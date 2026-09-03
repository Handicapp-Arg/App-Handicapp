import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppImage } from '../../components/AppImage';
import { X, Camera, Wheat, Syringe, Hammer, Activity, Wrench, Truck, Package } from 'lucide-react-native';
import { useAllEvents, useCreateEvent, useDeleteEvent } from '../../hooks/use-events';
import { useHorses } from '../../hooks/use-horses';
import { useAuth } from '../../lib/auth';
import { DatePicker } from '../../components/DatePicker';
import { EventCard } from '../../components/EventCard';
import { ScreenHeader, HeaderButton } from '../../components/ScreenHeader';
import { Routes } from '../../lib/routes';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { EventRowSkeleton } from '../../components/Skeleton';
import { haptic } from '../../lib/haptics';
import { CURRENCY_OPTIONS, type Currency } from '../../lib/currency';
import { colors, makeEventTypeColors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight } from '../../styles/tokens';
import { useCommonStyles } from '../../styles/common';
import { useToast } from '../../components/Toast';
import { FormSheet } from '../../components/FormSheet';

const TYPE_OPTIONS = ['salud', 'entrenamiento', 'tarea', 'carrera', 'gasto', 'nota'] as const;

// Gating por rol en la UI: jinete solo "entrenamiento", peón solo "tarea".
function visibleTypeOptions(role?: string): readonly string[] {
  if (role === 'jinete') return ['entrenamiento'];
  if (role === 'peon') return ['tarea'];
  return TYPE_OPTIONS;
}

function defaultTypeForRole(role?: string): string {
  if (role === 'jinete') return 'entrenamiento';
  if (role === 'peon') return 'tarea';
  return 'salud';
}

// Categorías de gasto: colores neutralizados vía theme (no arcoíris hardcodeado).
// El ícono es un indicador de tipo, no un estado; usa color neutro secundario.
const makeExpenseCategories = (c: ThemeColors) => [
  { value: 'alimentacion',  label: 'Alimento',     Icon: Wheat,    color: c.textMuted },
  { value: 'veterinario',   label: 'Veterinario',  Icon: Syringe,  color: c.textMuted },
  { value: 'herradero',     label: 'Herradero',    Icon: Hammer,   color: c.textMuted },
  { value: 'entrenamiento', label: 'Entreno',      Icon: Activity, color: c.textMuted },
  { value: 'mantenimiento', label: 'Mant.',        Icon: Wrench,   color: c.textMuted },
  { value: 'transporte',    label: 'Transporte',   Icon: Truck,    color: c.textMuted },
  { value: 'otros',         label: 'Otros',        Icon: Package,  color: c.textMuted },
];

/* ─── Modal crear evento ─── */

function CreateEventModal({ visible, onClose, c, s }: { visible: boolean; onClose: () => void; c: ThemeColors; s: Styles }) {
  const { typography, modal: modalStyle, input: inputStyle, button } = useCommonStyles();
  const { user } = useAuth();
  const eventTypeColors = makeEventTypeColors(c);
  const expenseCategories = makeExpenseCategories(c);
  const typeOpts = visibleTypeOptions(user?.role);
  const { data: horses } = useHorses();
  const createEvent = useCreateEvent();
  const toast = useToast();
  const [horseId, setHorseId] = useState(horses?.[0]?.id ?? '');
  const [type, setType] = useState<string>(() => defaultTypeForRole(user?.role));
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [error, setError] = useState('');

  // La hoja ya no se destruye al cerrarse: limpiamos el formulario al abrir.
  useEffect(() => {
    if (!visible) return;
    setDescription(''); setAmount(''); setExpenseCategory('');
    setPhotoUris([]); setError('');
    setDate(new Date().toISOString().split('T')[0]);
    setType(defaultTypeForRole(user?.role));
    setHorseId(horses?.[0]?.id ?? '');
  }, [visible]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { toast.error('Necesitamos acceso a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8, selectionLimit: 5,
    });
    if (!result.canceled) {
      setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5));
    }
  };

  const handleSubmit = async () => {
    if (!horseId) { setError('Seleccioná un caballo'); haptic.error(); return; }
    if (!description.trim()) { setError('Escribí una descripción'); haptic.error(); return; }
    setError('');
    try {
      await createEvent.mutateAsync({
        type, description, date, horse_id: horseId,
        amount: type === 'gasto' && amount ? String(parseFloat(amount) || 0) : undefined,
        expense_category: type === 'gasto' && expenseCategory ? expenseCategory : undefined,
        currency: type === 'gasto' ? currency : undefined,
        photoUris: photoUris.length > 0 ? photoUris : undefined,
      });
      haptic.success();
      toast.success('Evento creado');
      onClose();
    } catch {
      haptic.error();
      setError('No se pudo crear el evento. Intentá de nuevo.');
    }
  };

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title="Nuevo evento"
      footer={
        <>
          <TouchableOpacity style={[button.secondary, { flex: 1 }]} onPress={() => { haptic.light(); onClose(); }}>
            <Text style={button.secondaryText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[button.primary, { flex: 1 }, createEvent.isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={createEvent.isPending}
          >
            {createEvent.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={button.primaryText}>Crear evento</Text>
            }
          </TouchableOpacity>
        </>
      }
    >
      <>
          {/* Caballo */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Caballo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
              {horses?.map((h) => (
                <TouchableOpacity
                  key={h.id}
                  style={[s.chip, horseId === h.id && s.chipActive]}
                  onPress={() => { haptic.selection(); setHorseId(h.id); }}
                >
                  <Text style={[s.chipText, horseId === h.id && s.chipTextActive]}>{h.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tipo */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Tipo</Text>
            <View style={s.typeGrid}>
              {typeOpts.map((t) => {
                const ec = eventTypeColors[t];
                const active = type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeBtn, active && { backgroundColor: c.isDark ? ec.text + '26' : ec.bg }]}
                    onPress={() => { haptic.selection(); setType(t); }}
                  >
                    <Text style={[s.typeBtnText, active && { color: ec.text }]}>{ec.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Fecha */}
          <DatePicker label="Fecha" value={date} onChange={setDate} />

          {/* Monto, moneda y categoría */}
          {type === 'gasto' && (
            <>
              <View style={{ gap: space[2] }}>
                <Text style={typography.label}>Monto</Text>
                <View style={{ flexDirection: 'row', gap: space[2] }}>
                  {CURRENCY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[s.currencyBtn, currency === opt.value && s.currencyBtnActive]}
                      onPress={() => { haptic.selection(); setCurrency(opt.value); }}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.currencyBtnText, currency === opt.value && s.currencyBtnTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={inputStyle.base}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={c.textFaint}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ gap: space[2] }}>
                <Text style={typography.label}>Categoría</Text>
                <View style={s.categoryGrid}>
                  {expenseCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[s.categoryBtn, expenseCategory === cat.value && { backgroundColor: c.text }]}
                      onPress={() => { haptic.selection(); setExpenseCategory(expenseCategory === cat.value ? '' : cat.value); }}
                      activeOpacity={0.75}
                    >
                      <cat.Icon size={16} color={expenseCategory === cat.value ? c.surface : cat.color} strokeWidth={2} />
                      <Text style={[s.categoryBtnText, expenseCategory === cat.value && { color: c.surface }]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Fotos opcionales */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Fotos (opcional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
              {photoUris.map((uri, i) => (
                <View key={uri} style={s.photoThumb}>
                  <AppImage source={{ uri }} style={s.photoImg} />
                  <TouchableOpacity
                    style={s.photoRemove}
                    onPress={() => { haptic.light(); setPhotoUris((p) => p.filter((_, idx) => idx !== i)); }}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar foto"
                  >
                    <X size={12} color={colors.white} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              ))}
              {photoUris.length < 5 && (
                <TouchableOpacity style={s.photoAdd} onPress={pickPhoto} activeOpacity={0.75}>
                  <Camera size={20} color={c.textMuted} strokeWidth={2} />
                  <Text style={s.photoAddText}>Agregar</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Descripción */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Descripción</Text>
            <TextInput
              style={inputStyle.multiline}
              value={description}
              onChangeText={setDescription}
              placeholder="Detalle del evento..."
              placeholderTextColor={c.textFaint}
              multiline
            />
          </View>

          {error ? <Text style={s.errorText}>{error}</Text> : null}
      </>
    </FormSheet>
  );
}

/* ─── Pantalla principal ─── */

export default function EventosScreen() {
  const { can, user } = useAuth();
  const filterTypeOptions = visibleTypeOptions(user?.role);
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const eventTypeColors = makeEventTypeColors(c);
  const { layout, typography } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { events, isLoading, isError, isFetchingMore, hasMore, loadMore, reset, refetch, total } = useAllEvents(
    filterType ? { type: filterType } : undefined,
  );
  const deleteEvent = useDeleteEvent();
  const canCreate = can('events', 'create');
  const canDelete = can('events', 'delete');

  useEffect(() => { reset(); }, [filterType]);

  const headerChrome = (
    <>
      <ScreenHeader
        scrollable
        showBack
        backTo={Routes.mas}
        title={total > 0 ? `Eventos (${total})` : 'Eventos'}
        right={canCreate ? (
          <HeaderButton label="+ Nuevo" onPress={() => { haptic.medium(); setShowCreate(true); }} />
        ) : undefined}
      />

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        style={{ maxHeight: 48 }}
      >
        {(['', ...filterTypeOptions] as string[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.filterChip, filterType === t && s.filterChipActive]}
            onPress={() => { haptic.selection(); setFilterType(t); }}
          >
            <Text style={[s.filterChipText, filterType === t && s.filterChipTextActive]}>
              {t === '' ? 'Todos' : eventTypeColors[t]?.label ?? t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Contador */}
      {total > 0 && (
        <Text style={s.counter}>{events.length} de {total}</Text>
      )}
    </>
  );

  return (
    <View style={[layout.screen, { paddingTop: insets.top }]}>

      {/* Lista */}
      {isError && events.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        >
          {headerChrome}
          <ErrorState onRetry={() => refetch()} />
        </ScrollView>
      ) : isLoading ? (
        <View>
          {headerChrome}
          <View style={{ paddingHorizontal: space[4], paddingTop: space[3], gap: space[2] }}>
            {[1,2,3,4,5].map((i) => <EventRowSkeleton key={i} />)}
          </View>
        </View>
      ) : !events.length ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        >
          {headerChrome}
          <EmptyState
            icon={filterType ? 'filter-outline' : 'document-text-outline'}
            title={filterType ? 'Sin eventos de este tipo' : 'Sin eventos registrados'}
            message={filterType
              ? `No hay eventos de "${eventTypeColors[filterType]?.label}". Probá con otro filtro.`
              : 'Los eventos registrados de salud, entrenamiento y gastos aparecerán aquí.'}
            actionLabel={canCreate && !filterType ? 'Crear primer evento' : undefined}
            onAction={() => { haptic.medium(); setShowCreate(true); }}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={s.list}
          ListHeaderComponent={headerChrome}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.border, marginLeft: space[4] }} />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)} style={{ paddingHorizontal: space[4] }}>
              <EventCard
                event={item}
                showHorse
                canEditMetrics={canCreate}
                onDelete={canDelete ? (id) => deleteEvent.mutate(id) : undefined}
              />
            </Animated.View>
          )}
          onEndReached={() => { if (hasMore) loadMore(); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingMore ? (
              <View style={s.footer}>
                <ActivityIndicator size="small" color={c.brand} />
              </View>
            ) : !hasMore && total > 0 ? (
              <View style={s.footer}>
                <Text style={typography.caption}>— {total} eventos en total —</Text>
              </View>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CreateEventModal visible={showCreate} onClose={() => setShowCreate(false)} c={c} s={s} />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[1],
  },
  newBtn: { backgroundColor: c.brand, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[2] },
  newBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  filterRow: { paddingHorizontal: space[4], paddingVertical: space[2], gap: space[2] },
  filterChip: {
    borderRadius: radius.full, paddingHorizontal: space[4], paddingVertical: space[1] + 2,
    backgroundColor: c.surfaceAlt,
  },
  filterChipActive: { backgroundColor: c.text },
  filterChipText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  filterChipTextActive: { color: c.surface },
  counter: { fontSize: text.xs, color: c.textFaint, paddingHorizontal: space[4], paddingBottom: space[1] },
  list: { paddingBottom: 120 },
  footer: { padding: space[5], alignItems: 'center' },
  // Modal form
  chip: {
    borderRadius: radius.full, paddingHorizontal: space[4], paddingVertical: space[2],
    backgroundColor: c.surfaceAlt,
  },
  chipActive: { backgroundColor: c.brand },
  chipText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  chipTextActive: { color: colors.white },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  typeBtn: {
    flex: 1, minWidth: '45%', borderRadius: radius.md,
    paddingVertical: space[2] + 2, alignItems: 'center', backgroundColor: c.surfaceAlt,
  },
  typeBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },
  errorText: { fontSize: text.sm, color: colors.red500 },
  currencyBtn: { borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[2], backgroundColor: c.surfaceAlt },
  currencyBtnActive: { backgroundColor: c.brand },
  currencyBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },
  currencyBtnTextActive: { color: colors.white },
  photoThumb: { width: 72, height: 72, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  photoAdd: { width: 72, height: 72, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.borderStrong, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 2, backgroundColor: c.surfaceAlt },
  photoAddText: { fontSize: 10, color: c.textFaint, fontWeight: weight.semibold },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: space[2], backgroundColor: c.surfaceAlt },
  categoryBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
});
