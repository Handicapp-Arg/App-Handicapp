import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Users, XCircle, Check, Home } from 'lucide-react-native';
import Animated from 'react-native-reanimated';

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
import { space, text, touch, radius, weight, shadow } from '../../../../styles/tokens';
import { entradaFila } from '../../../../styles/motion';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { PressableScale } from '../../../../components/PressableScale';
import { FormSheet } from '../../../../components/FormSheet';
import { Avatar } from '../../../../components/Avatar';
import { EmptyState } from '../../../../components/EmptyState';
import { ErrorState } from '../../../../components/ErrorState';
import { Skeleton } from '../../../../components/Skeleton';

export default function EquipoScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const insets = useSafeAreaInsets();
  const { can, user } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading, isError, refetch } = useHorse(id);

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

  if (isError && !horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Equipo" />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  if (isLoading || !horse) {
    // Silueta real: rótulo de sección y filas de persona con avatar redondo.
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Equipo" />
        <View style={{ paddingHorizontal: space[4], paddingTop: space[5], gap: space[5] }}>
          <Skeleton width={110} height={16} />
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] + 2 }}>
              <Skeleton width={48} height={48} borderRadius={radius.full} />
              <View style={{ flex: 1, gap: space[2] }}>
                <Skeleton width="55%" height={17} />
                <Skeleton width="40%" height={13} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const personas = (horseVets?.length ?? 0) + (assignees?.length ?? 0);
  const esPropietario = user?.role === 'propietario' && horse.owner_id === user.id;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        scrollable
        showBack
        title="Equipo"
        subtitle={`${horse.name}${personas > 0 ? ` · ${personas} persona${personas === 1 ? '' : 's'}` : ''}`}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Veterinarios ─── */}
        <View style={s.rotuloRow}>
          <Text style={s.rotulo}>Veterinario</Text>
          {can('horses', 'update') && (
            <PressableScale
              onPress={() => { haptic.light(); setShowAssignVet(true); }}
              style={s.linkBtn}
              accessibilityRole="button"
              accessibilityLabel="Asignar un veterinario"
            >
              <Text style={s.linkBtnText}>Asignar</Text>
            </PressableScale>
          )}
        </View>
        {!horseVets?.length ? (
          <View style={s.lista}>
            <EmptyState
              icon="medkit-outline"
              title="Sin veterinarios asignados"
              message="Asigná un veterinario para que pueda ver y cargar la sanidad del caballo."
            />
          </View>
        ) : (
          <View style={s.lista}>
            {horseVets.map((v, i, arr) => (
              <Animated.View key={v.id} entering={entradaFila(i)} style={[s.persona, i < arr.length - 1 && s.personaBorde]}>
                <Avatar name={v.user.name} size={48} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.personaNombre} numberOfLines={1}>{v.user.name}</Text>
                  <Text style={s.personaSub} numberOfLines={1}>{v.user.email}</Text>
                </View>
                {can('horses', 'update') && (
                  <PressableScale
                    onPress={() => handleRemoveVet(v.user_id, v.user.name)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar a ${v.user.name}`}
                  >
                    <XCircle size={20} color={c.textFaint} strokeWidth={2} />
                  </PressableScale>
                )}
              </Animated.View>
            ))}
          </View>
        )}

        {/* ─── Gente a cargo ─── */}
        <View style={s.rotuloRow}>
          <Text style={s.rotulo}>Gente a cargo</Text>
          {canManageTeam && (
            <PressableScale
              onPress={() => { haptic.light(); setSelectedMemberId(''); setShowAssignTeam(true); }}
              style={s.linkBtn}
              accessibilityRole="button"
              accessibilityLabel="Asignar gente al caballo"
            >
              <Text style={s.linkBtnText}>Asignar</Text>
            </PressableScale>
          )}
        </View>
        {!assignees?.length ? (
          <View style={s.lista}>
            <EmptyState
              icon="people-outline"
              title="Sin personas asignadas"
              message="Jinetes y peones solo ven los caballos que les asignes."
            />
          </View>
        ) : (
          <View style={s.lista}>
            {assignees.map((m, i, arr) => (
              <Animated.View key={m.id} entering={entradaFila(i)} style={[s.persona, i < arr.length - 1 && s.personaBorde]}>
                <Avatar name={m.user.name} size={48} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.personaNombre} numberOfLines={1}>{m.user.name}</Text>
                  <Text style={s.personaSub} numberOfLines={1}>{m.user.email}</Text>
                </View>
                {canManageTeam && (
                  <PressableScale
                    onPress={() => handleRemoveMember(m.user_id, m.user.name)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar a ${m.user.name}`}
                  >
                    <XCircle size={20} color={c.textFaint} strokeWidth={2} />
                  </PressableScale>
                )}
              </Animated.View>
            ))}
          </View>
        )}

        {/* ─── Dónde está: el establecimiento SÍ es una tarjeta de contenido ─── */}
        {!!horse.establishment?.name && (
          <>
            <View style={s.rotuloRow}><Text style={s.rotulo}>Dónde está</Text></View>
            <View style={s.lista}>
              <View style={s.tarjeta}>
                <View style={s.tarjetaIcono}>
                  <Home size={20} color={c.info} strokeWidth={1.9} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.personaNombre} numberOfLines={1}>{horse.establishment.name}</Text>
                  <Text style={s.personaSub} numberOfLines={1}>Establecimiento a cargo</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* ─── Propiedad ─── */}
        {esPropietario && (
          <>
            <View style={s.rotuloRow}><Text style={s.rotulo}>Propiedad</Text></View>
            <View style={s.lista}>
              <View style={s.persona}>
                <Avatar name={user?.name} size={48} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.personaNombre} numberOfLines={1}>{user?.name}</Text>
                  <Text style={s.personaSub}>Sos el propietario</Text>
                </View>
              </View>

              <PressableScale
                style={s.transferir}
                onPress={() => { haptic.light(); setShowTransfer(true); }}
                accessibilityRole="button"
                accessibilityLabel="Transferir el caballo a otro propietario"
              >
                <Text style={s.transferirText}>Transferir el caballo</Text>
              </PressableScale>

              {movements && movements.length > 0 && (
                <View style={s.movimientos}>
                  <Text style={s.movimientosTitulo}>Movimientos</Text>
                  {movements.slice(0, 5).map((m, i) => (
                    <Animated.View key={m.id} entering={entradaFila(i)} style={s.movimientoRow}>
                      <Text style={s.movimientoFecha}>{fechaHumana(m.created_at)}</Text>
                      <Text style={s.movimientoDesc}>{m.description}</Text>
                    </Animated.View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ─── Hoja asignar veterinario ─── */}
      <FormSheet
        visible={showAssignVet}
        onClose={() => setShowAssignVet(false)}
        title="Asignar veterinario"
        footer={
          <PressableScale
            style={[s.btnPrimary, { flex: 1 }, (!selectedVetId || assignVet.isPending) && { opacity: 0.5 }]}
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
            accessibilityRole="button"
            accessibilityLabel="Confirmar asignación de veterinario"
          >
            {assignVet.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.btnPrimaryText}>Asignar</Text>}
          </PressableScale>
        }
      >
        {!veterinarios?.length ? (
          <Text style={s.ayuda}>No hay veterinarios registrados en el sistema.</Text>
        ) : (
          <View>
            {veterinarios
              .filter((v) => !horseVets?.some((a) => a.user_id === v.id))
              .map((v, i) => (
                <PressableScale
                  key={v.id}
                  scaleTo={0.98}
                  style={[s.opcion, i > 0 && s.opcionBorde]}
                  onPress={() => { haptic.selection(); setSelectedVetId(v.id); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedVetId === v.id }}
                  accessibilityLabel={v.name}
                >
                  <User size={17} color={c.textMuted} strokeWidth={2} />
                  <Text style={s.opcionText} numberOfLines={1}>{v.name}</Text>
                  {selectedVetId === v.id && <Check size={18} color={c.brand} strokeWidth={2.4} />}
                </PressableScale>
              ))}
          </View>
        )}
      </FormSheet>

      {/* ─── Hoja asignar equipo ─── */}
      <FormSheet
        visible={showAssignTeam}
        onClose={() => setShowAssignTeam(false)}
        title="Asignar gente"
        footer={
          <PressableScale
            style={[s.btnPrimary, { flex: 1 }, (!selectedMemberId || assignMember.isPending) && { opacity: 0.5 }]}
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
            accessibilityRole="button"
            accessibilityLabel="Confirmar asignación de equipo"
          >
            {assignMember.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.btnPrimaryText}>Asignar</Text>}
          </PressableScale>
        }
      >
        <Text style={s.ayuda}>Jinetes y peones solo ven los caballos que les asignes.</Text>
        {!orgMembers?.length ? (
          <Text style={s.ayuda}>No hay miembros (jinete / peón / encargado) en la organización de este caballo.</Text>
        ) : (
          <View>
            {orgMembers
              .filter((m) => !assignees?.some((a) => a.user_id === m.user_id))
              .map((m, i) => (
                <PressableScale
                  key={m.user_id}
                  scaleTo={0.98}
                  style={[s.opcion, i > 0 && s.opcionBorde]}
                  onPress={() => { haptic.selection(); setSelectedMemberId(m.user_id); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedMemberId === m.user_id }}
                  accessibilityLabel={m.name}
                >
                  <Users size={17} color={c.textMuted} strokeWidth={2} />
                  <Text style={s.opcionText} numberOfLines={1}>
                    {m.name} · {orgRoleLabel[m.role_in_org] ?? m.role_in_org}
                  </Text>
                  {selectedMemberId === m.user_id && <Check size={18} color={c.brand} strokeWidth={2.4} />}
                </PressableScale>
              ))}
          </View>
        )}
      </FormSheet>

      {/* ─── Hoja transferir propiedad ─── */}
      <FormSheet
        visible={showTransfer}
        onClose={() => setShowTransfer(false)}
        title="Transferir el caballo"
        footer={
          <PressableScale
            style={[s.btnDanger, { flex: 1 }, (!transferOwnerId || transferHorse.isPending) && { opacity: 0.5 }]}
            disabled={!transferOwnerId || transferHorse.isPending}
            onPress={handleTransfer}
            accessibilityRole="button"
            accessibilityLabel="Confirmar transferencia de propiedad"
          >
            {transferHorse.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.btnPrimaryText}>Confirmar</Text>}
          </PressableScale>
        }
      >
        <Text style={s.ayuda}>Esta acción transfiere la propiedad de {horse.name} y no se puede deshacer.</Text>
        {!propietarios?.length ? (
          <Text style={s.ayuda}>No hay otros propietarios en el sistema.</Text>
        ) : (
          <View>
            {propietarios
              .filter((p) => p.id !== user?.id)
              .map((p, i) => (
                <PressableScale
                  key={p.id}
                  scaleTo={0.98}
                  style={[s.opcion, i > 0 && s.opcionBorde]}
                  onPress={() => { haptic.selection(); setTransferOwnerId(p.id); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: transferOwnerId === p.id }}
                  accessibilityLabel={p.name}
                >
                  <Text style={s.opcionText} numberOfLines={1}>{p.name}</Text>
                  {transferOwnerId === p.id && <Check size={18} color={c.brand} strokeWidth={2.4} />}
                </PressableScale>
              ))}
          </View>
        )}
      </FormSheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  rotuloRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[4], marginTop: space[6], marginBottom: space[1],
  },
  rotulo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint },
  linkBtn: { minHeight: touch.min, justifyContent: 'center', paddingLeft: space[3] },
  linkBtnText: { fontSize: text.base - 1, fontWeight: weight.semibold, color: c.brand },

  /* Filas de persona, planas sobre el lienzo */
  lista: { paddingHorizontal: space[4] },
  persona: { flexDirection: 'row', alignItems: 'center', gap: space[3] + 2, paddingVertical: space[3] + 2 },
  personaBorde: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  personaNombre: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  personaSub: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },

  /* La única tarjeta con superficie: el lugar donde vive el caballo. */
  tarjeta: {
    flexDirection: 'row', alignItems: 'center', gap: space[3] + 2,
    backgroundColor: c.surface, borderRadius: radius.card, padding: space[4] - 1,
    ...(c.isDark ? {} : shadow.md),
  },
  tarjetaIcono: { width: 42, height: 42, borderRadius: radius.thumb - 1, backgroundColor: c.infoSoft, alignItems: 'center', justifyContent: 'center' },

  transferir: {
    alignSelf: 'flex-start', height: touch.min, paddingHorizontal: space[4],
    borderRadius: radius.full, backgroundColor: c.dangerSoft, alignItems: 'center', justifyContent: 'center',
    marginTop: space[2],
  },
  transferirText: { fontSize: text.base - 1, fontWeight: weight.semibold, color: c.danger },

  movimientos: { marginTop: space[6], gap: space[2] },
  movimientosTitulo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint },
  movimientoRow: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start' },
  movimientoFecha: { fontSize: text.sm - 1, color: c.textFaint, width: 84 },
  movimientoDesc: { fontSize: text.sm - 1, color: c.textMuted, flex: 1 },

  /* Filas de selección planas dentro de las hojas */
  opcion: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: touch.min + 6 },
  opcionBorde: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  opcionText: { flex: 1, fontSize: text.md, color: c.text },
  ayuda: { fontSize: text.sm - 1, color: c.textFaint },

  btnPrimary: { height: touch.button, borderRadius: radius.button, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
  btnDanger: { height: touch.button, borderRadius: radius.button, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontSize: text.md, fontWeight: weight.semibold, color: colors.white },
});
