import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { AppImage } from '../../../components/AppImage';
import {
  X, Camera, Wheat, Syringe, Hammer, Activity, Wrench, Truck, Package,
  HeartPulse, Dumbbell, ClipboardList, Trophy, Receipt, StickyNote,
  type LucideIcon,
} from 'lucide-react-native';
import { useCreateEvent } from '../../../hooks/use-events';
import { useHorses } from '../../../hooks/use-horses';
import { useAuth } from '../../../lib/auth';
import { DatePicker } from '../../../components/DatePicker';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { ActionSheet, type Accion } from '../../../components/ActionSheet';
import { FilaSelector } from '../../../components/FilaSelector';
import { PressableScale } from '../../../components/PressableScale';
import { HorseshoeH } from '../../../components/icons/equine';
import { haptic } from '../../../lib/haptics';
import { CURRENCY_OPTIONS, type Currency } from '../../../lib/currency';
import { colors, makeEventTypeColors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch, shadow, brandShadow } from '../../../styles/tokens';
import { useToast } from '../../../components/Toast';

const TYPE_OPTIONS = ['salud', 'entrenamiento', 'tarea', 'carrera', 'gasto', 'nota'] as const;

const TYPE_ICONS: Record<string, LucideIcon> = {
  salud: HeartPulse,
  entrenamiento: Dumbbell,
  tarea: ClipboardList,
  carrera: Trophy,
  gasto: Receipt,
  nota: StickyNote,
};

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

const EXPENSE_CATEGORIES = [
  { value: 'alimentacion',  label: 'Alimento',      Icon: Wheat },
  { value: 'veterinario',   label: 'Veterinario',   Icon: Syringe },
  { value: 'herradero',     label: 'Herradero',     Icon: Hammer },
  { value: 'entrenamiento', label: 'Entrenamiento', Icon: Activity },
  { value: 'mantenimiento', label: 'Mantenimiento', Icon: Wrench },
  { value: 'transporte',    label: 'Transporte',    Icon: Truck },
  { value: 'otros',         label: 'Otros',         Icon: Package },
];

export default function NuevoEventoScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const eventTypeColors = makeEventTypeColors(c);
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
  const [sheet, setSheet] = useState<'categoria' | null>(null);

  // Si los caballos llegan después del primer render, preseleccionar el primero.
  useEffect(() => {
    if (!horseId && horses?.[0]?.id) setHorseId(horses[0].id);
  }, [horses]);

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

  const canSubmit = !!horseId && !!description.trim() && !createEvent.isPending;
  const isDirty = !!description.trim() || !!amount.trim() || photoUris.length > 0;

  // Tras guardar con exito el back es programatico: el guardia no debe frenarlo.
  const guardadoRef = useRef(false);

  // Intercepta salir (back del header, gesto o botón físico) y confirma solo
  // si hay formulario sucio.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as never, (e: any) => {
      if (!isDirty || guardadoRef.current) return;
      e.preventDefault();
      Alert.alert('¿Descartar cambios?', 'Vas a perder lo que escribiste.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  const handleSubmit = async () => {
    if (!horseId) { setError('Elegí un caballo'); haptic.error(); return; }
    if (!description.trim()) { setError('Contá qué pasó'); haptic.error(); return; }
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
      guardadoRef.current = true;
      toast.success('Evento creado');
      router.back();
    } catch {
      haptic.error();
      setError('No se pudo crear el evento. Intentá de nuevo.');
    }
  };

  const horseSel = horses?.find((h) => h.id === horseId);
  const catSel = EXPENSE_CATEGORIES.find((cat) => cat.value === expenseCategory);

  const accionesCategoria: Accion[] = EXPENSE_CATEGORIES.map((cat) => ({
    label: cat.label,
    Icon: cat.Icon,
    onPress: () => setExpenseCategory(cat.value),
  }));

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* El caballo elegido es el contexto de la pantalla: va de subtítulo. */}
      <ScreenHeader scrollable showBack title="Cargar algo" subtitle={horseSel?.name} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* ─── Qué pasó: la grilla es la primera decisión ─────────────────────── */}
        <View style={s.seccion}>
          <Text style={s.rotulo}>Qué pasó</Text>
          <View style={s.grillaTipos}>
            {typeOpts.map((t) => {
              const Icono = TYPE_ICONS[t] ?? StickyNote;
              const activo = type === t;
              return (
                <PressableScale
                  key={t}
                  style={[s.tipo, activo && s.tipoActivo]}
                  onPress={() => { haptic.selection(); setType(t); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={eventTypeColors[t]?.label ?? t}
                >
                  <Icono size={21} color={activo ? c.bg : c.textMuted} strokeWidth={1.9} />
                  <Text style={[s.tipoTexto, activo && s.tipoTextoActivo]} numberOfLines={1}>
                    {eventTypeColors[t]?.label ?? t}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* ─── Caballo: se elige por la foto, igual que en el turno nuevo ─────── */}
        <View style={s.seccion}>
          <Text style={s.rotulo}>De qué caballo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filaCaballos}>
            {(horses ?? []).map((h) => {
              const activo = horseId === h.id;
              return (
                <PressableScale
                  key={h.id}
                  style={[s.caballo, activo && s.caballoActivo]}
                  onPress={() => { haptic.selection(); setHorseId(h.id); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={h.name}
                >
                  {h.image_url ? (
                    <AppImage source={{ uri: h.image_url }} style={s.caballoFoto} />
                  ) : (
                    <View style={[s.caballoFoto, s.caballoFotoVacia]}>
                      <HorseshoeH size={26} color={c.textFaint} />
                    </View>
                  )}
                  <Text style={[s.caballoNombre, activo && s.caballoNombreActivo]} numberOfLines={1}>
                    {h.name}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>

        {/* El relato es el corazón del evento: campo grande, sin rótulo. */}
        <TextInput
          style={s.textarea}
          value={description}
          onChangeText={setDescription}
          placeholder="Contá qué pasó. Por ejemplo: comió todo, buen ánimo, salió al potrero temprano."
          placeholderTextColor={c.textFaint}
          multiline
          textAlignVertical="top"
        />

        <View style={s.seccion}>
          <Text style={s.rotulo}>Cuándo</Text>
          <DatePicker label="Día" value={date} onChange={setDate} />
        </View>

        {/* Monto y categoría: solo para gastos */}
        {type === 'gasto' && (
          <View style={s.seccion}>
            <Text style={s.rotulo}>Cuánto</Text>
            <View style={s.montoRow}>
              <View style={s.monedaToggle}>
                {CURRENCY_OPTIONS.map((opt) => (
                  <PressableScale
                    key={opt.value}
                    style={[s.monedaBtn, currency === opt.value && s.monedaBtnActiva]}
                    onPress={() => { haptic.selection(); setCurrency(opt.value); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: currency === opt.value }}
                    accessibilityLabel={`Moneda ${opt.label}`}
                  >
                    <Text style={[s.monedaText, currency === opt.value && s.monedaTextActiva]}>
                      {opt.label}
                    </Text>
                  </PressableScale>
                ))}
              </View>
              <TextInput
                style={s.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="Monto"
                placeholderTextColor={c.textFaint}
                keyboardType="decimal-pad"
              />
            </View>
            <FilaSelector
              primera
              label="Categoría"
              valor={catSel?.label}
              placeholder="Elegir"
              onPress={() => setSheet('categoria')}
            />
          </View>
        )}

        {/* Adjuntos: fila nativa; las miniaturas aparecen solo si hay fotos */}
        <View>
          <Pressable
            style={({ pressed }) => [s.fotosRow, pressed && { backgroundColor: c.surfaceAlt }]}
            onPress={() => { haptic.selection(); pickPhoto(); }}
            accessibilityRole="button"
            accessibilityLabel="Agregar fotos"
            disabled={photoUris.length >= 5}
          >
            <Camera size={20} color={c.textMuted} strokeWidth={1.8} />
            <Text style={s.fotosRowText}>Agregar fotos</Text>
            {photoUris.length > 0 && (
              <Text style={s.fotosRowCount}>{photoUris.length}/5</Text>
            )}
          </Pressable>
          {photoUris.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2], paddingTop: space[2] }}>
              {photoUris.map((uri, i) => (
                <View key={uri} style={s.photoThumb}>
                  <AppImage source={{ uri }} style={s.photoImg} />
                  <Pressable
                    style={s.photoRemove}
                    onPress={() => { haptic.light(); setPhotoUris((p) => p.filter((_, idx) => idx !== i)); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar foto"
                  >
                    <X size={12} color={colors.white} strokeWidth={2.5} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {error ? <Text style={s.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Un solo CTA: el verde vive acá y en ningún otro lado */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <PressableScale
          style={[s.submitBtn, !canSubmit && s.submitBtnOff]}
          disabled={!canSubmit}
          onPress={handleSubmit}
          accessibilityRole="button"
          accessibilityLabel="Cargar el evento"
        >
          {createEvent.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.submitBtnText}>Cargar</Text>
          }
        </PressableScale>
      </View>

      <ActionSheet
        visible={sheet === 'categoria'}
        onClose={() => setSheet(null)}
        title="Categoría del gasto"
        acciones={accionesCategoria}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4] + 2, paddingTop: space[2], paddingBottom: space[10], gap: space[6] },
  seccion: { gap: space[3] },
  rotulo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint },

  /* ─── Grilla de tipos ──────────────────────────────────────────────────── */
  grillaTipos: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] + 2 },
  tipo: {
    // Tres por fila: 33% menos el gap de 10.
    width: '31.5%',
    height: 84, borderRadius: radius.card,
    alignItems: 'center', justifyContent: 'center', gap: space[2],
    paddingHorizontal: space[1],
    backgroundColor: c.surface,
    ...(c.isDark ? {} : shadow.sm),
  },
  // Selección invertida (negro), no verde: el verde es guardar.
  tipoActivo: { backgroundColor: c.text },
  tipoTexto: { fontSize: text.sm - 1, fontWeight: weight.medium, color: c.textMuted },
  tipoTextoActivo: { color: c.bg, fontWeight: weight.semibold },

  /* ─── Caballos ─────────────────────────────────────────────────────────── */
  filaCaballos: { gap: space[2] + 2, paddingVertical: space[1] },
  caballo: {
    width: 108, borderRadius: radius.button, padding: space[2] + 2, gap: space[2],
    alignItems: 'center', backgroundColor: c.surface,
    ...(c.isDark ? {} : shadow.sm),
  },
  caballoActivo: { borderWidth: 2, borderColor: c.text, padding: space[2] },
  caballoFoto: { width: '100%', height: 58, borderRadius: radius.md + 2 },
  caballoFotoVacia: { backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  caballoNombre: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
  caballoNombreActivo: { color: c.text, fontWeight: weight.semibold },

  /* ─── Campos ───────────────────────────────────────────────────────────── */
  textarea: {
    minHeight: 132, borderRadius: radius.card,
    paddingHorizontal: space[4] + 2, paddingTop: space[4], paddingBottom: space[4],
    backgroundColor: c.surfaceAlt,
    fontSize: text.md, lineHeight: 24, color: c.text,
  },
  input: {
    flex: 1, height: touch.field, borderRadius: radius.field,
    paddingHorizontal: space[4], backgroundColor: c.surfaceAlt,
    fontSize: text.md, color: c.text,
  },
  montoRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  monedaToggle: { flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.field, padding: 3 },
  monedaBtn: { paddingHorizontal: space[3], paddingVertical: space[2] + 2, borderRadius: radius.field - 3 },
  monedaBtnActiva: { backgroundColor: c.surface },
  monedaText: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
  monedaTextActiva: { color: c.text },
  errorText: { fontSize: text.sm, color: c.danger },

  /* ─── Fotos ────────────────────────────────────────────────────────────── */
  photoThumb: { width: 72, height: 72, borderRadius: radius.thumb, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: radius.full,
    backgroundColor: c.overlay, justifyContent: 'center', alignItems: 'center',
  },
  fotosRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: touch.min + 6,
  },
  fotosRowText: { flex: 1, fontSize: text.md, color: c.text },
  fotosRowCount: { fontSize: text.sm, color: c.textFaint },

  footer: { paddingHorizontal: space[4] + 2, paddingTop: space[3] },
  submitBtn: {
    height: touch.button, borderRadius: radius.button,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.brand,
    ...(c.isDark ? {} : brandShadow(c.brand)),
  },
  submitBtnOff: { opacity: 0.45 },
  submitBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: colors.white, letterSpacing: -0.2 },
});
