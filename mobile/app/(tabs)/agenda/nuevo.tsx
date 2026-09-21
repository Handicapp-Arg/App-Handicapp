import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Clock, Stethoscope, Hammer, Trophy, Bug, Syringe, Dumbbell, MoreHorizontal,
  Check, ChevronRight, Search,
  type LucideIcon,
} from 'lucide-react-native';
import { useCreateAppointment, APPOINTMENT_TYPES } from '../../../hooks/use-agenda';
import { useHorses } from '../../../hooks/use-horses';
import { DatePicker } from '../../../components/DatePicker';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { AppImage } from '../../../components/AppImage';
import { PressableScale } from '../../../components/PressableScale';
import { HorseshoeH } from '../../../components/icons/equine';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch, shadow, brandShadow } from '../../../styles/tokens';
import { hora } from '../../../lib/fechas';
import { useToast } from '../../../components/Toast';
import { BottomSheet } from '../../../components/BottomSheet';

/** Un ícono por tipo de turno: la grilla se elige de un vistazo, sin leer. */
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

/**
 * Hasta acá el carrusel de fotos es lo más rápido para elegir. Pasado este
 * número, arrastrar buscando una foto se vuelve peor que buscar por nombre.
 */
const TOPE_CARRUSEL = 6;

export default function NuevoTurnoScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: horses } = useHorses();
  const create = useCreateAppointment();
  const toast = useToast();

  const [horseId, setHorseId] = useState(horses?.[0]?.id ?? '');
  const [pickerCaballo, setPickerCaballo] = useState(false);
  const [buscaCaballo, setBuscaCaballo] = useState('');
  const caballoElegido = (horses ?? []).find((h) => h.id === horseId);
  const [type, setType] = useState('veterinario');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [timeDate, setTimeDate] = useState(() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [error, setError] = useState('');

  const timeStr = hora(timeDate.toISOString());

  useEffect(() => {
    if (!horseId && horses?.[0]?.id) setHorseId(horses[0].id);
  }, [horses]);

  const isDirty = !!title.trim() || !!date;
  // El título deja de ser obligatorio en la UI: si no se escribe nada, vale el
  // nombre del tipo elegido ("Veterinario"). El backend igual recibe un title.
  const canSubmit = !!horseId && !!date && !create.isPending;

  // Tras guardar con exito el back es programatico: el guardia no debe frenarlo.
  const guardadoRef = useRef(false);

  // Confirmar descarte solo si el formulario está sucio.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as never, (e: any) => {
      if (!isDirty || guardadoRef.current) return;
      e.preventDefault();
      Alert.alert('¿Descartar el turno?', 'Vas a perder lo que escribiste.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  const handleSubmit = async () => {
    if (!horseId || !date) { setError('Elegí el caballo y el día'); haptic.error(); return; }
    setError('');
    const dt = new Date(date + 'T12:00:00');
    dt.setHours(timeDate.getHours(), timeDate.getMinutes());
    const titulo = title.trim() || APPOINTMENT_TYPES[type]?.label || 'Turno';
    try {
      await create.mutateAsync({ horse_id: horseId, type, title: titulo, scheduled_at: dt.toISOString() });
      haptic.success();
      guardadoRef.current = true;
      toast.success('Turno agendado');
      router.back();
    } catch {
      haptic.error();
      setError('No se pudo agendar el turno. Intentá de nuevo.');
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Nuevo turno" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* ─── Para qué: grilla de tipos, la decisión que ordena todo lo demás ── */}
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

        {/* ─── Para qué caballo ───────────────────────────────────────────────
            Con pocos caballos se eligen por la foto, que es lo más rápido.
            Pasado ese número el carrusel obliga a arrastrar a ciegas buscando
            una foto, así que se cambia por una fila que abre una hoja con
            buscador: elegir entre veinte es un problema distinto al de elegir
            entre tres. */}
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
                {caballoElegido?.name ?? 'Elegí un caballo'}
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
                    <View>
                      {h.image_url ? (
                        <AppImage source={{ uri: h.image_url }} style={s.caballoFoto} />
                      ) : (
                        <View style={[s.caballoFoto, s.caballoFotoVacia]}>
                          <HorseshoeH size={26} color={c.textFaint} />
                        </View>
                      )}
                      {/* El check dice "es este" sin discutirle el color a la
                          foto; el borde duro competía con la imagen. */}
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

        {/* ─── Cuándo ─────────────────────────────────────────────────────────── */}
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

        {/* Campo libre, sin rótulo: el placeholder describe. Es opcional. */}
        <TextInput
          style={s.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Con quién o qué detalle (opcional)"
          placeholderTextColor={c.textFaint}
          returnKeyType="done"
        />

        {error ? <Text style={s.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Un solo CTA verde: el acento de la pantalla vive acá y en ningún otro lado. */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <PressableScale
          style={[s.submitBtn, !canSubmit && s.submitBtnOff]}
          disabled={!canSubmit}
          onPress={handleSubmit}
          accessibilityRole="button"
          accessibilityLabel="Guardar el turno"
        >
          {create.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.submitBtnText}>Guardar el turno</Text>
          }
        </PressableScale>
      </View>

      {/* Hoja de selección, solo para cuando hay muchos caballos. */}
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
  seccion: { gap: space[3] },
  rotulo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint },

  /* ─── Grilla de tipos ──────────────────────────────────────────────────── */
  grillaTipos: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] + 1 },
  tipo: {
    // Cuatro por fila: (100% - 3 gaps) / 4. El gap es 9, así que 25% menos ~7.
    width: '23%',
    height: 78, borderRadius: radius.button,
    alignItems: 'center', justifyContent: 'center', gap: space[1] + 3,
    paddingHorizontal: space[1],
    backgroundColor: c.surface,
    ...(c.isDark ? {} : shadow.sm),
  },
  // Selección invertida (negro), no verde: el verde es guardar.
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
  // Anillo verde y fino, no negro y grueso: el negro duro pegado a una foto se
  // lee como un error de recorte, y el grosor movía la tarjeta un pixel.
  caballoActivo: { borderWidth: 2, borderColor: c.brand, padding: space[2] },
  caballoCheck: {
    position: 'absolute', top: -5, right: -5,
    width: 22, height: 22, borderRadius: radius.full,
    backgroundColor: c.brand,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Fila selectora, para cuando hay demasiados caballos para un carrusel. */
  elegirCaballo: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: touch.field, paddingHorizontal: space[4],
    borderRadius: radius.field, backgroundColor: c.surfaceAlt,
  },
  elegirFoto: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: c.surface },
  elegirTexto: { flex: 1, fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  elegirPlaceholder: { fontWeight: weight.regular, color: c.textFaint },

  /* Hoja de selección */
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
