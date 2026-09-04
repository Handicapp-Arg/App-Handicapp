import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Banknote, Wheat, Syringe, Hammer, Activity, Wrench, Truck, Package, type LucideIcon,
} from 'lucide-react-native';

import { useHorse, useFinancialSummary } from '../../../../hooks/use-horses';
import { useAuth } from '../../../../lib/auth';
import { formatMoney } from '../../../../lib/currency';
import { fechaHumana } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, weight } from '../../../../styles/tokens';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { Spinner } from '../../../../components/Spinner';
import { EmptyState } from '../../../../components/EmptyState';
import { ErrorState } from '../../../../components/ErrorState';

const EXPENSE_CATEGORY_META: Record<string, { Icon: LucideIcon; color: string; label: string }> = {
  alimentacion:  { Icon: Wheat,    color: '#16a34a', label: 'Alimentación' },
  veterinario:   { Icon: Syringe,  color: '#dc2626', label: 'Veterinario' },
  herradero:     { Icon: Hammer,   color: '#d97706', label: 'Herradero' },
  entrenamiento: { Icon: Activity, color: '#a16207', label: 'Entrenamiento' },
  mantenimiento: { Icon: Wrench,   color: '#0284c7', label: 'Mantenimiento' },
  transporte:    { Icon: Truck,    color: '#0891b2', label: 'Transporte' },
  otros:         { Icon: Package,  color: '#6b7280', label: 'Otros' },
};

export default function FinanzasScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading } = useHorse(id);
  const isJineteOrPeon = user?.role === 'jinete' || user?.role === 'peon';
  const { data: financial, isError, refetch } = useFinancialSummary(id, !isJineteOrPeon);

  if (isLoading || !horse) return <Spinner />;

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
              message='Creá un evento de tipo "Gasto" para ver el dashboard'
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

              {/* Por categoría */}
              {(financial.by_category ?? []).length > 0 && (
                <View style={{ marginTop: space[6] }}>
                  <Text style={s.sectionTitle}>Por categoría</Text>
                  {financial.by_category.map((cat) => {
                    const meta = EXPENSE_CATEGORY_META[cat.category] ?? { Icon: Package, color: c.textMuted, label: cat.category };
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
                  {(financial.monthly ?? []).slice(0, 6).map((m) => {
                    const [year, month] = m.month.split('-');
                    const label = format(new Date(Number(year), Number(month) - 1, 1), 'MMM yy', { locale: es });
                    const maxVal = Math.max(...(financial.monthly ?? []).map((x) => x.total), 1);
                    return (
                      <View key={m.month} style={s.barRow}>
                        <Text style={s.barLabel}>{label}</Text>
                        <View style={s.barTrack}><View style={[s.barFill, { width: `${(m.total / maxVal) * 100}%` as any }]} /></View>
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
                    const meta = EXPENSE_CATEGORY_META[exp.expense_category ?? ''] ?? { Icon: Package, color: c.textMuted, label: exp.expense_category ?? '' };
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

  /* Hero: total acumulado */
  hero: { alignItems: 'center', paddingVertical: space[4], gap: space[1] },
  heroValue: { fontSize: text.display, fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  heroLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  subStatRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: space[3], borderTopWidth: 1, borderTopColor: c.border,
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
    paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: c.border,
  },
  expenseRowLast: { borderBottomWidth: 0 },
  expenseDesc: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  expenseDate: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },
  expenseAmount: { fontSize: text.base, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },
});
