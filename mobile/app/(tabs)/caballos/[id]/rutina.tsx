import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Sunrise, Sun, Moon, Droplets, Sprout, Activity, HeartPulse, CheckCircle2, User, Info, type LucideIcon,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useHorse } from '../../../../hooks/use-horses';
import { useRoutines, useUpsertRoutine, ROUTINE_ITEMS, todayISO } from '../../../../hooks/use-routines';
import { haptic } from '../../../../lib/haptics';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, weight, touch, radius } from '../../../../styles/tokens';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { Spinner } from '../../../../components/Spinner';

/** Íconos de la rutina diaria — lucide con color (en vez de emojis). */
const ROUTINE_ICON: Record<string, { Icon: LucideIcon; color: string }> = {
  morning_feed:   { Icon: Sunrise,    color: '#f59e0b' },
  afternoon_feed: { Icon: Sun,        color: '#eab308' },
  evening_feed:   { Icon: Moon,       color: '#6366f1' },
  water_ok:       { Icon: Droplets,   color: '#3b82f6' },
  paddock:        { Icon: Sprout,     color: '#22c55e' },
  trained:        { Icon: Activity,   color: '#f97316' },
  health_check:   { Icon: HeartPulse, color: '#ef4444' },
};

export default function RutinaScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading } = useHorse(id);
  const { data: routines } = useRoutines(id);
  const upsertRoutine = useUpsertRoutine(id);
  const today = todayISO();
  const todayRoutine = routines?.find((r) => r.date === today);

  if (isLoading || !horse) return <Spinner />;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Rutina" subtitle={horse.name} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
            <Text style={s.sectionTitle}>Rutina de hoy</Text>
            {routines && routines.length > 0 && (() => {
              const totalChecks = routines.reduce((acc, r) =>
                acc + ROUTINE_ITEMS.filter(({ key }) => r[key]).length, 0);
              const maxChecks = routines.length * ROUTINE_ITEMS.length;
              const pct = maxChecks > 0 ? Math.round((totalChecks / maxChecks) * 100) : 0;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: text.xs, color: pct >= 70 ? c.success : pct >= 40 ? c.warning : c.danger, fontWeight: weight.bold }}>
                    {pct}%
                  </Text>
                  <Text style={{ fontSize: text.xs, color: c.textFaint }}>últimos {routines.length}d</Text>
                </View>
              );
            })()}
          </View>

          <View style={s.routineList}>
            {ROUTINE_ITEMS.map(({ key, label }) => {
              const checked = todayRoutine?.[key] ?? false;
              const ri = ROUTINE_ICON[key];
              const RIcon = ri?.Icon ?? Info;
              return (
                <TouchableOpacity
                  key={key}
                  style={[s.routineItem, checked && s.routineItemChecked]}
                  onPress={() => { haptic.selection(); upsertRoutine.mutate({ date: today, [key]: !checked }); }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={checked ? `${label}, hecho` : label}
                >
                  <View style={[s.routineIconWrap, { backgroundColor: checked ? (c.isDark ? 'rgba(34,197,94,0.14)' : '#f0fdf4') : c.surface }]}>
                    <RIcon size={18} color={ri?.color ?? c.textFaint} strokeWidth={2} />
                  </View>
                  <Text style={[s.routineLabel, checked && s.routineLabelChecked]}>{label}</Text>
                  {checked && <CheckCircle2 size={20} color={c.success} strokeWidth={2} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Prueba de trabajo: quién cargó la rutina de hoy */}
          {todayRoutine?.filler?.name && (
            <View style={s.routineAuthor}>
              <User size={12} color={c.textFaint} strokeWidth={2} />
              <Text style={s.routineAuthorText}>
                Cargó {todayRoutine.filler.name}
                {todayRoutine.created_at
                  ? ` · ${format(new Date(todayRoutine.created_at), 'HH:mm', { locale: es })}`
                  : ''}
              </Text>
            </View>
          )}

          {/* Tendencia de los últimos días */}
          {routines && routines.length > 1 && (
            <View style={s.routineTrend}>
              <Text style={s.routineTrendTitle}>Últimos {routines.length} días</Text>
              <View style={s.routineTrendDays}>
                {[...routines].reverse().map((r) => {
                  const completedCount = ROUTINE_ITEMS.filter(({ key }) => r[key]).length;
                  const pct = completedCount / ROUTINE_ITEMS.length;
                  const dayLabel = format(new Date(`${r.date}T12:00:00`), 'EEEEE', { locale: es });
                  const isToday = r.date === today;
                  return (
                    <View key={r.date} style={s.routineTrendDay}>
                      <View style={[s.routineTrendBar, {
                        height: Math.max(4, pct * 36),
                        backgroundColor: pct >= 0.7 ? c.success : pct >= 0.4 ? c.warning : pct > 0 ? c.danger : c.borderStrong,
                      }]} />
                      <Text style={[s.routineTrendLabel, isToday && { color: c.brand, fontWeight: weight.bold }]}>{dayLabel}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  section: { marginHorizontal: space[4], gap: space[2] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: text.md, fontWeight: '700', color: c.text, letterSpacing: -0.3 },

  routineList: { gap: space[2] },
  routineItem: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: 60, borderRadius: radius.lg, paddingHorizontal: space[3], paddingVertical: space[2],
    backgroundColor: c.surfaceAlt,
  },
  routineItemChecked: { backgroundColor: c.isDark ? 'rgba(34,197,94,0.14)' : '#f0fdf4' },
  routineIconWrap: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  routineLabel: { flex: 1, fontSize: text.base, fontWeight: '500', color: c.textMuted },
  routineLabelChecked: { color: c.isDark ? '#86efac' : '#15803d', fontWeight: weight.semibold },
  routineAuthor: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  routineAuthorText: { fontSize: 11, color: c.textFaint, fontWeight: weight.medium },
  routineTrend: { marginTop: 12, backgroundColor: c.surfaceAlt, borderRadius: 12, padding: space[3] },
  routineTrendTitle: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  routineTrendDays: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 52 },
  routineTrendDay: { alignItems: 'center', gap: 4, flex: 1 },
  routineTrendBar: { width: 14, borderRadius: 4, minHeight: 4 },
  routineTrendLabel: { fontSize: text.xs, color: c.textFaint, fontWeight: weight.medium },
});
