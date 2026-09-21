import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';

import { useHorseRecordDetail, useHorseRecordProgeny, type HorseRecord } from '../../../hooks/use-horse-records';
import { useAuth } from '../../../lib/auth';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, weight, radius, shadow } from '../../../styles/tokens';
import { entradaFila } from '../../../styles/motion';
import { haptic } from '../../../lib/haptics';
import { Routes, nav } from '../../../lib/routes';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { PressableScale } from '../../../components/PressableScale';
import { Skeleton } from '../../../components/Skeleton';
import { ErrorState } from '../../../components/ErrorState';
import { EmptyState } from '../../../components/EmptyState';
import { PadronTabs } from './index';

const SIN_ANIO = 'Sin año';

/** Agrupa los hijos por año de nacimiento, del más nuevo al más viejo. Es el
 *  orden en que se mira una progenie: primero la camada reciente. */
function porAnio(items: HorseRecord[]) {
  const mapa = new Map<string, HorseRecord[]>();
  for (const h of items) {
    const clave = h.birth_year != null ? String(h.birth_year) : SIN_ANIO;
    const grupo = mapa.get(clave);
    if (grupo) grupo.push(h); else mapa.set(clave, [h]);
  }
  return [...mapa.entries()].sort((a, b) => {
    if (a[0] === SIN_ANIO) return 1;
    if (b[0] === SIN_ANIO) return -1;
    return Number(b[0]) - Number(a[0]);
  });
}

function Cifra({ n, etiqueta, s }: { n: number; etiqueta: string; s: Styles }) {
  return (
    <View>
      <Text style={s.cifra}>{n}</Text>
      <Text style={s.cifraEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

/** Esqueleto con la silueta real: la fila de cifras y las filas con miniatura. */
function ProgenieSkeleton({ s }: { s: Styles }) {
  return (
    <View style={{ paddingHorizontal: space[4] }}>
      <View style={{ flexDirection: 'row', gap: space[6], marginBottom: space[6] }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ gap: space[1] }}>
            <Skeleton width={38} height={30} />
            <Skeleton width={64} height={13} />
          </View>
        ))}
      </View>
      <Skeleton width={54} height={14} style={{ marginBottom: space[3] }} />
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={s.filaSkeleton}>
          <Skeleton width={52} height={52} borderRadius={radius.field} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="55%" height={17} />
            <Skeleton width="40%" height={13} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function PadronProgenieScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: detail } = useHorseRecordDetail(id);
  const { data: progenie, isLoading, isError, refetch } = useHorseRecordProgeny(id);

  const grupos = useMemo(() => porAnio(progenie ?? []), [progenie]);
  const total = progenie?.length ?? 0;
  const verificados = progenie?.filter((h) => h.ownership_status === 'verified').length ?? 0;
  const madres = new Set((progenie ?? []).map((h) => h.dam_name).filter(Boolean)).size;

  const abrir = (hijoId: string) => { haptic.selection(); nav.push(router, Routes.padronRegistro(hijoId)); };

  // Índice corrido entre grupos: el escalonado tiene que seguir el orden en que
  // se ven las filas, no reiniciarse en cada año.
  let corrido = -1;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <ScreenHeader scrollable showBack title="Pedigrí" subtitle={detail?.name ?? 'Hijos'} />
      <PadronTabs id={id} active="progenie" />

      {isLoading ? (
        <ProgenieSkeleton s={s} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : total === 0 ? (
        <EmptyState
          icon="paw-outline"
          title="Sin hijos registrados"
          message="El padrón oficial no tiene descendencia cargada para este ejemplar."
        />
      ) : (
        <>
          <View style={s.cifras}>
            <Cifra n={total} etiqueta={total === 1 ? 'Hijo' : 'Hijos'} s={s} />
            <Cifra n={verificados} etiqueta="Verificados" s={s} />
            <Cifra n={madres} etiqueta={madres === 1 ? 'Madre' : 'Madres'} s={s} />
          </View>

          {grupos.map(([anio, hijos]) => (
            <View key={anio} style={s.grupo}>
              <Text style={s.anio}>{anio}</Text>
              {hijos.map((h) => {
                corrido += 1;
                // El primero de todos va como tarjeta: es la camada que se mira
                // primero y la regla de la tarjeta pide un solo dato hero.
                const destacado = corrido === 0;
                const mio = !!user && h.verified_owner?.id === user.id;
                return (
                  <Animated.View key={h.id} entering={entradaFila(corrido)}>
                    <PressableScale
                      style={[s.fila, destacado && s.filaDestacada]}
                      onPress={() => abrir(h.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir el registro de ${h.name}`}
                    >
                      <View style={s.inicial}>
                        <Text style={s.inicialTexto}>{h.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={s.nombreFila}>
                          <Text style={s.nombre} numberOfLines={1}>{h.name}</Text>
                          {mio && (
                            <View style={s.chipMio}>
                              <Text style={s.chipMioTexto}>TUYO</Text>
                            </View>
                          )}
                        </View>
                        {h.dam_name ? (
                          <Text style={s.madre} numberOfLines={1}>
                            Madre: <Text style={s.madreNombre}>{h.dam_name}</Text>
                          </Text>
                        ) : null}
                      </View>
                      <ChevronRight size={17} color={c.textFaint} strokeWidth={2.2} />
                    </PressableScale>
                  </Animated.View>
                );
              })}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingBottom: space[12] },

  cifras: { flexDirection: 'row', gap: space[6], paddingHorizontal: space[4], paddingBottom: space[6] },
  cifra: { fontSize: text['2xl'], fontWeight: weight.bold, color: c.text, letterSpacing: -1 },
  cifraEtiqueta: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },

  grupo: { paddingHorizontal: space[4], marginBottom: space[5] },
  anio: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint, marginBottom: space[3] },

  fila: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], marginBottom: space[1] },
  filaDestacada: {
    backgroundColor: c.surface,
    borderRadius: radius.card,
    padding: space[3] + 2,
    marginBottom: space[3],
    ...(c.isDark ? {} : shadow.lg),
  },
  filaSkeleton: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], marginBottom: space[2] },

  inicial: {
    width: 52, height: 52, borderRadius: radius.field, backgroundColor: c.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  inicialTexto: { fontSize: text.md, fontWeight: weight.bold, color: c.textFaint },

  nombreFila: { flexDirection: 'row', alignItems: 'center', gap: space[2] - 1 },
  nombre: { flexShrink: 1, fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  chipMio: { height: 20, paddingHorizontal: space[2], borderRadius: radius.full, backgroundColor: c.brandSoft, justifyContent: 'center' },
  chipMioTexto: { fontSize: text.xs - 1, fontWeight: weight.bold, letterSpacing: 0.3, color: c.brand },

  madre: { fontSize: text.sm, color: c.textMuted, marginTop: 3 },
  madreNombre: { color: c.dam, fontWeight: weight.semibold },
});
