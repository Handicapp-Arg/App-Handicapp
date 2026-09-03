import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useHorseRecordDetail, useHorseRecordProgeny } from '../../../hooks/use-horse-records';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, weight } from '../../../styles/tokens';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Spinner } from '../../../components/Spinner';
import { ErrorState } from '../../../components/ErrorState';

export default function PadronProgenieScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: detail } = useHorseRecordDetail(id);
  const { data: progeny, isLoading, isError, refetch } = useHorseRecordProgeny(id);

  return (
    <View style={s.root}>
      <ScreenHeader showBack title="Progenie" subtitle={detail?.name} />
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : !progeny || progeny.length === 0 ? (
        <Text style={s.empty}>Sin progenie registrada</Text>
      ) : (
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionTitle}>{progeny.length} descendiente{progeny.length !== 1 ? 's' : ''}</Text>
          {progeny.map((p, index) => (
            <Animated.View key={p.id} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
              <View style={s.row}>
                <Text style={s.rowName}>{p.name}</Text>
                {p.birth_year != null && <Text style={s.rowYear}>{p.birth_year}</Text>}
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scrollContent: { paddingHorizontal: space[4], paddingBottom: space[10], paddingTop: space[2] },
  sectionTitle: {
    fontSize: text.xs,
    fontWeight: weight.bold,
    color: c.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: space[3],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  rowName: { fontSize: text.sm, color: c.text, fontWeight: weight.medium },
  rowYear: { fontSize: text.xs, color: c.textFaint },
  empty: { textAlign: 'center', color: c.textFaint, fontSize: text.sm, marginTop: space[8] },
});
