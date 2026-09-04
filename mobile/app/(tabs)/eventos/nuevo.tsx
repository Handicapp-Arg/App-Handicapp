import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { AppImage } from '../../../components/AppImage';
import { X, Camera, Wheat, Syringe, Hammer, Activity, Wrench, Truck, Package } from 'lucide-react-native';
import { useCreateEvent } from '../../../hooks/use-events';
import { useHorses } from '../../../hooks/use-horses';
import { useAuth } from '../../../lib/auth';
import { DatePicker } from '../../../components/DatePicker';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { haptic } from '../../../lib/haptics';
import { CURRENCY_OPTIONS, type Currency } from '../../../lib/currency';
import { colors, makeEventTypeColors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../styles/tokens';
import { useCommonStyles } from '../../../styles/common';
import { useToast } from '../../../components/Toast';

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

export default function NuevoEventoScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { c } = useTheme();
  const { typography, input: inputStyle } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
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

  // Intercepta salir (back del header, gesto o botón físico) y confirma solo
  // si hay formulario sucio.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as never, (e: any) => {
      if (!isDirty) return;
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
      toast.success('Evento creado');
      router.back();
    } catch {
      haptic.error();
      setError('No se pudo crear el evento. Intentá de nuevo.');
    }
  };

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
        {/* Caballo */}
        <View style={s.section}>
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
        <View style={s.section}>
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
        <View style={s.section}>
          <DatePicker label="Fecha" value={date} onChange={setDate} />
        </View>

        {/* Gasto: aparece debajo cuando el tipo lo requiere — en pantalla completa
            el condicional respira, no hace falta partirlo en dos pantallas. */}
        {type === 'gasto' && (
          <>
            <View style={s.section}>
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
            <View style={s.section}>
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
        <View style={s.section}>
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
        <View style={s.section}>
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
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => router.back()}>
          <Text style={s.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.submitBtn, { flex: 1 }, !canSubmit && { opacity: 0.5 }]}
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
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[8], gap: space[5] },
  section: { gap: space[2] },
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
  footer: { flexDirection: 'row', gap: space[3], paddingHorizontal: space[4], paddingTop: space[3], borderTopWidth: 1, borderTopColor: c.border },
  cancelBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.surfaceAlt, alignItems: 'center' },
  cancelBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: c.textMuted },
  submitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.brand, alignItems: 'center' },
  submitBtnText: { fontSize: text.md, fontWeight: weight.extrabold, color: colors.white },
});
