import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, AlertTriangle, XCircle, CalendarClock, Lock, Download, MoreVertical, Trash2, type LucideIcon } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  useMedicalRecords, useDeleteMedicalRecord, useDownloadMedicalPdf, useDownloadHealthCertificate,
  MEDICAL_TYPE_LABELS, makeMedicalTypeColors, SANITARY_DISEASES, healthStatusFromNextDue,
  type HealthStatus,
} from '../../../../hooks/use-medical';
import { useHorse, useWeightRecords, useAddWeightRecord } from '../../../../hooks/use-horses';
import { usePlanStatus } from '../../../../hooks/use-plan';
import { useAuth } from '../../../../lib/auth';
import { haptic } from '../../../../lib/haptics';
import { DatePicker } from '../../../../components/DatePicker';
import { useToast } from '../../../../components/Toast';
import { colors } from '../../../../lib/colors';
import { fechaHumana, vence } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../../styles/tokens';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { FormSheet } from '../../../../components/FormSheet';
import { ActionSheet } from '../../../../components/ActionSheet';
import { EmptyState } from '../../../../components/EmptyState';
import { ErrorState } from '../../../../components/ErrorState';
import { ListRowSkeleton } from '../../../../components/Skeleton';
import { todayISO } from '../../../../hooks/use-routines';
import { Routes, nav } from '../../../../lib/routes';

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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can, user } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);
  const medicalColors = makeMedicalTypeColors(c);
  const healthStatusMeta = useMemo(() => makeHealthStatusMeta(c), [c]);

  const { data: horse, isLoading, isError, refetch } = useHorse(id);
  const { data: medicalRecords } = useMedicalRecords(id);
  const deleteMedical = useDeleteMedicalRecord(id);
  const { download: downloadPdf, loading: pdfLoading } = useDownloadMedicalPdf(id, horse?.name ?? '');
  const { download: downloadCert, loading: certLoading } = useDownloadHealthCertificate(id, horse?.name ?? '');
  const { data: planStatus } = usePlanStatus();
  const isApprovedVet = user?.role === 'veterinario' && user?.vet_license_status === 'approved';
  const canCertify = isApprovedVet && (planStatus?.features?.includes('libreta_digital') ?? false);

  const { data: weightRecords } = useWeightRecords(id);
  const addWeight = useAddWeightRecord(id);

  const today = todayISO();
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(today);
  const [medMenuRecord, setMedMenuRecord] = useState<{ id: string; name: string } | null>(null);

  // El registro médico (formulario de varios campos) ahora es una pantalla
  // empujada: ./sanidad-nuevo.tsx. La hoja de peso (1 campo) se queda como hoja.
  const irANuevoRegistro = (prefill?: { type: string; name: string }) => {
    haptic.light();
    const base = Routes.caballoSanidadNuevo(id);
    const url = prefill
      ? `${base}?type=${encodeURIComponent(prefill.type)}&name=${encodeURIComponent(prefill.name)}`
      : base;
    nav.push(router, url);
  };

  useEffect(() => {
    if (!showAddWeight) return;
    setNewWeight('');
    setNewWeightDate(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddWeight]);

  if (isError && !horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Sanidad" />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  if (isLoading || !horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Sanidad" />
        <View style={{ padding: space[4], gap: space[2] }}>
          {[1, 2, 3, 4, 5].map((i) => <ListRowSkeleton key={i} />)}
        </View>
      </View>
    );
  }

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
          {SANITARY_DISEASES.map((d, i) => {
            const last = medicalRecords?.filter((r) => r.type === 'sanidad').find((r) => d.match.test(r.name)) ?? null;
            const nextDue = last?.next_due ?? null;
            const status = healthStatusFromNextDue(nextDue);
            const meta = healthStatusMeta[status];
            const StatusIcon = meta.Icon;
            return (
              <View key={d.key} style={[s.healthRow, i > 0 && s.healthRowBorde]}>
                <View style={[s.healthIconWrap, { backgroundColor: meta.bg }]}>
                  <StatusIcon size={16} color={meta.text} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.healthName} numberOfLines={1}>{d.name}</Text>
                  <View style={s.healthDueRow}>
                    <CalendarClock size={12} color={c.textFaint} strokeWidth={2} />
                    <Text style={s.healthDue} numberOfLines={1}>
                      {nextDue ? vence(nextDue) : 'Sin registro'}
                    </Text>
                  </View>
                </View>
                <View style={s.healthRight}>
                  <View style={[s.healthBadge, { backgroundColor: meta.bg }]}>
                    <View style={[s.healthBadgeDot, { backgroundColor: meta.dot }]} />
                    <Text style={[s.healthBadgeText, { color: meta.text }]}>{meta.label}</Text>
                  </View>
                  {can('horses', 'update') && (
                    <TouchableOpacity
                      onPress={() => irANuevoRegistro({ type: 'sanidad', name: d.name })}
                      activeOpacity={0.7}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Certificar ${d.name}`}
                    >
                      <Text style={s.healthCertifyText}>Certificar</Text>
                    </TouchableOpacity>
                  )}
                </View>
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
              <TouchableOpacity onPress={() => { haptic.light(); setShowAddWeight(true); }} style={s.smallBtn} activeOpacity={0.75}>
                <Text style={s.smallBtnText}>+ Registrar</Text>
              </TouchableOpacity>
            )}
          </View>
          {!weightRecords?.length ? (
            <EmptyState
              icon="scale-outline"
              title="Sin registros de peso"
              message="Registrá el primer peso para seguir la condición del caballo."
            />
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
                    ? <ActivityIndicator size="small" color={c.danger} />
                    : <><Download size={14} color={c.danger} strokeWidth={2.2} /><Text style={s.pdfBtnText}>PDF</Text></>
                  }
                </TouchableOpacity>
              )}
              {can('horses', 'update') && (
                <TouchableOpacity
                  onPress={() => irANuevoRegistro()}
                  style={s.smallBtn}
                  activeOpacity={0.75}
                >
                  <Text style={s.smallBtnText}>+ Agregar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!medicalRecords?.length ? (
            <EmptyState
              icon="medkit-outline"
              title="Sin registros médicos"
              message="Agregá vacunas, desparasitaciones y tratamientos."
            />
          ) : (
            <View>
              {medicalRecords.map((rec, index) => {
                const mc = medicalColors[rec.type] ?? medicalColors.tratamiento;
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
                            onPress={() => { haptic.selection(); setMedMenuRecord({ id: rec.id, name: rec.name }); }}
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
          <TouchableOpacity
            style={[s.btn, s.btnPrimary, { flex: 1 }, (!newWeight || addWeight.isPending) && { opacity: 0.6 }]}
            disabled={!newWeight || addWeight.isPending}
            onPress={async () => { await addWeight.mutateAsync({ weight_kg: newWeight, date: newWeightDate }); setShowAddWeight(false); haptic.success(); toast.success('Peso registrado'); }}
            accessibilityRole="button"
            accessibilityLabel="Guardar peso registrado"
          >
            {addWeight.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.btnPrimaryText}>Guardar</Text>}
          </TouchableOpacity>
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

      {/* ─── Menú de acciones del registro médico ─── */}
      <ActionSheet
        visible={!!medMenuRecord}
        onClose={() => setMedMenuRecord(null)}
        title={medMenuRecord?.name}
        acciones={[
          {
            label: 'Eliminar',
            Icon: Trash2,
            destructiva: true,
            onPress: () => { if (medMenuRecord) { haptic.medium(); deleteMedical.mutate(medMenuRecord.id); } },
          },
        ]}
      />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  section: { marginHorizontal: space[4], marginBottom: space[6], gap: space[2] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: text.md, fontWeight: weight.bold, color: c.text, letterSpacing: -0.3 },
  countBadge: { backgroundColor: c.surfaceAlt, borderRadius: radius.full, paddingHorizontal: space[2], paddingVertical: 2 },
  countText: { fontSize: text.xs, fontWeight: weight.bold, color: c.textMuted },

  /* Libreta sanitaria — filas planas: el ícono de estado + badge comunican todo */
  healthBookHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  healthBookTitle: { fontSize: text.xs, fontWeight: weight.bold, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  healthRowBorde: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  healthIconWrap: { width: 34, height: 34, borderRadius: radius.md - 2, justifyContent: 'center', alignItems: 'center' },
  healthName: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  healthDueRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  healthDue: { fontSize: text.sm, color: c.textFaint, flexShrink: 1 },
  healthRight: { alignItems: 'flex-end', gap: space[2] },
  healthBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: space[2], paddingVertical: 3 },
  healthBadgeDot: { width: 5, height: 5, borderRadius: radius.full },
  healthBadgeText: { fontSize: text.xs, fontWeight: weight.bold },
  healthCertifyText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.brand },
  certifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: c.brand, borderRadius: radius.md, paddingVertical: space[3], marginTop: 2 },
  certifyBtnLocked: { backgroundColor: c.surfaceAlt },
  certifyBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.white },

  /* Peso — el valor destaca por tipografía, sin caja de acento */
  weightLatest: { paddingVertical: space[3], marginBottom: 4 },
  weightValue: { fontSize: text.xl, fontWeight: weight.bold, color: c.text },
  weightCC: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },
  weightDate: { fontSize: text.xs, color: c.textMuted, marginTop: 2 },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space[2], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  weightRowLast: { borderBottomWidth: 0 },
  weightRowValue: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  weightRowDate: { fontSize: text.xs, color: c.textFaint },

  /* Médico */
  medRow: { paddingVertical: space[3], gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  medRowLast: { borderBottomWidth: 0 },
  medCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  medTypeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  medTypeText: { fontSize: text.xs, fontWeight: weight.bold },
  medName: { flex: 1, fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  medDate: { fontSize: text.xs, color: c.textFaint },
  medNextDue: { fontSize: text.xs },
  medBrand: { fontSize: text.xs, color: c.textFaint },
  medNotes: { fontSize: text.xs, color: c.textMuted, fontStyle: 'italic' },

  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.full, paddingHorizontal: space[3], minHeight: touch.min, backgroundColor: c.dangerSoft, minWidth: touch.min, justifyContent: 'center' },
  pdfBtnText: { fontSize: text.xs, fontWeight: weight.bold, color: c.danger },

  smallBtn: { minHeight: touch.min, justifyContent: 'center', borderRadius: radius.full, paddingHorizontal: space[3], backgroundColor: c.surfaceAlt },
  smallBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },

  input: { borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: space[3], fontSize: text.base, color: c.text, backgroundColor: c.surfaceAlt },
  btn: { borderRadius: radius.lg, height: touch.button, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: c.brand },
  btnPrimaryText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
});
