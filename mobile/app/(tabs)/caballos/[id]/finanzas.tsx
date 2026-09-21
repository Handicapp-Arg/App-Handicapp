import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Wheat, Syringe, Hammer, Activity, Wrench, Truck, Package, type LucideIcon,
} from 'lucide-react-native';

import { useHorse, useFinancialSummary } from '../../../../hooks/use-horses';
import { useAuth } from '../../../../lib/auth';
import { haptic } from '../../../../lib/haptics';
import { Routes } from '../../../../lib/routes';
import { formatMoney } from '../../../../lib/currency';
import { fechaHumana, mesCorto } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, weight, radius, touch } from '../../../../styles/tokens';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { EmptyState } from '../../../../components/EmptyState';
import { ErrorState } from '../../../../components/ErrorState';
import { ListRowSkeleton, Skeleton } from '../../../../components/Skeleton';

/** Colores por categoría con tokens semánticos del theme (legibles en ambos temas). */
function makeExpenseCategoryMeta(c: ThemeColors): Record<string, { Icon: LucideIcon; color: string; label: string }> {
  return {
    alimentacion:  { Icon: Wheat,    color: c.success,   label: 'Alimentación' },
    veterinario:   { Icon: Syringe,  color: c.danger,    label: 'Veterinario' },
    herradero:     { Icon: Hammer,   color: c.warning,   label: 'Herradero' },
    entrenamiento: { Icon: Activity, color: c.info,      label: 'Entrenamiento' },
    mantenimiento: { Icon: Wrench,   color: c.textMuted, label: 'Mantenimiento' },
    transporte:    { Icon: Truck,    color: c.info,      label: 'Transporte' },
    otros:         { Icon: Package,  color: c.textMuted, label: 'Otros' },
  };
}

export default function FinanzasScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const insets = useSafeAreaInsets();
  const { user, can } = useAuth();
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading, isError: isHorseError, refetch: refetchHorse } = useHorse(id);
  const isJineteOrPeon = user?.role === 'jinete' || user?.role === 'peon';
  const { data: financial, isError, refetch } = useFinancialSummary(id, !isJineteOrPeon);
  const categoryMeta = useMemo(() => makeExpenseCategoryMeta(c), [c]);

  // Cargar un gasto sin salir del caballo: el formulario abre ya en tipo "gasto".
  const puedeRegistrar = can('horses', 'update');
  const irARegistrarGasto = () => {
    haptic.light();
    router.push({ pathname: Routes.caballoEventoNuevo(id), params: { tipo: 'gasto' } } as never);
  };

  if (isHorseError && !horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Finanzas" />
        <ErrorState onRetry={refetchHorse} />
      </View>
    );
  }

  if (isLoading || !horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Finanzas" />
        <View style={{ padding: space[4], gap: space[2] }}>
          <Skeleton height={72} style={{ marginBottom: space[2] }} />
          {[1, 2, 3, 4].map((i) => <ListRowSkeleton key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Finanzas" subtitle={horse.name} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          {isError && !financial ? (
            <ErrorState onRetry={refetch} />
          ) : !financial || financial.total === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="Sin gastos registrados"
              message="Cargá el primer gasto de este caballo y vas a ver acá el total, el promedio por mes y el detalle por categoría."
              actionLabel={puedeRegistrar ? 'Registrar gasto' : undefined}
              onAction={puedeRegistrar ? irARegistrarGasto : undefined}
            />
          ) : (
            <>
              {/* Hero: total acumulado */}
              <View style={s.hero}>
                <Text style={s.heroValue} numberOfLines={1} adjustsFontSizeToFit>
                  {formatMoney(financial.total)}
                </Text>
                <Text style={s.heroLabel}>Total acumulado</Text>
              </View>
              <View style={s.subStatRow}>
                <Text style={s.subStatLabel}>Promedio por mes</Text>
                <Text style={s.subStatValue}>{formatMoney(financial.average_monthly)}</Text>
              </View>

              {puedeRegistrar && (
                <TouchableOpacity
                  style={s.registrarBtn}
                  onPress={irARegistrarGasto}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Registrar un gasto de este caballo"
                >
                  <Text style={s.registrarBtnText}>+ Registrar gasto</Text>
                </TouchableOpacity>
              )}

              {/* Por categoría */}
              {(financial.by_category ?? []).length > 0 && (
                <View style={{ marginTop: space[6] }}>
                  <Text style={s.sectionTitle}>Por categoría</Text>
                  {financial.by_category.map((cat) => {
                    const meta = categoryMeta[cat.category] ?? { Icon: Package, color: c.textMuted, label: cat.category };
                    const MetaIcon = meta.Icon;
                    const pct = financial.total > 0 ? (cat.total / financial.total) * 100 : 0;
                    const maxVal = Math.max(...financial.by_category.map((x) => x.total), 1);
                    return (
                      <View key={cat.category} style={s.catRow}>
                        <View style={s.catRowTop}>
                          <View style={s.catRowLabel}>
                            <MetaIcon size={16} color={meta.color} strokeWidth={2} />
                            <Text style={s.catName}>{meta.label}</Text>
                          </View>
                          <View style={s.catRowValues}>
                            <Text style={s.catPct}>{pct.toFixed(0)}%</Text>
                            <Text style={s.catTotal}>{formatMoney(cat.total)}</Text>
                          </View>
                        </View>
                        <View style={s.barTrack}>
                          <View style={[s.barFill, { width: `${(cat.total / maxVal) * 100}%` as any, backgroundColor: meta.color }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Evolución mensual */}
              {(financial.monthly ?? []).length > 0 && (
                <View style={{ marginTop: space[6] }}>
                  <Text style={s.sectionTitle}>Evolución mensual</Text>
                  {(financial.monthly ?? []).slice(0, 6).map((m, i) => {
                    const label = mesCorto(m.month);
                    const maxVal = Math.max(...(financial.monthly ?? []).map((x) => x.total), 1);
                    // Serie en gris neutro; el cuero marca solo el mes más reciente.
                    const esMesActual = i === 0;
                    return (
                      <View key={m.month} style={s.barRow}>
                        <Text style={s.barLabel}>{label}</Text>
                        <View style={s.barTrack}>
                          <View style={[
                            s.barFill,
                            { width: `${(m.total / maxVal) * 100}%` as any },
                            !esMesActual && { backgroundColor: c.textFaint },
                          ]} />
                        </View>
                        <Text style={s.barValue}>{formatMoney(m.total)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Últimos gastos */}
              {(financial.recent_expenses ?? []).length > 0 && (
                <View style={{ marginTop: space[6] }}>
                  <Text style={s.sectionTitle}>Últimos gastos</Text>
                  {financial.recent_expenses.map((exp, i, arr) => {
                    const meta = categoryMeta[exp.expense_category ?? ''] ?? { Icon: Package, color: c.textMuted, label: exp.expense_category ?? '' };
                    const MetaIcon = meta.Icon;
                    const isLast = i === arr.length - 1;
                    return (
                      <View key={exp.id} style={[s.expenseRow, isLast && s.expenseRowLast]}>
                        <MetaIcon size={18} color={meta.color} strokeWidth={2} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.expenseDesc} numberOfLines={1}>{exp.description}</Text>
                          <Text style={s.expenseDate}>{fechaHumana(exp.date) || '—'}</Text>
                        </View>
                        <Text style={s.expenseAmount}>{formatMoney(exp.amount)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  section: { marginHorizontal: space[4] },
  sectionTitle: { fontSize: text.md, fontWeight: weight.bold, color: c.text, letterSpacing: -0.3, marginBottom: space[3] },

  /* Misma píldora neutra que el "+ Registrar" de Sanidad, para no inventar un botón nuevo. */
  registrarBtn: {
    alignSelf: 'center', marginTop: space[4], minHeight: touch.min, justifyContent: 'center',
    borderRadius: radius.full, paddingHorizontal: space[4], backgroundColor: c.surfaceAlt,
  },
  registrarBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },

  /* Hero: total acumulado */
  hero: { alignItems: 'center', paddingVertical: space[4], gap: space[1] },
  heroValue: { fontSize: text.display, fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  heroLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  subStatRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  subStatLabel: { fontSize: text.base, color: c.textMuted },
  subStatValue: { fontSize: text.base, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },

  /* Categorías */
  catRow: { marginBottom: space[3] },
  catRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space[1] },
  catRowLabel: { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1 },
  catName: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  catRowValues: { flexDirection: 'row', gap: space[2], alignItems: 'center' },
  catPct: { fontSize: text.xs, color: c.textFaint },
  catTotal: { fontSize: text.sm, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[2] },
  barLabel: { width: 40, fontSize: text.xs, color: c.textFaint, textAlign: 'right' },
  barTrack: { flex: 1, height: 6, backgroundColor: c.border, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: c.brand, borderRadius: 999 },
  barValue: { width: 72, fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted, textAlign: 'right', fontVariant: ['tabular-nums'] },

  /* Últimos gastos */
  expenseRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  expenseRowLast: { borderBottomWidth: 0 },
  expenseDesc: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  expenseDate: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },
  expenseAmount: { fontSize: text.base, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },
});
