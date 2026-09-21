import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ShieldCheck } from 'lucide-react-native';

import { useHorseRecordDetail, useHorseRecordTree, type HorseRecordNode } from '../../../hooks/use-horse-records';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, weight, radius, shadow } from '../../../styles/tokens';
import { duration, easing } from '../../../styles/motion';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Skeleton } from '../../../components/Skeleton';
import { ErrorState } from '../../../components/ErrorState';
import { PadronTabs } from './index';

const SEX_LABEL: Record<string, string> = { macho: 'macho', hembra: 'hembra', castrado: 'castrado' };

/** Alto del árbol. Fijo porque los conectores se dibujan en porcentaje: si la
 *  columna creciera con el contenido, las curvas dejarían de tocar las tarjetas. */
const ALTO = 448;
/** Ancho de las dos columnas de conectores entre generaciones. */
const CONECTOR = 22;

/**
 * Una llave que se abre: sube a la tarjeta de arriba y baja a la de abajo.
 * Es un borde en L con esquina redondeada, no una línea recta, porque el trazo
 * curvo es lo que lee como "árbol" y no como tabla.
 */
function Llave({ c }: { c: ThemeColors }) {
  return (
    <View style={{ width: CONECTOR, justifyContent: 'center' }}>
      <View style={{ height: '50%', borderRightWidth: 2, borderTopWidth: 2, borderColor: c.borderStrong, borderTopRightRadius: radius.md, marginRight: 10 }} />
      <View style={{ height: '50%', borderRightWidth: 2, borderBottomWidth: 2, borderColor: c.borderStrong, borderBottomRightRadius: radius.md, marginRight: 10 }} />
    </View>
  );
}

/** Las cuatro llaves de padres → abuelos, más finas porque están un paso atrás. */
function LlavesAbuelos({ c }: { c: ThemeColors }) {
  const base = { borderRightWidth: 2, borderColor: c.border, marginRight: 10 } as const;
  return (
    <View style={{ width: CONECTOR, justifyContent: 'space-around' }}>
      <View style={[base, { height: '22%', borderTopWidth: 2, borderTopRightRadius: radius.md }]} />
      <View style={[base, { height: '22%', borderBottomWidth: 2, borderBottomRightRadius: radius.md, marginBottom: space[4] }]} />
      <View style={[base, { height: '22%', borderTopWidth: 2, borderTopRightRadius: radius.md, marginTop: space[4] }]} />
      <View style={[base, { height: '22%', borderBottomWidth: 2, borderBottomRightRadius: radius.md }]} />
    </View>
  );
}

/** Tarjeta de un padre: el rol lo dice la etiqueta y lo confirma la barra lateral. */
function Progenitor({ rol, nodo, acento, s }: { rol: string; nodo: HorseRecordNode | null; acento: string; s: Styles }) {
  return (
    <View style={[s.padre, { borderLeftColor: acento }]}>
      <Text style={s.rol}>{rol}</Text>
      <Text style={s.padreNombre} numberOfLines={2}>{nodo?.name ?? 'Sin dato'}</Text>
      {nodo?.birth_year != null && <Text style={s.anio}>{nodo.birth_year}</Text>}
    </View>
  );
}

/** Tarjeta de abuelo. Si no hay dato la tarjeta igual ocupa su lugar: el hueco
 *  también es información (dice hasta dónde llega el registro). */
function Abuelo({ nodo, s }: { nodo: HorseRecordNode | null; s: Styles }) {
  if (!nodo) {
    return (
      <View style={[s.abuelo, s.abueloVacio]}>
        <Text style={s.abueloVacioTexto}>Sin dato</Text>
      </View>
    );
  }
  return (
    <View style={s.abuelo}>
      <Text style={s.abueloNombre} numberOfLines={2}>{nodo.name}</Text>
      {nodo.birth_year != null && <Text style={s.anioSm}>{nodo.birth_year}</Text>}
    </View>
  );
}

/** Esqueleto con la silueta del árbol: tres columnas, 1 + 2 + 4 tarjetas. */
function ArbolSkeleton({ ancho }: { ancho: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 0, height: ALTO, paddingHorizontal: space[4] }}>
      <View style={{ width: ancho, justifyContent: 'center' }}>
        <Skeleton height={86} borderRadius={radius.button} />
      </View>
      <View style={{ width: CONECTOR }} />
      <View style={{ width: ancho, justifyContent: 'space-around' }}>
        <Skeleton height={92} borderRadius={radius.field} />
        <Skeleton height={92} borderRadius={radius.field} />
      </View>
      <View style={{ width: CONECTOR }} />
      <View style={{ width: ancho, justifyContent: 'space-between' }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={64} borderRadius={radius.thumb} />)}
      </View>
    </View>
  );
}

export default function PadronPedigreeScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { width } = useWindowDimensions();

  // Tres columnas iguales dentro del margen de pantalla, descontando las dos
  // columnas de conectores. Se calcula con el ancho real y no con un número
  // fijo para que un teléfono chico o una tablet no rompan la grilla.
  const ancho = Math.max(72, (width - space[4] * 2 - CONECTOR * 2) / 3);

  const { data: detail } = useHorseRecordDetail(id);
  const { data: arbol, isLoading, isError, refetch } = useHorseRecordTree(id, 3);

  const vitals = detail
    ? [
        detail.birth_year != null ? String(detail.birth_year) : null,
        detail.sex ? SEX_LABEL[detail.sex] : null,
        detail.breed,
      ].filter(Boolean).join(' · ')
    : '';

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <ScreenHeader scrollable showBack title={detail?.name ?? 'Pedigrí'} subtitle={vitals || 'Pedigrí'} />
      <PadronTabs id={id} active="pedigree" />

      {isLoading ? (
        <ArbolSkeleton ancho={ancho} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : !arbol ? (
        <Text style={s.vacio}>El registro no tiene pedigrí cargado.</Text>
      ) : (
        // El árbol entra entero y no fila por fila: es UNA figura, y escalonarla
        // por partes la haría ver como una lista que se arma sola.
        <Animated.View entering={FadeIn.duration(duration.enter).easing(easing.outQuart.factory())}>
          <View style={[s.arbol, { height: ALTO }]}>
            <View style={{ width: ancho, justifyContent: 'center' }}>
              <View style={s.raiz}>
                <Text style={s.raizRol}>El caballo</Text>
                <Text style={s.raizNombre} numberOfLines={2}>{arbol.name}</Text>
                {arbol.birth_year != null && <Text style={s.raizAnio}>{arbol.birth_year}</Text>}
              </View>
            </View>

            <Llave c={c} />

            <View style={{ width: ancho, justifyContent: 'space-around' }}>
              <Progenitor rol="Padre" nodo={arbol.sire} acento={c.info} s={s} />
              <Progenitor rol="Madre" nodo={arbol.dam} acento={c.danger} s={s} />
            </View>

            <LlavesAbuelos c={c} />

            <View style={{ width: ancho, justifyContent: 'space-between' }}>
              <Abuelo nodo={arbol.sire?.sire ?? null} s={s} />
              <Abuelo nodo={arbol.sire?.dam ?? null} s={s} />
              <Abuelo nodo={arbol.dam?.sire ?? null} s={s} />
              <Abuelo nodo={arbol.dam?.dam ?? null} s={s} />
            </View>
          </View>

          <View style={s.pie}>
            <ShieldCheck size={15} color={c.textFaint} strokeWidth={1.9} />
            <Text style={s.pieTexto}>Datos del registro oficial</Text>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingBottom: space[12] },
  vacio: { textAlign: 'center', color: c.textFaint, fontSize: text.base, marginTop: space[10] },

  arbol: { flexDirection: 'row', paddingHorizontal: space[4], paddingTop: space[2] },

  // El caballo va en la superficie invertida: es el único nodo que no se compara
  // con otro, así que se distingue por contraste y no por color.
  raiz: { backgroundColor: c.text, borderRadius: radius.button, paddingVertical: space[4], paddingHorizontal: space[3] },
  raizRol: { fontSize: text.xs - 1, color: c.textMuted },
  raizNombre: { fontSize: text.base, fontWeight: weight.semibold, color: c.bg, marginTop: 3 },
  raizAnio: { fontSize: text.xs - 1, color: c.textMuted, marginTop: 3 },

  padre: {
    backgroundColor: c.surface,
    borderRadius: radius.field,
    padding: space[3],
    borderLeftWidth: 3,
    ...(c.isDark ? {} : shadow.sm),
  },
  rol: { fontSize: text.xs - 1, color: c.textFaint },
  padreNombre: { fontSize: text.sm + 1, fontWeight: weight.semibold, color: c.text, marginTop: 2 },
  anio: { fontSize: text.xs - 1, color: c.textFaint, marginTop: 2 },

  abuelo: {
    backgroundColor: c.surface,
    borderRadius: radius.thumb,
    padding: space[2] + 2,
    ...(c.isDark ? {} : shadow.sm),
  },
  abueloVacio: { backgroundColor: c.surfaceAlt, shadowOpacity: 0, elevation: 0 },
  abueloNombre: { fontSize: text.xs + 1, fontWeight: weight.semibold, color: c.text },
  abueloVacioTexto: { fontSize: text.xs + 1, fontWeight: weight.medium, color: c.textFaint },
  anioSm: { fontSize: text.xs - 2, color: c.textFaint, marginTop: 2 },

  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2], marginTop: space[5] },
  pieTexto: { fontSize: text.sm, color: c.textFaint },
});
