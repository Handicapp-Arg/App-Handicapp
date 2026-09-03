import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, AlertTriangle, XCircle, CalendarClock, Lock, Download, MoreVertical, type LucideIcon } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  useMedicalRecords, useAddMedicalRecord, useDeleteMedicalRecord, useDownloadMedicalPdf, useDownloadHealthCertificate,
  MEDICAL_TYPE_LABELS, MEDICAL_TYPE_COLORS, SANITARY_DISEASES, healthStatusFromNextDue,
  type HealthStatus, type CreateMedicalRecordDto,
} from '../../../../hooks/use-medical';
import { useHorse, useWeightRecords, useAddWeightRecord } from '../../../../hooks/use-horses';
import { usePlanStatus } from '../../../../hooks/use-plan';
import { useAuth } from '../../../../lib/auth';
import { haptic } from '../../../../lib/haptics';
import { DatePicker } from '../../../../components/DatePicker';
import { Spinner } from '../../../../components/Spinner';
import { useToast } from '../../../../components/Toast';
import { colors } from '../../../../lib/colors';
import { fechaHumana, vence } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, shadow } from '../../../../styles/tokens';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { FormSheet } from '../../../../components/FormSheet';
import { todayISO } from '../../../../hooks/use-routines';

function makeHealthStatusMeta(c: ThemeColors): Record<HealthStatus, { dot: string; bg: string; text: string; label: string; Icon: LucideIcon }> {
  return {
    verde:    { dot: c.success, bg: c.successSoft, text: c.success, label: 'Vigente',    Icon: ShieldCheck },
    amarillo: { dot: c.warning, bg: c.warningSoft, text: c.warning, label: 'Por vencer', Icon: AlertTriangle },
    rojo:     { dot: c.danger,  bg: c.dangerSoft,  text: c.danger,  label: 'Vencido',    Icon: XCircle },
  };
}

export default function SanidadScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const insets = useSafeAreaInsets();
  const { can, user } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);
  const healthStatusMeta = useMemo(() => makeHealthStatusMeta(c), [c]);

  const { data: horse, isLoading } = useHorse(id);
  const { data: medicalRecords } = useMedicalRecords(id);
  const addMedical = useAddMedicalRecord(id);
  const deleteMedical = useDeleteMedicalRecord(id);
  const { download: downloadPdf, loading: pdfLoading } = useDownloadMedicalPdf(id, horse?.name ?? '');
  const { download: downloadCert, loading: certLoading } = useDownloadHealthCertificate(id, horse?.name ?? '');
  const { data: planStatus } = usePlanStatus();
  const isApprovedVet = user?.role === 'veterinario' && user?.vet_license_status === 'approved';
  const canCertify = isApprovedVet && (planStatus?.features?.includes('libreta_digital') ?? false);

  const { data: weightRecords } = useWeightRecords(id);
  const addWeight = useAddWeightRecord(id);

  const today = todayISO();
  const [showAddMedical, setShowAddMedical] = useState(false);
  const [medicalForm, setMedicalForm] = useState<CreateMedicalRecordDto>({ type: 'vacuna', name: '', date: today });
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(today);

  useEffect(() => {
    if (!showAddWeight) return;
    setNewWeight('');
    setNewWeightDate(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddWeight]);

  if (isLoading || !horse) return <Spinner />;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Sanidad" subtitle={horse.name} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }} showsVerticalScrollIndicator={false}>

        {/* ─── Libreta sanitaria ─── */}
        <View style={s.section}>
          <View style={s.healthBookHeader}>
            <ShieldCheck size={14} color={c.brand} strokeWidth={2.4} />
            <Text style={s.healthBookTitle}>Libreta sanitaria</Text>
          </View>
          {SANITARY_DISEASES.map((d) => {
            const last = medicalRecords?.filter((r) => r.type === 'sanidad').find((r) => d.match.test(r.name)) ?? null;
            const nextDue = last?.next_due ?? null;
            const status = healthStatusFromNextDue(nextDue);
            const meta = healthStatusMeta[status];
            const StatusIcon = meta.Icon;
            return (
              <View key={d.key} style={s.healthRow}>
                <View style={[s.healthAccent, { backgroundColor: meta.dot }]} />
                <View style={[s.healthIconWrap, { backgroundColor: meta.bg }]}>
                  <StatusIcon size={16} color={meta.text} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.healthName} numberOfLines={1}>{d.name}</Text>
                  <View style={s.healthDueRow}>
                    <CalendarClock size={10} color={c.textFaint} strokeWidth={2} />
                    <Text style={s.healthDue} numberOfLines={1}>
                      {nextDue ? vence(nextDue) : 'Sin registro'}
                    </Text>
                  </View>
                </View>
                <View style={[s.healthBadge, { backgroundColor: meta.bg }]}>
                  <View style={[s.healthBadgeDot, { backgroundColor: meta.dot }]} />
                  <Text style={[s.healthBadgeText, { color: meta.text }]}>{meta.label}</Text>
                </View>
                {can('horses', 'update') && (
                  <TouchableOpacity
                    style={s.healthCertifyBtn}
                    onPress={() => { haptic.light(); setMedicalForm({ type: 'sanidad', name: d.name, date: today }); setShowAddMedical(true); }}
                    activeOpacity={0.8}
                  >
                    <Text style={s.healthCertifyText}>Certificar</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          {isApprovedVet && (
            <TouchableOpacity
              style={[s.certifyBtn, !canCertify && s.certifyBtnLocked]}
              disabled={certLoading || !canCertify}
              onPress={() => {
                if (!canCertify) {
                  toast.error('Certificado no disponible. Requiere plan Pro + matrícula aprobada.');
                  return;
                }
                haptic.light();
                downloadCert();
              }}
              activeOpacity={0.85}
            >
              {canCertify
                ? <ShieldCheck size={15} color={colors.white} strokeWidth={2.2} />
                : <Lock size={14} color={c.textMuted} strokeWidth={2.2} />}
              <Text style={[s.certifyBtnText, !canCertify && { color: c.textMuted }]}>
                {certLoading ? 'Emitiendo...' : 'Emitir certificado'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Peso y condición ─── */}
        <View style={s.section}>
          <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
            <Text style={s.sectionTitle}>Peso y condición</Text>
            {can('horses', 'update') && (
              <TouchableOpacity onPress={() => { haptic.light(); setShowAddWeight(true); }} style={s.smallBtn}>
                <Text style={s.smallBtnText}>+ Registrar</Text>
              </TouchableOpacity>
            )}
          </View>
          {!weightRecords?.length ? (
            <Text style={s.emptyText}>Sin registros de peso</Text>
          ) : (
            <View>
              <View style={s.weightLatest}>
                <Text style={s.weightValue}>{Number(weightRecords[0].weight_kg)} kg</Text>
                {weightRecords[0].body_condition && <Text style={s.weightCC}>CC: {weightRecords[0].body_condition}/9</Text>}
                <Text style={s.weightDate}>{fechaHumana(weightRecords[0].date)}</Text>
              </View>
              {weightRecords.slice(1, 6).map((r, i, arr) => (
                <View key={r.id} style={[s.weightRow, i === arr.length - 1 && s.weightRowLast]}>
                  <Text style={s.weightRowValue}>{Number(r.weight_kg)} kg</Text>
                  <Text style={s.weightRowDate}>{fechaHumana(r.date)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ─── Historial médico ─── */}
        <View style={s.section}>
          <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Historial médico</Text>
              {medicalRecords && medicalRecords.length > 0 && (
                <View style={s.countBadge}><Text style={s.countText}>{medicalRecords.length}</Text></View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {medicalRecords && medicalRecords.length > 0 && (
                <TouchableOpacity
                  onPress={() => { haptic.light(); downloadPdf(); }}
                  style={s.pdfBtn}
                  disabled={pdfLoading}
                  activeOpacity={0.75}
                >
                  {pdfLoading
                    ? <ActivityIndicator size="small" color={c.isDark ? '#fca5a5' : '#dc2626'} />
                    : <><Download size={14} color={c.isDark ? '#fca5a5' : '#dc2626'} strokeWidth={2.2} /><Text style={s.pdfBtnText}>PDF</Text></>
                  }
                </TouchableOpacity>
              )}
              {can('horses', 'update') && (
                <TouchableOpacity
                  onPress={() => { haptic.light(); setMedicalForm({ type: 'vacuna', name: '', date: today }); setShowAddMedical(true); }}
                  style={s.smallBtn}
                >
                  <Text style={s.smallBtnText}>+ Agregar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!medicalRecords?.length ? (
            <Text style={s.emptyText}>Sin registros médicos. Agregá vacunas, desparasitaciones y tratamientos.</Text>
          ) : (
            <View>
              {medicalRecords.map((rec, index) => {
                const mc = MEDICAL_TYPE_COLORS[rec.type] ?? MEDICAL_TYPE_COLORS.tratamiento;
                const isLast = index === medicalRecords.length - 1;
                return (
                  <Animated.View key={rec.id} style={[s.medRow, isLast && s.medRowLast]} entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 45)}>
                    <View style={s.medCardTop}>
                      <View style={[s.medTypeBadge, { backgroundColor: mc.bg }]}>
                        <Text style={[s.medTypeText, { color: mc.text }]}>{MEDICAL_TYPE_LABELS[rec.type] ?? rec.type}</Text>
                      </View>
                      <Text style={s.medName} numberOfLines={1}>{rec.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.medDate}>{fechaHumana(rec.date)}</Text>
                        {can('horses', 'update') && (
                          <TouchableOpacity
                            onPress={() => Alert.alert('Eliminar', `¿Eliminás "${rec.name}"?`, [
                              { text: 'Cancelar', style: 'cancel' },
                              { text: 'Eliminar', style: 'destructive', onPress: () => { haptic.medium(); deleteMedical.mutate(rec.id); } },
                            ])}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel={`Más opciones de ${rec.name}`}
                          >
                            <MoreVertical size={20} color={c.textFaint} strokeWidth={2} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    {(rec.next_due || rec.brand || rec.notes) && (
                      <View style={{ gap: 2, paddingLeft: 2, marginTop: 4 }}>
                        {rec.next_due && (() => {
                          const dueStatus = healthStatusFromNextDue(rec.next_due);
                          const dueColor = dueStatus === 'rojo' ? c.danger : dueStatus === 'amarillo' ? c.warning : c.textFaint;
                          return (
                            <Text style={[s.medNextDue, { color: dueColor, fontWeight: dueStatus === 'rojo' ? weight.bold : weight.medium }]}>
                              {vence(rec.next_due)}
                            </Text>
                          );
                        })()}
                        {rec.brand && <Text style={s.medBrand}>Marca: {rec.brand}</Text>}
                        {rec.notes && <Text style={s.medNotes}>{rec.notes}</Text>}
                      </View>
                    )}
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── Hoja agregar peso ─── */}
      <FormSheet
        visible={showAddWeight}
        onClose={() => setShowAddWeight(false)}
        title="Registrar peso"
        footer={
          <>
            <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => setShowAddWeight(false)} accessibilityRole="button" accessibilityLabel="Cancelar registro de peso">
              <Text style={s.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btnPrimary, { flex: 1 }, (!newWeight || addWeight.isPending) && { opacity: 0.6 }]}
              disabled={!newWeight || addWeight.isPending}
              onPress={async () => { await addWeight.mutateAsync({ weight_kg: newWeight, date: newWeightDate }); setShowAddWeight(false); haptic.success(); toast.success('Peso registrado'); }}
              accessibilityRole="button"
              accessibilityLabel="Guardar peso registrado"
            >
              {addWeight.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.btnPrimaryText}>Guardar</Text>}
            </TouchableOpacity>
          </>
        }
      >
        <TextInput
          style={s.input}
          value={newWeight}
          onChangeText={setNewWeight}
          placeholder="Peso en kg, ej: 450.0"
          placeholderTextColor={c.textFaint}
          keyboardType="decimal-pad"
          returnKeyType="done"
        />
        <DatePicker label="Fecha" value={newWeightDate} onChange={setNewWeightDate} maxDate={new Date()} />
      </FormSheet>

      {/* ─── Hoja agregar registro médico ─── */}
      <FormSheet
        visible={showAddMedical}
        onClose={() => { setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: today }); }}
        title="Nuevo registro médico"
        footer={
          <>
            <TouchableOpacity
              style={[s.btn, s.btnSecondary, { flex: 1 }]}
              onPress={() => { setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: today }); }}
              accessibilityRole="button"
              accessibilityLabel="Cancelar registro médico"
            >
              <Text style={s.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btnPrimary, { flex: 1 }, (!medicalForm.name.trim() || addMedical.isPending) && { opacity: 0.5 }]}
              disabled={!medicalForm.name.trim() || addMedical.isPending}
              onPress={async () => { await addMedical.mutateAsync(medicalForm); setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: today }); haptic.success(); toast.success('Registro médico agregado'); }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Guardar registro médico"
            >
              {addMedical.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.btnPrimaryText}>Guardar</Text>}
            </TouchableOpacity>
          </>
        }
      >
        <Text style={s.fieldLabel}>Tipo</Text>
        <View style={s.medTypeGrid}>
          {(['vacuna', 'desparasitacion', 'analisis', 'tratamiento', 'sanidad'] as const).map((t) => {
            const mc = MEDICAL_TYPE_COLORS[t];
            const active = medicalForm.type === t;
            return (
              <TouchableOpacity key={t} style={[s.medTypeOption, active && { backgroundColor: mc.bg }]} onPress={() => { haptic.selection(); setMedicalForm((p) => ({ ...p, type: t })); }} activeOpacity={0.7}>
                <Text style={[s.medTypeOptionText, active && { color: mc.text, fontWeight: '700' }]}>{MEDICAL_TYPE_LABELS[t]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput style={s.input} value={medicalForm.name} onChangeText={(v) => setMedicalForm((p) => ({ ...p, name: v }))} placeholder="Nombre / producto, ej: Triple viral" placeholderTextColor={c.textFaint} returnKeyType="next" />
        <DatePicker label="Fecha *" value={medicalForm.date} onChange={(v) => setMedicalForm((p) => ({ ...p, date: v }))} maxDate={new Date()} />
        <DatePicker label="Próxima dosis" value={medicalForm.next_due ?? ''} onChange={(v) => setMedicalForm((p) => ({ ...p, next_due: v || undefined }))} />
        <TextInput style={s.input} value={medicalForm.brand ?? ''} onChangeText={(v) => setMedicalForm((p) => ({ ...p, brand: v || undefined }))} placeholder="Marca / laboratorio (opcional)" placeholderTextColor={c.textFaint} returnKeyType="next" />
        <TextInput style={[s.input, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]} value={medicalForm.notes ?? ''} onChangeText={(v) => setMedicalForm((p) => ({ ...p, notes: v || undefined }))} placeholder="Notas / observaciones adicionales" placeholderTextColor={c.textFaint} multiline returnKeyType="done" />
      </FormSheet>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  section: { marginHorizontal: space[4], marginBottom: space[6], gap: space[2] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: text.md, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  countBadge: { backgroundColor: c.surfaceAlt, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 11, fontWeight: '700', color: c.textMuted },
  emptyText: { fontSize: 13, color: c.textFaint },

  /* Libreta sanitaria */
  healthBookHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  healthBookTitle: { fontSize: 11, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: c.surface, borderRadius: 12, paddingLeft: 12, paddingRight: 10, paddingVertical: 10, overflow: 'hidden', marginBottom: 8, ...(c.isDark ? {} : shadow.sm) },
  healthAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  healthIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  healthName: { fontSize: 13, fontWeight: '600', color: c.text },
  healthDueRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  healthDue: { fontSize: 10, color: c.textFaint, flexShrink: 1 },
  healthBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  healthBadgeDot: { width: 5, height: 5, borderRadius: 999 },
  healthBadgeText: { fontSize: 9, fontWeight: '700' },
  healthCertifyBtn: { borderRadius: 999, backgroundColor: c.brandSoft, paddingHorizontal: 10, paddingVertical: 5 },
  healthCertifyText: { fontSize: 10, fontWeight: '700', color: c.brand },
  certifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: c.brand, borderRadius: 12, paddingVertical: space[3], marginTop: 2 },
  certifyBtnLocked: { backgroundColor: c.surfaceAlt },
  certifyBtnText: { fontSize: 12, fontWeight: '700', color: colors.white },

  /* Peso */
  weightLatest: { backgroundColor: c.isDark ? 'rgba(234,88,12,0.14)' : '#fff7ed', borderRadius: 12, padding: 12, marginBottom: 4 },
  weightValue: { fontSize: 28, fontWeight: '800', color: c.isDark ? '#fb923c' : '#c2410c' },
  weightCC: { fontSize: 12, color: c.isDark ? '#fdba74' : '#ea580c', marginTop: 2 },
  weightDate: { fontSize: 11, color: c.isDark ? '#fdba74' : '#9a3412', marginTop: 2 },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  weightRowLast: { borderBottomWidth: 0 },
  weightRowValue: { fontSize: 14, fontWeight: '600', color: c.text },
  weightRowDate: { fontSize: 12, color: c.textFaint },

  /* Médico */
  medRow: { paddingVertical: space[3], gap: 6, borderBottomWidth: 1, borderBottomColor: c.border },
  medRowLast: { borderBottomWidth: 0 },
  medCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  medTypeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  medTypeText: { fontSize: 10, fontWeight: '700' },
  medName: { flex: 1, fontSize: 13, fontWeight: '600', color: c.text },
  medDate: { fontSize: 10, color: c.textFaint },
  medNextDue: { fontSize: 11 },
  medBrand: { fontSize: 11, color: c.textFaint },
  medNotes: { fontSize: 11, color: c.textMuted, fontStyle: 'italic' },
  medTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  medTypeOption: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: c.surfaceAlt },
  medTypeOptionText: { fontSize: 12, color: c.textMuted },

  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.isDark ? 'rgba(239,68,68,0.16)' : '#fef2f2', minWidth: 44, justifyContent: 'center' },
  pdfBtnText: { fontSize: 11, fontWeight: '700', color: c.isDark ? '#fca5a5' : '#dc2626' },

  smallBtn: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.surfaceAlt },
  smallBtnText: { fontSize: 11, fontWeight: '600', color: c.text },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: c.text },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: c.text, backgroundColor: c.surfaceAlt },
  btn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: c.brand },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: colors.white },
  btnSecondary: { backgroundColor: c.surfaceAlt },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
});
