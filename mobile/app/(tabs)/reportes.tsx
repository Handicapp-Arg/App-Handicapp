import { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { AxiosError } from 'axios';
import { useRouter } from 'expo-router';
import {
  BarChart3, HeartPulse, Wallet, CalendarClock, Stethoscope, TrendingUp,
  AlertTriangle, Clock, CheckCircle2,
} from 'lucide-react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, shadow } from '../../styles/tokens';
import { Routes } from '../../lib/routes';
import { useReportSummary, type ReportSummary } from '../../hooks/use-reports';
import { ReportSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { formatMoney } from '../../lib/currency';

const RED = '#dc2626';
const AMBER = '#d97706';
const GREEN = '#059669';

const CATEGORY_LABELS: Record<string, string> = {
  alimentacion: 'Alimentación',
  veterinario: 'Veterinario',
  herradero: 'Herradero',
  entrenamiento: 'Entrenamiento',
  mantenimiento: 'Mantenimiento',
  transporte: 'Transporte',
  otros: 'Otros',
};

const APPOINTMENT_LABELS: Record<string, string> = {
  veterinario: 'Veterinario',
  herrador: 'Herrador',
  competencia: 'Competencia',
  desparasitacion: 'Desparasitación',
  vacuna: 'Vacuna',
  entrenamiento: 'Entrenamiento',
  otro: 'Otro',
};

const fmtMoney = (n: number) => formatMoney(n);

const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('es-AR', { month: 'short' });
};

const fmtDate = (iso: string) =>
  new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso)
    .toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

function StatCard({ icon, label, value, hint, s }: {
  icon: React.ReactNode; label: string; value: string; hint?: string; s: Styles;
}) {
  return (
    <View style={s.statCard}>
      <View style={s.statIcon}>{icon}</View>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {hint ? <Text style={s.statHint}>{hint}</Text> : null}
    </View>
  );
}

function HealthCard({ health, c, s }: { health: ReportSummary['health']; c: ThemeColors; s: Styles }) {
  const verde = Math.max(0, health.total - health.rojo - health.amarillo);
  const attention = health.rojo + health.amarillo;
  const total = Math.max(1, health.rojo + health.amarillo + verde);

  const cells = [
    { value: health.rojo, label: 'Vencidos', color: RED, bg: 'rgba(239,68,68,0.12)', Icon: AlertTriangle },
    { value: health.amarillo, label: 'Por vencer', color: AMBER, bg: 'rgba(245,158,11,0.12)', Icon: Clock },
    { value: verde, label: 'Al día', color: GREEN, bg: 'rgba(16,185,129,0.12)', Icon: CheckCircle2 },
  ];

  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <HeartPulse size={18} color={c.brand} strokeWidth={2} />
        <Text style={s.cardTitle}>Salud sanitaria</Text>
      </View>

      {/* Barra semáforo agregada */}
      <View style={s.semaforoTrack}>
        {health.rojo > 0 && <View style={{ flex: health.rojo, backgroundColor: RED }} />}
        {health.amarillo > 0 && <View style={{ flex: health.amarillo, backgroundColor: AMBER }} />}
        {verde > 0 && <View style={{ flex: verde, backgroundColor: GREEN }} />}
        {total === 1 && health.rojo + health.amarillo + verde === 0 && (
          <View style={{ flex: 1, backgroundColor: c.border }} />
        )}
      </View>

      <View style={s.healthRow}>
        {cells.map((cell) => (
          <View key={cell.label} style={[s.healthBox, { backgroundColor: cell.bg }]}>
            <cell.Icon size={15} color={cell.color} strokeWidth={2.2} />
            <Text style={[s.healthNum, { color: cell.color }]}>{cell.value}</Text>
            <Text style={[s.healthLbl, { color: cell.color }]}>{cell.label}</Text>
          </View>
        ))}
      </View>

      <Text style={s.cardHint}>
        {attention > 0
          ? `${attention} caballo${attention === 1 ? '' : 's'} necesitan atención sanitaria (AIE, Encefalomielitis, Influenza).`
          : 'Todos los caballos están al día con las enfermedades oficiales.'}
      </Text>
    </View>
  );
}

function ExpensesCard({ expenses, c, s }: { expenses: ReportSummary['expenses']; c: ThemeColors; s: Styles }) {
  const max = Math.max(1, ...expenses.monthly.map((m) => m.total));
  const chrono = [...expenses.monthly].reverse();
  const catMax = Math.max(1, ...expenses.by_category.map((cat) => cat.total));

  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <Wallet size={18} color={c.brand} strokeWidth={2} />
        <Text style={s.cardTitle}>Gastos</Text>
      </View>

      <View style={s.expenseTotals}>
        <View style={s.expenseBox}>
          <Text style={s.expenseBoxLbl}>Este mes</Text>
          <Text style={s.expenseBoxVal}>{fmtMoney(expenses.month_total)}</Text>
        </View>
        <View style={s.expenseBox}>
          <Text style={s.expenseBoxLbl}>Últimos 12 meses</Text>
          <Text style={s.expenseBoxVal}>{fmtMoney(expenses.year_total)}</Text>
        </View>
      </View>

      {chrono.length > 0 ? (
        <View style={s.chart}>
          {chrono.map((m, i) => {
            const isCurrent = i === chrono.length - 1;
            return (
              <View key={m.month} style={s.chartCol}>
                <View style={s.chartValRow}>
                  {isCurrent ? (
                    <Text style={s.chartVal} numberOfLines={1} adjustsFontSizeToFit>
                      {fmtMoney(m.total)}
                    </Text>
                  ) : null}
                </View>
                <View style={s.chartBarTrack}>
                  <View
                    style={[
                      s.chartBar,
                      {
                        height: `${Math.round((m.total / max) * 100)}%`,
                        backgroundColor: isCurrent ? c.brand : c.brandSoft,
                        borderWidth: isCurrent ? 0 : StyleSheet.hairlineWidth,
                        borderColor: c.brand,
                      },
                    ]}
                  />
                </View>
                <Text style={[s.chartLbl, isCurrent && { color: c.brand, fontWeight: weight.bold }]}>
                  {fmtMonth(m.month)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={s.emptyText}>Sin gastos registrados en el período.</Text>
      )}

      {expenses.by_category.length > 0 && (
        <View style={s.catSection}>
          <Text style={s.subLabel}>Por categoría</Text>
          {expenses.by_category.map((cat) => (
            <View key={cat.category} style={{ gap: 5 }}>
              <View style={s.catRow}>
                <Text style={s.catName}>{CATEGORY_LABELS[cat.category] ?? cat.category}</Text>
                <Text style={s.catTotal}>{fmtMoney(cat.total)}</Text>
              </View>
              <View style={s.catTrack}>
                <View style={[s.catFill, { width: `${Math.round((cat.total / catMax) * 100)}%`, backgroundColor: c.brandSoft }]} />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function UpcomingCard({ upcoming, c, s }: { upcoming: ReportSummary['upcoming']; c: ThemeColors; s: Styles }) {
  const hasItems = upcoming.appointments.length > 0 || upcoming.medical.length > 0;
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <CalendarClock size={18} color={c.brand} strokeWidth={2} />
        <Text style={s.cardTitle}>Próximos vencimientos</Text>
      </View>

      {!hasItems && <Text style={s.emptyText}>No hay turnos ni vencimientos próximos.</Text>}

      {upcoming.appointments.map((a) => (
        <View key={a.id} style={s.upRow}>
          <View style={[s.upIcon, { backgroundColor: c.brandSoft }]}>
            <CalendarClock size={15} color={c.brand} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.upTitle} numberOfLines={1}>{a.title}</Text>
            <Text style={s.upSub} numberOfLines={1}>
              {a.horse_name} · {APPOINTMENT_LABELS[a.type] ?? a.type}
            </Text>
          </View>
          <Text style={s.upDate}>{fmtDateTime(a.scheduled_at)}</Text>
        </View>
      ))}

      {upcoming.medical.map((m) => (
        <View key={m.id} style={s.upRow}>
          <View style={[s.upIcon, { backgroundColor: 'rgba(16,185,129,0.14)' }]}>
            <Stethoscope size={15} color={GREEN} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.upTitle} numberOfLines={1}>{m.name}</Text>
            <Text style={s.upSub} numberOfLines={1}>{m.horse_name}</Text>
          </View>
          <Text style={s.upDate}>{fmtDate(m.next_due)}</Text>
        </View>
      ))}
    </View>
  );
}

function NoPlanState({ c, s }: { c: ThemeColors; s: Styles }) {
  const router = useRouter();
  return (
    <View style={s.noPlan}>
      <View style={s.noPlanIcon}>
        <BarChart3 size={30} color={c.textMuted} strokeWidth={1.8} />
      </View>
      <Text style={s.noPlanTitle}>Tu plan no incluye reportes</Text>
      <Text style={s.noPlanText}>
        Actualizá tu plan para acceder al resumen de tus caballos, salud, gastos y próximos vencimientos.
      </Text>
      <Pressable
        onPress={() => router.navigate(Routes.miPlan as never)}
        style={({ pressed }) => [s.noPlanBtn, pressed && { opacity: 0.7 }]}
      >
        <Text style={s.noPlanBtnText}>Ver Mi Plan</Text>
      </Pressable>
    </View>
  );
}

export default function ReportesScreen() {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data, isLoading, error } = useReportSummary();
  const status = (error as AxiosError | null)?.response?.status;

  return (
    <View style={s.root}>
      <ScreenHeader title="Reportes" showBack backTo={Routes.mas} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ReportSkeleton />
        ) : status === 403 ? (
          <NoPlanState c={c} s={s} />
        ) : error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="No pudimos cargar tus reportes"
            message="Revisá tu conexión e intentá de nuevo en un momento."
            tint={colors.red500}
          />
        ) : data ? (
          <>
            <Animated.View style={s.statRow} entering={FadeInDown.duration(320)}>
              <StatCard
                icon={<BarChart3 size={20} color={c.brand} strokeWidth={2} />}
                label="Caballos" value={String(data.horses.total)} hint="Gestionados" s={s}
              />
              <StatCard
                icon={<HeartPulse size={20} color={c.brand} strokeWidth={2} />}
                label="Vencidos" value={String(data.health.rojo)}
                hint={`${data.health.amarillo} por vencer`} s={s}
              />
              <StatCard
                icon={<TrendingUp size={20} color={c.brand} strokeWidth={2} />}
                label="Gasto mes" value={fmtMoney(data.expenses.month_total)} s={s}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(320).delay(60)}>
              <HealthCard health={data.health} c={c} s={s} />
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(320).delay(120)}>
              <ExpensesCard expenses={data.expenses} c={c} s={s} />
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(320).delay(180)}>
              <UpcomingCard upcoming={data.upcoming} c={c} s={s} />
            </Animated.View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  content: { padding: space[4], paddingBottom: space[12], gap: space[4] },

  emptyText: { fontSize: text.sm, color: c.textFaint, paddingHorizontal: space[1] },

  /* Stats */
  statRow: { flexDirection: 'row', gap: space[3] },
  statCard: {
    flex: 1, backgroundColor: c.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: c.border, padding: space[3], gap: 2, ...shadow.sm,
  },
  statIcon: { marginBottom: space[1] },
  statLabel: { fontSize: 10, fontWeight: weight.bold, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: text.lg, fontWeight: weight.extrabold, color: c.text },
  statHint: { fontSize: 10, color: c.textFaint },

  /* Cards */
  card: {
    backgroundColor: c.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: c.border, padding: space[4], ...shadow.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[3] },
  cardTitle: { fontSize: text.md, fontWeight: weight.bold, color: c.text },
  cardHint: { fontSize: text.xs, color: c.textFaint, marginTop: space[3], lineHeight: 16 },
  subLabel: { fontSize: text.xs, fontWeight: weight.bold, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 },

  /* Health */
  semaforoTrack: {
    flexDirection: 'row', height: 8, borderRadius: radius.full,
    overflow: 'hidden', backgroundColor: c.surfaceAlt, marginBottom: space[3],
  },
  healthRow: { flexDirection: 'row', gap: space[2] },
  healthBox: { flex: 1, borderRadius: radius.md, paddingVertical: space[3], alignItems: 'center', gap: 2 },
  healthNum: { fontSize: text.xl, fontWeight: weight.extrabold },
  healthLbl: { fontSize: text.xs, fontWeight: weight.semibold },

  /* Expenses */
  expenseTotals: { flexDirection: 'row', gap: space[3], marginBottom: space[4] },
  expenseBox: { flex: 1, backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space[3] },
  expenseBoxLbl: { fontSize: 10, fontWeight: weight.bold, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 },
  expenseBoxVal: { fontSize: text.md, fontWeight: weight.extrabold, color: c.text, marginTop: 2 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 104 },
  chartCol: { flex: 1, alignItems: 'center', gap: 5, height: '100%' },
  chartValRow: { height: 12, alignSelf: 'stretch', justifyContent: 'flex-end', alignItems: 'center' },
  chartVal: { fontSize: 8, fontWeight: weight.bold, color: c.text },
  chartBarTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderTopLeftRadius: 5, borderTopRightRadius: 5, minHeight: 3 },
  chartLbl: { fontSize: 9, color: c.textFaint, textTransform: 'capitalize' },

  catSection: { marginTop: space[4], paddingTop: space[4], borderTopWidth: 1, borderTopColor: c.border, gap: space[3] },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { fontSize: text.sm, color: c.textMuted },
  catTotal: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  catTrack: { height: 6, borderRadius: radius.full, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  catFill: { height: '100%', borderRadius: radius.full },

  /* Upcoming */
  upRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surfaceAlt, borderRadius: radius.md,
    padding: space[3], marginBottom: space[2],
  },
  upIcon: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  upTitle: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  upSub: { fontSize: text.xs, color: c.textFaint, marginTop: 1 },
  upDate: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },

  /* No plan */
  noPlan: {
    backgroundColor: c.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: c.border, padding: space[6],
    alignItems: 'center', gap: space[3], ...shadow.sm,
  },
  noPlanIcon: {
    width: 60, height: 60, borderRadius: radius.xl,
    backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  noPlanTitle: { fontSize: text.lg, fontWeight: weight.extrabold, color: c.text, textAlign: 'center' },
  noPlanText: { fontSize: text.sm, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
  noPlanBtn: {
    marginTop: space[1], backgroundColor: c.brand, borderRadius: radius.md,
    paddingHorizontal: space[5], paddingVertical: space[3],
  },
  noPlanBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
});
