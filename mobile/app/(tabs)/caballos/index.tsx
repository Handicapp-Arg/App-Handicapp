import { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';
import { ShieldCheck, Building2 } from 'lucide-react-native';
import { useHorses } from '../../../hooks/use-horses';
import { formatMoney } from '../../../lib/currency';
import { useDashboard } from '../../../hooks/use-dashboard';
import { ScreenHeader, HeaderButton } from '../../../components/ScreenHeader';
import { HorseCardSkeleton } from '../../../components/Skeleton';
import { PressableScale } from '../../../components/PressableScale';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { Routes, nav } from '../../../lib/routes';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import type { Horse } from '../../../../packages/shared/src';
import { AppImage } from '../../../components/AppImage';
import { space, text, radius, weight, shadow } from '../../../styles/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { HorseshoeH } from '../../../components/icons/equine';

function HorseCard({ horse, monthlySpend, c, s }: {
  horse: Horse;
  monthlySpend?: number;
  c: ThemeColors;
  s: Styles;
}) {
  const router = useRouter();
  const sexLabel: Record<string, string> = { macho: 'Macho', hembra: 'Hembra', castrado: 'Castrado' };
  const subtitle = [horse.breed?.name, horse.sex ? sexLabel[horse.sex] : null].filter(Boolean).join(' · ');

  return (
    <PressableScale
      style={s.card}
      onPress={() => { haptic.light(); router.push(`/(tabs)/caballos/${horse.id}`); }}
      accessibilityRole="button"
      accessibilityLabel={`Ver ficha de ${horse.name}`}
    >
      {/* La foto es la tarjeta; el texto vive sobre un degradado */}
      {horse.image_url ? (
        <AppImage source={{ uri: horse.image_url }} style={s.cardPhoto} />
      ) : (
        <View style={s.cardPhotoPlaceholder}>
          <HorseshoeH size={64} color={c.brand} />
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.62)']}
        locations={[0.4, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Insignias arriba */}
      <View style={s.cardTopRow}>
        {horse.activity ? (
          <View style={s.cardActivityPill}>
            <Text style={s.cardActivityText}>{horse.activity.name}</Text>
          </View>
        ) : <View />}
        {horse.horse_record_id ? (
          <View style={s.cardVerifiedPill}>
            <ShieldCheck size={12} color={colors.white} strokeWidth={2.4} />
            <Text style={s.cardVerifiedText}>Padrón</Text>
          </View>
        ) : null}
      </View>

      {/* Nombre y datos sobre el degradado */}
      <View style={s.cardOverlay}>
        <Text style={s.cardName} numberOfLines={1}>{horse.name}</Text>
        <View style={s.cardMetaRow}>
          {subtitle ? <Text style={s.cardBreed} numberOfLines={1}>{subtitle}</Text> : null}
          {horse.establishment ? (
            <Text style={s.cardEstab} numberOfLines={1}>  ·  {horse.establishment.name}</Text>
          ) : null}
        </View>
        {monthlySpend != null && monthlySpend > 0 && (
          <Text style={s.cardSpend}>{formatMoney(monthlySpend)} este mes</Text>
        )}
      </View>
    </PressableScale>
  );
}

/* El alta de caballo ahora es una pantalla empujada: app/(tabs)/caballos/nuevo.tsx
   (los formularios con tipeo se rompían con el teclado dentro de las hojas). */

export default function CaballosScreen() {
  const { can } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: horses, isLoading, isError, refetch, isRefetching } = useHorses();
  const { data: dashboard } = useDashboard();
  const router = useRouter();
  const [filterActivity, setFilterActivity] = useState('');
  const [filterEstab, setFilterEstab] = useState('');
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Horse>>(null);
  useScrollToTop(listRef);

  const spendMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of dashboard?.spend_by_horse ?? []) map[s.horse_id] = s.total;
    return map;
  }, [dashboard?.spend_by_horse]);

  // Opciones de filtro dinámicas según los datos disponibles
  const activityOptions = [...new Set((horses ?? []).map((h) => h.activity?.name).filter(Boolean))] as string[];
  const estabOptions = [...new Set((horses ?? []).map((h) => h.establishment?.name).filter(Boolean))] as string[];
  const hasFilters = activityOptions.length > 1 || estabOptions.length > 1;

  const filtered = (horses ?? []).filter((h) => {
    const matchActivity = !filterActivity || h.activity?.name === filterActivity;
    const matchEstab = !filterEstab || h.establishment?.name === filterEstab;
    return matchActivity && matchEstab;
  });

  if (isLoading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader
          scrollable
          title="Caballos"
          right={can('horses', 'create') ? <HeaderButton label="Nuevo" onPress={() => nav.push(router, Routes.caballoNuevo)} /> : undefined}
        />
        <View style={{ padding: 16, gap: 12 }}>
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
        ListHeaderComponent={
          <>
            <ScreenHeader
              scrollable
              title="Caballos"
              right={can('horses', 'create') ? (
                <HeaderButton label="Nuevo" onPress={() => { haptic.medium(); nav.push(router, Routes.caballoNuevo); }} />
              ) : undefined}
            />

            {/* Filtros por actividad y establecimiento */}
            {hasFilters && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterRow}
                style={{ maxHeight: 44 }}
              >
                {activityOptions.map((act) => (
                  <TouchableOpacity
                    key={act}
                    style={[s.filterChip, filterActivity === act && s.filterChipActive]}
                    onPress={() => { haptic.selection(); setFilterActivity(filterActivity === act ? '' : act); }}
                    activeOpacity={0.75}
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
                  >
                    <Building2 size={11} color={filterEstab === est ? c.surface : c.textMuted} strokeWidth={2} />
                    <Text style={[s.filterChipText, filterEstab === est && s.filterChipTextActive]}>{est}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        }
        ListEmptyComponent={
          isError ? (
            <ErrorState onRetry={() => refetch()} />
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
          <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)} style={{ paddingHorizontal: 12 }}>
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
      />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  list: { paddingBottom: 120, gap: 10 },
  // ─── Horse Card — foto primero (la imagen es la tarjeta) ──────────────────
  card: {
    height: 210,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: c.surfaceAlt,
    ...(c.isDark ? {} : { ...shadow.sm }),
  },
  cardPhoto: { ...StyleSheet.absoluteFillObject },
  cardPhotoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.isDark ? c.surfaceAlt : '#efe9df',
    justifyContent: 'center', alignItems: 'center',
    opacity: 0.9,
  },
  cardTopRow: {
    position: 'absolute', top: space[3], left: space[3], right: space[3],
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardActivityPill: {
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: radius.full,
    paddingHorizontal: space[3], paddingVertical: 4,
  },
  cardActivityText: { fontSize: text.xs, fontWeight: weight.bold, color: colors.white },
  cardVerifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: radius.full,
    paddingHorizontal: space[2] + 2, paddingVertical: 4,
  },
  cardVerifiedText: { fontSize: text.xs, fontWeight: weight.bold, color: colors.white },
  cardOverlay: {
    position: 'absolute', left: space[4], right: space[4], bottom: space[3] + 2,
    gap: 2,
  },
  cardName: {
    fontSize: text.lg, fontWeight: weight.semibold, color: colors.white,
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 },
  },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center' },
  cardBreed: { fontSize: text.sm, color: 'rgba(255,255,255,0.92)', fontWeight: weight.medium },
  cardEstab: { fontSize: text.sm, color: 'rgba(255,255,255,0.75)', flexShrink: 1 },
  cardSpend: { fontSize: text.sm, fontWeight: weight.bold, color: 'rgba(255,255,255,0.95)', marginTop: 2 },
  // ─── FAB ──────────────────────────────────────────────────────────────────
  // ─── Filtros ───────────────────────────────────────────────────────────────
  filterRow: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: 5, backgroundColor: c.surfaceAlt },
  // Selección neutra invertida (como los toggles de apps consolidadas), sin cuero.
  filterChipActive: { backgroundColor: c.text },
  filterChipText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  filterChipTextActive: { color: c.surface },
});
