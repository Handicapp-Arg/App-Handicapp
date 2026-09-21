import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Wheat, Syringe, Hammer, Activity, Wrench, Truck, Package, Plus, type LucideIcon,
} from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useHorse, useFinancialSummary } from '../../../../hooks/use-horses';
import { useAuth } from '../../../../lib/auth';
import { haptic } from '../../../../lib/haptics';
import { Routes } from '../../../../lib/routes';
import { formatMoney } from '../../../../lib/currency';
import { fechaHumana, mesCorto } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, weight, radius, touch, shadow, brandShadow } from '../../../../styles/tokens';
import { entradaFila } from '../../../../styles/motion';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { PressableScale } from '../../../../components/PressableScale';
import { EmptyState } from '../../../../components/EmptyState';
import { ErrorState } from '../../../../components/ErrorState';
import { Skeleton } from '../../../../components/Skeleton';
import { colors } from '../../../../lib/colors';

/** Colores por categoría con tokens semánticos del theme (legibles en ambos temas). */
function makeExpenseCategoryMeta(c: ThemeColors): Record<string, { Icon: LucideIcon; color: string; bg: string; label: string }> {
  return {
    alimentacion:  { Icon: Wheat,    color: c.success,   bg: c.successSoft, label: 'Alimentación' },
    veterinario:   { Icon: Syringe,  color: c.danger,    bg: c.dangerSoft,  label: 'Veterinario' },
    herradero:     { Icon: Hammer,   color: c.goldText,  bg: c.goldSoft,    label: 'Herradero' },
    entrenamiento: { Icon: Activity, color: c.info,      bg: c.infoSoft,    label: 'Entrenamiento' },
    mantenimiento: { Icon: Wrench,   color: c.textMuted, bg: c.surfaceAlt,  label: 'Mantenimiento' },
    transporte:    { Icon: Truck,    color: c.info,      bg: c.infoSoft,    label: 'Transporte' },
    otros:         { Icon: Package,  color: c.textMuted, bg: c.surfaceAlt,  label: 'Otros' },
  };
}

const BARRA_MAX = 58;  // alto máximo de una barra del mini gráfico del hero
const BARRA_MIN = 6;

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

  /**
   * Serie del mini gráfico: el backend manda los meses del más nuevo al más
   * viejo, y un gráfico se lee de izquierda (pasado) a derecha (presente), así
   * que se invierte. El delta sale de comparar los dos meses más recientes.
   */
  const serie = useMemo(() => {
    const meses = (financial?.monthly ?? []).slice(0, 6);
    const max = Math.max(...meses.map((m) => m.total), 1);
    const delta = meses.length >= 2 && meses[1].total > 0
      ? Math.round(((meses[0].total - meses[1].total) / meses[1].total) * 100)
      : null;
    return { barras: [...meses].reverse(), max, delta };
  }, [financial]);

  /**
   * Gastado en el año en curso. El backend manda hasta 24 meses en `monthly`
   * (clave 'YYYY-MM'), así que el año calendario se suma acá y no hace falta
   * un endpoint nuevo. Es lo que dice el hero: el acumulado histórico no le
   * sirve a nadie para decidir nada.
   */
  const gastadoEsteAnio = useMemo(() => {
    const anio = String(new Date().getFullYear());
    return (financial?.monthly ?? [])
      .filter((m) => m.month.startsWith(anio))
      .reduce((acc, m) => acc + m.total, 0);
  }, [financial]);

  if (isHorseError && !horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Finanzas" />
        <ErrorState onRetry={refetchHorse} />
      </View>
    );
  }

  if (isLoading || !horse) {
    // Silueta idéntica a la real: la tarjeta hero grande y después filas.
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Finanzas" />
        <View style={{ paddingHorizontal: space[4], paddingTop: space[5] }}>
          <Skeleton height={196} borderRadius={radius.sheet} />
        </View>
        <View style={{ paddingHorizontal: space[4], marginTop: space[8], gap: space[5] }}>
          <Skeleton width={140} height={20} />
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={42} />)}
        </View>
      </View>
    );
  }

  const sinDatos = isError && !financial ? 'error' : (!financial || financial.total === 0) ? 'vacio' : null;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Finanzas" subtitle={horse.name} />

      {sinDatos === 'error' ? (
        <ErrorState onRetry={refetch} />
      ) : sinDatos === 'vacio' ? (
        <EmptyState
          icon="receipt-outline"
          title="Sin gastos registrados"
          message="Cargá el primer gasto de este caballo y vas a ver acá el total, en qué se va y el detalle mes a mes."
          actionLabel={puedeRegistrar ? 'Registrar gasto' : undefined}
          onAction={puedeRegistrar ? irARegistrarGasto : undefined}
        />
      ) : financial ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + space[20] }}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Hero: la tarjeta de tinta con el único número que importa ─── */}
          <Animated.View entering={entradaFila(0)} style={s.heroWrap}>
            <View style={s.hero}>
              <Text style={s.heroLabel}>Gastado este año</Text>
              <Text style={s.heroValor} numberOfLines={1} adjustsFontSizeToFit>
                {formatMoney(gastadoEsteAnio)}
              </Text>

              <View style={s.heroMetaRow}>
                {serie.delta !== null && (
                  <View style={s.chip}>
                    {/* El relleno translúcido se hace con una capa aparte: aplicar
                        opacity al chip entero también apagaría el texto. */}
                    <View style={[StyleSheet.absoluteFill, s.chipFondo]} />
                    <Text style={s.chipText}>
                      {serie.delta > 0 ? '+' : serie.delta < 0 ? '−' : ''}{Math.abs(serie.delta)}%
                    </Text>
                  </View>
                )}
                <Text style={s.heroMeta}>
                  {serie.delta !== null ? 'vs. el mes pasado' : `Promedio ${formatMoney(financial.average_monthly)} por mes`}
                </Text>
              </View>

              {serie.barras.length > 0 && (
                <View style={s.grafico}>
                  {serie.barras.map((m, i) => {
                    const esUltimo = i === serie.barras.length - 1;
                    return (
                      <View key={m.month} style={s.graficoCol}>
                        <View
                          style={[
                            s.barra,
                            { height: Math.max(BARRA_MIN, (m.total / serie.max) * BARRA_MAX) },
                            // El mes corriente va a plena opacidad: es el que se lee.
                            esUltimo ? s.barraActual : s.barraPasada,
                          ]}
                        />
                        <Text style={[s.graficoLabel, esUltimo && s.graficoLabelActual]}>{mesCorto(m.month)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </Animated.View>

          {/* ─── En qué se va ─── */}
          {(financial.by_category ?? []).length > 0 && (
            <>
              <View style={s.tituloRow}>
                <Text style={s.tituloSeccion}>En qué se va</Text>
                <Text style={s.tituloMeta}>del total</Text>
              </View>
              <View style={s.lista}>
                {financial.by_category.map((cat, i, arr) => {
                  const meta = categoryMeta[cat.category] ?? { Icon: Package, color: c.textMuted, bg: c.surfaceAlt, label: cat.category };
                  const MetaIcon = meta.Icon;
                  const pct = financial.total > 0 ? (cat.total / financial.total) * 100 : 0;
                  return (
                    <Animated.View
                      key={cat.category}
                      entering={entradaFila(i + 1)}
                      style={[s.fila, i < arr.length - 1 && s.filaBorde]}
                    >
                      <View style={[s.filaIcono, { backgroundColor: meta.bg }]}>
                        <MetaIcon size={19} color={meta.color} strokeWidth={1.9} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.filaNombre} numberOfLines={1}>{meta.label}</Text>
                        <Text style={s.filaSub}>{pct.toFixed(0)}% del total</Text>
                      </View>
                      <Text style={s.filaMonto}>{formatMoney(cat.total)}</Text>
                    </Animated.View>
                  );
                })}
              </View>
            </>
          )}

          {/* ─── Últimos gastos ─── */}
          {(financial.recent_expenses ?? []).length > 0 && (
            <>
              <View style={s.tituloRow}>
                <Text style={s.tituloSeccion}>Últimos gastos</Text>
              </View>
              <View style={s.lista}>
                {financial.recent_expenses.map((exp, i, arr) => {
                  const meta = categoryMeta[exp.expense_category ?? ''] ?? { Icon: Package, color: c.textMuted, bg: c.surfaceAlt, label: exp.expense_category ?? 'Otros' };
                  const MetaIcon = meta.Icon;
                  return (
                    <Animated.View
                      key={exp.id}
                      entering={entradaFila(i)}
                      style={[s.fila, i < arr.length - 1 && s.filaBorde]}
                    >
                      <View style={[s.filaIcono, { backgroundColor: meta.bg }]}>
                        <MetaIcon size={19} color={meta.color} strokeWidth={1.9} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.filaNombre} numberOfLines={1}>{exp.description}</Text>
                        <Text style={s.filaSub}>{fechaHumana(exp.date) || meta.label}</Text>
                      </View>
                      <Text style={s.filaMonto}>{formatMoney(exp.amount)}</Text>
                    </Animated.View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      ) : null}

      {/* ─── CTA fijo ─── */}
      {puedeRegistrar && sinDatos !== 'vacio' && (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={['transparent', c.bg]}
            style={[s.velo, { height: insets.bottom + space[20] }]}
          />
          <View style={[s.ctaWrap, { paddingBottom: insets.bottom + space[4] }]}>
            <PressableScale
              style={s.cta}
              onPress={irARegistrarGasto}
              accessibilityRole="button"
              accessibilityLabel="Registrar un gasto de este caballo"
            >
              <Plus size={19} color={colors.white} strokeWidth={2.4} />
              <Text style={s.ctaText}>Registrar un gasto</Text>
            </PressableScale>
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  /**
   * Hero de tinta: `c.text` como fondo y `c.bg` como texto. Es la "superficie
   * invertida" del sistema, y se da vuelta sola en oscuro sin tocar nada.
   */
  heroWrap: { paddingHorizontal: space[4], paddingTop: space[5] },
  hero: { backgroundColor: c.text, borderRadius: radius.sheet, padding: space[5], ...(c.isDark ? {} : shadow.md) },
  heroLabel: { fontSize: text.sm - 1, color: c.textMuted },
  heroValor: { fontSize: text.display + 4, fontWeight: weight.bold, color: c.bg, letterSpacing: -1.6, marginTop: space[1], fontVariant: ['tabular-nums'] },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[3] },
  chip: { height: 24, paddingHorizontal: space[2] + 1, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  chipFondo: { backgroundColor: c.bg, opacity: 0.16, borderRadius: radius.full },
  chipText: { fontSize: text.xs, fontWeight: weight.bold, color: c.bg },
  heroMeta: { fontSize: text.sm - 1, color: c.textMuted, flexShrink: 1 },

  grafico: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2], marginTop: space[5] },
  graficoCol: { flex: 1, alignItems: 'center', gap: space[2] - 1 },
  barra: { width: '100%', borderRadius: radius.sm - 1 },
  barraPasada: { backgroundColor: c.bg, opacity: 0.16 },
  barraActual: { backgroundColor: c.bg },
  graficoLabel: { fontSize: text.xs - 2, color: c.textMuted },
  graficoLabelActual: { color: c.bg, fontWeight: weight.bold },

  /* Secciones */
  tituloRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[4], marginTop: space[7], marginBottom: space[1],
  },
  tituloSeccion: { fontSize: text.md + 1, fontWeight: weight.bold, color: c.text, letterSpacing: -0.4 },
  tituloMeta: { fontSize: text.sm, color: c.textFaint },

  /* Filas planas sobre el lienzo */
  lista: { paddingHorizontal: space[4] },
  fila: { flexDirection: 'row', alignItems: 'center', gap: space[3] + 2, paddingVertical: space[3] + 2 },
  filaBorde: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  filaIcono: { width: 40, height: 40, borderRadius: radius.thumb - 2, alignItems: 'center', justifyContent: 'center' },
  filaNombre: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  filaSub: { fontSize: text.sm - 1, color: c.textFaint, marginTop: 2 },
  filaMonto: { fontSize: text.md, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },

  /* CTA */
  velo: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  ctaWrap: { position: 'absolute', left: space[4], right: space[4], bottom: 0 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] + 1,
    height: touch.button, borderRadius: radius.button, backgroundColor: c.brand,
    ...(c.isDark ? {} : brandShadow(c.brand)),
  },
  ctaText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
});
