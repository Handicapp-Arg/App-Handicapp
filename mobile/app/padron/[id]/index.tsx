import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, type Router } from 'expo-router';
import Animated from 'react-native-reanimated';
import { CheckCircle2, Info } from 'lucide-react-native';

import { useHorseRecordDetail } from '../../../hooks/use-horse-records';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, weight, radius, shadow, touch } from '../../../styles/tokens';
import { entradaFila } from '../../../styles/motion';
import { haptic } from '../../../lib/haptics';
import { nav } from '../../../lib/routes';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { PressableScale } from '../../../components/PressableScale';
import { Skeleton } from '../../../components/Skeleton';
import { ErrorState } from '../../../components/ErrorState';

const SEX_LABEL: Record<string, string> = { macho: 'macho', hembra: 'hembra', castrado: 'castrado' };

/** Las tres caras de un registro del padrón. El orden es el del lienzo. */
type PadronTab = 'pedigree' | 'progenie' | 'datos';
const TABS: { key: PadronTab; label: string }[] = [
  { key: 'pedigree', label: 'Pedigrí' },
  { key: 'progenie', label: 'Hijos' },
  { key: 'datos', label: 'Datos' },
];

/**
 * Píldoras de navegación del padrón. Viven acá y las importan las otras dos
 * pantallas del registro: una sola definición evita que las tres se vayan
 * separando con cada retoque. La seleccionada va en negro (`c.text`), que es
 * la superficie invertida del sistema; el verde queda reservado a la acción.
 */
export function PadronTabs({ id, active }: { id: string; active: PadronTab }) {
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => makeTabStyles(c), [c]);

  const ir = (key: PadronTab) => {
    if (key === active) return;
    haptic.selection();
    // `replace` y no `push`: moverse entre pestañas de un mismo registro no es
    // entrar más hondo, así que no debe apilar pantallas para volver.
    const destino = key === 'datos' ? `/padron/${id}` : `/padron/${id}/${key}`;
    (router as Router).replace(destino as never);
  };

  return (
    <View style={s.row}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <PressableScale
            key={t.key}
            style={[s.pill, on ? s.pillOn : s.pillOff]}
            onPress={() => ir(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t.label}
          >
            <Text style={[s.pillText, on ? s.pillTextOn : s.pillTextOff]}>{t.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const makeTabStyles = (c: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingBottom: space[4] },
  pill: {
    height: 38,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillOn: { backgroundColor: c.text },
  pillOff: { backgroundColor: c.surface, ...(c.isDark ? {} : shadow.sm) },
  pillText: { fontSize: text.sm },
  pillTextOn: { color: c.bg, fontWeight: weight.semibold },
  pillTextOff: { color: c.textMuted, fontWeight: weight.medium },
});

/** Esqueleto con la silueta del contenido real: píldoras, ficha y aviso. */
function DatosSkeleton({ s }: { s: Styles }) {
  return (
    <View style={s.body}>
      <View style={{ flexDirection: 'row', gap: space[2], marginBottom: space[4] }}>
        {[72, 64, 68].map((w, i) => <Skeleton key={i} width={w} height={38} borderRadius={radius.full} />)}
      </View>
      <View style={s.card}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={s.infoRow}>
            <Skeleton width={90} height={13} />
            <Skeleton width={120} height={15} />
          </View>
        ))}
      </View>
      <Skeleton height={72} borderRadius={radius.card} style={{ marginTop: space[4] }} />
    </View>
  );
}

export default function PadronRegistroScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: detail, isLoading, isError, refetch } = useHorseRecordDetail(id);

  const vitals = detail
    ? [
        detail.birth_year != null ? String(detail.birth_year) : null,
        detail.sex ? SEX_LABEL[detail.sex] : null,
        detail.breed,
      ].filter(Boolean).join(' · ')
    : '';

  const filas: [string, string | null | undefined][] = detail
    ? [
        ['Nro. de registro', detail.registration_number],
        ['Raza', detail.breed],
        ['Pelo', detail.color],
        ['País', detail.country_code],
        ['Padre', detail.sire_name],
        ['Madre', detail.dam_name],
      ]
    : [];
  const visibles = filas.filter(([, v]) => !!v);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader scrollable showBack title={detail?.name ?? 'Registro'} subtitle={vitals || 'Padrón'} />

      {isLoading ? (
        <DatosSkeleton s={s} />
      ) : isError || !detail ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <View style={s.body}>
          <PadronTabs id={id} active="datos" />

          <View style={s.card}>
            {visibles.map(([label, value], i) => (
              <Animated.View key={label} entering={entradaFila(i)} style={[s.infoRow, i > 0 && s.infoRowBorde]}>
                <Text style={s.infoLabel}>{label}</Text>
                <Text style={s.infoValue} numberOfLines={2}>{value}</Text>
              </Animated.View>
            ))}
            {visibles.length === 0 && (
              <Text style={s.vacio}>El registro no trae más datos que el nombre.</Text>
            )}
          </View>

          <Animated.View entering={entradaFila(visibles.length)}>
            {detail.verified_owner ? (
              <View style={s.aviso}>
                <View style={[s.avisoIcono, { backgroundColor: c.brandSoft }]}>
                  <CheckCircle2 size={19} color={c.brand} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.avisoTitulo}>Propietario verificado</Text>
                  <Text style={s.avisoTexto}>{detail.verified_owner.name}</Text>
                </View>
              </View>
            ) : (
              <View style={s.aviso}>
                <View style={[s.avisoIcono, { backgroundColor: c.goldSoft }]}>
                  <Info size={19} color={c.goldText} strokeWidth={1.9} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.avisoTitulo}>Sin propietario verificado</Text>
                  <Text style={s.avisoTexto}>Si es tuyo, vinculalo desde la ficha del caballo.</Text>
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      )}
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingBottom: space[12] },
  body: { paddingTop: space[4] },

  card: {
    marginHorizontal: space[4],
    backgroundColor: c.surface,
    borderRadius: radius.card,
    paddingHorizontal: space[4],
    ...(c.isDark ? {} : shadow.md),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[4],
    minHeight: touch.min + space[2],
    paddingVertical: space[2],
  },
  infoRowBorde: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  infoLabel: { fontSize: text.sm, color: c.textFaint, flexShrink: 0 },
  infoValue: { flex: 1, fontSize: text.base, color: c.text, fontWeight: weight.semibold, textAlign: 'right' },
  vacio: { paddingVertical: space[5], fontSize: text.sm, color: c.textFaint, textAlign: 'center' },

  aviso: {
    marginHorizontal: space[4],
    marginTop: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    backgroundColor: c.surface,
    borderRadius: radius.card,
    padding: space[4],
    ...(c.isDark ? {} : shadow.md),
  },
  avisoIcono: { width: 42, height: 42, borderRadius: radius.thumb, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avisoTitulo: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  avisoTexto: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },
});
