import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useHorse } from '../../../../hooks/use-horses';
import { useAuth } from '../../../../lib/auth';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { PedigreeTab } from '../../../../components/PedigreeTab';
import { Spinner } from '../../../../components/Spinner';

export default function PedigreeScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { can, user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading } = useHorse(id);

  if (isLoading || !horse) return <Spinner />;

  const canEdit = can('horses', 'update') || (user?.role === 'propietario' && horse.owner_id === user.id) || user?.role === 'admin';

  return (
    <View style={s.root}>
      <ScreenHeader showBack title="Pedigrí" subtitle={horse.name} />
      <PedigreeTab horseId={horse.id} horseName={horse.name} canEdit={canEdit} />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
});
