import { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable,
  TextInput, RefreshControl, ScrollView,
  Platform, ActivityIndicator, ActionSheetIOS, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';
import {
  ShieldCheck, Building2, ChevronRight,
  Camera, Search, XCircle, Plus,
} from 'lucide-react-native';
import { useHorses, useCreateHorse, useUploadHorseImage } from '../../../hooks/use-horses';
import { formatMoney } from '../../../lib/currency';
import { useDashboard } from '../../../hooks/use-dashboard';
import { DatePicker } from '../../../components/DatePicker';
import { ScreenHeader, HeaderButton } from '../../../components/ScreenHeader';
import { FormSheet } from '../../../components/FormSheet';
import { HorseCardSkeleton } from '../../../components/Skeleton';
import { PressableScale } from '../../../components/PressableScale';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { useToast } from '../../../components/Toast';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { Routes, nav } from '../../../lib/routes';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import type { Horse } from '../../../../packages/shared/src';
import { AppImage } from '../../../components/AppImage';
import { space, text, radius, weight, shadow } from '../../../styles/tokens';
import { useCommonStyles } from '../../../styles/common';
import { LinearGradient } from 'expo-linear-gradient';
import { HorseshoeH } from '../../../components/icons/equine';

function HorseCard({ horse, monthlySpend, c, s }: {
  horse: Horse;
  monthlySpend?: number;
  c: ThemeColors;
  s: Styles;
}) {
  const router = useRouter();
  const sexLabel: Record<string, string> = { macho: 'Macho', hembra: 'Hembra', castrado: 'Castrado' };
  const subtitle = [horse.breed?.name, horse.sex ? sexLabel[horse.sex] : null].filter(Boolean).join(' · ');

  return (
    <PressableScale
      style={s.card}
      onPress={() => { haptic.light(); router.push(`/(tabs)/caballos/${horse.id}`); }}
      accessibilityRole="button"
      accessibilityLabel={`Ver ficha de ${horse.name}`}
    >
      {/* La foto es la tarjeta; el texto vive sobre un degradado */}
      {horse.image_url ? (
        <AppImage source={{ uri: horse.image_url }} style={s.cardPhoto} />
      ) : (
        <View style={s.cardPhotoPlaceholder}>
          <HorseshoeH size={64} color={c.brand} />
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.62)']}
        locations={[0.4, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Insignias arriba */}
      <View style={s.cardTopRow}>
        {horse.activity ? (
          <View style={s.cardActivityPill}>
            <Text style={s.cardActivityText}>{horse.activity.name}</Text>
          </View>
        ) : <View />}
        {horse.horse_record_id ? (
          <View style={s.cardVerifiedPill}>
            <ShieldCheck size={12} color={colors.white} strokeWidth={2.4} />
            <Text style={s.cardVerifiedText}>Padrón</Text>
          </View>
        ) : null}
      </View>

      {/* Nombre y datos sobre el degradado */}
      <View style={s.cardOverlay}>
        <Text style={s.cardName} numberOfLines={1}>{horse.name}</Text>
        <View style={s.cardMetaRow}>
          {subtitle ? <Text style={s.cardBreed} numberOfLines={1}>{subtitle}</Text> : null}
          {horse.establishment ? (
            <Text style={s.cardEstab} numberOfLines={1}>  ·  {horse.establishment.name}</Text>
          ) : null}
        </View>
        {monthlySpend != null && monthlySpend > 0 && (
          <Text style={s.cardSpend}>{formatMoney(monthlySpend)} este mes</Text>
        )}
      </View>
    </PressableScale>
  );
}

function CreateHorseModal({
  visible, onClose, c, s,
}: {
  visible: boolean;
  onClose: () => void;
  c: ThemeColors;
  s: Styles;
}) {
  const router = useRouter();
  const createHorse = useCreateHorse();
  const uploadImage = useUploadHorseImage();
  const toast = useToast();
  const { input: inputStyle } = useCommonStyles();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState('');

  // El FormSheet no destruye el formulario al cerrarse: hay que limpiarlo
  // manualmente cuando se vuelve a abrir, o el usuario ve lo que tipeó antes.
  useEffect(() => {
    if (!visible) return;
    setName(''); setBirthDate(''); setMicrochip(''); setPhotoUri(null); setError('');
  }, [visible]);

  const pickPhoto = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { toast.error('Necesitamos acceso a la cámara.'); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true });
      if (!result.canceled) setPhotoUri(result.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { toast.error('Necesitamos acceso a la galería.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true });
      if (!result.canceled) setPhotoUri(result.assets[0].uri);
    }
  };

  const handlePickPhoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', 'Tomar foto', 'Elegir de galería'], cancelButtonIndex: 0 },
        (i) => { if (i === 1) pickPhoto('camera'); else if (i === 2) pickPhoto('gallery'); },
      );
    } else {
      Alert.alert('Foto del caballo', '¿De dónde querés subir la foto?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tomar foto', onPress: () => pickPhoto('camera') },
        { text: 'Elegir de galería', onPress: () => pickPhoto('gallery') },
      ]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    if (microchip && microchip.length !== 15) { setError('El microchip debe tener 15 dígitos (o dejalo vacío).'); return; }
    setError('');
    try {
      const result = await createHorse.mutateAsync({
        name: name.trim(),
        birth_date: birthDate || undefined,
        microchip: microchip || undefined,
      });
      let fotoFallo = false;
      if (photoUri) {
        try {
          await uploadImage.mutateAsync({ id: result.horse.id, uri: photoUri });
        } catch {
          // El caballo ya se creó, así que no bloqueamos el alta — pero se avisa:
          // tragarse este error hacía que el usuario viera "guardado" y la foto
          // nunca apareciera, sin ninguna pista de por qué.
          fotoFallo = true;
        }
      }
      if (fotoFallo) {
        toast.error('Caballo guardado, pero no pudimos subir la foto. Probá cargarla desde su ficha.');
      } else {
        toast.success('Caballo guardado');
      }
      haptic.success();
      onClose();
      if (result.record_matches.length === 0) {
        nav.push(router, Routes.caballo(result.horse.id) as never);
      }
      if (result.record_matches.length > 0) {
        nav.push(router, `${Routes.vincularPadron(result.horse.id)}?matches=${encodeURIComponent(JSON.stringify(result.record_matches))}&microchip=${encodeURIComponent(microchip)}&birthDate=${encodeURIComponent(birthDate)}`);
      }
    } catch (err) {
      haptic.error();
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'No se pudo crear el caballo. Intentá de nuevo.');
    }
  };

  const isBusy = createHorse.isPending || uploadImage.isPending;

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title="Nuevo caballo"
      footer={
        <>
          <Pressable style={s.cancelBtn} onPress={() => { haptic.light(); onClose(); }}>
            <Text style={s.cancelBtnText}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[s.submitBtn, isBusy && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isBusy}
          >
            {isBusy
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.submitBtnText}>Crear</Text>
            }
          </Pressable>
        </>
      }
    >
      {/* Foto */}
      <TouchableOpacity
        style={s.photoPickerBtn}
        onPress={handlePickPhoto}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={photoUri ? 'Cambiar foto del caballo' : 'Agregar foto del caballo'}
      >
        {photoUri ? (
          <AppImage source={{ uri: photoUri }} style={s.photoPreview} />
        ) : (
          <View style={s.photoPlaceholder}>
            <Camera size={28} color={c.textFaint} strokeWidth={2} />
            <Text style={s.photoPlaceholderText}>Agregar foto</Text>
            <Text style={s.photoPlaceholderSub}>Cámara o galería</Text>
          </View>
        )}
        {photoUri && (
          <View style={s.photoEditBadge}>
            <Camera size={13} color={colors.white} strokeWidth={2} />
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        style={inputStyle.base}
        value={name}
        onChangeText={setName}
        placeholder="Nombre del caballo *"
        placeholderTextColor={c.textFaint}
        autoCapitalize="words"
      />
      <DatePicker
        label="Fecha de nacimiento (opcional)"
        value={birthDate}
        onChange={setBirthDate}
        maxDate={new Date()}
      />
      <TextInput
        style={inputStyle.base}
        value={microchip}
        onChangeText={(v) => setMicrochip(v.replace(/\D/g, '').slice(0, 15))}
        placeholder="Microchip de 15 dígitos (opcional)"
        placeholderTextColor={c.textFaint}
        keyboardType="numeric"
      />
      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </FormSheet>
  );
}

export default function CaballosScreen() {
  const { can } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: horses, isLoading, isError, refetch, isRefetching } = useHorses();
  const { data: dashboard } = useDashboard();
  const [search, setSearch] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterEstab, setFilterEstab] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Horse>>(null);
  useScrollToTop(listRef);

  const spendMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of dashboard?.spend_by_horse ?? []) map[s.horse_id] = s.total;
    return map;
  }, [dashboard?.spend_by_horse]);

  // Opciones de filtro dinámicas según los datos disponibles
  const activityOptions = [...new Set((horses ?? []).map((h) => h.activity?.name).filter(Boolean))] as string[];
  const estabOptions = [...new Set((horses ?? []).map((h) => h.establishment?.name).filter(Boolean))] as string[];
  const hasFilters = activityOptions.length > 1 || estabOptions.length > 1;

  const filtered = (horses ?? []).filter((h) => {
    const q = search.toLowerCase();
    const matchSearch = !search || (
      h.name.toLowerCase().includes(q) ||
      (h.breed?.name ?? '').toLowerCase().includes(q) ||
      (h.microchip ?? '').includes(q)
    );
    const matchActivity = !filterActivity || h.activity?.name === filterActivity;
    const matchEstab = !filterEstab || h.establishment?.name === filterEstab;
    return matchSearch && matchActivity && matchEstab;
  });

  if (isLoading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader
          scrollable
          title="Caballos"
          right={can('horses', 'create') ? <HeaderButton label="+ Nuevo" onPress={() => setShowCreate(true)} /> : undefined}
        />
        <View style={{ padding: 16, gap: 12 }}>
          {[1, 2, 3].map((i) => <HorseCardSkeleton key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(h) => h.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            <ScreenHeader
              scrollable
              title="Caballos"
              right={can('horses', 'create') ? (
                <HeaderButton label="+ Nuevo" onPress={() => { haptic.medium(); setShowCreate(true); }} />
              ) : undefined}
            />
            {/* Buscador */}
            <View style={s.searchWrap}>
              <Search size={16} color={c.textFaint} strokeWidth={2} />
              <TextInput
                style={s.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar"
                placeholderTextColor={c.textFaint}
                clearButtonMode="while-editing"
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  activeOpacity={0.7}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar búsqueda"
                >
                  <XCircle size={16} color={c.textFaint} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filtros por actividad y establecimiento */}
            {hasFilters && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterRow}
                style={{ maxHeight: 44 }}
              >
                {activityOptions.map((act) => (
                  <TouchableOpacity
                    key={act}
                    style={[s.filterChip, filterActivity === act && s.filterChipActive]}
                    onPress={() => { haptic.selection(); setFilterActivity(filterActivity === act ? '' : act); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.filterChipText, filterActivity === act && s.filterChipTextActive]}>{act}</Text>
                  </TouchableOpacity>
                ))}
                {estabOptions.map((est) => (
                  <TouchableOpacity
                    key={est}
                    style={[s.filterChip, filterEstab === est && s.filterChipActive]}
                    onPress={() => { haptic.selection(); setFilterEstab(filterEstab === est ? '' : est); }}
                    activeOpacity={0.75}
                  >
                    <Building2 size={11} color={filterEstab === est ? colors.white : c.textMuted} strokeWidth={2} />
                    <Text style={[s.filterChipText, filterEstab === est && s.filterChipTextActive]}>{est}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        }
        ListEmptyComponent={
          isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
          <EmptyState
            icon={search ? 'search-outline' : 'paw-outline'}
            title={search ? 'Sin resultados' : 'No hay caballos registrados'}
            message={search ? `No encontramos resultados para "${search}"` : 'Registrá el primer caballo para empezar a gestionar su historial.'}
            actionLabel={!search && can('horses', 'create') ? 'Registrar caballo' : undefined}
            onAction={() => { haptic.medium(); setShowCreate(true); }}
          />
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)} style={{ paddingHorizontal: 12 }}>
            <HorseCard
              horse={item}
              monthlySpend={spendMap[item.id]}
              c={c}
              s={s}
            />
          </Animated.View>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Hoja: crear caballo */}
      <CreateHorseModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        c={c}
        s={s}
      />

      {can('horses', 'create') && (
        <Pressable
          style={s.fab}
          onPress={() => { haptic.medium(); setShowCreate(true); }}
          accessibilityRole="button"
          accessibilityLabel="Nuevo caballo"
          hitSlop={8}
        >
          <Plus size={26} color={colors.white} strokeWidth={2.5} />
        </Pressable>
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginVertical: 10,
    backgroundColor: c.surface, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 2, gap: 8,
    minHeight: 48, ...shadow.sm,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: text.base, color: c.text },
  list: { paddingBottom: 120, gap: 10 },
  // ─── Horse Card — foto primero (la imagen es la tarjeta) ──────────────────
  card: {
    height: 210,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: c.surfaceAlt,
    ...(c.isDark ? {} : { ...shadow.sm }),
  },
  cardPhoto: { ...StyleSheet.absoluteFillObject },
  cardPhotoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.isDark ? c.surfaceAlt : '#efe9df',
    justifyContent: 'center', alignItems: 'center',
    opacity: 0.9,
  },
  cardTopRow: {
    position: 'absolute', top: space[3], left: space[3], right: space[3],
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardActivityPill: {
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radius.full,
    paddingHorizontal: space[3], paddingVertical: 4,
  },
  cardActivityText: { fontSize: text.xs, fontWeight: weight.bold, color: '#7d5426' },
  cardVerifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: radius.full,
    paddingHorizontal: space[2] + 2, paddingVertical: 4,
  },
  cardVerifiedText: { fontSize: text.xs, fontWeight: weight.bold, color: colors.white },
  cardOverlay: {
    position: 'absolute', left: space[4], right: space[4], bottom: space[3] + 2,
    gap: 2,
  },
  cardName: {
    fontSize: text.lg, fontWeight: weight.extrabold, color: colors.white,
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 },
  },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center' },
  cardBreed: { fontSize: text.sm, color: 'rgba(255,255,255,0.92)', fontWeight: weight.medium },
  cardEstab: { fontSize: text.sm, color: 'rgba(255,255,255,0.75)', flexShrink: 1 },
  cardSpend: { fontSize: text.sm, fontWeight: weight.bold, color: 'rgba(255,255,255,0.95)', marginTop: 2 },
  // ─── FAB ──────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute', right: 20, bottom: 110,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.brand,
    shadowColor: c.brand, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 7, elevation: 4,
  },
  // ─── Filtros ───────────────────────────────────────────────────────────────
  filterRow: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: c.surfaceAlt },
  filterChipActive: { backgroundColor: c.brand, borderColor: c.brand },
  filterChipText: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  filterChipTextActive: { color: colors.white },
  errorText: { fontSize: 13, color: colors.red500 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  submitBtn: { flex: 1, borderRadius: 12, backgroundColor: c.brand, paddingVertical: 13, alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  photoPickerBtn: { alignSelf: 'center', marginBottom: 6, position: 'relative' },
  photoPreview: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: c.brand },
  photoPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: c.surfaceAlt, borderWidth: 2, borderColor: c.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  photoPlaceholderText: { fontSize: 12, fontWeight: '700', color: c.textMuted },
  photoPlaceholderSub: { fontSize: 10, color: c.textFaint },
  photoEditBadge: { position: 'absolute', bottom: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.white },
});
