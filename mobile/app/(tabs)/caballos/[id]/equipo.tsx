import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Users, XCircle } from 'lucide-react-native';

import {
  useHorse, useHorseVets, useVeterinarios, useAssignVet, useRemoveVet,
  useHorseAssignees, useHorseOrgMembers, useAssignMember, useRemoveMember,
  usePropietarios, useTransferHorse, useHorseMovements,
} from '../../../../hooks/use-horses';
import { useAuth } from '../../../../lib/auth';
import { haptic } from '../../../../lib/haptics';
import { useToast } from '../../../../components/Toast';
import { colors } from '../../../../lib/colors';
import { fechaHumana } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, touch } from '../../../../styles/tokens';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { FormSheet } from '../../../../components/FormSheet';
import { Avatar } from '../../../../components/Avatar';
import { Spinner } from '../../../../components/Spinner';

export default function EquipoScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const insets = useSafeAreaInsets();
  const { can, user } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading } = useHorse(id);

  // Vets
  const { data: horseVets } = useHorseVets(id);
  const { data: veterinarios } = useVeterinarios();
  const assignVet = useAssignVet(id);
  const removeVet = useRemoveVet(id);

  // Equipo (jinete / peón / encargado)
  const canManageTeam = can('horses', 'update');
  const { data: assignees } = useHorseAssignees(id);
  const { data: orgMembers } = useHorseOrgMembers(id, canManageTeam);
  const assignMember = useAssignMember(id);
  const removeMember = useRemoveMember(id);

  // Transferencia
  const { data: propietarios } = usePropietarios();
  const transferHorse = useTransferHorse();
  const { data: movements } = useHorseMovements(id);

  const [showAssignVet, setShowAssignVet] = useState(false);
  const [selectedVetId, setSelectedVetId] = useState('');
  const [showAssignTeam, setShowAssignTeam] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferOwnerId, setTransferOwnerId] = useState('');

  useEffect(() => {
    if (!showAssignVet) return;
    setSelectedVetId('');
  }, [showAssignVet]);

  useEffect(() => {
    if (!showAssignTeam) return;
    setSelectedMemberId('');
  }, [showAssignTeam]);

  useEffect(() => {
    if (!showTransfer) return;
    setTransferOwnerId('');
  }, [showTransfer]);

  const orgRoleLabel: Record<string, string> = { jinete: 'Jinete', peon: 'Peón', encargado: 'Encargado' };

  const handleRemoveVet = (vetUserId: string, vetName: string) => {
    Alert.alert('Quitar veterinario', `¿Quitás a ${vetName} del acceso a ${horse?.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => { haptic.medium(); removeVet.mutate(vetUserId); } },
    ]);
  };

  const handleRemoveMember = (memberUserId: string, memberName: string) => {
    Alert.alert('Quitar del equipo', `¿Quitás a ${memberName} del acceso a ${horse?.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => { haptic.medium(); removeMember.mutate(memberUserId); } },
    ]);
  };

  const handleTransfer = () => {
    if (!transferOwnerId || !horse) return;
    Alert.alert('Confirmar transferencia', '¿Transferís la propiedad de este caballo? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Transferir',
        style: 'destructive',
        onPress: async () => {
          try {
            await transferHorse.mutateAsync({ id, new_owner_id: transferOwnerId });
            haptic.success();
            toast.success('Caballo transferido');
            setShowTransfer(false);
            setTransferOwnerId('');
          } catch {
            haptic.error();
            toast.error('No se pudo transferir el caballo. Probá de nuevo.');
          }
        },
      },
    ]);
  };

  if (isLoading || !horse) return <Spinner />;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Equipo y veterinarios" subtitle={horse.name} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }} showsVerticalScrollIndicator={false}>

        {/* ─── Veterinarios asignados ─── */}
        <View style={s.section}>
          <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
            <Text style={s.sectionTitle}>Veterinarios</Text>
            {can('horses', 'update') && (
              <TouchableOpacity onPress={() => { haptic.light(); setShowAssignVet(true); }} style={s.smallBtn}>
                <Text style={s.smallBtnText}>+ Asignar</Text>
              </TouchableOpacity>
            )}
          </View>
          {!horseVets?.length ? (
            <Text style={s.emptyText}>Sin veterinarios asignados</Text>
          ) : (
            <View>
              {horseVets.map((v) => (
                <View key={v.id} style={s.personRow}>
                  <Avatar name={v.user.name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.docName}>{v.user.name}</Text>
                    <Text style={{ fontSize: 11, color: c.textFaint }}>{v.user.email}</Text>
                  </View>
                  {can('horses', 'update') && (
                    <TouchableOpacity
                      onPress={() => handleRemoveVet(v.user_id, v.user.name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Quitar a ${v.user.name}`}
                    >
                      <XCircle size={20} color={c.textFaint} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ─── Equipo asignado (jinete / peón / encargado) ─── */}
        <View style={s.section}>
          <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
            <Text style={s.sectionTitle}>Equipo</Text>
            {canManageTeam && (
              <TouchableOpacity onPress={() => { haptic.light(); setSelectedMemberId(''); setShowAssignTeam(true); }} style={s.smallBtn}>
                <Text style={s.smallBtnText}>+ Asignar</Text>
              </TouchableOpacity>
            )}
          </View>
          {!assignees?.length ? (
            <Text style={s.emptyText}>Sin personas asignadas. Jinetes y peones solo ven los caballos que les asignes.</Text>
          ) : (
            <View>
              {assignees.map((m) => (
                <View key={m.id} style={s.personRow}>
                  <Avatar name={m.user.name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.docName}>{m.user.name}</Text>
                    <Text style={{ fontSize: 11, color: c.textFaint }}>{m.user.email}</Text>
                  </View>
                  {canManageTeam && (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(m.user_id, m.user.name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Quitar a ${m.user.name}`}
                    >
                      <XCircle size={20} color={c.textFaint} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ─── Transferencia de propiedad ─── */}
        {user?.role === 'propietario' && horse.owner_id === user.id && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Propiedad</Text>
            <TouchableOpacity
              style={[s.smallBtn, { alignSelf: 'flex-start', backgroundColor: c.isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2' }]}
              onPress={() => setShowTransfer(true)}
              activeOpacity={0.8}
            >
              <Text style={[s.smallBtnText, { color: colors.red500 }]}>Transferir caballo</Text>
            </TouchableOpacity>
            {movements && movements.length > 0 && (
              <View style={{ marginTop: 12, gap: 6 }}>
                <Text style={s.emptyText}>Historial de movimientos:</Text>
                {movements.slice(0, 5).map((m) => (
                  <View key={m.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 11, color: c.textFaint }}>
                      {fechaHumana(m.created_at)}
                    </Text>
                    <Text style={{ fontSize: 11, color: c.textMuted, flex: 1 }}>{m.description}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── Hoja asignar veterinario ─── */}
      <FormSheet
        visible={showAssignVet}
        onClose={() => setShowAssignVet(false)}
        title="Asignar veterinario"
        footer={
          <>
            <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => setShowAssignVet(false)} accessibilityRole="button" accessibilityLabel="Cancelar asignación de veterinario">
              <Text style={s.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btnPrimary, { flex: 1 }, (!selectedVetId || assignVet.isPending) && { opacity: 0.5 }]}
              disabled={!selectedVetId || assignVet.isPending}
              onPress={async () => {
                try {
                  await assignVet.mutateAsync(selectedVetId);
                  haptic.success();
                  toast.success('Veterinario asignado');
                  setShowAssignVet(false);
                } catch {
                  haptic.error();
                  toast.error('No se pudo asignar el veterinario. Probá de nuevo.');
                }
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Confirmar asignación de veterinario"
            >
              {assignVet.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.btnPrimaryText}>Asignar</Text>}
            </TouchableOpacity>
          </>
        }
      >
        {!veterinarios?.length ? (
          <Text style={s.emptyText}>No hay veterinarios registrados en el sistema.</Text>
        ) : (
          <View style={{ gap: 6 }}>
            {veterinarios
              .filter((v) => !horseVets?.some((a) => a.user_id === v.id))
              .map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[s.smallBtn, { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }, selectedVetId === v.id && { backgroundColor: c.brand }]}
                  onPress={() => { haptic.selection(); setSelectedVetId(v.id); }}
                  activeOpacity={0.75}
                >
                  <User size={16} color={selectedVetId === v.id ? colors.white : c.brand} strokeWidth={2} />
                  <Text style={[s.smallBtnText, selectedVetId === v.id && { color: colors.white }]}>{v.name}</Text>
                </TouchableOpacity>
              ))}
          </View>
        )}
      </FormSheet>

      {/* ─── Hoja asignar equipo ─── */}
      <FormSheet
        visible={showAssignTeam}
        onClose={() => setShowAssignTeam(false)}
        title="Asignar equipo"
        footer={
          <>
            <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => setShowAssignTeam(false)} accessibilityRole="button" accessibilityLabel="Cancelar asignación de equipo">
              <Text style={s.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btnPrimary, { flex: 1 }, (!selectedMemberId || assignMember.isPending) && { opacity: 0.5 }]}
              disabled={!selectedMemberId || assignMember.isPending}
              onPress={async () => {
                try {
                  await assignMember.mutateAsync(selectedMemberId);
                  haptic.success();
                  toast.success('Miembro asignado');
                  setShowAssignTeam(false);
                } catch {
                  haptic.error();
                  toast.error('No se pudo asignar. Probá de nuevo.');
                }
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Confirmar asignación de equipo"
            >
              {assignMember.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.btnPrimaryText}>Asignar</Text>}
            </TouchableOpacity>
          </>
        }
      >
        <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 4 }}>
          Jinetes y peones solo ven los caballos que les asignes.
        </Text>
        {!orgMembers?.length ? (
          <Text style={s.emptyText}>No hay miembros (jinete / peón / encargado) en la organización de este caballo.</Text>
        ) : (
          <View style={{ gap: 6 }}>
            {orgMembers
              .filter((m) => !assignees?.some((a) => a.user_id === m.user_id))
              .map((m) => (
                <TouchableOpacity
                  key={m.user_id}
                  style={[s.smallBtn, { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }, selectedMemberId === m.user_id && { backgroundColor: c.brand }]}
                  onPress={() => { haptic.selection(); setSelectedMemberId(m.user_id); }}
                  activeOpacity={0.75}
                >
                  <Users size={16} color={selectedMemberId === m.user_id ? colors.white : c.brand} strokeWidth={2} />
                  <Text style={[s.smallBtnText, selectedMemberId === m.user_id && { color: colors.white }]}>
                    {m.name} · {orgRoleLabel[m.role_in_org] ?? m.role_in_org}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        )}
      </FormSheet>

      {/* ─── Hoja transferir propiedad ─── */}
      <FormSheet
        visible={showTransfer}
        onClose={() => setShowTransfer(false)}
        title="Transferir propiedad"
        footer={
          <>
            <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => setShowTransfer(false)} accessibilityRole="button" accessibilityLabel="Cancelar transferencia">
              <Text style={s.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, { flex: 1, backgroundColor: colors.red500, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }, (!transferOwnerId || transferHorse.isPending) && { opacity: 0.5 }]}
              disabled={!transferOwnerId || transferHorse.isPending}
              onPress={handleTransfer}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Confirmar transferencia de propiedad"
            >
              {transferHorse.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.btnPrimaryText}>Confirmar</Text>}
            </TouchableOpacity>
          </>
        }
      >
        <Text style={{ fontSize: 12, color: c.textMuted }}>Esta acción transfiere la propiedad de {horse.name} y no se puede deshacer.</Text>
        {!propietarios?.length ? (
          <Text style={s.emptyText}>No hay otros propietarios en el sistema.</Text>
        ) : (
          <View style={{ gap: 6 }}>
            {propietarios
              .filter((p) => p.id !== user?.id)
              .map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[s.smallBtn, { alignSelf: 'stretch', paddingVertical: 12 }, transferOwnerId === p.id && { backgroundColor: colors.red500 }]}
                  onPress={() => { haptic.selection(); setTransferOwnerId(p.id); }}
                  activeOpacity={0.75}
                >
                  <Text style={[s.smallBtnText, transferOwnerId === p.id && { color: colors.white }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
          </View>
        )}
      </FormSheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  section: { marginHorizontal: space[4], marginBottom: space[6], gap: space[2] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: text.md, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  emptyText: { fontSize: text.sm, color: c.textFaint },

  personRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 10 },
  docName: { flex: 1, fontSize: text.base, fontWeight: '500', color: c.text },

  smallBtn: { minHeight: touch.min, justifyContent: 'center', borderRadius: 999, paddingHorizontal: space[4], backgroundColor: c.surfaceAlt },
  smallBtnText: { fontSize: text.sm, fontWeight: '600', color: c.text },

  btn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: c.brand },
  btnPrimaryText: { fontSize: text.base, fontWeight: '700', color: colors.white },
  btnSecondary: { backgroundColor: c.surfaceAlt },
  btnSecondaryText: { fontSize: text.base, fontWeight: '600', color: c.textMuted },
});
