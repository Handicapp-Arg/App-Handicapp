import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Star, X, Camera } from 'lucide-react-native';
import { useHorse } from '../../hooks/use-horses';
import { useCreateEvent } from '../../hooks/use-events';
import { useUpsertTrainingMetrics, useTrainingHistory, type TrainingHistoryItem } from '../../hooks/use-training-metrics';
import { todayISO } from '../../hooks/use-routines';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { PressableScale } from '../../components/PressableScale';
import { Avatar } from '../../components/Avatar';
import { useToast } from '../../components/Toast';
import { space, radius, shadow } from '../../styles/tokens';
import { fontFamily } from '../../styles/fonts';

const DISCIPLINES = ['Paso', 'Trote', 'Galope', 'Salto', 'Doma'] as const;
const RESPONSES = ['Bien', 'Normal', 'Cansado'] as const;

const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 'YYYY-MM-DD' → '2 jul'. Robusto ante fechas inválidas. */
function fechaCorta(iso: string): string {
  const parts = iso?.slice(0, 10).split('-');
  if (!parts || parts.length < 3) return iso ?? '';
  const [, m, d] = parts.map((p) => parseInt(p, 10));
  const mes = MESES_CORTO[(m ?? 1) - 1] ?? '';
  return `${d} ${mes}`;
}

function StarsRow({ value, color, faint }: { value: number; color: string; faint: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={15}
          color={n <= value ? color : faint}
          fill={n <= value ? color : 'transparent'}
          strokeWidth={2}
        />
      ))}
    </View>
  );
}

function HistoryRow({ item, c, s }: { item: TrainingHistoryItem; c: ThemeColors; s: Styles }) {
  const parts: string[] = [];
  if (item.distance_km != null) parts.push(`${item.distance_km} km`);
  if (item.duration_min != null) parts.push(`${item.duration_min} min`);
  const meta = parts.join(' · ');
  return (
    <View style={s.histRow}>
      <View style={s.histDateBox}>
        <Text style={s.histDate}>{fechaCorta(item.date)}</Text>
      </View>
      <View style={s.histBody}>
        <Text style={s.histDiscipline} numberOfLines={1}>
          {item.discipline ?? 'Monta'}
        </Text>
        {!!meta && <Text style={s.histMeta} numberOfLines={1}>{meta}</Text>}
      </View>
      {item.intensity != null && item.intensity > 0 && (
        <StarsRow value={item.intensity} color={c.brand} faint={c.borderStrong} />
      )}
    </View>
  );
}

export default function JineteHorse() {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const horseId = String(id);

  const { data: horse } = useHorse(horseId);
  const createEvent = useCreateEvent();
  const upsert = useUpsertTrainingMetrics(); // el id del evento (recién creado) se pasa en mutate
  const { data: history, isLoading: histLoading } = useTrainingHistory(horseId);

  const [discipline, setDiscipline] = useState<string | null>(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState(0);
  const [response, setResponse] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);

  // Cámara directa: saca la foto en el momento (como el peón), de a una, hasta 5.
  const pickPhoto = async () => {
    if (photoUris.length >= 5) { toast.info('Ya cargaste 5 fotos'); return; }
    haptic.selection();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { haptic.error(); toast.error('Necesitamos permiso para usar la cámara.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUris((prev) => [...prev, result.assets[0].uri].slice(0, 5));
    }
  };

  const saving = createEvent.isPending || upsert.isPending;

  // Mini-resumen del mes en curso
  const summary = useMemo(() => {
    if (!history || history.length === 0) return null;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    let count = 0;
    let km = 0;
    for (const it of history) {
      const d = new Date(`${it.date?.slice(0, 10)}T00:00:00`);
      if (d.getFullYear() === y && d.getMonth() === m) {
        count += 1;
        if (it.distance_km != null) km += it.distance_km;
      }
    }
    if (count === 0) return null;
    const kmTxt = km > 0 ? ` · ${Math.round(km * 10) / 10} km` : '';
    return `${count} ${count === 1 ? 'monta' : 'montas'}${kmTxt} este mes`;
  }, [history]);

  const resetForm = () => {
    setDiscipline(null);
    setDistance('');
    setDuration('');
    setIntensity(0);
    setResponse(null);
    setNote('');
    setPhotoUris([]);
  };

  const buildDescription = (): string => {
    let desc = discipline ?? 'Monta';
    if (response) desc += ` · Respondió: ${response}`;
    const n = note.trim();
    if (n) desc += `. ${n}`;
    return desc;
  };

  const save = async () => {
    if (!discipline) { haptic.error(); toast.error('Elegí una disciplina'); return; }
    haptic.light();
    try {
      const event = await createEvent.mutateAsync({
        type: 'entrenamiento',
        description: buildDescription(),
        date: todayISO(),
        horse_id: horseId,
        photoUris: photoUris.length > 0 ? photoUris : undefined,
      });
      await upsert.mutateAsync({
        eventId: event.id,
        distance_km: distance ? parseFloat(distance) : undefined,
        duration_min: duration ? parseInt(duration, 10) : undefined,
        intensity: intensity > 0 ? intensity : undefined,
        discipline,
      });
      haptic.success();
      toast.success('Monta registrada');
      resetForm();
    } catch {
      haptic.error();
      toast.error('No se pudo guardar. Probá de nuevo.');
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + space[3] }]}>
        <PressableScale style={s.backBtn} scaleTo={0.92} onPress={() => { haptic.light(); router.back(); }}>
          <ChevronLeft size={28} color={c.text} strokeWidth={2.4} />
        </PressableScale>
        {horse?.image_url ? (
          <Image source={{ uri: horse.image_url }} style={s.photo} resizeMode="cover" />
        ) : (
          <Avatar name={horse?.name ?? '?'} size={44} />
        )}
        <Text style={s.horseName} numberOfLines={1}>{horse?.name ?? '...'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + space[8] }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── A) Registrar la monta ─── */}
        <Text style={s.sectionTitle}>Registrar monta</Text>

        <Text style={s.label}>Disciplina</Text>
        <View style={s.chipsWrap}>
          {DISCIPLINES.map((d) => {
            const active = discipline === d;
            return (
              <PressableScale
                key={d}
                style={[s.chip, active && s.chipActive]}
                scaleTo={0.95}
                onPress={() => { haptic.selection(); setDiscipline(d); }}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{d}</Text>
              </PressableScale>
            );
          })}
        </View>

        <View style={s.row}>
          <View style={s.rowItem}>
            <Text style={s.label}>Distancia (km)</Text>
            <TextInput
              style={s.input}
              value={distance}
              onChangeText={setDistance}
              placeholder="—"
              placeholderTextColor={c.textFaint}
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
          </View>
          <View style={s.rowItem}>
            <Text style={s.label}>Duración (min)</Text>
            <TextInput
              style={s.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="—"
              placeholderTextColor={c.textFaint}
              keyboardType="number-pad"
              inputMode="numeric"
            />
          </View>
        </View>

        <Text style={s.label}>Esfuerzo</Text>
        <View style={s.starsInput}>
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= intensity;
            return (
              <PressableScale
                key={n}
                style={s.starTouch}
                scaleTo={0.88}
                onPress={() => { haptic.selection(); setIntensity(intensity === n ? 0 : n); }}
              >
                <Star
                  size={30}
                  color={filled ? c.brand : c.borderStrong}
                  fill={filled ? c.brand : 'transparent'}
                  strokeWidth={2}
                />
              </PressableScale>
            );
          })}
        </View>

        <Text style={s.label}>¿Cómo respondió?</Text>
        <View style={s.chipsWrap}>
          {RESPONSES.map((r) => {
            const active = response === r;
            return (
              <PressableScale
                key={r}
                style={[s.chip, active && s.chipActive]}
                scaleTo={0.95}
                onPress={() => { haptic.selection(); setResponse(active ? null : r); }}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{r}</Text>
              </PressableScale>
            );
          })}
        </View>
        <TextInput
          style={s.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Nota (opcional)…"
          placeholderTextColor={c.textFaint}
          multiline
          textAlignVertical="top"
        />

        <Text style={s.label}>Fotos de la monta <Text style={s.labelOpt}>(opcional)</Text></Text>
        {photoUris.length === 0 ? (
          <TouchableOpacity style={s.photoBtnFull} onPress={pickPhoto} activeOpacity={0.8}>
            <Camera size={22} color={c.brand} strokeWidth={2} />
            <Text style={s.photoBtnFullText}>Sacar foto</Text>
          </TouchableOpacity>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
            {photoUris.map((uri, i) => (
              <View key={uri} style={s.photoThumb}>
                <Image source={{ uri }} style={s.photoImg} />
                <TouchableOpacity
                  style={s.photoRemove}
                  onPress={() => { haptic.light(); setPhotoUris((p) => p.filter((_, idx) => idx !== i)); }}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <X size={12} color="#fff" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ))}
            {photoUris.length < 5 && (
              <TouchableOpacity style={s.photoAdd} onPress={pickPhoto} activeOpacity={0.75}>
                <Camera size={20} color={c.textMuted} strokeWidth={2} />
                <Text style={s.photoAddText}>Otra</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        <PressableScale style={s.saveBtn} scaleTo={0.97} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator color={colors.white} />
            : <Text style={s.saveText}>Guardar monta</Text>}
        </PressableScale>

        {/* ─── B) Progreso / historial ─── */}
        <View style={s.progressHead}>
          <Text style={s.sectionTitle}>Progreso</Text>
          {!!summary && <Text style={s.summary}>{summary}</Text>}
        </View>

        {histLoading ? (
          <ActivityIndicator color={c.brand} style={{ marginTop: space[4] }} />
        ) : !history || history.length === 0 ? (
          <Text style={s.emptyHist}>Todavía no registraste montas para este caballo.</Text>
        ) : (
          <View style={s.histList}>
            {history.map((item, index) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(index * 40).duration(280)}>
                <HistoryRow item={item} c={c} s={s} />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingBottom: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: c.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: c.surfaceAlt },
  horseName: {
    flex: 1,
    fontSize: 22,
    fontFamily: fontFamily.extrabold,
    fontWeight: '800',
    color: c.text,
  },
  content: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fontFamily.extrabold,
    fontWeight: '800',
    color: c.text,
  },
  label: {
    fontSize: 14,
    marginTop: space[4],
    marginBottom: space[2],
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    color: c.textMuted,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  chip: {
    paddingHorizontal: space[4],
    paddingVertical: space[2] + 2,
    borderRadius: radius.full,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderStrong,
  },
  starsInput: {
    flexDirection: 'row',
    gap: space[1],
  },
  starTouch: {
    padding: space[1] + 1,
  },
  chipActive: {
    backgroundColor: c.brand,
    borderColor: c.brand,
  },
  chipText: {
    fontSize: 15,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    color: c.text,
  },
  chipTextActive: { color: colors.white },
  row: {
    flexDirection: 'row',
    gap: space[3],
  },
  rowItem: { flex: 1 },
  input: {
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: space[4],
    paddingVertical: space[3] + 2,
    fontSize: 18,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    color: c.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderStrong,
  },
  noteInput: {
    marginTop: space[3],
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    padding: space[4],
    minHeight: 80,
    fontSize: 16,
    fontFamily: fontFamily.medium,
    color: c.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderStrong,
  },
  photoThumb: { width: 72, height: 72, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center',
  },
  photoAdd: {
    width: 72, height: 72, borderRadius: radius.md, borderWidth: 1.5,
    borderColor: c.borderStrong, borderStyle: 'dashed', justifyContent: 'center',
    alignItems: 'center', gap: 2, backgroundColor: c.surfaceAlt,
  },
  photoAddText: { fontSize: 10, color: c.textFaint, fontFamily: fontFamily.semibold, fontWeight: '600' },
  labelOpt: { color: c.textFaint, fontWeight: '400' },
  photoBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    height: 54,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    borderStyle: 'dashed',
    backgroundColor: c.surfaceAlt,
  },
  photoBtnFullText: { fontSize: 15, color: c.brand, fontFamily: fontFamily.semibold, fontWeight: '600' },
  saveBtn: {
    marginTop: space[5],
    backgroundColor: c.brand,
    borderRadius: radius.lg,
    paddingVertical: space[4] + 2,
    alignItems: 'center',
    ...shadow.md,
  },
  saveText: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    fontWeight: '700',
    color: colors.white,
  },
  progressHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: space[8],
    marginBottom: space[2],
  },
  summary: {
    fontSize: 13,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    color: c.brand,
  },
  emptyHist: {
    marginTop: space[4],
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: c.textFaint,
    textAlign: 'center',
  },
  histList: {
    marginTop: space[2],
    gap: space[2],
  },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: space[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderStrong,
  },
  histDateBox: {
    width: 52,
    alignItems: 'center',
  },
  histDate: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'capitalize',
  },
  histBody: { flex: 1 },
  histDiscipline: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    fontWeight: '700',
    color: c.text,
  },
  histMeta: {
    fontSize: 13,
    marginTop: 1,
    fontFamily: fontFamily.medium,
    fontWeight: '500',
    color: c.textMuted,
  },
});
