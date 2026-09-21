import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { AppImage } from '../../../components/AppImage';
import {
  X, Camera, Wheat, Syringe, Hammer, Activity, Wrench, Truck, Package,
  HeartPulse, Dumbbell, ClipboardList, Trophy, Receipt, StickyNote,
} from 'lucide-react-native';
import { useCreateEvent } from '../../../hooks/use-events';
import { useHorses } from '../../../hooks/use-horses';
import { useAuth } from '../../../lib/auth';
import { DatePicker } from '../../../components/DatePicker';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { ActionSheet, type Accion } from '../../../components/ActionSheet';
import { FilaSelector } from '../../../components/FilaSelector';
import { haptic } from '../../../lib/haptics';
import { CURRENCY_OPTIONS, type Currency } from '../../../lib/currency';
import { colors, makeEventTypeColors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../styles/tokens';
import { useCommonStyles } from '../../../styles/common';
import { useToast } from '../../../components/Toast';

const TYPE_OPTIONS = ['salud', 'entrenamiento', 'tarea', 'carrera', 'gasto', 'nota'] as const;

const TYPE_ICONS: Record<string, typeof HeartPulse> = {
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
  const { input: inputStyle } = useCommonStyles();
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
  const [sheet, setSheet] = useState<'caballo' | 'tipo' | 'categoria' | null>(null);

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

  const accionesCaballo: Accion[] = (horses ?? []).map((h) => ({
    label: h.name,
    onPress: () => setHorseId(h.id),
  }));
  const accionesTipo: Accion[] = typeOpts.map((t) => ({
    label: eventTypeColors[t]?.label ?? t,
    Icon: TYPE_ICONS[t],
    onPress: () => setType(t),
  }));
  const accionesCategoria: Accion[] = EXPENSE_CATEGORIES.map((cat) => ({
    label: cat.label,
    Icon: cat.Icon,
    onPress: () => setExpenseCategory(cat.value),
  }));

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Nuevo evento" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Filas de selección, patrón Ajustes de iOS */}
        <View style={s.selGrupo}>
          <FilaSelector
            primera
            label="Caballo"
            valor={horseSel?.name}
            placeholder="Elegir"
            onPress={() => setSheet('caballo')}
          />
          <FilaSelector
            label="Tipo"
            valor={eventTypeColors[type]?.label ?? type}
            placeholder="Elegir"
            onPress={() => setSheet('tipo')}
          />
          {type === 'gasto' && (
            <FilaSelector
              label="Categoría"
              valor={catSel?.label}
              placeholder="Elegir"
              onPress={() => setSheet('categoria')}
            />
          )}
        </View>

        <DatePicker label="Fecha" value={date} onChange={setDate} />

        {/* Monto: solo para gastos */}
        {type === 'gasto' && (
          <View style={s.montoRow}>
            <View style={s.monedaToggle}>
              {CURRENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.monedaBtn, currency === opt.value && s.monedaBtnActiva]}
                  onPress={() => { haptic.selection(); setCurrency(opt.value); }}
                  activeOpacity={0.75}
                >
                  <Text style={[s.monedaText, currency === opt.value && s.monedaTextActiva]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[inputStyle.base, { flex: 1 }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="Monto"
              placeholderTextColor={c.textFaint}
              keyboardType="decimal-pad"
            />
          </View>
        )}

        {/* Descripción al final, como notas de un evento de Calendario */}
        <TextInput
          style={[inputStyle.multiline, s.descInput]}
          value={description}
          onChangeText={setDescription}
          placeholder="¿Qué pasó?"
          placeholderTextColor={c.textFaint}
          multiline
        />

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
            </ScrollView>
          )}
        </View>

        {error ? <Text style={s.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Un solo CTA: el cuero vive acá y en ningún otro lado */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          {createEvent.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.submitBtnText}>Crear evento</Text>
          }
        </TouchableOpacity>
      </View>

      <ActionSheet
        visible={sheet === 'caballo'}
        onClose={() => setSheet(null)}
        title="Caballo"
        acciones={accionesCaballo}
      />
      <ActionSheet
        visible={sheet === 'tipo'}
        onClose={() => setSheet(null)}
        title="Tipo de evento"
        acciones={accionesTipo}
      />
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
  body: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[8], gap: space[5] },
  descInput: { minHeight: 96 },
  selGrupo: { },
  montoRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  monedaToggle: {
    flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 3,
  },
  monedaBtn: { paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.md - 3 },
  monedaBtnActiva: { backgroundColor: c.surface },
  monedaText: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
  monedaTextActiva: { color: c.text },
  errorText: { fontSize: text.sm, color: c.danger },
  photoThumb: { width: 72, height: 72, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  fotosRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: touch.min + 6,
  },
  fotosRowText: { flex: 1, fontSize: text.md, color: c.text },
  fotosRowCount: { fontSize: text.sm, color: c.textFaint },
  footer: { paddingHorizontal: space[4], paddingTop: space[3] },
  submitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.lg, backgroundColor: c.brand, alignItems: 'center' },
  submitBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: colors.white },
});
