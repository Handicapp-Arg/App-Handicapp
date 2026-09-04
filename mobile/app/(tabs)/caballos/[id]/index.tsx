import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Platform, TextInput, ActivityIndicator, Alert, ActionSheetIOS, Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, ChevronRight, MoreHorizontal, QrCode, ShieldCheck, Megaphone,
  Trash2, Camera, Pencil, Stethoscope, Network, Clock, Images, Banknote,
  Users, FileText, ClipboardList, Copy, Share2, AlertTriangle, CalendarClock, Scale,
  type LucideIcon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { differenceInYears } from 'date-fns';

import {
  useHorse, useFinancialSummary, useUpdateHorse, useDeleteHorse, useUploadHorseImage, useWeightRecords,
  useHorseDocuments, useHorseVets, useHorseAssignees,
} from '../../../../hooks/use-horses';
import { useMedicalRecords, SANITARY_DISEASES, healthStatusFromNextDue } from '../../../../hooks/use-medical';
import { useAgenda } from '../../../../hooks/use-agenda';
import { useEventsByHorse } from '../../../../hooks/use-events';
import { useActivityPhotos } from '../../../../hooks/use-activity-photos';
import { useRoutines } from '../../../../hooks/use-routines';
import { formatMoney } from '../../../../lib/currency';
import { useAuth } from '../../../../lib/auth';
import { haptic } from '../../../../lib/haptics';
import { Routes, nav } from '../../../../lib/routes';
import { DatePicker } from '../../../../components/DatePicker';
import { Spinner } from '../../../../components/Spinner';
import { useToast } from '../../../../components/Toast';
import { colors } from '../../../../lib/colors';
import { fechaHumana, fechaHoraHumana } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, weight } from '../../../../styles/tokens';
import { ActionSheet } from '../../../../components/ActionSheet';
import { FormSheet } from '../../../../components/FormSheet';
import { BottomSheet } from '../../../../components/BottomSheet';
import { AppImage } from '../../../../components/AppImage';

// Base URL para el enlace público del caballo (QR). Configurable via EXPO_PUBLIC_APP_URL
// (ej. IP LAN http://192.168.x.x:3005) para que el QR sea accesible desde otros dispositivos.
const PUBLIC_BASE = process.env.EXPO_PUBLIC_APP_URL ?? 'https://app.handicapp.com.ar';

const SEX_LABEL: Record<string, string> = { macho: 'Macho', hembra: 'Hembra', castrado: 'Castrado' };

/* ─── EditHorseModal ─── */
function EditHorseModal({ horse, visible, onClose, c, s }: { horse: NonNullable<ReturnType<typeof useHorse>['data']>; visible: boolean; onClose: () => void; c: ThemeColors; s: Styles }) {
  const updateHorse = useUpdateHorse();
  const toast = useToast();
  const [name, setName] = useState(horse.name);
  const [birthDate, setBirthDate] = useState(horse.birth_date ?? '');
  const [microchip, setMicrochip] = useState(horse.microchip ?? '');
  const [error, setError] = useState('');

  // La hoja ya no se destruye al cerrarse: limpiamos el formulario al abrir.
  useEffect(() => {
    if (!visible) return;
    setName(horse.name);
    setBirthDate(horse.birth_date ?? '');
    setMicrochip(horse.microchip ?? '');
    setError('');
  }, [visible, horse]);

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); haptic.error(); return; }
    setError('');
    try {
      await updateHorse.mutateAsync({ id: horse.id, name: name.trim(), birth_date: birthDate || null, microchip: microchip || null });
      haptic.success();
      toast.success('Cambios guardados');
      onClose();
    } catch {
      haptic.error();
      setError('No se pudieron guardar los cambios. Intentá de nuevo.');
    }
  };

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title={`Editar ${horse.name}`}
      footer={
        <>
          <TouchableOpacity
            style={[s.btn, s.btnSecondary, { flex: 1 }]}
            onPress={() => { haptic.light(); onClose(); }}
            accessibilityRole="button"
            accessibilityLabel="Cancelar edición"
          >
            <Text style={s.btnSecondaryText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, s.btnPrimary, { flex: 1 }, updateHorse.isPending && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={updateHorse.isPending}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios del caballo"
          >
            {updateHorse.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.btnPrimaryText}>Guardar</Text>}
          </TouchableOpacity>
        </>
      }
    >
      <TextInput
        style={s.input}
        value={name}
        onChangeText={setName}
        placeholder="Nombre del caballo"
        placeholderTextColor={c.textFaint}
        autoCapitalize="words"
        textContentType="name"
        returnKeyType="next"
      />
      <DatePicker label="Fecha de nacimiento" value={birthDate} onChange={setBirthDate} maxDate={new Date()} />
      <TextInput
        style={s.input}
        value={microchip}
        onChangeText={(v) => setMicrochip(v.replace(/\D/g, '').slice(0, 15))}
        placeholder="Microchip (15 dígitos)"
        placeholderTextColor={c.textFaint}
        keyboardType="numeric"
        returnKeyType="done"
      />
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </FormSheet>
  );
}

/* ─── SectionRow: fila de navegación estilo Más/Ajustes ─── */
function SectionRow({ Icon, label, sub, onPress, c, s }: { Icon: LucideIcon; label: string; sub?: string; onPress: () => void; c: ThemeColors; s: Styles }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={label}>
      <View style={s.rowIconWrap}>
        <Icon size={20} color={c.text} strokeWidth={1.7} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      <ChevronRight size={16} color={c.textFaint} strokeWidth={2} />
    </TouchableOpacity>
  );
}

/* ─── SummaryRow: fila de resumen vital (turno / peso / gasto) ─── */
function SummaryRow({ Icon, label, value, tone, onPress, c, s, isLast }: { Icon: LucideIcon; label: string; value: string; tone?: 'default' | 'brand'; onPress: () => void; c: ThemeColors; s: Styles; isLast?: boolean }) {
  return (
    <TouchableOpacity style={[s.summaryRow, isLast && s.summaryRowLast]} onPress={onPress} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={label}>
      <View style={s.rowIconWrap}>
        <Icon size={18} color={tone === 'brand' ? c.brand : c.textMuted} strokeWidth={1.8} />
      </View>
      <Text style={[s.rowLabel, { flex: 1 }]}>{label}</Text>
      <Text style={[s.summaryValue, tone === 'brand' && { color: c.brand }]} numberOfLines={1}>{value}</Text>
      <ChevronRight size={16} color={c.textFaint} strokeWidth={2} />
    </TouchableOpacity>
  );
}

/* ─── Main ─── */
export default function HorseDetailScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can, user } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading, refetch, isRefetching } = useHorse(id);
  const isJineteOrPeon = user?.role === 'jinete' || user?.role === 'peon';
  const { data: financial } = useFinancialSummary(id, !isJineteOrPeon);
  const { data: weightRecords } = useWeightRecords(id);
  const { data: medicalRecords } = useMedicalRecords(id);
  const { data: agenda } = useAgenda(true);
  const { data: events } = useEventsByHorse(id);
  const { data: activityPhotos } = useActivityPhotos(id);
  const { data: documents } = useHorseDocuments(id);
  const { data: horseVets } = useHorseVets(id);
  const { data: assignees } = useHorseAssignees(id);
  const { data: routines } = useRoutines(id);
  const deleteHorse = useDeleteHorse();
  const uploadImage = useUploadHorseImage();

  const [showEdit, setShowEdit] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handlePickImage = () => {
    const doUpload = async (source: 'camera' | 'gallery') => {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { toast.error('Necesitamos acceso a la cámara.'); return; }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 });
        if (!result.canceled && result.assets[0]) { await uploadImage.mutateAsync({ id, uri: result.assets[0].uri }); toast.success('Foto actualizada'); }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { toast.error('Necesitamos acceso a la galería.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
        if (!result.canceled && result.assets[0]) { await uploadImage.mutateAsync({ id, uri: result.assets[0].uri }); toast.success('Foto actualizada'); }
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', 'Tomar foto', 'Elegir de galería'], cancelButtonIndex: 0 },
        (i) => { if (i === 1) doUpload('camera'); else if (i === 2) doUpload('gallery'); },
      );
    } else {
      Alert.alert('Foto del caballo', '¿De dónde querés actualizar la foto?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tomar foto', onPress: () => doUpload('camera') },
        { text: 'Elegir de galería', onPress: () => doUpload('gallery') },
      ]);
    }
  };

  const handleDelete = () => {
    haptic.medium();
    Alert.alert('Eliminar caballo', `¿Eliminás a ${horse?.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteHorse.mutateAsync(id); router.back(); } },
    ]);
  };

  if (isLoading) return <Spinner />;
  if (!horse) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Text style={{ fontSize: text.base, color: c.textMuted }}>Caballo no encontrado</Text>
        <TouchableOpacity
          onPress={() => { haptic.light(); router.canGoBack() ? router.back() : router.navigate(Routes.tabsCaballos as never); }}
          accessibilityRole="button"
          accessibilityLabel="Volver a la lista de caballos"
        >
          <Text style={{ fontSize: text.sm, fontWeight: '600', color: c.brand }}>← Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const base = Routes.caballo(horse.id);
  const goto = (path: string) => { haptic.selection(); nav.push(router, `${base}/${path}`); };

  // ─── Datos vitales, una línea bajo el hero ───
  const vitals: string[] = [];
  if (horse.birth_date) {
    // Igual que lib/fechas.ts: ancla la fecha sola al mediodía local para no
    // correrse un día por huso horario.
    const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(horse.birth_date);
    const birthDate = new Date(soloFecha ? `${horse.birth_date}T12:00:00` : horse.birth_date);
    const years = differenceInYears(new Date(), birthDate);
    vitals.push(`${years} años`);
  }
  if (horse.sex) vitals.push(SEX_LABEL[horse.sex] ?? horse.sex);
  if (horse.breed) vitals.push(horse.breed.name);

  // ─── Alertas de libreta sanitaria (vencidas / por vencer) ───
  let worstHealthStatus: 'rojo' | 'amarillo' | null = null;
  let overdueCount = 0;
  let dueSoonCount = 0;
  for (const d of SANITARY_DISEASES) {
    const last = medicalRecords?.filter((r) => r.type === 'sanidad').find((r) => d.match.test(r.name)) ?? null;
    const status = healthStatusFromNextDue(last?.next_due ?? null);
    if (status === 'rojo') { overdueCount++; worstHealthStatus = 'rojo'; }
    else if (status === 'amarillo') { dueSoonCount++; if (worstHealthStatus !== 'rojo') worstHealthStatus = 'amarillo'; }
  }

  // ─── Resumen vital: próximo turno / último peso / gasto del mes ───
  const proximoTurno = (agenda ?? [])
    .filter((a) => a.horse_id === horse.id)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
  const ultimoPeso = weightRecords?.[0];
  const gastoDelMes = financial?.monthly?.[0];

  const hasFinanzas = !isJineteOrPeon;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
    >
      {/* ─── Hero: aspect ratio, Dynamic Island safe ─── */}
      <View style={s.heroWrap}>
        {horse.image_url
          ? <AppImage source={{ uri: horse.image_url }} style={StyleSheet.absoluteFill} />
          : (
            <View style={[StyleSheet.absoluteFill, s.heroPlaceholder]}>
              <Text style={s.heroPlaceholderInitial}>{horse.name[0]?.toUpperCase()}</Text>
            </View>
          )
        }
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.75)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Back */}
        <TouchableOpacity
          style={[s.heroPill, { top: insets.top + 10, left: 14 }]}
          onPress={() => { haptic.light(); router.canGoBack() ? router.back() : router.navigate(Routes.tabsCaballos as never); }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Volver a la lista de caballos"
        >
          <ChevronLeft size={20} color={colors.white} strokeWidth={2} />
        </TouchableOpacity>

        {/* Acciones — menú de 3 puntitos */}
        {(can('horses', 'update') || can('horses', 'delete')) && (
          <View style={[s.heroActions, { top: insets.top + 10 }]}>
            <TouchableOpacity
              style={[s.heroPill, s.heroPillStatic]}
              onPress={() => { haptic.light(); setShowMenu(true); }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Más opciones del caballo"
            >
              <MoreHorizontal size={20} color={colors.white} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        {/* Nombre + QR + badges */}
        <View style={s.heroContent}>
          <View style={s.heroNameRow}>
            <Text style={[s.horseName, { flex: 1 }]} numberOfLines={2}>{horse.name}</Text>
            {horse.public_token && (
              <TouchableOpacity
                style={[s.heroPill, s.heroPillStatic, s.heroPillQr]}
                onPress={() => { haptic.light(); setShowQR(true); }} activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Ver código QR del caballo"
              >
                <QrCode size={20} color={c.isDark ? '#1a1207' : colors.white} strokeWidth={2.2} />
              </TouchableOpacity>
            )}
          </View>
          <View style={s.heroBadges}>
            {horse.horse_record_id && (
              <View style={[s.heroBadge, s.heroBadgeVerified]}>
                <ShieldCheck size={11} color={colors.white} strokeWidth={2} />
                <Text style={s.heroBadgeText}>Verificado en padrón</Text>
              </View>
            )}
            {horse.breed && <View style={s.heroBadge}><Text style={s.heroBadgeText} numberOfLines={1}>{horse.breed.name}</Text></View>}
            {horse.activity && <View style={[s.heroBadge, s.heroBadgeAmber]}><Text style={s.heroBadgeText} numberOfLines={1}>{horse.activity.name}</Text></View>}
          </View>
        </View>
      </View>

      {/* ─── Hoja de contenido (se monta sobre la imagen) ─── */}
      <View style={s.sheet}>

        {/* ─── Datos vitales, una línea ─── */}
        {vitals.length > 0 && (
          <Text style={s.vitalsLine}>{vitals.join(' · ')}</Text>
        )}

        {/* ─── Alerta de libreta sanitaria ─── */}
        {worstHealthStatus && (
          <TouchableOpacity
            style={[s.alertBanner, worstHealthStatus === 'rojo' ? s.alertBannerDanger : s.alertBannerWarning]}
            onPress={() => goto('sanidad')}
            activeOpacity={0.85}
          >
            <AlertTriangle size={16} color={worstHealthStatus === 'rojo' ? c.danger : c.warning} strokeWidth={2.2} />
            <Text style={[s.alertText, { color: worstHealthStatus === 'rojo' ? c.danger : c.warning }]}>
              {worstHealthStatus === 'rojo'
                ? `${overdueCount} vacuna${overdueCount > 1 ? 's' : ''} vencida${overdueCount > 1 ? 's' : ''}`
                : `${dueSoonCount} vacuna${dueSoonCount > 1 ? 's' : ''} por vencer`}
            </Text>
            <ChevronRight size={16} color={worstHealthStatus === 'rojo' ? c.danger : c.warning} strokeWidth={2} />
          </TouchableOpacity>
        )}

        {/* ─── Resumen vital ─── */}
        <View style={s.summaryCard}>
          <SummaryRow
            Icon={CalendarClock}
            label="Próximo turno"
            value={proximoTurno ? fechaHoraHumana(proximoTurno.scheduled_at) : 'Sin turnos'}
            onPress={() => { haptic.selection(); nav.push(router, Routes.tabsAgenda as never); }}
            c={c} s={s}
          />
          <SummaryRow
            Icon={Scale}
            label="Último peso"
            value={ultimoPeso ? `${Number(ultimoPeso.weight_kg)} kg` : 'Sin registros'}
            onPress={() => goto('sanidad')}
            c={c} s={s}
          />
          {hasFinanzas && (
            <SummaryRow
              Icon={Banknote}
              label="Gasto del mes"
              value={gastoDelMes ? formatMoney(gastoDelMes.total) : 'Sin gastos'}
              onPress={() => goto('finanzas')}
              c={c} s={s}
              isLast
            />
          )}
        </View>

        {/* ─── Lista de secciones ─── */}
        <View style={s.sectionsList}>
          <SectionRow Icon={Clock} label="Historial" sub={!events?.length ? 'Sin registros' : undefined} onPress={() => goto('historial')} c={c} s={s} />
          <SectionRow Icon={Stethoscope} label="Sanidad" sub={!medicalRecords?.length ? 'Sin registros' : undefined} onPress={() => goto('sanidad')} c={c} s={s} />
          {hasFinanzas && <SectionRow Icon={Banknote} label="Finanzas" sub={!financial?.total ? 'Sin gastos' : undefined} onPress={() => goto('finanzas')} c={c} s={s} />}
          <SectionRow Icon={Images} label="Fotos" sub={!activityPhotos?.length ? 'Sin fotos' : undefined} onPress={() => goto('fotos')} c={c} s={s} />
          <SectionRow Icon={Users} label="Equipo y veterinarios" sub={!horseVets?.length && !assignees?.length ? 'Sin asignaciones' : undefined} onPress={() => goto('equipo')} c={c} s={s} />
          <SectionRow Icon={FileText} label="Documentos" sub={!documents?.length ? 'Sin documentos' : undefined} onPress={() => goto('documentos')} c={c} s={s} />
          <SectionRow Icon={ClipboardList} label="Rutina" sub={!routines?.length ? 'Sin registros' : undefined} onPress={() => goto('rutina')} c={c} s={s} />
          <SectionRow Icon={Network} label="Pedigrí" sub={horse.pedigree_status === 'unverified' ? 'Sin verificar' : undefined} onPress={() => goto('pedigree')} c={c} s={s} />
        </View>
      </View>

      {/* ─── Menú de acciones ─── */}
      <ActionSheet
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        acciones={[
          ...(can('horses', 'update') ? [
            { label: 'Cambiar foto', Icon: Camera, onPress: handlePickImage },
            { label: 'Editar caballo', Icon: Pencil, onPress: () => setShowEdit(true) },
          ] : []),
          ...((user?.role === 'propietario' || can('auctions', 'create')) ? [{
            label: 'Publicar en venta',
            Icon: Megaphone,
            onPress: () => { haptic.medium(); nav.push(router, `${Routes.remateCrear}?horse=${horse.id}` as never); },
          }] : []),
          ...(can('horses', 'delete') ? [{
            label: 'Eliminar caballo',
            Icon: Trash2,
            destructiva: true,
            onPress: handleDelete,
          }] : []),
        ]}
      />

      {/* ─── Hoja QR ─── */}
      <BottomSheet visible={showQR} onClose={() => setShowQR(false)} title="Código QR">
        <View style={{ paddingBottom: insets.bottom + 8 }}>
          <Text style={s.qrTitle} numberOfLines={1}>{horse.name}</Text>
          <View style={s.qrWrap}>
            <View style={s.qrInner}>
              {horse.public_token && (
                <QRCode value={`${PUBLIC_BASE}/caballo/${horse.public_token}`} size={200} color="#9d6c35" backgroundColor="#ffffff" />
              )}
            </View>
          </View>
          <Text style={s.qrHint}>Escaneá para ver el perfil público del caballo</Text>
          <View style={s.qrActions}>
            <TouchableOpacity
              style={s.qrLinkBtn}
              onPress={async () => {
                if (!horse.public_token) return;
                await Clipboard.setStringAsync(`${PUBLIC_BASE}/caballo/${horse.public_token}`);
                haptic.light();
                toast.success('Enlace copiado');
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Copiar enlace público del caballo"
            >
              <Copy size={15} color={c.brand} strokeWidth={2.2} />
              <Text style={s.qrLinkBtnText}>Copiar enlace</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.qrShareBtn}
              onPress={async () => {
                if (!horse.public_token) return;
                const url = `${PUBLIC_BASE}/caballo/${horse.public_token}`;
                try {
                  await Share.share({ message: `Mirá el perfil de ${horse.name} en HandicApp: ${url}`, url });
                } catch {
                  // usuario canceló
                }
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Compartir enlace público del caballo"
            >
              <Share2 size={15} color={colors.white} strokeWidth={2.2} />
              <Text style={s.qrShareBtnText}>Compartir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>

      {/* ─── Hoja editar caballo ─── */}
      <EditHorseModal horse={horse} visible={showEdit} onClose={() => setShowEdit(false)} c={c} s={s} />
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

  /* Hero */
  heroWrap: { aspectRatio: 16 / 9, position: 'relative', backgroundColor: colors.gray900 },
  heroPlaceholder: { backgroundColor: colors.gray900, alignItems: 'center', justifyContent: 'center' },
  heroPlaceholderInitial: { fontSize: 80, fontWeight: '800', color: colors.brand300 },
  heroPill: {
    position: 'absolute', width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroPillQr: { backgroundColor: c.brand, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  heroPillStatic: { position: 'relative', top: undefined, left: undefined },
  heroActions: { position: 'absolute', right: 14, flexDirection: 'row', gap: 8 },
  heroContent: { position: 'absolute', bottom: 0, left: 16, right: 16, paddingBottom: 20 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  horseName: { fontSize: text.xl, fontWeight: '800', letterSpacing: -0.5, color: colors.white, lineHeight: 32, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroBadges: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeAmber: { backgroundColor: 'rgba(245,158,11,0.35)' },
  heroBadgeVerified: { backgroundColor: 'rgba(16,163,127,0.9)', flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroBadgeText: { fontSize: 11, fontWeight: '600', color: colors.white },

  sheet: {
    marginTop: -10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: c.bg,
    overflow: 'hidden',
    paddingTop: space[4],
  },

  /* Vitales */
  vitalsLine: { fontSize: text.base, fontWeight: weight.semibold, color: c.textMuted, textAlign: 'center', marginBottom: space[4] },

  /* Alerta sanitaria */
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: space[4], marginBottom: space[4], paddingHorizontal: space[4], paddingVertical: space[3], borderRadius: 12 },
  alertBannerDanger: { backgroundColor: c.dangerSoft },
  alertBannerWarning: { backgroundColor: c.warningSoft },
  alertText: { flex: 1, fontSize: text.sm, fontWeight: '700' },

  /* Resumen vital */
  summaryCard: { marginHorizontal: space[4], marginBottom: space[6] },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 52, borderBottomWidth: 1, borderBottomColor: c.border },
  summaryRowLast: { borderBottomWidth: 0 },
  summaryValue: { fontSize: text.sm, fontWeight: '700', color: c.text, maxWidth: 140 },

  /* Lista de secciones — patrón Más/Ajustes */
  sectionsList: { marginHorizontal: space[4], marginBottom: space[8] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 52, borderBottomWidth: 1, borderBottomColor: c.border },
  rowIconWrap: { width: 28, alignItems: 'center', flexShrink: 0 },
  rowLabel: { fontSize: text.md, fontWeight: weight.regular, color: c.text, letterSpacing: -0.2 },
  rowSub: { fontSize: text.xs, color: c.textFaint, marginTop: 1 },

  /* Hoja QR */
  qrTitle: { fontSize: text.xl, fontWeight: '800', color: c.text, marginBottom: 4 },
  qrWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 18 },
  qrInner: { backgroundColor: '#ffffff', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  qrHint: { textAlign: 'center', fontSize: text.sm, fontWeight: '500', color: c.textMuted, paddingHorizontal: 24, lineHeight: 18 },
  qrActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  qrLinkBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 14, backgroundColor: c.surfaceAlt, paddingVertical: 13 },
  qrLinkBtnText: { fontSize: text.sm, fontWeight: '700', color: c.brand },
  qrShareBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 14, backgroundColor: c.brand, paddingVertical: 13 },
  qrShareBtnText: { fontSize: text.sm, fontWeight: '700', color: colors.white },

  /* Formularios (dentro de FormSheet) */
  fieldError: { fontSize: text.sm, color: colors.red500 },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: text.base, color: c.text, backgroundColor: c.surfaceAlt },
  btn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: c.brand },
  btnPrimaryText: { fontSize: text.base, fontWeight: '700', color: colors.white },
  btnSecondary: { backgroundColor: c.surfaceAlt },
  btnSecondaryText: { fontSize: text.base, fontWeight: '600', color: c.textMuted },
});
