import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../lib/colors';
import { radius } from '../styles/tokens';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = radius.sm, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

/** Skeleton completo para una card de caballo */
export function HorseCardSkeleton() {
  return (
    <View style={sk.card}>
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
  return (
    <View style={sk.eventRow}>
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
  return (
    <View style={sk.homePad}>
      <Skeleton height={130} borderRadius={radius.xl} style={{ marginBottom: 20 }} />
      <View style={sk.statsRow}>
        <Skeleton height={80} style={{ flex: 1 }} borderRadius={radius.lg} />
        <Skeleton height={80} style={{ flex: 1 }} borderRadius={radius.lg} />
      </View>
      <Skeleton height={16} width={120} style={{ marginTop: 20, marginBottom: 12 }} />
      {[1, 2, 3].map((i) => <EventRowSkeleton key={i} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.gray200 },
});

const sk = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray100 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.white, marginBottom: 2 },
  statsRow: { flexDirection: 'row', gap: 12 },
  homePad: { padding: 16, gap: 0 },
});
