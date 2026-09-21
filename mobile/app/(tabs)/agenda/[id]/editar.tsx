import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Clock, Stethoscope, Hammer, Trophy, Bug, Syringe, Dumbbell, MoreHorizontal,
  Check, ChevronRight, Search,
  type LucideIcon,
} from 'lucide-react-native';
import {
  useAppointment, useUpdateAppointment, APPOINTMENT_TYPES, AVISOS, AVISO_DEFAULT,
} from '../../../../hooks/use-agenda';
import { useHorses } from '../../../../hooks/use-horses';
import { DatePicker } from '../../../../components/DatePicker';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { AppImage } from '../../../../components/AppImage';
import { PressableScale } from '../../../../components/PressableScale';
import { Skeleton } from '../../../../components/Skeleton';
import { ErrorState } from '../../../../components/ErrorState';
import { HorseshoeH } from '../../../../components/icons/equine';
import { haptic } from '../../../../lib/haptics';
import { colors } from '../../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch, shadow, brandShadow } from '../../../../styles/tokens';
import { hora } from '../../../../lib/fechas';
import { useToast } from '../../../../components/Toast';
import { BottomSheet } from '../../../../components/BottomSheet';

/** Mismo mapa que el alta: la grilla se elige de un vistazo, sin leer. */
const ICONO_TIPO: Record<string, LucideIcon> = {
  veterinario: Stethoscope,
  herrador: Hammer,
  competencia: Trophy,
  desparasitacion: Bug,
  vacuna: Syringe,
  entrenamiento: Dumbbell,
  otro: MoreHorizontal,
};

const TIPOS = Object.keys(APPOINTMENT_TYPES);

/** Igual que en el alta: pasado este número el carrusel se vuelve incómodo. */
const TOPE_CARRUSEL = 6;

/** 'YYYY-MM-DD' en hora LOCAL. `toISOString()` daría UTC y correría el día. */
const aDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function EditarTurnoScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: horses } = useHorses();
  const { data: turno, isLoading, isError, refetch } = useAppointment(id);
  const update = useUpdateAppointment();
  const toast = useToast();

  const [horseId, setHorseId] = useState('');
  const [pickerCaballo, setPickerCaballo] = useState(false);
  const [buscaCaballo, setBuscaCaballo] = useState('');
  const caballoElegido = (horses ?? []).find((h) => h.id === horseId);
  const [type, setType] = useState('veterinario');
  const [title, setTitle] = useState('');
  const [professional, setProfessional] = useState('');
  const [aviso, setAviso] = useState<number | null>(AVISO_DEFAULT);
  const [date, setDate] = useState('');
  const [timeDate, setTimeDate] = useState(() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [error, setError] = useState('');
  const [precargado, setPrecargado] = useState(false);

  const timeStr = hora(timeDate.toISOString());

  // Precargar una sola vez: si se repitiera con cada refetch, pisaría lo que el
  // usuario está tipeando en el momento en que vuelve la consulta de fondo.
  useEffect(() => {
    if (!turno || precargado) return;
    const cuando = new Date(turno.scheduled_at);
    setHorseId(turno.horse_id);
    setType(turno.type);
    setTitle(turno.title);
    setProfessional(turno.professional ?? '');
    // `undefined` es "el backend no mandó el campo" (turno viejo): vale el
    // default. `null` sí es una elección del usuario: no avisar.
    setAviso(turno.remind_hours_before === undefined ? AVISO_DEFAULT : turno.remind_hours_before);
    setDate(aDia(cuando));
    setTimeDate(cuando);
    setPrecargado(true);
  }, [turno, precargado]);

  /** La fecha+hora armada con lo que hay en el formulario. */
  const fechaArmada = useMemo(() => {
    if (!date) return null;
    const dt = new Date(date + 'T12:00:00');
    dt.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);
    return dt;
  }, [date, timeDate]);

  const isDirty = !!turno && precargado && (
    horseId !== turno.horse_id ||
    type !== turno.type ||
    title !== turno.title ||
    professional !== (turno.professional ?? '') ||
    aviso !== (turno.remind_hours_before === undefined ? AVISO_DEFAULT : turno.remind_hours_before) ||
    (!!fechaArmada && fechaArmada.getTime() !== new Date(turno.scheduled_at).getTime())
  );

  const canSubmit = !!horseId && !!date && isDirty && !update.isPending;

  // Tras guardar salimos con back: el guardia de descarte no debe frenarlo.
  const guardadoRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as never, (e: any) => {
      if (!isDirty || guardadoRef.current) return;
      e.preventDefault();
      Alert.alert('¿Descartar los cambios?', 'Vas a perder lo que editaste.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  const handleSubmit = async () => {
    if (!id || !horseId || !fechaArmada) { setError('Elegí el caballo y el día'); haptic.error(); return; }
    setError('');
    const titulo = title.trim() || APPOINTMENT_TYPES[type]?.label || 'Turno';
    try {
      // Se manda el turno completo, no un diff: son seis campos y el backend
      // aplica solo lo que llega. Calcular el diff acá agregaba una fuente de
      // errores sin ahorrar nada medible.
      await update.mutateAsync({
        id,
        horse_id: horseId,
        type,
        title: titulo,
        scheduled_at: fechaArmada.toISOString(),
        professional: professional.trim() || null,
        remind_hours_before: aviso,
      });
      haptic.success();
      guardadoRef.current = true;
      toast.success('Turno actualizado');
      router.back();
    } catch {
      haptic.error();
      setError('No se pudo guardar el turno. Intentá de nuevo.');
    }
  };

  if (isError && !turno) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader showBack title="Editar turno" />
        <ErrorState onRetry={() => refetch()} />
      </View>
    );
  }

  if (isLoading && !turno) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader showBack title="Editar turno" />
        {/* Misma silueta que el formulario real: grilla, carrusel y dos filas. */}
        <View style={s.esqueleto}>
          <Skeleton height={17} width="35%" />
          <Skeleton height={78} borderRadius={radius.button} />
          <Skeleton height={17} width="45%" />
          <Skeleton height={96} borderRadius={radius.button} />
          <Skeleton height={touch.field} borderRadius={radius.field} />
          <Skeleton height={touch.field} borderRadius={radius.field} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Editar turno" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* ─── Para qué ───────────────────────────────────────────────────── */}
        <View style={s.seccion}>
          <Text style={s.rotulo}>Para qué</Text>
          <View style={s.grillaTipos}>
            {TIPOS.map((t) => {
              const Icono = ICONO_TIPO[t] ?? MoreHorizontal;
              const activo = type === t;
              return (
                <PressableScale
                  key={t}
                  style={[s.tipo, activo && s.tipoActivo]}
                  onPress={() => { haptic.selection(); setType(t); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={APPOINTMENT_TYPES[t].label}
                >
                  <Icono size={21} color={activo ? c.bg : c.textMuted} strokeWidth={1.9} />
                  <Text style={[s.tipoTexto, activo && s.tipoTextoActivo]} numberOfLines={1}>
                    {APPOINTMENT_TYPES[t].label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* ─── Para qué caballo ───────────────────────────────────────────── */}
        <View style={s.seccion}>
          <Text style={s.rotulo}>Para qué caballo</Text>

          {(horses ?? []).length > TOPE_CARRUSEL ? (
            <PressableScale
              style={s.elegirCaballo}
              onPress={() => { haptic.selection(); setPickerCaballo(true); }}
              accessibilityRole="button"
              accessibilityLabel="Elegir el caballo"
            >
              {caballoElegido?.image_url ? (
                <AppImage source={{ uri: caballoElegido.image_url }} style={s.elegirFoto} />
              ) : (
                <View style={[s.elegirFoto, s.caballoFotoVacia]}>
                  <HorseshoeH size={20} color={c.textFaint} />
                </View>
              )}
              <Text style={[s.elegirTexto, !caballoElegido && s.elegirPlaceholder]} numberOfLines={1}>
                {caballoElegido?.name ?? turno?.horse?.name ?? 'Elegí un caballo'}
              </Text>
              <ChevronRight size={18} color={c.textFaint} strokeWidth={2.2} />
            </PressableScale>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filaCaballos}
            >
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
                    <View style={s.caballoFotoWrap}>
                      {h.image_url ? (
                        <AppImage source={{ uri: h.image_url }} style={s.caballoFoto} />
                      ) : (
                        <View style={[s.caballoFoto, s.caballoFotoVacia]}>
                          <HorseshoeH size={26} color={c.textFaint} />
                        </View>
                      )}
                      {activo && (
                        <View style={s.caballoCheck}>
                          <Check size={13} color={colors.white} strokeWidth={3} />
                        </View>
                      )}
                    </View>
                    <Text style={[s.caballoNombre, activo && s.caballoNombreActivo]} numberOfLines={1}>
                      {h.name}
                    </Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ─── Cuándo ─────────────────────────────────────────────────────── */}
        <View style={s.seccion}>
          <Text style={s.rotulo}>Cuándo</Text>
          <DatePicker label="Día" value={date} onChange={setDate} />

          <PressableScale
            onPress={() => { haptic.selection(); setShowTimePicker(true); }}
            style={s.horaBtn}
            accessibilityRole="button"
            accessibilityLabel={`Hora: ${timeStr}`}
          >
            <Text style={s.horaLabel}>Hora</Text>
            <Text style={s.horaValor}>{timeStr}</Text>
            <Clock size={18} color={c.textFaint} strokeWidth={1.8} />
          </PressableScale>

          {showTimePicker && (
            <DateTimePicker
              value={timeDate}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selected) setTimeDate(selected);
              }}
            />
          )}
        </View>

        {/* ─── Aviso previo ───────────────────────────────────────────────── */}
        <View style={s.seccion}>
          <Text style={s.rotulo}>Avisarme</Text>
          <View style={s.filaAvisos}>
            {AVISOS.map((a) => {
              const activo = aviso === a.horas;
              return (
                <PressableScale
                  key={a.label}
                  style={[s.aviso, activo && s.avisoActivo]}
                  onPress={() => { haptic.selection(); setAviso(a.horas); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={a.label}
                >
                  <Text style={[s.avisoTexto, activo && s.avisoTextoActivo]} numberOfLines={1}>
                    {a.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        <TextInput
          style={s.input}
          value={professional}
          onChangeText={setProfessional}
          placeholder="Quién atiende (opcional)"
          placeholderTextColor={c.textFaint}
          returnKeyType="done"
          maxLength={120}
        />

        <TextInput
          style={s.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Qué detalle (opcional)"
          placeholderTextColor={c.textFaint}
          returnKeyType="done"
        />

        {error ? <Text style={s.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <PressableScale
          style={[s.submitBtn, !canSubmit && s.submitBtnOff]}
          disabled={!canSubmit}
          onPress={handleSubmit}
          accessibilityRole="button"
          accessibilityLabel="Guardar los cambios"
        >
          {update.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.submitBtnText}>Guardar los cambios</Text>
          }
        </PressableScale>
      </View>

      <BottomSheet
        visible={pickerCaballo}
        onClose={() => { setPickerCaballo(false); setBuscaCaballo(''); }}
        title="Elegí el caballo"
      >
        <View style={s.buscador}>
          <Search size={18} color={c.textFaint} strokeWidth={1.9} />
          <TextInput
            style={s.buscadorInput}
            value={buscaCaballo}
            onChangeText={setBuscaCaballo}
            placeholder="Buscar por nombre"
            placeholderTextColor={c.textFaint}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        <ScrollView style={s.pickerLista} keyboardShouldPersistTaps="handled">
          {(horses ?? [])
            .filter((h) => h.name.toLowerCase().includes(buscaCaballo.trim().toLowerCase()))
            .map((h) => {
              const activo = horseId === h.id;
              return (
                <PressableScale
                  key={h.id}
                  style={s.pickerFila}
                  onPress={() => {
                    haptic.selection();
                    setHorseId(h.id);
                    setPickerCaballo(false);
                    setBuscaCaballo('');
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={h.name}
                >
                  {h.image_url ? (
                    <AppImage source={{ uri: h.image_url }} style={s.pickerFoto} />
                  ) : (
                    <View style={[s.pickerFoto, s.caballoFotoVacia]}>
                      <HorseshoeH size={20} color={c.textFaint} />
                    </View>
                  )}
                  <Text style={s.pickerNombre} numberOfLines={1}>{h.name}</Text>
                  {activo && <Check size={19} color={c.brand} strokeWidth={2.6} />}
                </PressableScale>
              );
            })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4] + 2, paddingTop: space[2], paddingBottom: space[10], gap: space[6] },
  esqueleto: { paddingHorizontal: space[4] + 2, paddingTop: space[3], gap: space[4] },
  seccion: { gap: space[3] },
  rotulo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint },

  /* ─── Grilla de tipos ──────────────────────────────────────────────────── */
  grillaTipos: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] + 1 },
  tipo: {
    width: '23%',
    height: 78, borderRadius: radius.button,
    alignItems: 'center', justifyContent: 'center', gap: space[1] + 3,
    paddingHorizontal: space[1],
    backgroundColor: c.surface,
    ...(c.isDark ? {} : shadow.sm),
  },
  tipoActivo: { backgroundColor: c.text },
  tipoTexto: { fontSize: text.xs, fontWeight: weight.medium, color: c.textMuted },
  tipoTextoActivo: { color: c.bg, fontWeight: weight.semibold },

  /* ─── Caballos ─────────────────────────────────────────────────────────── */
  filaCaballos: { gap: space[2] + 2, paddingVertical: space[1] },
  caballo: {
    width: 108, borderRadius: radius.button, padding: space[2] + 2, gap: space[2],
    alignItems: 'center', backgroundColor: c.surface,
    ...(c.isDark ? {} : shadow.sm),
  },
  caballoActivo: { borderWidth: 2, borderColor: c.brand, padding: space[2] },
  caballoCheck: {
    position: 'absolute', top: -5, right: -5,
    width: 22, height: 22, borderRadius: radius.full,
    backgroundColor: c.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  elegirCaballo: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: touch.field, paddingHorizontal: space[4],
    borderRadius: radius.field, backgroundColor: c.surfaceAlt,
  },
  elegirFoto: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: c.surface },
  elegirTexto: { flex: 1, fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  elegirPlaceholder: { fontWeight: weight.regular, color: c.textFaint },

  buscador: {
    flexDirection: 'row', alignItems: 'center', gap: space[2] + 2,
    height: touch.min, borderRadius: radius.field,
    backgroundColor: c.surfaceAlt, paddingHorizontal: space[4],
    marginBottom: space[2],
  },
  buscadorInput: { flex: 1, fontSize: text.base, color: c.text, padding: 0 },
  pickerLista: { maxHeight: 340 },
  pickerFila: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingVertical: space[2] + 2,
  },
  pickerFoto: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.surfaceAlt },
  pickerNombre: { flex: 1, fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  caballoFotoWrap: { alignSelf: 'stretch' },
  caballoFoto: { width: '100%', height: 58, borderRadius: radius.md + 2 },
  caballoFotoVacia: { backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  caballoNombre: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
  caballoNombreActivo: { color: c.text, fontWeight: weight.semibold },

  /* ─── Hora ─────────────────────────────────────────────────────────────── */
  horaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: touch.field, borderRadius: radius.field,
    paddingHorizontal: space[4], backgroundColor: c.surfaceAlt,
  },
  horaLabel: { flex: 1, fontSize: text.base, color: c.textMuted },
  horaValor: { fontSize: text.base, fontWeight: weight.semibold, color: c.text, fontVariant: ['tabular-nums'] },

  /* ─── Aviso previo ─────────────────────────────────────────────────────── */
  filaAvisos: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  aviso: {
    paddingHorizontal: space[4], height: touch.min,
    borderRadius: radius.field, justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
  },
  avisoActivo: { backgroundColor: c.text },
  avisoTexto: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
  avisoTextoActivo: { color: c.bg, fontWeight: weight.semibold },

  input: {
    height: touch.field, borderRadius: radius.field,
    paddingHorizontal: space[4], backgroundColor: c.surfaceAlt,
    fontSize: text.md, color: c.text,
  },
  errorText: { fontSize: text.sm, color: c.danger },

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
