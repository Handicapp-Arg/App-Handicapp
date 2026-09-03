import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Banknote, Wheat, Syringe, Hammer, Activity, Wrench, Truck, Package, type LucideIcon,
} from 'lucide-react-native';

import { useHorse, useFinancialSummary } from '../../../../hooks/use-horses';
import { useAuth } from '../../../../lib/auth';
import { formatMoney } from '../../../../lib/currency';
import { fechaHumana } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text } from '../../../../styles/tokens';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { Spinner } from '../../../../components/Spinner';

const EXPENSE_CATEGORY_META: Record<string, { Icon: LucideIcon; color: string }> = {
  alimentacion:  { Icon: Wheat,    color: '#16a34a' },
  veterinario:   { Icon: Syringe,  color: '#dc2626' },
  herradero:     { Icon: Hammer,   color: '#d97706' },
  entrenamiento: { Icon: Activity, color: '#a16207' },
  mantenimiento: { Icon: Wrench,   color: '#0284c7' },
  transporte:    { Icon: Truck,    color: '#0891b2' },
  otros:         { Icon: Package,  color: '#6b7280' },
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
  const { data: financial } = useFinancialSummary(id, !isJineteOrPeon);

  if (isLoading || !horse) return <Spinner />;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Finanzas" subtitle={horse.name} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          {!financial || financial.total === 0 ? (
            <View style={s.emptyBox}>
              <Banknote size={32} color={c.textFaint} strokeWidth={1.75} />
              <Text style={s.emptyTitle}>Sin gastos registrados</Text>
              <Text style={s.emptyText}>Creá un evento de tipo "Gasto" para ver el dashboard</Text>
            </View>
          ) : (
            <>
              {/* KPIs */}
              <View style={s.financialGrid}>
                <View style={[s.financialStat, { backgroundColor: c.brandSoft }]}>
                  <Text style={s.financialStatValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatMoney(financial.total)}
                  </Text>
                  <Text style={s.financialStatLabel}>Total acumulado</Text>
                </View>
                <View style={[s.financialStat, { backgroundColor: c.brandSoft }]}>
                  <Text style={s.financialStatValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatMoney(financial.average_monthly)}
                  </Text>
                  <Text style={s.financialStatLabel}>Promedio/mes</Text>
                </View>
              </View>

              {/* Por categoría */}
              {(financial.by_category ?? []).length > 0 && (
                <View style={{ marginTop: space[6] }}>
                  <Text style={[s.sectionTitle, { marginBottom: 10 }]}>Por categoría</Text>
                  {financial.by_category.map((cat) => {
                    const meta = EXPENSE_CATEGORY_META[cat.category] ?? { Icon: Package, color: '#6b7280' };
                    const MetaIcon = meta.Icon;
                    const pct = financial.total > 0 ? (cat.total / financial.total) * 100 : 0;
                    const maxVal = Math.max(...financial.by_category.map((x) => x.total), 1);
                    return (
                      <View key={cat.category} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                            <MetaIcon size={14} color={meta.color} strokeWidth={2} />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>
                              {EXPENSE_CATEGORY_META[cat.category] ? cat.category.charAt(0).toUpperCase() + cat.category.slice(1) : cat.category}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, color: c.textFaint }}>{pct.toFixed(0)}%</Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{formatMoney(cat.total)}</Text>
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
                  <Text style={[s.sectionTitle, { marginBottom: 10 }]}>Evolución mensual</Text>
                  {(financial.monthly ?? []).slice(0, 6).map((m) => {
                    const [year, month] = m.month.split('-');
                    const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
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
                  <Text style={[s.sectionTitle, { marginBottom: 10 }]}>Últimos gastos</Text>
                  {financial.recent_expenses.map((exp, i, arr) => {
                    const meta = EXPENSE_CATEGORY_META[exp.expense_category ?? ''] ?? { Icon: Package, color: '#6b7280' };
                    const MetaIcon = meta.Icon;
                    const isLast = i === arr.length - 1;
                    return (
                      <View key={exp.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: c.border }}>
                        <MetaIcon size={18} color={meta.color} strokeWidth={2} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }} numberOfLines={1}>{exp.description}</Text>
                          <Text style={{ fontSize: 11, color: c.textFaint }}>
                            {fechaHumana(exp.date) || '—'}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>{formatMoney(exp.amount)}</Text>
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
  sectionTitle: { fontSize: text.md, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  emptyText: { fontSize: 13, color: c.textFaint },
  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: c.text },

  financialGrid: { flexDirection: 'row', gap: 10 },
  financialStat: { flex: 1, borderRadius: 12, padding: 12 },
  financialStatValue: { fontSize: 18, fontWeight: '800', color: c.text },
  financialStatLabel: { fontSize: 10, fontWeight: '600', color: c.textMuted, marginTop: 2, textTransform: 'uppercase' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { width: 36, fontSize: 10, color: c.textFaint, textAlign: 'right' },
  barTrack: { flex: 1, height: 6, backgroundColor: c.border, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: c.brand, borderRadius: 999 },
  barValue: { width: 64, fontSize: 10, fontWeight: '600', color: c.textMuted, textAlign: 'right' },
});
