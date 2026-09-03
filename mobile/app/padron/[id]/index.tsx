import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, CheckCircle2, Info, Network, Users } from 'lucide-react-native';

import { useHorseRecordDetail, useHorseRecordProgeny } from '../../../hooks/use-horse-records';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, weight, radius } from '../../../styles/tokens';
import { haptic } from '../../../lib/haptics';
import { nav } from '../../../lib/routes';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Spinner } from '../../../components/Spinner';
import { ErrorState } from '../../../components/ErrorState';

const SEX_LABEL: Record<string, string> = { macho: 'Macho', hembra: 'Hembra', castrado: 'Castrado' };

function InfoRow({ label, value, s }: { label: string; value: string; s: Styles }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function NavRow({ Icon, label, onPress, c, s }: { Icon: typeof Network; label: string; onPress: () => void; c: ThemeColors; s: Styles }) {
  return (
    <TouchableOpacity style={s.navRow} onPress={onPress} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={label}>
      <View style={s.navIconWrap}>
        <Icon size={20} color={c.text} strokeWidth={1.7} />
      </View>
      <Text style={s.navLabel}>{label}</Text>
      <ChevronRight size={16} color={c.textFaint} strokeWidth={2} />
    </TouchableOpacity>
  );
}

export default function PadronRegistroScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: detail, isLoading, isError, refetch } = useHorseRecordDetail(id);
  const { data: progeny } = useHorseRecordProgeny(id);
  const progenyCount = progeny?.length ?? 0;

  const goto = (path: 'pedigree' | 'progenie') => { haptic.selection(); nav.push(router, `/padron/${id}/${path}`); };

  if (isLoading) {
    return (
      <View style={s.root}>
        <ScreenHeader showBack title="Registro" />
        <Spinner />
      </View>
    );
  }

  if (isError || !detail) {
    return (
      <View style={s.root}>
        <ScreenHeader showBack title="Registro" />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  const vitals = [
    detail.birth_year != null ? String(detail.birth_year) : null,
    detail.sex ? SEX_LABEL[detail.sex] : null,
    detail.country_code,
  ].filter(Boolean).join(' · ');

  const rows: [string, string | null | undefined][] = [
    ['Color / Pelo', detail.color],
    ['Raza', detail.breed],
    ['Nro. registro', detail.registration_number],
    ['Padre', detail.sire_name],
    ['Madre', detail.dam_name],
  ];

  return (
    <View style={s.root}>
      <ScreenHeader showBack title={detail.name} subtitle="Padrón" />
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {vitals ? <Text style={s.vitals}>{vitals}</Text> : null}

        <View style={s.infoList}>
          {rows.filter(([, v]) => v).map(([label, value]) => (
            <InfoRow key={label} label={label} value={value as string} s={s} />
          ))}
        </View>

        {detail.verified_owner ? (
          <View style={s.ownerRow}>
            <CheckCircle2 size={16} color={c.success} strokeWidth={2} />
            <Text style={s.ownerText}>Propietario: {detail.verified_owner.name}</Text>
          </View>
        ) : (
          <View style={s.claimBanner}>
            <Info size={18} color={c.info} strokeWidth={2} />
            <Text style={s.claimText}>Sin propietario verificado. Podés reclamarlo desde la web.</Text>
          </View>
        )}

        <View style={s.navList}>
          <NavRow Icon={Network} label="Pedigrí" onPress={() => goto('pedigree')} c={c} s={s} />
          <NavRow Icon={Users} label={`Progenie (${progenyCount})`} onPress={() => goto('progenie')} c={c} s={s} />
        </View>
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scrollContent: { paddingHorizontal: space[4], paddingBottom: space[10] },

  vitals: { fontSize: text.base, fontWeight: weight.semibold, color: c.textMuted, textAlign: 'center', marginBottom: space[5] },

  infoList: { marginBottom: space[5] },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 52,
    paddingVertical: space[2],
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  infoLabel: { fontSize: text.sm, color: c.textMuted, fontWeight: weight.medium, flex: 1 },
  infoValue: { fontSize: text.sm, color: c.text, fontWeight: weight.semibold, flex: 2, textAlign: 'right' },

  ownerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space[6] },
  ownerText: { fontSize: text.sm, color: c.success, fontWeight: weight.medium, marginLeft: space[2] },
  claimBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: c.infoSoft,
    borderRadius: radius.md,
    padding: space[3],
    marginBottom: space[6],
  },
  claimText: { flex: 1, fontSize: text.xs, color: c.info, lineHeight: 18, marginLeft: space[2] },

  navList: {},
  navRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 52, borderBottomWidth: 1, borderBottomColor: c.border },
  navIconWrap: { width: 28, alignItems: 'center', flexShrink: 0 },
  navLabel: { flex: 1, fontSize: text.md, fontWeight: weight.regular, color: c.text, letterSpacing: -0.2 },
});
