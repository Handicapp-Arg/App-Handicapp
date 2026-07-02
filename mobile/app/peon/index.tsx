import { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LogOut, ChevronRight } from 'lucide-react-native';
import { useHorses } from '../../hooks/use-horses';
import { useAuth } from '../../lib/auth';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { PressableScale } from '../../components/PressableScale';
import { EmptyState } from '../../components/EmptyState';
import { space, radius, shadow } from '../../styles/tokens';
import { fontFamily } from '../../styles/fonts';
import type { Horse } from '../../../packages/shared/src';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fechaLarga(): string {
  const d = new Date();
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function HorseCard({ horse, c, s, onPress }: { horse: Horse; c: ThemeColors; s: Styles; onPress: () => void }) {
  return (
    <PressableScale style={s.card} onPress={onPress} scaleTo={0.96}>
      {horse.image_url ? (
        <Image source={{ uri: horse.image_url }} style={s.photo} resizeMode="cover" />
      ) : (
        <View style={[s.photo, s.photoPlaceholder]}>
          <Text style={s.photoInitial} allowFontScaling={false}>{horse.name[0]?.toUpperCase()}</Text>
        </View>
      )}
      <Text style={s.cardName} numberOfLines={1}>{horse.name}</Text>
      <View style={s.chevWrap}>
        <ChevronRight size={30} color={c.textFaint} strokeWidth={2.6} />
      </View>
    </PressableScale>
  );
}

export default function PeonHome() {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { data: horses, isLoading } = useHorses();

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? '';

  return (
    <View style={[s.screen, { paddingTop: insets.top + space[4] }]}>
      <View style={s.header}>
        <Text style={s.hello} numberOfLines={2}>¡Hola, {firstName}!</Text>
        <Text style={s.date}>{fechaLarga()}</Text>
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={c.brand} /></View>
      ) : !horses || horses.length === 0 ? (
        <EmptyState
          icon="paw-outline"
          title="Todavía no tenés caballos"
          message="Cuando te asignen un caballo, va a aparecer acá."
        />
      ) : (
        <FlatList
          data={horses}
          keyExtractor={(h) => h.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(320)}>
              <HorseCard
                horse={item}
                c={c}
                s={s}
                onPress={() => { haptic.light(); router.push(`/peon/${item.id}`); }}
              />
            </Animated.View>
          )}
        />
      )}

      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <PressableScale
          style={s.exitBtn}
          scaleTo={0.97}
          onPress={() => { haptic.medium(); logout(); }}
        >
          <LogOut size={26} color={c.textMuted} strokeWidth={2.4} />
          <Text style={s.exitText}>Salir</Text>
        </PressableScale>
      </View>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: space[5],
    paddingBottom: space[4],
  },
  hello: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: fontFamily.extrabold,
    fontWeight: '800',
    color: c.text,
  },
  date: {
    fontSize: 19,
    marginTop: space[1],
    fontFamily: fontFamily.medium,
    fontWeight: '500',
    color: c.textMuted,
    textTransform: 'capitalize',
  },
  list: {
    paddingHorizontal: space[5],
    paddingTop: space[2],
    paddingBottom: space[6],
    gap: space[4],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    padding: space[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderStrong,
    ...shadow.sm,
  },
  photo: {
    width: 84,
    height: 84,
    borderRadius: radius.lg,
    backgroundColor: c.surfaceAlt,
  },
  photoPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: c.brand },
  photoInitial: { fontSize: 40, fontFamily: fontFamily.extrabold, fontWeight: '800', color: colors.white },
  cardName: {
    flex: 1,
    marginLeft: space[4],
    fontSize: 26,
    fontFamily: fontFamily.bold,
    fontWeight: '700',
    color: c.text,
  },
  chevWrap: { paddingRight: space[2] },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    paddingVertical: space[4] + 2,
  },
  exitText: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    fontWeight: '700',
    color: c.textMuted,
  },
});
