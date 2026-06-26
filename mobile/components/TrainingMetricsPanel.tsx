import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useTrainingMetrics, useUpsertTrainingMetrics } from '../hooks/use-training-metrics';
import { haptic } from '../lib/haptics';
import { colors } from '../lib/colors';
import { useTheme } from '../lib/theme';
import { space, text, radius, weight } from '../styles/tokens';

const INTENSITY_LABELS = ['', 'Muy liviano', 'Liviano', 'Moderado', 'Intenso', 'Máximo'];

interface Props {
  eventId: string;
  canEdit: boolean;
}

export function TrainingMetricsPanel({ eventId, canEdit }: Props) {
  const { c } = useTheme();
  const pal = c.isDark ? YELLOW_DARK : YELLOW;
  const s = useMemo(() => makeStyles(pal), [pal]);
  const { data: metrics } = useTrainingMetrics(eventId);
  const upsert = useUpsertTrainingMetrics(eventId);
  const [editing, setEditing] = useState(false);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState(0);
  const [discipline, setDiscipline] = useState('');

  const hasData = metrics && (
    metrics.distance_km != null || metrics.duration_min != null ||
    metrics.intensity != null || metrics.discipline
  );

  const openEdit = () => {
    setDistance(metrics?.distance_km != null ? String(metrics.distance_km) : '');
    setDuration(metrics?.duration_min != null ? String(metrics.duration_min) : '');
    setIntensity(metrics?.intensity ?? 0);
    setDiscipline(metrics?.discipline ?? '');
    setEditing(true);
    haptic.light();
  };

  const save = async () => {
    await upsert.mutateAsync({
      distance_km: distance ? parseFloat(distance) : undefined,
      duration_min: duration ? parseInt(duration, 10) : undefined,
      intensity: intensity > 0 ? intensity : undefined,
      discipline: discipline.trim() || undefined,
    });
    haptic.success();
    setEditing(false);
  };

  if (!hasData && !canEdit) return null;

  return (
    <View style={s.container}>
      <View style={s.titleRow}>
        <Text style={s.title}>Métricas de entrenamiento</Text>
        {canEdit && !editing && (
          <TouchableOpacity onPress={openEdit} activeOpacity={0.7}>
            <Text style={s.editLink}>{hasData ? 'Editar' : '+ Agregar'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!editing ? (
        hasData ? (
          <View style={s.dataRow}>
            {metrics?.distance_km != null && (
              <View style={s.statItem}>
                <Text style={s.statLabel}>Distancia</Text>
                <Text style={s.statValue}>{metrics.distance_km} km</Text>
              </View>
            )}
            {metrics?.duration_min != null && (
              <View style={s.statItem}>
                <Text style={s.statLabel}>Duración</Text>
                <Text style={s.statValue}>{metrics.duration_min} min</Text>
              </View>
            )}
            {metrics?.intensity != null && (
              <View style={s.statItem}>
                <Text style={s.statLabel}>Intensidad</Text>
                <Text style={s.statValue}>{metrics.intensity}/5</Text>
                <Text style={s.statSub}>{INTENSITY_LABELS[metrics.intensity]}</Text>
              </View>
            )}
            {metrics?.discipline && (
              <View style={s.statItem}>
                <Text style={s.statLabel}>Disciplina</Text>
                <Text style={s.statValue}>{metrics.discipline}</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={s.empty}>Sin métricas registradas</Text>
        )
      ) : (
        <View style={s.form}>
          {/* Distancia y duración */}
          <View style={s.formRow}>
            <View style={s.formField}>
              <Text style={s.fieldLabel}>Distancia (km)</Text>
              <TextInput
                style={s.input}
                value={distance}
                onChangeText={setDistance}
                placeholder="0.0"
                placeholderTextColor={colors.gray400}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={s.formField}>
              <Text style={s.fieldLabel}>Duración (min)</Text>
              <TextInput
                style={s.input}
                value={duration}
                onChangeText={setDuration}
                placeholder="60"
                placeholderTextColor={colors.gray400}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Intensidad */}
          <View>
            <Text style={s.fieldLabel}>Intensidad</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.intensityRow}>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[s.intensityBtn, intensity === n && s.intensityBtnActive]}
                  onPress={() => setIntensity(n)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.intensityBtnText, intensity === n && s.intensityBtnTextActive]}>
                    {n === 0 ? '—' : String(n)}
                  </Text>
                  {n > 0 && (
                    <Text style={[s.intensitySubText, intensity === n && { color: colors.white }]}>
                      {INTENSITY_LABELS[n]}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Disciplina */}
          <View>
            <Text style={s.fieldLabel}>Disciplina</Text>
            <TextInput
              style={s.input}
              value={discipline}
              onChangeText={setDiscipline}
              placeholder="Salto, doma, polo..."
              placeholderTextColor={colors.gray400}
              autoCapitalize="sentences"
            />
          </View>

          {/* Acciones */}
          <View style={s.formActions}>
            <TouchableOpacity onPress={() => setEditing(false)} activeOpacity={0.7}>
              <Text style={s.cancelLink}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, upsert.isPending && { opacity: 0.6 }]}
              onPress={save}
              disabled={upsert.isPending}
              activeOpacity={0.8}
            >
              {upsert.isPending
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Text style={s.saveBtnText}>Guardar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const YELLOW = {
  bg: '#fffbeb',
  border: '#fde68a',
  title: '#92400e',
  label: '#b45309',
  value: '#78350f',
  link: '#d97706',
  btnBg: '#d97706',
  empty: '#d97706',
  inputBg: '#ffffff',
  inputBorder: '#fde68a',
};

const YELLOW_DARK: typeof YELLOW = {
  bg: 'rgba(217,119,6,0.12)',
  border: 'rgba(217,119,6,0.35)',
  title: '#fcd34d',
  label: '#fbbf24',
  value: '#fde68a',
  link: '#fbbf24',
  btnBg: '#b45309',
  empty: '#fbbf24',
  inputBg: 'rgba(217,119,6,0.10)',
  inputBorder: 'rgba(217,119,6,0.40)',
};

const makeStyles = (p: typeof YELLOW) => StyleSheet.create({
  container: {
    backgroundColor: p.bg,
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: radius.md,
    padding: space[3],
    marginTop: space[2],
    gap: space[2],
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: text.xs, fontWeight: weight.bold, color: p.title, textTransform: 'uppercase', letterSpacing: 0.5 },
  editLink: { fontSize: text.xs, fontWeight: weight.semibold, color: p.link },
  dataRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  statItem: { gap: 1 },
  statLabel: { fontSize: 10, fontWeight: weight.semibold, color: p.label, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: text.sm, fontWeight: weight.bold, color: p.value },
  statSub: { fontSize: 10, color: p.label },
  empty: { fontSize: text.xs, color: p.empty },
  form: { gap: space[3] },
  formRow: { flexDirection: 'row', gap: space[2] },
  formField: { flex: 1, gap: 4 },
  fieldLabel: { fontSize: 10, fontWeight: weight.bold, color: p.label, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    borderWidth: 1, borderColor: p.inputBorder, borderRadius: radius.sm,
    paddingHorizontal: space[3], paddingVertical: space[2],
    fontSize: text.sm, color: p.value, backgroundColor: p.inputBg,
  },
  intensityRow: { gap: space[2], paddingVertical: 4 },
  intensityBtn: {
    borderRadius: radius.sm, borderWidth: 1, borderColor: p.inputBorder,
    paddingHorizontal: space[3], paddingVertical: space[1] + 2,
    backgroundColor: p.inputBg, alignItems: 'center', minWidth: 52,
  },
  intensityBtnActive: { backgroundColor: p.btnBg, borderColor: p.btnBg },
  intensityBtnText: { fontSize: text.xs, fontWeight: weight.bold, color: p.value },
  intensityBtnTextActive: { color: colors.white },
  intensitySubText: { fontSize: 9, color: p.label, marginTop: 1 },
  formActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space[4] },
  cancelLink: { fontSize: text.xs, color: colors.gray500 },
  saveBtn: { borderRadius: radius.sm, backgroundColor: p.btnBg, paddingHorizontal: space[4], paddingVertical: space[2] },
  saveBtnText: { fontSize: text.xs, fontWeight: weight.bold, color: colors.white },
});
