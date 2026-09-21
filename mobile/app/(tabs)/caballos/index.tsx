import { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView, TextInput,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';
import { ShieldCheck, Building2, Search, Plus } from 'lucide-react-native';
import { useHorses } from '../../../hooks/use-horses';
import { formatMoney } from '../../../lib/currency';
import { useDashboard } from '../../../hooks/use-dashboard';
import { HorseCardSkeleton } from '../../../components/Skeleton';
import { PressableScale } from '../../../components/PressableScale';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { Routes, nav } from '../../../lib/routes';
import { edadEnAnios, vence } from '../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import type { Horse } from '../../../../packages/shared/src';
import { AppImage } from '../../../components/AppImage';
import { space, text, radius, weight, shadow } from '../../../styles/tokens';
import { HorseshoeH } from '../../../components/icons/equine';

/**
 * El semáforo sanitario que manda el backend, traducido a color. El verde no
 * lleva chip: "todo en orden" no merece ocupar una línea de la tarjeta, y si
 * pintáramos los tres estados la lista entera quedaría llena de globitos.
 */
const SEMAFORO = {
  rojo:     { fondo: (c: ThemeColors) => c.dangerSoft, punto: (c: ThemeColors) => c.danger,  texto: (c: ThemeColors) => c.danger },
  amarillo: { fondo: (c: ThemeColors) => c.goldSoft,   punto: (c: ThemeColors) => c.warning, texto: (c: ThemeColors) => c.goldText },
  verde:    { fondo: (c: ThemeColors) => c.brandSoft,  punto: (c: ThemeColors) => c.brand,   texto: (c: ThemeColors) => c.brand },
} as const;

/**
 * La tarjeta muestra la foto al costado y el dato que importa a la derecha.
 * Antes la foto ocupaba toda la tarjeta y el nombre iba encima de un degradado:
 * se veía lindo pero no dejaba leer de un vistazo cuánto gasta cada caballo ni
 * cuál está verificado, que es a lo que se entra a esta pantalla.
 */
function HorseCard({ horse, monthlySpend, c, s }: {
  horse: Horse;
  monthlySpend?: number;
  c: ThemeColors;
  s: Styles;
}) {
  const router = useRouter();
  const edad = edadEnAnios(horse.birth_date);
  const subtitle = [
    horse.activity?.name ?? horse.breed?.name,
    edad != null ? `${edad} ${edad === 1 ? 'año' : 'años'}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <PressableScale
      style={s.card}
      onPress={() => { haptic.light(); router.push(`/(tabs)/caballos/${horse.id}`); }}
      accessibilityRole="button"
      accessibilityLabel={`Ver ficha de ${horse.name}`}
    >
      {horse.image_url ? (
        <AppImage source={{ uri: horse.image_url }} style={s.cardPhoto} />
      ) : (
        <View style={[s.cardPhoto, s.cardPhotoPlaceholder]}>
          <HorseshoeH size={40} color={c.textFaint} />
        </View>
      )}

      <View style={s.cardBody}>
        <View style={s.cardNameRow}>
          <Text style={s.cardName} numberOfLines={1}>{horse.name}</Text>
          {/* El escudo dice "está en el padrón": es el sello de confianza y por
              eso va pegado al nombre, no perdido en una esquina. */}
          {horse.horse_record_id ? (
            <ShieldCheck size={15} color={c.brand} strokeWidth={2.4} />
          ) : null}
        </View>

        {subtitle ? <Text style={s.cardMeta} numberOfLines={1}>{subtitle}</Text> : null}

        {horse.health && horse.health.status !== 'verde' ? (
          <View style={[s.chip, { backgroundColor: SEMAFORO[horse.health.status].fondo(c) }]}>
            <View style={[s.chipPunto, { backgroundColor: SEMAFORO[horse.health.status].punto(c) }]} />
            <Text style={[s.chipText, { color: SEMAFORO[horse.health.status].texto(c) }]} numberOfLines={1}>
              {`${horse.health.name} · ${vence(horse.health.next_due).toLowerCase()}`}
            </Text>
          </View>
        ) : horse.establishment?.name ? (
          <Text style={s.cardEstab} numberOfLines={1}>{horse.establishment.name}</Text>
        ) : null}

        <View style={s.cardSpacer} />

        {monthlySpend != null && monthlySpend > 0 ? (
          <View style={s.cardSpendRow}>
            <Text style={s.cardSpend}>{formatMoney(monthlySpend)}</Text>
            <Text style={s.cardSpendLabel}>este mes</Text>
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

/* El alta de caballo es una pantalla empujada: app/(tabs)/caballos/nuevo.tsx
   (los formularios con tipeo se rompían con el teclado dentro de las hojas). */

/** Los chips se ven compactos a propósito; el hitSlop les da los 44 táctiles. */
const HIT_CHIP = { top: 10, bottom: 10, left: 4, right: 4 };

export default function CaballosScreen() {
  const { can } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: horses, isLoading, isError, refetch, isRefetching } = useHorses();
  const { data: dashboard } = useDashboard();
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterEstab, setFilterEstab] = useState('');
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Horse>>(null);
  useScrollToTop(listRef);

  const spendMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of dashboard?.spend_by_horse ?? []) map[item.horse_id] = item.total;
    return map;
  }, [dashboard?.spend_by_horse]);

  // Opciones de filtro dinámicas según los datos disponibles
  const activityOptions = [...new Set((horses ?? []).map((h) => h.activity?.name).filter(Boolean))] as string[];
  const estabOptions = [...new Set((horses ?? []).map((h) => h.establishment?.name).filter(Boolean))] as string[];
  const hasFilters = activityOptions.length > 1 || estabOptions.length > 1;
  // El buscador aparece recién cuando hay tantos caballos que mirar la lista
  // deja de alcanzar; con cinco es ruido en pantalla.
  const hayBuscador = (horses ?? []).length >= 6;

  const termino = busqueda.trim().toLowerCase();
  const filtered = (horses ?? []).filter((h) => {
    const matchActivity = !filterActivity || h.activity?.name === filterActivity;
    const matchEstab = !filterEstab || h.establishment?.name === filterEstab;
    const matchTermino = !termino || h.name.toLowerCase().includes(termino);
    return matchActivity && matchEstab && matchTermino;
  });

  const limpiarFiltros = () => { setFilterActivity(''); setFilterEstab(''); };
  const sinFiltro = !filterActivity && !filterEstab;

  const encabezado = (
    <>
      <View style={s.header}>
        <Text style={s.title}>Tus caballos</Text>
        {can('horses', 'create') ? (
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => { haptic.medium(); nav.push(router, Routes.caballoNuevo); }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Agregar caballo"
          >
            <Plus size={24} color={c.bg} strokeWidth={2.2} />
          </TouchableOpacity>
        ) : null}
      </View>

      {hayBuscador ? (
        <View style={s.searchWrap}>
          <Search size={18} color={c.textFaint} strokeWidth={1.9} />
          <TextInput
            style={s.searchInput}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar un caballo"
            placeholderTextColor={c.textFaint}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>
      ) : null}

      {hasFilters ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
          style={s.filterScroll}
        >
          <TouchableOpacity
            style={[s.filterChip, sinFiltro && s.filterChipActive]}
            onPress={() => { haptic.selection(); limpiarFiltros(); }}
            activeOpacity={0.75}
            hitSlop={HIT_CHIP}
          >
            <Text style={[s.filterChipText, sinFiltro && s.filterChipTextActive]}>Todos</Text>
          </TouchableOpacity>
          {activityOptions.map((act) => (
            <TouchableOpacity
              key={act}
              style={[s.filterChip, filterActivity === act && s.filterChipActive]}
              onPress={() => { haptic.selection(); setFilterActivity(filterActivity === act ? '' : act); }}
              activeOpacity={0.75}
              hitSlop={HIT_CHIP}
            >
              <Text style={[s.filterChipText, filterActivity === act && s.filterChipTextActive]}>{act}</Text>
            </TouchableOpacity>
          ))}
          {estabOptions.map((est) => (
            <TouchableOpacity
              key={est}
              style={[s.filterChip, filterEstab === est && s.filterChipActive]}
              onPress={() => { haptic.selection(); setFilterEstab(filterEstab === est ? '' : est); }}
              activeOpacity={0.75}
              hitSlop={HIT_CHIP}
            >
              <Building2 size={12} color={filterEstab === est ? c.surface : c.textMuted} strokeWidth={2} />
              <Text style={[s.filterChipText, filterEstab === est && s.filterChipTextActive]}>{est}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
    </>
  );

  if (isLoading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <Text style={s.title}>Tus caballos</Text>
        </View>
        <View style={s.skeletonWrap}>
          {[1, 2, 3].map((i) => <HorseCardSkeleton key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(h) => h.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={
          isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : termino ? (
            <EmptyState
              icon="search-outline"
              title="Ningún caballo con ese nombre"
              message="Probá con otra parte del nombre."
            />
          ) : (
            <EmptyState
              icon="paw-outline"
              title="No hay caballos registrados"
              message="Registrá el primer caballo para empezar a gestionar su historial."
              actionLabel={can('horses', 'create') ? 'Registrar caballo' : undefined}
              onAction={() => { haptic.medium(); nav.push(router, Routes.caballoNuevo); }}
            />
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
            <HorseCard
              horse={item}
              monthlySpend={spendMap[item.id]}
              c={c}
              s={s}
            />
          </Animated.View>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />
        }
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  list: { paddingHorizontal: space[4] + 2, paddingBottom: 140, gap: 14 },
  skeletonWrap: { paddingHorizontal: space[4] + 2, gap: 14 },

  /* ─── Encabezado ───────────────────────────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space[3],
    paddingBottom: space[2],
  },
  title: { fontSize: text['2xl'], fontWeight: weight.bold, color: c.text, letterSpacing: -1.1 },
  // Negro y no verde: el verde es la acción principal de una pantalla y acá la
  // acción principal es entrar a un caballo, no crear uno nuevo.
  addBtn: {
    width: 46, height: 46, borderRadius: radius.thumb,
    backgroundColor: c.text,
    alignItems: 'center', justifyContent: 'center',
  },

  /* ─── Buscador ─────────────────────────────────────────────────────────── */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: space[2] + 2,
    height: 48, borderRadius: radius.thumb,
    backgroundColor: c.surface,
    paddingHorizontal: space[4],
    marginTop: space[2],
    ...(c.isDark ? {} : shadow.sm),
  },
  searchInput: { flex: 1, fontSize: text.base, color: c.text, padding: 0 },

  /* ─── Filtros ──────────────────────────────────────────────────────────── */
  filterScroll: { maxHeight: 52, marginTop: space[3] },
  filterRow: { gap: space[2], paddingVertical: space[1] },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 36, paddingHorizontal: space[4],
    borderRadius: radius.full,
    backgroundColor: c.surface,
    ...(c.isDark ? {} : shadow.sm),
  },
  // Selección neutra invertida (como los toggles de apps consolidadas).
  filterChipActive: { backgroundColor: c.text },
  filterChipText: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
  filterChipTextActive: { color: c.bg, fontWeight: weight.semibold },

  /* ─── Tarjeta ──────────────────────────────────────────────────────────── */
  card: {
    flexDirection: 'row',
    gap: space[3] + 2,
    padding: space[3],
    borderRadius: radius['2xl'] + 2,
    backgroundColor: c.surface,
    ...(c.isDark ? {} : shadow.lg),
  },
  cardPhoto: { width: 96, height: 116, borderRadius: radius.xl, backgroundColor: c.surfaceAlt },
  cardPhotoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, minWidth: 0, paddingVertical: space[1], paddingRight: space[1] },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: {
    flexShrink: 1,
    fontSize: text.lg - 2, fontWeight: weight.bold, color: c.text, letterSpacing: -0.5,
  },
  cardMeta: { fontSize: text.xs + 1, color: c.textMuted, marginTop: 2 },
  cardEstab: { fontSize: text.xs + 1, color: c.textFaint, marginTop: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    height: 27, paddingHorizontal: 11,
    borderRadius: radius.full,
    marginTop: 9,
    maxWidth: '100%',
  },
  chipPunto: { width: 6, height: 6, borderRadius: radius.full },
  chipText: { flexShrink: 1, fontSize: text.xs, fontWeight: weight.semibold },
  cardSpacer: { flex: 1, minHeight: space[2] },
  cardSpendRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  cardSpend: {
    fontSize: text.md + 2, fontWeight: weight.bold, color: c.text, letterSpacing: -0.5,
  },
  cardSpendLabel: { fontSize: text.xs, color: c.textFaint },
});
