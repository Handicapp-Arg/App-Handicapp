import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, User } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useHorse } from '../../../../hooks/use-horses';
import { useRoutines, useUpsertRoutine, ROUTINE_ITEMS, todayISO } from '../../../../hooks/use-routines';
import { haptic } from '../../../../lib/haptics';
import { hora, diaLargo, diaInicial } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, weight, radius } from '../../../../styles/tokens';
import { entradaFila } from '../../../../styles/motion';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { PressableScale } from '../../../../components/PressableScale';
import { ErrorState } from '../../../../components/ErrorState';
import { Skeleton } from '../../../../components/Skeleton';

const RING = 96;
const RING_STROKE = 11;
const TREND_MAX = 50;  // alto máximo de la barra de un día en la tendencia
const TREND_MIN = 6;

/**
 * Anillo de avance del día: un solo arco sobre una pista neutra. Va con SVG
 * porque en React Native no hay `conic-gradient` y una barra circular hecha con
 * Views siempre deja costura donde se unen las mitades.
 */
function AnilloRutina({ hechas, total, c }: { hechas: number; total: number; c: ThemeColors }) {
  const r = (RING - RING_STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const largo = total > 0 ? (hechas / total) * circ : 0;
  return (
    <Svg width={RING} height={RING}>
      <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={c.border} strokeWidth={RING_STROKE} fill="none" />
      {largo > 0 && (
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke={c.success}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${largo} ${circ - largo}`}
          // -90° para que el arco arranque arriba, no a las 3 en punto.
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      )}
    </Svg>
  );
}

export default function RutinaScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading, isError, refetch } = useHorse(id);
  const { data: routines } = useRoutines(id);
  const upsertRoutine = useUpsertRoutine(id);
  const today = todayISO();
  const todayRoutine = routines?.find((r) => r.date === today);

  const hechas = ROUTINE_ITEMS.filter(({ key }) => todayRoutine?.[key]).length;
  const total = ROUTINE_ITEMS.length;
  const pendientes = ROUTINE_ITEMS.filter(({ key }) => !todayRoutine?.[key]);

  if (isError && !horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Rutina" />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  if (isLoading || !horse) {
    // Silueta real: anillo + resumen, y después la checklist plana.
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Rutina" />
        <View style={s.resumen}>
          <Skeleton width={RING} height={RING} borderRadius={radius.full} />
          <View style={{ flex: 1, gap: space[2] }}>
            <Skeleton height={18} />
            <Skeleton width="70%" height={14} />
          </View>
        </View>
        <View style={{ paddingHorizontal: space[4], marginTop: space[8], gap: space[4] }}>
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={26} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Rutina" subtitle={`${horse.name} · ${diaLargo(today)}`} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Resumen del día ─── */}
        <Animated.View entering={entradaFila(0)} style={s.resumen}>
          <View style={s.anilloWrap}>
            <AnilloRutina hechas={hechas} total={total} c={c} />
            <View style={s.anilloCentro}>
              <Text style={s.anilloValor}>{hechas}/{total}</Text>
              <Text style={s.anilloCaption}>hoy</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.resumenTitulo}>
              {hechas === total ? 'La rutina de hoy está completa' : `Van ${hechas} de ${total} tareas`}
            </Text>
            {pendientes.length > 0 && (
              <Text style={s.resumenSub}>
                Falta{pendientes.length === 1 ? '' : 'n'} {pendientes.map((p) => p.label.toLowerCase()).join(', ')}.
              </Text>
            )}
            {/* Prueba de trabajo: quién cargó la rutina de hoy. */}
            {todayRoutine?.filler?.name && (
              <View style={s.autorRow}>
                <User size={14} color={c.textFaint} strokeWidth={1.9} />
                <Text style={s.autorText}>
                  Cargó {todayRoutine.filler.name}
                  {todayRoutine.created_at ? ` · ${hora(todayRoutine.created_at)}` : ''}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ─── Checklist de hoy ─── */}
        <Text style={s.tituloSeccion}>Hoy</Text>
        <View style={s.lista}>
          {ROUTINE_ITEMS.map(({ key, label }, i) => {
            const checked = todayRoutine?.[key] ?? false;
            return (
              <Animated.View key={key} entering={entradaFila(i + 1)}>
                <PressableScale
                  scaleTo={0.98}
                  style={[s.fila, i < ROUTINE_ITEMS.length - 1 && s.filaBorde]}
                  onPress={() => { haptic.selection(); upsertRoutine.mutate({ date: today, [key]: !checked }); }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={checked ? `${label}, hecho` : `${label}, sin hacer`}
                >
                  <View style={[s.marca, checked ? s.marcaHecha : s.marcaVacia]}>
                    {checked && <Check size={15} color={c.bg} strokeWidth={3} />}
                  </View>
                  <Text style={[s.filaLabel, !checked && s.filaLabelPendiente]}>{label}</Text>
                  {checked
                    ? <Text style={s.filaHecho}>Hecho</Text>
                    : <Text style={s.filaMarcar}>Marcar</Text>}
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>

        {/* ─── Tendencia ─── */}
        {routines && routines.length > 1 && (
          <>
            <Text style={s.tituloSeccion}>Últimos {routines.length} días</Text>
            <View style={s.tendencia}>
              {[...routines].reverse().map((r) => {
                const hechasDia = ROUTINE_ITEMS.filter(({ key }) => r[key]).length;
                const pct = hechasDia / total;
                const esHoy = r.date === today;
                return (
                  <View key={r.date} style={s.tendenciaCol}>
                    <View
                      style={[
                        s.tendenciaBarra,
                        { height: Math.max(TREND_MIN, pct * TREND_MAX) },
                        // Verde cuando el día cerró bien, ámbar si quedó a medias
                        // y neutro si no se cargó nada: el color es el diagnóstico.
                        { backgroundColor: pct >= 0.7 ? c.success : pct >= 0.4 ? c.warning : pct > 0 ? c.danger : c.border },
                      ]}
                    />
                    <Text style={[s.tendenciaLabel, esHoy && s.tendenciaLabelHoy]}>{diaInicial(r.date)}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  /* Resumen */
  resumen: { flexDirection: 'row', alignItems: 'center', gap: space[5], paddingHorizontal: space[4], paddingTop: space[5] },
  anilloWrap: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  anilloCentro: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  anilloValor: { fontSize: text.lg, fontWeight: weight.bold, color: c.text, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  anilloCaption: { fontSize: text.xs - 1, color: c.textFaint, marginTop: 3 },
  resumenTitulo: { fontSize: text.md, fontWeight: weight.semibold, color: c.text, lineHeight: 23 },
  resumenSub: { fontSize: text.sm, color: c.textMuted, marginTop: space[1], lineHeight: 20 },
  autorRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] - 1, marginTop: space[2] + 2 },
  autorText: { fontSize: text.sm - 1, color: c.textFaint, flexShrink: 1 },

  /* Secciones y filas planas sobre el lienzo */
  tituloSeccion: {
    fontSize: text.md + 1, fontWeight: weight.bold, color: c.text, letterSpacing: -0.4,
    paddingHorizontal: space[4], marginTop: space[8], marginBottom: space[1],
  },
  lista: { paddingHorizontal: space[4] },
  fila: { flexDirection: 'row', alignItems: 'center', gap: space[3] + 2, paddingVertical: space[3] + 1 },
  filaBorde: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  marca: { width: 26, height: 26, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  marcaHecha: { backgroundColor: c.success },
  // El pendiente es un anillo, no un círculo relleno: pesa menos que lo hecho.
  marcaVacia: { borderWidth: 2, borderColor: c.borderStrong },
  filaLabel: { flex: 1, fontSize: text.md, fontWeight: weight.medium, color: c.text },
  filaLabelPendiente: { color: c.textMuted },
  filaHecho: { fontSize: text.sm, color: c.textFaint },
  filaMarcar: { fontSize: text.sm, fontWeight: weight.semibold, color: c.brand },

  /* Tendencia */
  tendencia: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2] + 1, paddingHorizontal: space[4], marginTop: space[3] },
  tendenciaCol: { flex: 1, alignItems: 'center', gap: space[2] - 1 },
  tendenciaBarra: { width: '100%', borderRadius: radius.sm - 1 },
  tendenciaLabel: { fontSize: text.xs - 1, color: c.textFaint },
  tendenciaLabelHoy: { color: c.text, fontWeight: weight.bold },
});
