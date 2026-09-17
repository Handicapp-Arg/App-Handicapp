import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useTrainingMetrics, useUpsertTrainingMetrics } from '../hooks/use-training-metrics';
import { haptic } from '../lib/haptics';
import { colors } from '../lib/colors';
import { useTheme, type ThemeColors } from '../lib/theme';
import { useToast } from './Toast';
import { space, text, radius, weight, touch } from '../styles/tokens';

const INTENSITY_LABELS = ['', 'Muy liviano', 'Liviano', 'Moderado', 'Intenso', 'Máximo'];

interface Props {
  eventId: string;
  canEdit: boolean;
}

export function TrainingMetricsPanel({ eventId, canEdit }: Props) {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: metrics } = useTrainingMetrics(eventId);
  const upsert = useUpsertTrainingMetrics();
  const toast = useToast();
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
    try {
      await upsert.mutateAsync({
        eventId,
        distance_km: distance ? parseFloat(distance) : undefined,
        duration_min: duration ? parseInt(duration, 10) : undefined,
        intensity: intensity > 0 ? intensity : undefined,
        discipline: discipline.trim() || undefined,
      });
      haptic.success();
      setEditing(false);
    } catch {
      haptic.error();
      toast.error('No se pudieron guardar las métricas. Probá de nuevo.');
    }
  };

  if (!hasData && !canEdit) return null;

  // Pares label/valor planos, sin panel de fondo.
  const metricPairs: { label: string; value: string; sub?: string }[] = [];
  if (metrics?.distance_km != null) metricPairs.push({ label: 'Distancia', value: `${metrics.distance_km} km` });
  if (metrics?.duration_min != null) metricPairs.push({ label: 'Duración', value: `${metrics.duration_min} min` });
  if (metrics?.intensity != null) metricPairs.push({ label: 'Intensidad', value: `${metrics.intensity}/5`, sub: INTENSITY_LABELS[metrics.intensity] });
  if (metrics?.discipline) metricPairs.push({ label: 'Disciplina', value: metrics.discipline });

  return (
    <View style={s.container}>
      <View style={s.titleRow}>
        <Text style={s.title}>Métricas de entrenamiento</Text>
        {canEdit && !editing && (
          <TouchableOpacity
            onPress={openEdit}
            activeOpacity={0.7}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hasData ? 'Editar métricas de entrenamiento' : 'Agregar métricas de entrenamiento'}
          >
            <Text style={s.editLink}>{hasData ? 'Editar' : '+ Agregar'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!editing ? (
        hasData ? (
          <View>
            {metricPairs.map((m, i) => (
              <View key={m.label} style={[s.metricRow, i > 0 && s.metricBorde]}>
                <Text style={s.metricLabel}>{m.label}</Text>
                <Text style={s.metricValue}>
                  {m.value}
                  {m.sub ? <Text style={s.metricSub}>  {m.sub}</Text> : null}
                </Text>
              </View>
            ))}
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
                placeholderTextColor={c.textFaint}
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
                placeholderTextColor={c.textFaint}
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
                  accessibilityRole="button"
                  accessibilityLabel={n === 0 ? 'Sin intensidad' : `Intensidad ${n} de 5, ${INTENSITY_LABELS[n]}`}
                  accessibilityState={{ selected: intensity === n }}
                >
                  <Text style={[s.intensityBtnText, intensity === n && s.intensityBtnTextActive]}>
                    {n === 0 ? '—' : String(n)}
                  </Text>
                  {n > 0 && (
                    <Text style={[s.intensitySubText, intensity === n && { color: c.surface }]}>
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
              placeholderTextColor={c.textFaint}
              autoCapitalize="sentences"
            />
          </View>

          {/* Un solo CTA; cancelar es un link de texto */}
          <View style={s.formActions}>
            <TouchableOpacity
              style={[s.saveBtn, upsert.isPending && { opacity: 0.6 }]}
              onPress={save}
              disabled={upsert.isPending}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Guardar métricas de entrenamiento"
              accessibilityState={{ disabled: upsert.isPending }}
            >
              {upsert.isPending
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Text style={s.saveBtnText}>Guardar</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEditing(false)}
              activeOpacity={0.7}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cancelar edición de métricas"
            >
              <Text style={s.cancelLink}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  // Sin panel: las métricas viven planas sobre el fondo del evento.
  container: { marginTop: space[2], gap: space[2] },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  editLink: { fontSize: text.xs, fontWeight: weight.semibold, color: c.brand },

  metricRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: space[2], gap: space[3],
  },
  metricBorde: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  metricLabel: { fontSize: text.sm, color: c.textMuted },
  metricValue: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  metricSub: { fontSize: text.xs, fontWeight: weight.regular, color: c.textFaint },
  empty: { fontSize: text.xs, color: c.textFaint },

  form: { gap: space[3] },
  formRow: { flexDirection: 'row', gap: space[2] },
  formField: { flex: 1, gap: space[1] },
  fieldLabel: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    borderRadius: radius.sm,
    paddingHorizontal: space[3], paddingVertical: space[2],
    fontSize: text.sm, color: c.text, backgroundColor: c.surfaceAlt,
  },
  intensityRow: { gap: space[2], paddingVertical: space[1] },
  intensityBtn: {
    borderRadius: radius.sm,
    paddingHorizontal: space[3], paddingVertical: space[2],
    backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    minWidth: 52, minHeight: touch.min,
  },
  // Selección neutra invertida (texto sobre fondo c.text), sin cuero.
  intensityBtnActive: { backgroundColor: c.text },
  intensityBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.text },
  intensityBtnTextActive: { color: c.surface },
  intensitySubText: { fontSize: text.xs, color: c.textFaint, marginTop: 1 },
  formActions: { gap: space[3], alignItems: 'center' },
  cancelLink: { fontSize: text.sm, color: c.textMuted },
  saveBtn: {
    alignSelf: 'stretch',
    borderRadius: radius.sm, backgroundColor: c.brand,
    minHeight: touch.min,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.white },
});
