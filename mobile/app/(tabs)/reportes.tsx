import { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AxiosError } from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { BarChart3, CalendarClock, Stethoscope } from 'lucide-react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, touch, shadow, brandShadow } from '../../styles/tokens';
import { entradaFila } from '../../styles/motion';
import { Routes } from '../../lib/routes';
import { useReportSummary, type ReportSummary } from '../../hooks/use-reports';
import { useDashboard } from '../../hooks/use-dashboard';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { PressableScale } from '../../components/PressableScale';
import { Avatar } from '../../components/Avatar';
import { haptic } from '../../lib/haptics';
import { formatMoney } from '../../lib/currency';
import { fechaHoraHumana, vence } from '../../lib/fechas';

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
  return format(new Date(Number(y), Number(m) - 1, 1), 'MMM', { locale: es });
};

/**
 * Cuánto sale cada caballo. El dato no viene en /reports/summary sino en
 * /dashboard (`spend_by_horse`), que ya está cacheado: por eso se lee de ahí
 * en vez de inventar una barra con el total repartido.
 */
function GastoPorCaballo({ s }: { s: Styles }) {
  const { data: dashboard } = useDashboard();
  const filas = dashboard?.spend_by_horse ?? [];
  if (filas.length === 0) return null;
  const max = Math.max(1, ...filas.map((f) => f.total));

  return (
    <>
      <Text style={s.seccion}>Cuánto sale cada uno</Text>
      {filas.map((f, i) => (
        <Animated.View key={f.horse_id} entering={entradaFila(i)} style={[s.gastoFila, i < filas.length - 1 && s.divisor]}>
          <Avatar name={f.horse_name} size={38} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.gastoNombre} numberOfLines={1}>{f.horse_name}</Text>
            <View style={s.barraTrack}>
              <View style={[s.barraFill, { width: `${Math.round((f.total / max) * 100)}%` }]} />
            </View>
          </View>
          <Text style={s.gastoMonto}>{fmtMoney(f.total)}</Text>
        </Animated.View>
      ))}
    </>
  );
}

/** Sanidad en tres números: al día, por vencer, vencidas. */
function Sanidad({ health, c, s }: { health: ReportSummary['health']; c: ThemeColors; s: Styles }) {
  const alDia = Math.max(0, health.total - health.rojo - health.amarillo);
  const cajas = [
    { valor: alDia, label: 'al día', fondo: c.successSoft, tinta: c.success },
    { valor: health.amarillo, label: 'por vencer', fondo: c.goldSoft, tinta: c.goldText },
    { valor: health.rojo, label: 'vencidas', fondo: c.dangerSoft, tinta: c.danger },
  ];
  return (
    <>
      <Text style={s.seccion}>Cómo viene la sanidad</Text>
      <View style={s.sanidadRow}>
        {cajas.map((caja) => (
          <View key={caja.label} style={[s.sanidadCaja, { backgroundColor: caja.fondo }]}>
            <Text style={[s.sanidadNum, { color: caja.tinta }]}>{caja.valor}</Text>
            <Text style={[s.sanidadLbl, { color: caja.tinta }]}>{caja.label}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

/** Gasto mes a mes: la barra del mes corriente es la única en verde. */
function GastoMensual({ expenses, c, s }: { expenses: ReportSummary['expenses']; c: ThemeColors; s: Styles }) {
  const chrono = [...expenses.monthly].reverse();
  if (chrono.length === 0) return null;
  const max = Math.max(1, ...chrono.map((m) => m.total));

  return (
    <>
      <Text style={s.seccion}>Mes a mes</Text>
      <View style={s.chart}>
        {chrono.map((m, i) => {
          const actual = i === chrono.length - 1;
          return (
            <View key={m.month} style={s.chartCol}>
              <View style={s.chartBarTrack}>
                <View
                  style={[
                    s.chartBar,
                    {
                      height: `${Math.round((m.total / max) * 100)}%`,
                      backgroundColor: actual ? c.brand : c.surfaceAlt,
                    },
                  ]}
                />
              </View>
              <Text style={[s.chartLbl, actual && { color: c.brand, fontWeight: weight.bold }]}>
                {fmtMonth(m.month)}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

/** Categorías y próximos vencimientos: filas planas, sin cajas. */
function PorCategoria({ expenses, s }: { expenses: ReportSummary['expenses']; s: Styles }) {
  if (expenses.by_category.length === 0) return null;
  const max = Math.max(1, ...expenses.by_category.map((cat) => cat.total));
  return (
    <>
      <Text style={s.seccion}>En qué se va</Text>
      {expenses.by_category.map((cat, i) => (
        <View key={cat.category} style={[s.catRow, i < expenses.by_category.length - 1 && s.divisor]}>
          <View style={{ flex: 1 }}>
            <Text style={s.catName}>{CATEGORY_LABELS[cat.category] ?? cat.category}</Text>
            <View style={s.barraTrack}>
              <View style={[s.barraFill, { width: `${Math.round((cat.total / max) * 100)}%` }]} />
            </View>
          </View>
          <Text style={s.gastoMonto}>{fmtMoney(cat.total)}</Text>
        </View>
      ))}
    </>
  );
}

function Proximos({ upcoming, c, s }: { upcoming: ReportSummary['upcoming']; c: ThemeColors; s: Styles }) {
  const filas = [
    ...upcoming.appointments.map((a) => ({
      key: `turno-${a.id}`, Icon: CalendarClock, tinta: c.info, fondo: c.infoSoft,
      title: a.title,
      sub: `${a.horse_name} · ${APPOINTMENT_LABELS[a.type] ?? a.type}`,
      date: fechaHoraHumana(a.scheduled_at),
    })),
    ...upcoming.medical.map((m) => ({
      key: `medico-${m.id}`, Icon: Stethoscope, tinta: c.success, fondo: c.successSoft,
      title: m.name,
      sub: m.horse_name,
      date: vence(m.next_due),
    })),
  ];
  if (filas.length === 0) return null;

  return (
    <>
      <Text style={s.seccion}>Lo que se viene</Text>
      {filas.map((f, i) => (
        <View key={f.key} style={[s.upRow, i < filas.length - 1 && s.divisor]}>
          <View style={[s.cajita, { backgroundColor: f.fondo }]}>
            <f.Icon size={18} color={f.tinta} strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.upTitle} numberOfLines={1}>{f.title}</Text>
            <Text style={s.upSub} numberOfLines={1}>{f.sub}</Text>
          </View>
          <Text style={s.upDate}>{f.date}</Text>
        </View>
      ))}
    </>
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
        Actualizá tu plan para ver el resumen de tus caballos, la sanidad, los gastos y lo que se viene.
      </Text>
      <PressableScale
        onPress={() => { haptic.light(); router.navigate(Routes.miPlan as never); }}
        style={s.noPlanBtn}
        accessibilityRole="button"
        accessibilityLabel="Ver Mi Plan"
      >
        <Text style={s.noPlanBtnText}>Ver Mi Plan</Text>
      </PressableScale>
    </View>
  );
}

export default function ReportesScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data, isLoading, error, refetch, isRefetching } = useReportSummary();
  const status = (error as AxiosError | null)?.response?.status;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />
        }
      >
        <ScreenHeader scrollable title="Reportes" showBack backTo={Routes.mas} />

        <View style={s.cuerpo}>
          {isLoading ? (
            // Misma silueta: hero, tres filas con barra y tres cajas de sanidad.
            <>
              <Skeleton width="100%" height={132} borderRadius={radius.card} />
              <View style={{ height: space[6] }} />
              <Skeleton width={160} height={16} />
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={[s.gastoFila, i < 2 && s.divisor]}>
                  <Skeleton width={38} height={38} borderRadius={radius.thumb} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton width="45%" height={14} />
                    <Skeleton width="100%" height={6} borderRadius={radius.full} />
                  </View>
                  <Skeleton width={80} height={16} />
                </View>
              ))}
              <View style={{ height: space[6] }} />
              <View style={s.sanidadRow}>
                {[0, 1, 2].map((i) => <Skeleton key={i} height={74} borderRadius={radius.card} style={{ flex: 1 }} />)}
              </View>
            </>
          ) : status === 403 ? (
            <NoPlanState c={c} s={s} />
          ) : error ? (
            <ErrorState onRetry={refetch} titulo="No pudimos cargar tus reportes" />
          ) : data ? (
            <>
              {/* Hero invertido con el único dato que resume el año. */}
              <View style={s.hero}>
                <Text style={s.heroRotulo}>
                  {data.horses.total === 1 ? 'Gastado en tu caballo' : `Gastado en tus ${data.horses.total} caballos`}
                </Text>
                <Text style={s.heroMonto}>{fmtMoney(data.expenses.year_total)}</Text>
                <Text style={s.heroPie}>{fmtMoney(data.expenses.month_total)} este mes</Text>
              </View>

              <GastoPorCaballo s={s} />
              <Sanidad health={data.health} c={c} s={s} />
              <GastoMensual expenses={data.expenses} c={c} s={s} />
              <PorCategoria expenses={data.expenses} s={s} />
              <Proximos upcoming={data.upcoming} c={c} s={s} />
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  content: { paddingBottom: 120 },
  cuerpo: { paddingHorizontal: space[4], paddingTop: space[2] },

  // Superficie invertida: `c.text` de fondo, `c.bg` de tinta. Anda en los dos temas.
  hero: { backgroundColor: c.text, borderRadius: radius.card, padding: space[5], ...(c.isDark ? {} : shadow.md) },
  heroRotulo: { fontSize: text.sm, color: c.textFaint },
  heroMonto: { fontSize: text.display, fontWeight: weight.bold, color: c.bg, letterSpacing: -1.3, marginTop: space[1], fontVariant: ['tabular-nums'] },
  heroPie: { fontSize: text.sm, color: c.textFaint, marginTop: space[2] },

  seccion: { fontSize: text.md, fontWeight: weight.bold, color: c.text, letterSpacing: -0.4, marginTop: space[7], marginBottom: space[2] },
  divisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },

  gastoFila: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  gastoNombre: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  gastoMonto: { fontSize: text.base, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },
  barraTrack: { height: 6, borderRadius: radius.full, backgroundColor: c.surfaceAlt, overflow: 'hidden', marginTop: 6 },
  barraFill: { height: '100%', borderRadius: radius.full, backgroundColor: c.brand },

  sanidadRow: { flexDirection: 'row', gap: space[2] + 2 },
  sanidadCaja: { flex: 1, borderRadius: radius.card, padding: space[3] + 2 },
  sanidadNum: { fontSize: text.xl, fontWeight: weight.bold, letterSpacing: -0.9, fontVariant: ['tabular-nums'] },
  sanidadLbl: { fontSize: text.sm, marginTop: 3 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2], height: 112 },
  chartCol: { flex: 1, alignItems: 'center', gap: space[1] + 1, height: '100%' },
  chartBarTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderRadius: radius.full, minHeight: 4 },
  chartLbl: { fontSize: text.xs, color: c.textFaint, textTransform: 'capitalize' },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  catName: { fontSize: text.base, color: c.text },

  cajita: { width: 38, height: 38, borderRadius: radius.thumb, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  upRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  upTitle: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  upSub: { fontSize: text.sm, color: c.textFaint, marginTop: 1 },
  upDate: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },

  /* Sin plan */
  noPlan: { paddingVertical: space[8], paddingHorizontal: space[6], alignItems: 'center', gap: space[3] },
  noPlanIcon: { width: 60, height: 60, borderRadius: radius.card, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  noPlanTitle: { fontSize: text.lg, fontWeight: weight.bold, color: c.text, textAlign: 'center', letterSpacing: -0.5 },
  noPlanText: { fontSize: text.base, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
  noPlanBtn: {
    marginTop: space[2], backgroundColor: c.brand, borderRadius: radius.button,
    paddingHorizontal: space[6], height: touch.button, alignItems: 'center', justifyContent: 'center',
    ...(c.isDark ? {} : brandShadow(c.brand)),
  },
  noPlanBtnText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
});
