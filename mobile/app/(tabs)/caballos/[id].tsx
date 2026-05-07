import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl,
  Modal, KeyboardAvoidingView, Platform, TextInput, ActivityIndicator, Alert, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

import { useHorse, useFinancialSummary, useUpdateHorse, useDeleteHorse, useUploadHorseImage, useHorseDocuments, useWeightRecords, useAddWeightRecord } from '../../../hooks/use-horses';
import { useRoutines, useUpsertRoutine, ROUTINE_ITEMS } from '../../../hooks/use-routines';
import { useActivityPhotos, useUploadActivityPhoto, ACTIVITY_TYPES } from '../../../hooks/use-activity-photos';
import { useMedicalRecords, useAddMedicalRecord, useDeleteMedicalRecord, MEDICAL_TYPE_LABELS, MEDICAL_TYPE_COLORS, type CreateMedicalRecordDto } from '../../../hooks/use-medical';
import { useEventComments, useAddEventComment, useDeleteEventComment } from '../../../hooks/use-event-comments';
import { useEventsByHorse } from '../../../hooks/use-events';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { DatePicker } from '../../../components/DatePicker';
import { Spinner } from '../../../components/Spinner';
import { EventTypeBadge } from '../../../components/EventTypeBadge';
import { colors } from '../../../lib/colors';
import { space, text, radius, weight } from '../../../styles/tokens';
import type { Event, Horse } from '../../../../packages/shared/src';

type Tab = 'info' | 'historial' | 'medico' | 'fotos';

const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'info',      label: 'Info',      icon: 'information-circle-outline' },
  { key: 'historial', label: 'Historial', icon: 'time-outline' },
  { key: 'medico',    label: 'Médico',    icon: 'medkit-outline' },
  { key: 'fotos',     label: 'Fotos',     icon: 'images-outline' },
];

/* ─── EditHorseModal ─── */
function EditHorseModal({ horse, onClose }: { horse: Horse; onClose: () => void }) {
  const updateHorse = useUpdateHorse();
  const [name, setName] = useState(horse.name);
  const [birthDate, setBirthDate] = useState(horse.birth_date ?? '');
  const [microchip, setMicrochip] = useState(horse.microchip ?? '');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    setError('');
    await updateHorse.mutateAsync({ id: horse.id, name: name.trim(), birth_date: birthDate || null, microchip: microchip || null });
    onClose();
  };

  return (
    <KeyboardAvoidingView style={s.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.modalCard}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>Editar {horse.name}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.gray400} /></TouchableOpacity>
        </View>
        <View style={s.modalBody}>
          <Text style={s.fieldLabel}>Nombre *</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Nombre del caballo" placeholderTextColor={colors.gray400} autoCapitalize="words" />
          <DatePicker label="Fecha de nacimiento" value={birthDate} onChange={setBirthDate} maxDate={new Date()} />
          <Text style={s.fieldLabel}>Microchip (15 dígitos)</Text>
          <TextInput style={s.input} value={microchip} onChangeText={(v) => setMicrochip(v.replace(/\D/g, '').slice(0, 15))} placeholder="123456789012345" placeholderTextColor={colors.gray400} keyboardType="numeric" />
          {error ? <Text style={s.fieldError}>{error}</Text> : null}
        </View>
        <View style={s.modalFooter}>
          <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={onClose}><Text style={s.btnSecondaryText}>Cancelar</Text></TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnPrimary, { flex: 1 }, updateHorse.isPending && { opacity: 0.6 }]} onPress={handleSave} disabled={updateHorse.isPending}>
            {updateHorse.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.btnPrimaryText}>Guardar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ─── InfoItem ─── */
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoItem}>
      <Text style={s.infoLabel} numberOfLines={1}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

/* ─── EventCommentThread ─── */
function EventCommentThread({ eventId, currentUserId }: { eventId: string; currentUserId?: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const { data: comments } = useEventComments(eventId, open);
  const add = useAddEventComment(eventId);
  const del = useDeleteEventComment(eventId);

  return (
    <View style={s.commentRoot}>
      <TouchableOpacity style={s.commentToggle} onPress={() => setOpen((p) => !p)} activeOpacity={0.7}>
        <Ionicons name="chatbubble-outline" size={12} color={colors.gray400} />
        <Text style={s.commentToggleText}>
          {open ? 'Ocultar' : 'Comentarios'}{comments && comments.length > 0 ? ` (${comments.length})` : ''}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={s.commentBody}>
          {comments?.map((c) => (
            <View key={c.id} style={s.commentRow}>
              <View style={s.commentAvatar}><Text style={s.commentAvatarText}>{c.user?.name?.[0]?.toUpperCase() ?? '?'}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.commentAuthor}>{c.user?.name}</Text>
                  <Text style={s.commentDate}>{new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</Text>
                </View>
                <Text style={s.commentText}>{c.text}</Text>
              </View>
              {c.user_id === currentUserId && (
                <TouchableOpacity onPress={() => del.mutate(c.id)} style={{ paddingLeft: 6 }}>
                  <Ionicons name="close" size={14} color={colors.gray300} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <View style={s.commentInputRow}>
            <TextInput style={s.commentInput} value={text} onChangeText={setText} placeholder="Escribí un comentario..." placeholderTextColor={colors.gray400} multiline />
            <TouchableOpacity
              style={[s.commentSend, (!text.trim() || add.isPending) && { opacity: 0.4 }]}
              disabled={!text.trim() || add.isPending}
              onPress={async () => { await add.mutateAsync(text.trim()); setText(''); }}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

/* ─── EventCard ─── */
function EventCard({ event, currentUserId }: { event: Event; currentUserId?: string }) {
  const date = new Date(event.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <View style={s.eventCard}>
      <View style={s.eventHeader}>
        <EventTypeBadge type={event.type} />
        <Text style={s.eventDate}>{date}</Text>
      </View>
      <Text style={s.eventDesc}>{event.description}</Text>
      {event.amount != null && (
        <Text style={s.eventAmount}>${Number(event.amount).toLocaleString('es-AR')}</Text>
      )}
      <EventCommentThread eventId={event.id} currentUserId={currentUserId} />
    </View>
  );
}

/* ─── Main ─── */
export default function HorseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can, user } = useAuth();

  const { data: horse, isLoading, refetch, isRefetching } = useHorse(id);
  const { data: events } = useEventsByHorse(id);
  const { data: financial } = useFinancialSummary(id);
  const { data: documents } = useHorseDocuments(id);
  const { data: weightRecords } = useWeightRecords(id);
  const addWeight = useAddWeightRecord(id);
  const { data: routines } = useRoutines(id);
  const upsertRoutine = useUpsertRoutine(id);
  const { data: activityPhotos } = useActivityPhotos(id);
  const uploadActivityPhoto = useUploadActivityPhoto(id);
  const { data: medicalRecords } = useMedicalRecords(id);
  const addMedical = useAddMedicalRecord(id);
  const deleteMedical = useDeleteMedicalRecord(id);

  const todayISO = new Date().toISOString().split('T')[0];
  const todayRoutine = routines?.find((r) => r.date === todayISO);
  const deleteHorse = useDeleteHorse();
  const uploadImage = useUploadHorseImage();

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [showEdit, setShowEdit] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(todayISO);
  const [activityType, setActivityType] = useState('otro');
  const [showAddMedical, setShowAddMedical] = useState(false);
  const [medicalForm, setMedicalForm] = useState<CreateMedicalRecordDto>({ type: 'vacuna', name: '', date: todayISO });

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permisos necesarios', 'Necesitamos acceso a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets[0]) await uploadImage.mutateAsync({ id, uri: result.assets[0].uri });
  };

  const handleDelete = () => {
    haptic.medium();
    Alert.alert('Eliminar caballo', `¿Eliminás a ${horse?.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteHorse.mutateAsync(id); router.back(); } },
    ]);
  };

  if (isLoading) return <Spinner />;
  if (!horse) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Text style={{ fontSize: 15, color: colors.gray500 }}>Caballo no encontrado</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>← Volver</Text></TouchableOpacity>
      </View>
    );
  }

  const sortedEvents = [...(events ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const infoItems: { label: string; value: string }[] = [];
  if (horse.birth_date) {
    const years = Math.floor((Date.now() - new Date(horse.birth_date + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    infoItems.push({ label: 'Nacimiento', value: `${new Date(horse.birth_date + 'T12:00:00').toLocaleDateString('es-AR')} · ${years} años` });
  }
  if (horse.microchip) infoItems.push({ label: 'Microchip', value: horse.microchip });
  if (horse.owner) infoItems.push({ label: 'Propietario', value: horse.owner.name });
  if (horse.establishment) infoItems.push({ label: 'Establecimiento', value: horse.establishment.name });
  if (horse.breed) infoItems.push({ label: 'Raza', value: horse.breed.name });
  if (horse.activity) infoItems.push({ label: 'Actividad', value: horse.activity.name });

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {/* ─── Hero: aspect ratio, Dynamic Island safe ─── */}
      <View style={s.heroWrap}>
        {horse.image_url
          ? <Image source={{ uri: horse.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFill, s.heroPlaceholder]} />
        }
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.75)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Back */}
        <TouchableOpacity style={[s.heroPill, { top: insets.top + 10, left: 14 }]} onPress={() => { haptic.light(); router.back(); }} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color={colors.white} />
        </TouchableOpacity>

        {/* Acciones */}
        {(can('horses', 'update') || can('horses', 'delete')) && (
          <View style={[s.heroActions, { top: insets.top + 10 }]}>
            {can('horses', 'update') && (
              <TouchableOpacity style={[s.heroPill, uploadImage.isPending && { opacity: 0.6 }]} onPress={handlePickImage} disabled={uploadImage.isPending} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={18} color={colors.white} />
              </TouchableOpacity>
            )}
            {can('horses', 'update') && (
              <TouchableOpacity style={s.heroPill} onPress={() => setShowEdit(true)} activeOpacity={0.8}>
                <Ionicons name="pencil-outline" size={18} color={colors.white} />
              </TouchableOpacity>
            )}
            {can('horses', 'delete') && (
              <TouchableOpacity style={[s.heroPill, s.heroPillDanger]} onPress={handleDelete} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={18} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* QR */}
        {horse.public_token && (
          <TouchableOpacity
            style={[s.heroPill, { position: 'absolute', left: 14, bottom: 52 }, { backgroundColor: 'rgba(5,150,105,0.85)' }]}
            onPress={() => setShowQR(true)} activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={18} color={colors.white} />
          </TouchableOpacity>
        )}

        {/* Nombre + badges */}
        <View style={s.heroContent}>
          <Text style={s.horseName} numberOfLines={2}>{horse.name}</Text>
          <View style={s.heroBadges}>
            {horse.breed && <View style={s.heroBadge}><Text style={s.heroBadgeText} numberOfLines={1}>{horse.breed.name}</Text></View>}
            {horse.activity && <View style={[s.heroBadge, s.heroBadgeAmber]}><Text style={s.heroBadgeText} numberOfLines={1}>{horse.activity.name}</Text></View>}
          </View>
        </View>
      </View>

      {/* ─── Tab bar ─── */}
      <View style={s.tabBar}>
        {TABS.map(({ key, label, icon }) => (
          <TouchableOpacity
            key={key}
            style={[s.tabItem, activeTab === key && s.tabItemActive]}
            onPress={() => { haptic.selection(); setActiveTab(key); }}
            activeOpacity={0.7}
          >
            <Ionicons name={icon} size={15} color={activeTab === key ? colors.primary : colors.gray400} />
            <Text style={[s.tabLabel, activeTab === key && s.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ════════════════ TAB: INFO ════════════════ */}
      {activeTab === 'info' && (
        <View style={{ gap: 0 }}>
          {/* Info grid */}
          {infoItems.length > 0 && (
            <View style={s.section}>
              <View style={s.infoGrid}>
                {infoItems.map((item) => <InfoItem key={item.label} label={item.label} value={item.value} />)}
              </View>
            </View>
          )}

          {/* Resumen financiero */}
          {financial && financial.total > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Resumen financiero</Text>
              <View style={s.financialCard}>
                <View style={s.financialGrid}>
                  <View style={[s.financialStat, { backgroundColor: '#faf5ff' }]}>
                    <Text style={[s.financialStatValue, { color: colors.purple700 }]} numberOfLines={1} adjustsFontSizeToFit>
                      ${financial.total.toLocaleString('es-AR')}
                    </Text>
                    <Text style={[s.financialStatLabel, { color: colors.purple700 }]}>Total gastos</Text>
                  </View>
                  <View style={[s.financialStat, { backgroundColor: colors.gray50 }]}>
                    <Text style={s.financialStatValue} numberOfLines={1} adjustsFontSizeToFit>
                      ${financial.average_monthly.toLocaleString('es-AR')}
                    </Text>
                    <Text style={s.financialStatLabel}>Promedio/mes</Text>
                  </View>
                </View>
                {financial.monthly.slice(0, 5).map((m) => {
                  const [year, month] = m.month.split('-');
                  const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
                  const maxVal = Math.max(...financial.monthly.slice(0, 5).map((x) => x.total));
                  const pct = maxVal > 0 ? (m.total / maxVal) * 100 : 0;
                  return (
                    <View key={m.month} style={s.barRow}>
                      <Text style={s.barLabel}>{label}</Text>
                      <View style={s.barTrack}><View style={[s.barFill, { width: `${pct}%` as any }]} /></View>
                      <Text style={s.barValue}>${m.total.toLocaleString('es-AR')}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Documentos */}
          {documents && documents.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Documentos</Text>
              <View style={s.docsCard}>
                {documents.map((doc, i) => (
                  <View key={doc.id}>
                    {i > 0 && <View style={s.docDivider} />}
                    <TouchableOpacity style={s.docRow} onPress={() => Linking.openURL(doc.url)} activeOpacity={0.7}>
                      <View style={s.docIcon}><Ionicons name="document-text-outline" size={18} color={colors.red500} /></View>
                      <Text style={s.docName} numberOfLines={1}>{doc.name}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Peso */}
          <View style={s.section}>
            <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
              <Text style={s.sectionTitle}>Peso y condición</Text>
              {can('horses', 'update') && (
                <TouchableOpacity onPress={() => setShowAddWeight(true)} style={s.smallBtn}>
                  <Text style={s.smallBtnText}>+ Registrar</Text>
                </TouchableOpacity>
              )}
            </View>
            {!weightRecords?.length ? (
              <Text style={s.emptyText}>Sin registros de peso</Text>
            ) : (
              <View style={s.weightCard}>
                <View style={s.weightLatest}>
                  <Text style={s.weightValue}>{Number(weightRecords[0].weight_kg)} kg</Text>
                  {weightRecords[0].body_condition && <Text style={s.weightCC}>CC: {weightRecords[0].body_condition}/9</Text>}
                  <Text style={s.weightDate}>{new Date(weightRecords[0].date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                </View>
                {weightRecords.slice(1, 4).map((r) => (
                  <View key={r.id} style={s.weightRow}>
                    <Text style={s.weightRowValue}>{Number(r.weight_kg)} kg</Text>
                    <Text style={s.weightRowDate}>{new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Rutina */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Rutina de hoy</Text>
            <View style={s.routineGrid}>
              {ROUTINE_ITEMS.map(({ key, label, emoji }) => {
                const checked = todayRoutine?.[key] ?? false;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[s.routineItem, checked && s.routineItemChecked]}
                    onPress={() => { haptic.selection(); upsertRoutine.mutate({ date: todayISO, [key]: !checked }); }}
                    activeOpacity={0.7}
                  >
                    <Text style={s.routineEmoji}>{emoji}</Text>
                    <Text style={[s.routineLabel, checked && s.routineLabelChecked]} numberOfLines={1}>{label}</Text>
                    {checked && <Ionicons name="checkmark-circle" size={16} color="#16a34a" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* ════════════════ TAB: HISTORIAL ════════════════ */}
      {activeTab === 'historial' && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Historial de eventos</Text>
            {sortedEvents.length > 0 && (
              <View style={s.countBadge}><Text style={s.countText}>{sortedEvents.length}</Text></View>
            )}
          </View>
          {sortedEvents.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyText}>Sin eventos registrados</Text></View>
          ) : (
            <View style={s.eventsList}>
              {sortedEvents.map((ev) => <EventCard key={ev.id} event={ev} currentUserId={user?.id} />)}
            </View>
          )}
        </View>
      )}

      {/* ════════════════ TAB: MÉDICO ════════════════ */}
      {activeTab === 'medico' && (
        <View style={s.section}>
          <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Historial médico</Text>
              {medicalRecords && medicalRecords.length > 0 && (
                <View style={s.countBadge}><Text style={s.countText}>{medicalRecords.length}</Text></View>
              )}
            </View>
            {can('horses', 'update') && (
              <TouchableOpacity onPress={() => setShowAddMedical(true)} style={s.smallBtn}>
                <Text style={s.smallBtnText}>+ Agregar</Text>
              </TouchableOpacity>
            )}
          </View>

          {!medicalRecords?.length ? (
            <Text style={s.emptyText}>Sin registros médicos. Agregá vacunas, desparasitaciones y tratamientos.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {medicalRecords.map((rec) => {
                const c = MEDICAL_TYPE_COLORS[rec.type] ?? MEDICAL_TYPE_COLORS.tratamiento;
                return (
                  <View key={rec.id} style={s.medCard}>
                    <View style={s.medCardTop}>
                      <View style={[s.medTypeBadge, { backgroundColor: c.bg }]}>
                        <Text style={[s.medTypeText, { color: c.text }]}>{MEDICAL_TYPE_LABELS[rec.type] ?? rec.type}</Text>
                      </View>
                      <Text style={s.medName} numberOfLines={1}>{rec.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.medDate}>{new Date(rec.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                        {can('horses', 'update') && (
                          <TouchableOpacity onPress={() => Alert.alert('Eliminar', `¿Eliminás "${rec.name}"?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Eliminar', style: 'destructive', onPress: () => { haptic.medium(); deleteMedical.mutate(rec.id); } },
                          ])}>
                            <Ionicons name="close" size={16} color={colors.gray300} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    {(rec.next_due || rec.brand || rec.notes) && (
                      <View style={{ gap: 2, paddingLeft: 2, marginTop: 4 }}>
                        {rec.next_due && <Text style={s.medNextDue}>Próxima: {new Date(rec.next_due + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>}
                        {rec.brand && <Text style={s.medBrand}>Marca: {rec.brand}</Text>}
                        {rec.notes && <Text style={s.medNotes}>{rec.notes}</Text>}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ════════════════ TAB: FOTOS ════════════════ */}
      {activeTab === 'fotos' && (
        <View style={s.section}>
          <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
            <Text style={s.sectionTitle}>Fotos verificadas</Text>
            <TouchableOpacity
              style={s.smallBtn}
              onPress={async () => {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') { Alert.alert('Permiso', 'Necesitamos acceso a la cámara.'); return; }
                const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
                if (!result.canceled && result.assets[0]) {
                  await uploadActivityPhoto.mutateAsync({ uri: result.assets[0].uri, activity_type: activityType });
                  haptic.success();
                }
              }}
            >
              <Text style={s.smallBtnText}>📷 Capturar</Text>
            </TouchableOpacity>
          </View>
          <View style={s.activityTypeRow}>
            {Object.entries(ACTIVITY_TYPES).map(([v, m]) => (
              <TouchableOpacity key={v} style={[s.activityChip, activityType === v && { backgroundColor: m.bg, borderColor: m.color }]} onPress={() => setActivityType(v)}>
                <Text style={[s.activityChipText, activityType === v && { color: m.color }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {!activityPhotos?.length ? (
            <Text style={s.emptyText}>Las fotos tomadas incluyen sello de fecha y autor verificado.</Text>
          ) : (
            <View style={s.photosGrid}>
              {activityPhotos.slice(0, 9).map((p) => {
                const meta = ACTIVITY_TYPES[p.activity_type] ?? ACTIVITY_TYPES.otro;
                return (
                  <TouchableOpacity key={p.id} style={s.photoWrap} onPress={() => Linking.openURL(p.url)} activeOpacity={0.85}>
                    <Image source={{ uri: p.url }} style={s.photoThumb} />
                    <View style={[s.photoBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[s.photoBadgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ─── Modal QR ─── */}
      <Modal visible={showQR} animationType="fade" transparent>
        <View style={s.qrOverlay}>
          <View style={s.qrCard}>
            <View style={s.qrHeader}>
              <View>
                <Text style={s.qrSub}>Código QR</Text>
                <Text style={s.qrTitle} numberOfLines={1}>{horse.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQR(false)}><Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
            </View>
            <View style={s.qrWrap}>
              {horse.public_token && (
                <QRCode value={`https://app.handicapp.com/caballo/${horse.public_token}`} size={220} color="#0f1f3d" backgroundColor="#ffffff" />
              )}
            </View>
            <Text style={s.qrHint}>Escaneá para ver el perfil público del caballo</Text>
            <TouchableOpacity style={s.qrBtn} onPress={() => Alert.alert('Enlace', `https://app.handicapp.com/caballo/${horse.public_token}`, [{ text: 'OK' }])} activeOpacity={0.85}>
              <Text style={s.qrBtnText}>Ver enlace</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Modal agregar peso ─── */}
      <Modal visible={showAddWeight} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Registrar peso</Text>
              <TouchableOpacity onPress={() => setShowAddWeight(false)}><Ionicons name="close" size={22} color={colors.gray400} /></TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <Text style={s.fieldLabel}>Peso (kg) *</Text>
              <TextInput style={s.input} value={newWeight} onChangeText={setNewWeight} placeholder="450.0" placeholderTextColor={colors.gray400} keyboardType="decimal-pad" />
              <DatePicker label="Fecha" value={newWeightDate} onChange={setNewWeightDate} maxDate={new Date()} />
            </View>
            <View style={s.modalFooter}>
              <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => setShowAddWeight(false)}><Text style={s.btnSecondaryText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, { flex: 1 }, (!newWeight || addWeight.isPending) && { opacity: 0.6 }]}
                disabled={!newWeight || addWeight.isPending}
                onPress={async () => { await addWeight.mutateAsync({ weight_kg: newWeight, date: newWeightDate }); setNewWeight(''); setShowAddWeight(false); haptic.success(); }}
              >
                {addWeight.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Modal agregar registro médico ─── */}
      <Modal visible={showAddMedical} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.modalCard, { maxHeight: '85%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nuevo registro médico</Text>
              <TouchableOpacity onPress={() => { setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: todayISO }); }}>
                <Ionicons name="close" size={22} color={colors.gray400} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.modalBody, { paddingBottom: 8 }]}>
              <Text style={s.fieldLabel}>Tipo</Text>
              <View style={s.medTypeGrid}>
                {(['vacuna', 'desparasitacion', 'analisis', 'tratamiento'] as const).map((t) => {
                  const c = MEDICAL_TYPE_COLORS[t];
                  const active = medicalForm.type === t;
                  return (
                    <TouchableOpacity key={t} style={[s.medTypeOption, active && { backgroundColor: c.bg, borderColor: c.text }]} onPress={() => setMedicalForm((p) => ({ ...p, type: t }))} activeOpacity={0.7}>
                      <Text style={[s.medTypeOptionText, active && { color: c.text, fontWeight: '700' }]}>{MEDICAL_TYPE_LABELS[t]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[s.fieldLabel, { marginTop: 10 }]}>Nombre / producto *</Text>
              <TextInput style={s.input} value={medicalForm.name} onChangeText={(v) => setMedicalForm((p) => ({ ...p, name: v }))} placeholder="Ej: Triple viral, Ivermectina..." placeholderTextColor={colors.gray400} />
              <DatePicker label="Fecha *" value={medicalForm.date} onChange={(v) => setMedicalForm((p) => ({ ...p, date: v }))} maxDate={new Date()} />
              <DatePicker label="Próxima dosis" value={medicalForm.next_due ?? ''} onChange={(v) => setMedicalForm((p) => ({ ...p, next_due: v || undefined }))} />
              <Text style={[s.fieldLabel, { marginTop: 10 }]}>Marca / laboratorio</Text>
              <TextInput style={s.input} value={medicalForm.brand ?? ''} onChangeText={(v) => setMedicalForm((p) => ({ ...p, brand: v || undefined }))} placeholder="Opcional" placeholderTextColor={colors.gray400} />
              <Text style={[s.fieldLabel, { marginTop: 10 }]}>Notas</Text>
              <TextInput style={[s.input, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]} value={medicalForm.notes ?? ''} onChangeText={(v) => setMedicalForm((p) => ({ ...p, notes: v || undefined }))} placeholder="Observaciones adicionales" placeholderTextColor={colors.gray400} multiline />
            </ScrollView>
            <View style={s.modalFooter}>
              <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => { setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: todayISO }); }}><Text style={s.btnSecondaryText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, { flex: 1 }, (!medicalForm.name.trim() || addMedical.isPending) && { opacity: 0.5 }]}
                disabled={!medicalForm.name.trim() || addMedical.isPending}
                onPress={async () => { await addMedical.mutateAsync(medicalForm); setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: todayISO }); haptic.success(); }}
                activeOpacity={0.85}
              >
                {addMedical.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Modal editar ─── */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <EditHorseModal horse={horse} onClose={() => setShowEdit(false)} />
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

  /* Hero */
  heroWrap: { aspectRatio: 16 / 9, position: 'relative', backgroundColor: '#1a1a2e' },
  heroPlaceholder: { backgroundColor: '#1a2744' },
  heroPill: {
    position: 'absolute', width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroPillDanger: { backgroundColor: 'rgba(220,38,38,0.55)' },
  heroActions: { position: 'absolute', right: 14, flexDirection: 'row', gap: 8 },
  heroContent: { position: 'absolute', bottom: 0, left: 16, right: 16, paddingBottom: 16 },
  horseName: { fontSize: 24, fontWeight: '800', color: colors.white, lineHeight: 30, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroBadges: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeAmber: { backgroundColor: 'rgba(245,158,11,0.35)' },
  heroBadgeText: { fontSize: 11, fontWeight: '600', color: colors.white },

  /* Tab bar */
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 3, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: colors.primary },
  tabLabel: { fontSize: 10, fontWeight: '600', color: colors.gray400 },
  tabLabelActive: { color: colors.primary },

  /* Sections */
  section: { margin: 16, gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  countBadge: { backgroundColor: colors.gray200, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 11, fontWeight: '700', color: colors.gray600 },
  emptyText: { fontSize: 13, color: colors.gray400 },
  empty: { alignItems: 'center', paddingVertical: 24 },

  /* Info */
  infoGrid: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoItem: { width: '47%', backgroundColor: colors.gray50, borderRadius: 10, padding: 10 },
  infoLabel: { fontSize: 10, fontWeight: '600', color: colors.gray400, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.gray900, marginTop: 2 },

  /* Financial */
  financialCard: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, padding: 14, gap: 10 },
  financialGrid: { flexDirection: 'row', gap: 10 },
  financialStat: { flex: 1, borderRadius: 12, padding: 12 },
  financialStatValue: { fontSize: 18, fontWeight: '800', color: colors.gray900 },
  financialStatLabel: { fontSize: 10, fontWeight: '600', color: colors.gray500, marginTop: 2, textTransform: 'uppercase' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { width: 36, fontSize: 10, color: colors.gray400, textAlign: 'right' },
  barTrack: { flex: 1, height: 6, backgroundColor: colors.gray100, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#a855f7', borderRadius: 999 },
  barValue: { width: 64, fontSize: 10, fontWeight: '600', color: colors.gray700, textAlign: 'right' },

  /* Docs */
  docsCard: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden' },
  docRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  docIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  docName: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.gray700 },
  docDivider: { height: 1, backgroundColor: colors.gray50, marginHorizontal: 12 },

  /* Peso */
  weightCard: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.gray100, padding: 12 },
  weightLatest: { backgroundColor: '#fff7ed', borderRadius: 12, padding: 12, marginBottom: 8 },
  weightValue: { fontSize: 28, fontWeight: '800', color: '#c2410c' },
  weightCC: { fontSize: 12, color: '#ea580c', marginTop: 2 },
  weightDate: { fontSize: 11, color: '#9a3412', marginTop: 2 },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.gray50 },
  weightRowValue: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  weightRowDate: { fontSize: 12, color: colors.gray400 },

  /* Rutina */
  routineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  routineItem: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.white },
  routineItemChecked: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  routineEmoji: { fontSize: 16 },
  routineLabel: { flex: 1, fontSize: 12, fontWeight: '500', color: colors.gray600 },
  routineLabelChecked: { color: '#15803d' },

  /* Eventos */
  eventsList: { gap: 8 },
  eventCard: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.gray100, padding: 14, gap: 6 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventDate: { fontSize: 11, color: colors.gray400 },
  eventDesc: { fontSize: 14, color: colors.gray700, lineHeight: 20 },
  eventAmount: { fontSize: 14, fontWeight: '700', color: colors.purple700 },

  /* Comentarios */
  commentRoot: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.gray100, paddingTop: 8 },
  commentToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentToggleText: { fontSize: 11, color: colors.gray400, fontWeight: '600' },
  commentBody: { marginTop: 8, gap: 8 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  commentAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.gray200, justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 10, fontWeight: '700', color: colors.gray600 },
  commentAuthor: { fontSize: 11, fontWeight: '700', color: colors.gray700 },
  commentDate: { fontSize: 10, color: colors.gray400 },
  commentText: { fontSize: 12, color: colors.gray700, marginTop: 2 },
  commentInputRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-end', marginTop: 4 },
  commentInput: { flex: 1, borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: colors.gray900, backgroundColor: colors.gray50, minHeight: 36, maxHeight: 80 },
  commentSend: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },

  /* Médico */
  medCard: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.gray100, padding: 12 },
  medCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  medTypeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  medTypeText: { fontSize: 10, fontWeight: '700' },
  medName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.gray900 },
  medDate: { fontSize: 10, color: colors.gray400 },
  medNextDue: { fontSize: 11, color: '#d97706', fontWeight: '500' },
  medBrand: { fontSize: 11, color: colors.gray400 },
  medNotes: { fontSize: 11, color: colors.gray500, fontStyle: 'italic' },
  medTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  medTypeOption: { borderRadius: 10, borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.white },
  medTypeOptionText: { fontSize: 12, color: colors.gray600 },

  /* Fotos */
  activityTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  activityChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  activityChipText: { fontSize: 11, fontWeight: '600', color: colors.gray600 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photoWrap: { width: '31%', aspectRatio: 1, position: 'relative' },
  photoThumb: { width: '100%', height: '100%', borderRadius: 10 },
  photoBadge: { position: 'absolute', bottom: 3, left: 3, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  photoBadgeText: { fontSize: 8, fontWeight: '700' },

  /* Botones pequeños */
  smallBtn: { borderRadius: 8, borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.white },
  smallBtnText: { fontSize: 11, fontWeight: '600', color: colors.primary },

  /* QR Modal */
  qrOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  qrCard: { backgroundColor: colors.white, borderRadius: 24, width: '100%', maxWidth: 340, overflow: 'hidden' },
  qrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingBottom: 16, backgroundColor: colors.primary },
  qrSub: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 },
  qrTitle: { fontSize: 20, fontWeight: '800', color: colors.white, marginTop: 2 },
  qrWrap: { alignItems: 'center', paddingVertical: 28, backgroundColor: '#f8fafc' },
  qrHint: { textAlign: 'center', fontSize: 13, fontWeight: '600', color: colors.gray700, paddingHorizontal: 20, marginTop: 4 },
  qrBtn: { margin: 16, marginTop: 12, borderRadius: 14, backgroundColor: colors.primary, paddingVertical: 14, alignItems: 'center' },
  qrBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },

  /* Modales generales */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.gray900 },
  modalBody: { padding: 20, gap: 10 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.gray100 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  fieldError: { fontSize: 13, color: colors.red500 },
  input: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: colors.gray900, backgroundColor: colors.gray50 },
  btn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: colors.white },
  btnSecondary: { borderWidth: 1, borderColor: colors.gray200 },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
});
