import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Check, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useHorse } from '../../hooks/use-horses';
import { useRoutine, useUpsertRoutine, todayISO, type Routine } from '../../hooks/use-routines';
import { useCreateEvent } from '../../hooks/use-events';
import { useUploadActivityPhoto } from '../../hooks/use-activity-photos';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { PressableScale } from '../../components/PressableScale';
import { useToast } from '../../components/Toast';
import { space, weight, radius, shadow } from '../../styles/tokens';
import { fontFamily } from '../../styles/fonts';
import { BottomSheet } from '../../components/BottomSheet';
import { AppImage } from '../../components/AppImage';

/** Campo de comida según la hora del día. */
function feedFieldForNow(): 'morning_feed' | 'afternoon_feed' | 'evening_feed' {
  const h = new Date().getHours();
  if (h < 12) return 'morning_feed';
  if (h < 18) return 'afternoon_feed';
  return 'evening_feed';
}

type RoutineField = keyof Pick<Routine, 'morning_feed' | 'afternoon_feed' | 'evening_feed' | 'water_ok' | 'box_cleaned' | 'paddock' | 'groomed'>;

const RAZONES = ['Está rengo', 'Tiene una herida', 'No comió', 'Otra cosa'];

export default function PeonHorse() {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const horseId = String(id);

  const today = todayISO();
  const { data: horse } = useHorse(horseId);
  const { data: routine } = useRoutine(horseId, today);
  const upsert = useUpsertRoutine(horseId);
  const createEvent = useCreateEvent();
  const uploadPhoto = useUploadActivityPhoto(horseId);

  const [rareOpen, setRareOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');

  const feedField = feedFieldForNow();

  const markRoutine = (field: RoutineField, doneLabel: string) => {
    // Ya está hecho: no re-disparar el mutate ni el toast (evita re-tap accidental).
    if (routine?.[field]) return;
    haptic.success();
    upsert.mutate(
      { date: today, [field]: true } as Partial<Routine> & { date: string },
      {
        onSuccess: () => toast.success(doneLabel),
        onError: () => { haptic.error(); toast.error('No se pudo guardar. Probá de nuevo.'); },
      },
    );
  };

  const reportRare = (razon: string) => {
    setRareOpen(false);
    haptic.medium();
    createEvent.mutate(
      { type: 'aviso', description: razon, date: today, horse_id: horseId },
      {
        onSuccess: () => { haptic.success(); toast.success('Listo, avisamos al encargado'); },
        onError: () => { haptic.error(); toast.error('No se pudo avisar. Probá de nuevo.'); },
      },
    );
  };

  const saveNote = () => {
    const txt = noteText.trim();
    if (!txt) { setNoteOpen(false); return; }
    setNoteOpen(false);
    haptic.success();
    upsert.mutate(
      { date: today, observations: txt },
      {
        onSuccess: () => { toast.success('Nota guardada'); setNoteText(''); },
        onError: () => { haptic.error(); toast.error('No se pudo guardar. Probá de nuevo.'); },
      },
    );
  };

  // Sacar una foto de la tarea: la hora la estampa el servidor (no manipulable).
  const takePhoto = async () => {
    haptic.light();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { toast.error('Necesitamos permiso para usar la cámara'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    toast.info('Subiendo foto…');
    try {
      await uploadPhoto.mutateAsync({ uri: res.assets[0].uri, activity_type: 'otro' });
      haptic.success();
      toast.success('Foto guardada con la hora');
    } catch {
      haptic.error();
      toast.error('No se pudo subir la foto. Probá de nuevo.');
    }
  };

  const buttons: { emoji: string; label: string; done: boolean; onPress: () => void }[] = [
    { emoji: '🌾', label: 'Comida', done: !!routine?.[feedField], onPress: () => markRoutine(feedField, 'Comida anotada') },
    { emoji: '💧', label: 'Agua', done: !!routine?.water_ok, onPress: () => markRoutine('water_ok', 'Agua anotada') },
    { emoji: '🧹', label: 'Limpié el box', done: !!routine?.box_cleaned, onPress: () => markRoutine('box_cleaned', 'Box limpio anotado') },
    { emoji: '🐎', label: 'Lo saqué', done: !!routine?.paddock, onPress: () => markRoutine('paddock', 'Paseo anotado') },
    { emoji: '🧽', label: 'Cepillado', done: !!routine?.groomed, onPress: () => markRoutine('groomed', 'Cepillado anotado') },
    { emoji: '⚠️', label: 'Algo raro', done: false, onPress: () => { haptic.light(); setRareOpen(true); } },
    { emoji: '📝', label: 'Nota', done: !!routine?.observations, onPress: () => { haptic.light(); setNoteText(routine?.observations ?? ''); setNoteOpen(true); } },
  ];

  return (
    <View style={[s.screen, { paddingTop: insets.top + space[3] }]}>
      {/* Header */}
      <View style={s.header}>
        <PressableScale
          style={s.backBtn}
          scaleTo={0.92}
          onPress={() => { haptic.light(); router.back(); }}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
        >
          <ChevronLeft size={34} color={c.text} strokeWidth={2.6} />
        </PressableScale>
        {horse?.image_url ? (
          <AppImage source={{ uri: horse.image_url }} style={s.photo} />
        ) : (
          <View style={[s.photo, s.photoPlaceholder]}>
            <Text style={s.photoInitial} allowFontScaling={false}>{horse?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <Text style={s.horseName} numberOfLines={1}>{horse?.name ?? '...'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.grid, { paddingBottom: insets.bottom + space[6] }]}
        showsVerticalScrollIndicator={false}
      >
        <PressableScale
          style={s.photoBtn}
          scaleTo={0.96}
          onPress={takePhoto}
          disabled={uploadPhoto.isPending}
          accessibilityRole="button"
          accessibilityLabel="Sacar foto de la tarea"
        >
          {uploadPhoto.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Camera size={30} color={colors.white} strokeWidth={2.4} />
              <Text style={s.photoBtnText} numberOfLines={1}>Sacar foto de la tarea</Text>
            </>
          )}
        </PressableScale>
        {buttons.map((b) => (
          <PressableScale
            key={b.label}
            style={[s.btn, b.done && { backgroundColor: c.success }]}
            scaleTo={0.95}
            onPress={b.onPress}
            accessibilityRole="button"
            accessibilityLabel={b.done ? `${b.label}, hecho` : b.label}
          >
            {b.done && (
              <View style={s.checkBadge}>
                <Check size={20} color={c.success} strokeWidth={3.5} />
              </View>
            )}
            <Text style={s.btnEmoji} allowFontScaling={false}>{b.emoji}</Text>
            <Text style={[s.btnLabel, b.done && { color: colors.white }]} numberOfLines={2}>{b.label}</Text>
          </PressableScale>
        ))}
      </ScrollView>

      <BottomSheet visible={rareOpen} onClose={() => setRareOpen(false)} title="¿Qué pasó?">
        {RAZONES.map((r) => (
          <PressableScale
            key={r}
            style={s.reasonBtn}
            scaleTo={0.97}
            onPress={() => reportRare(r)}
            accessibilityRole="button"
            accessibilityLabel={r}
          >
            <Text style={s.reasonText}>{r}</Text>
          </PressableScale>
        ))}
      </BottomSheet>

      <BottomSheet visible={noteOpen} onClose={() => setNoteOpen(false)} title="Escribí una nota" avoidKeyboard>
        <TextInput
          style={s.noteInput}
          value={noteText}
          onChangeText={setNoteText}
          placeholder="Escribí acá..."
          placeholderTextColor={c.textFaint}
          multiline
          autoFocus
          textAlignVertical="top"
        />
        <PressableScale
          style={s.saveBtn}
          scaleTo={0.97}
          onPress={saveNote}
          disabled={upsert.isPending}
          accessibilityRole="button"
          accessibilityLabel="Guardar nota"
        >
          {upsert.isPending
            ? <ActivityIndicator color={colors.white} />
            : <Text style={s.saveText}>Guardar</Text>}
        </PressableScale>
      </BottomSheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  header: {
    alignItems: 'center',
    paddingHorizontal: space[5],
    paddingBottom: space[4],
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: c.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space[3],
  },
  photo: { width: 110, height: 110, borderRadius: radius.full, backgroundColor: c.surfaceAlt },
  photoPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: c.brand },
  photoInitial: { fontSize: 52, fontFamily: fontFamily.extrabold, fontWeight: weight.extrabold, color: colors.white },
  horseName: {
    marginTop: space[3],
    fontSize: 32,
    fontFamily: fontFamily.extrabold,
    fontWeight: weight.extrabold,
    color: c.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    gap: space[3],
  },
  btn: {
    width: '47.5%',
    minHeight: 118,
    borderRadius: radius.xl,
    backgroundColor: c.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space[3],
    ...(c.isDark ? {} : shadow.sm),
  },
  checkBadge: {
    position: 'absolute',
    top: space[2],
    right: space[2],
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBtn: {
    width: '100%',
    minHeight: 76,
    flexDirection: 'row',
    gap: space[3],
    borderRadius: radius.xl,
    backgroundColor: c.brand,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space[4],
    marginBottom: space[1],
    ...shadow.md,
  },
  photoBtnText: {
    fontSize: 21,
    fontFamily: fontFamily.extrabold,
    fontWeight: weight.extrabold,
    color: colors.white,
  },
  btnEmoji: { fontSize: 42, marginBottom: space[2] },
  btnLabel: {
    fontSize: 19,
    fontFamily: fontFamily.bold,
    fontWeight: weight.bold,
    color: c.text,
    textAlign: 'center',
  },
  reasonBtn: {
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    paddingVertical: space[5],
    paddingHorizontal: space[4],
    alignItems: 'center',
  },
  reasonText: { fontSize: 22, fontFamily: fontFamily.bold, fontWeight: weight.bold, color: c.text },
  noteInput: {
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    padding: space[4],
    minHeight: 130,
    fontSize: 20,
    fontFamily: fontFamily.medium,
    color: c.text,
  },
  saveBtn: {
    backgroundColor: c.brand,
    borderRadius: radius.lg,
    paddingVertical: space[4] + 2,
    alignItems: 'center',
    marginTop: space[1],
  },
  saveText: { fontSize: 22, fontFamily: fontFamily.bold, fontWeight: weight.bold, color: colors.white },
});
