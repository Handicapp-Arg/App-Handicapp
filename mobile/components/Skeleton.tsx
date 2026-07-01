import { useEffect, useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withTiming, interpolate, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, type ThemeColors } from '../lib/theme';
import { radius } from '../styles/tokens';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/** Bloque de carga con shimmer (un brillo que se desliza), estilo apps modernas. */
export function Skeleton({ width = '100%', height = 16, borderRadius = radius.sm, style }: SkeletonProps) {
  const progress = useSharedValue(0);
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, []);

  const shimmer = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-180, 180]) }],
  }));

  return (
    <View style={[s.base, { width: width as any, height, borderRadius }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, shimmer]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.6)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** Skeleton completo para una card de caballo */
export function HorseCardSkeleton() {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.card}>
      <Skeleton height={120} borderRadius={radius.lg} />
      <View style={{ padding: 10, gap: 6 }}>
        <Skeleton height={14} width="70%" />
        <Skeleton height={11} width="45%" />
      </View>
    </View>
  );
}

/** Skeleton para una fila de evento */
export function EventRowSkeleton() {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.eventRow}>
      <Skeleton width={52} height={22} borderRadius={radius.full} />
      <View style={{ flex: 1, gap: 5 }}>
        <Skeleton height={13} width="80%" />
        <Skeleton height={11} width="40%" />
      </View>
      <Skeleton width={32} height={11} />
    </View>
  );
}

/** Skeleton para el home screen */
export function HomeSkeleton() {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.homePad}>
      <Skeleton height={130} borderRadius={radius.xl} style={{ marginBottom: 20 }} />
      <View style={s.statsRow}>
        <Skeleton height={80} style={{ flex: 1 }} borderRadius={radius.lg} />
        <Skeleton height={80} style={{ flex: 1 }} borderRadius={radius.lg} />
      </View>
      <Skeleton height={16} width={120} style={{ marginTop: 20, marginBottom: 12 }} />
      {[1, 2, 3].map((i) => <EventRowSkeleton key={i} />)}
    </View>
  );
}

/** Skeleton para una fila de lista genérica (avatar + 2 líneas) */
export function ListRowSkeleton() {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.listRow}>
      <Skeleton width={44} height={44} borderRadius={radius.full} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton height={13} width="60%" />
        <Skeleton height={11} width="38%" />
      </View>
    </View>
  );
}

/** Skeleton para la pantalla de reportes (stats + cards) */
export function ReportSkeleton() {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={{ gap: 16 }}>
      <View style={s.statsRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={s.reportStat}>
            <Skeleton width={22} height={22} borderRadius={radius.sm} />
            <Skeleton height={9} width="60%" style={{ marginTop: 8 }} />
            <Skeleton height={18} width="80%" style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
      {[1, 2, 3].map((i) => (
        <View key={i} style={s.reportCard}>
          <View style={s.postHead}>
            <Skeleton width={18} height={18} borderRadius={radius.sm} />
            <Skeleton height={14} width={140} />
          </View>
          <Skeleton height={8} width="100%" borderRadius={radius.full} style={{ marginTop: 16 }} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Skeleton height={58} style={{ flex: 1 }} borderRadius={radius.md} />
            <Skeleton height={58} style={{ flex: 1 }} borderRadius={radius.md} />
            <Skeleton height={58} style={{ flex: 1 }} borderRadius={radius.md} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Skeleton para una publicación del muro */
export function PostSkeleton() {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.post}>
      <View style={s.postHead}>
        <Skeleton width={40} height={40} borderRadius={radius.full} />
        <View style={{ gap: 6 }}>
          <Skeleton height={13} width={120} />
          <Skeleton height={10} width={70} />
        </View>
      </View>
      <Skeleton height={12} width="92%" style={{ marginTop: 12 }} />
      <Skeleton height={12} width="70%" style={{ marginTop: 6 }} />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  base: { backgroundColor: c.borderStrong, overflow: 'hidden' },
  card: { flex: 1, backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: c.surface, marginBottom: 2 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: c.surface, marginBottom: 8, borderRadius: radius.lg },
  post: { backgroundColor: c.surface, borderRadius: radius.xl, padding: 16, marginHorizontal: 16, marginBottom: 12 },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statsRow: { flexDirection: 'row', gap: 12 },
  homePad: { padding: 16, gap: 0 },
  reportStat: { flex: 1, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: 12 },
  reportCard: { backgroundColor: c.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: c.border, padding: 16 },
});
