import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useHorse } from '../../../../hooks/use-horses';
import { useAuth } from '../../../../lib/auth';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { PedigreeTab, PedigreeTreeSkeleton } from '../../../../components/PedigreeTab';
import { PadronTabs } from '../../../padron/[id]/index';

const SEXO_LABEL: Record<string, string> = { macho: 'macho', hembra: 'hembra', castrado: 'castrado' };

export default function PedigreeScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { can, user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading } = useHorse(id);

  // Mientras carga se mantiene el MISMO encabezado y la misma silueta de árbol
  // que va a haber después: si el esqueleto tuviera otra forma, al resolver la
  // pantalla entera saltaría de lugar.
  if (isLoading || !horse) {
    return (
      <View style={s.root}>
        <ScreenHeader showBack title="Pedigrí" />
        <PedigreeTreeSkeleton />
      </View>
    );
  }

  const canEdit = can('horses', 'update') || (user?.role === 'propietario' && horse.owner_id === user.id) || user?.role === 'admin';

  // Vitales del caballo bajo el nombre: "2021 · macho · sangre pura de carrera".
  // En minúscula porque es una descripción corrida, no una lista de rótulos.
  const vitales = [
    horse.birth_date ? horse.birth_date.slice(0, 4) : null,
    horse.sex ? SEXO_LABEL[horse.sex] : null,
    horse.breed?.name ? horse.breed.name.toLowerCase() : null,
  ].filter(Boolean).join(' · ');

  return (
    <View style={s.root}>
      <ScreenHeader showBack title={horse.name} subtitle={vitales || 'Pedigrí'} />
      {/* Las tres caras del registro (Pedigrí / Hijos / Datos) viven en el
          padrón: son las mismas píldoras, así que se reusa `PadronTabs` en vez
          de clonarlas. Solo aparecen si el caballo está vinculado — sin
          registro no hay ni progenie ni datos oficiales adónde ir. */}
      {!!horse.horse_record_id && <PadronTabs id={horse.horse_record_id} active="pedigree" />}
      <PedigreeTab horseId={horse.id} horseName={horse.name} canEdit={canEdit} />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
});
