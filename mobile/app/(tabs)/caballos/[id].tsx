import { use, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl,
  Modal, KeyboardAvoidingView, Platform, TextInput, ActivityIndicator, Alert, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHorse, useFinancialSummary, useUpdateHorse, useDeleteHorse, useUploadHorseImage, useHorseDocuments, useWeightRecords, useAddWeightRecord } from '../../../hooks/use-horses';
import { useRoutines, useUpsertRoutine, ROUTINE_ITEMS } from '../../../hooks/use-routines';
import { useActivityPhotos, useUploadActivityPhoto, ACTIVITY_TYPES } from '../../../hooks/use-activity-photos';
import { useMedicalRecords, useAddMedicalRecord, useDeleteMedicalRecord, MEDICAL_TYPE_LABELS, MEDICAL_TYPE_COLORS, type CreateMedicalRecordDto } from '../../../hooks/use-medical';
import { useEventComments, useAddEventComment, useDeleteEventComment } from '../../../hooks/use-event-comments';
import { DatePicker } from '../../../components/DatePicker';
import { useEventsByHorse } from '../../../hooks/use-events';
import { useAuth } from '../../../lib/auth';
import { Spinner } from '../../../components/Spinner';
import { EventTypeBadge } from '../../../components/EventTypeBadge';
import { colors } from '../../../lib/colors';
import type { Event, Horse } from '../../../../packages/shared/src';

function EditHorseModal({ horse, onClose }: { horse: Horse; onClose: () => void }) {
  const updateHorse = useUpdateHorse();
  const [name, setName] = useState(horse.name);
  const [birthDate, setBirthDate] = useState(horse.birth_date ?? '');
  const [microchip, setMicrochip] = useState(horse.microchip ?? '');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    setError('');
    await updateHorse.mutateAsync({
      id: horse.id,
      name: name.trim(),
      birth_date: birthDate || null,
      microchip: microchip || null,
    });
    onClose();
  };

  return (
    <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.modalCard}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Editar {horse.name}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        <View style={styles.modalBody}>
          <Text style={styles.fieldLabel}>Nombre *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nombre del caballo"
            placeholderTextColor={colors.gray400}
            autoCapitalize="words"
          />

          <DatePicker
            label="Fecha de nacimiento"
            value={birthDate}
            onChange={setBirthDate}
            maxDate={new Date()}
          />

          <Text style={styles.fieldLabel}>Microchip (15 dígitos)</Text>
          <TextInput
            style={styles.input}
            value={microchip}
            onChangeText={(v) => setMicrochip(v.replace(/\D/g, '').slice(0, 15))}
            placeholder="123456789012345"
            placeholderTextColor={colors.gray400}
            keyboardType="numeric"
          />

          {error ? <Text style={styles.fieldError}>{error}</Text> : null}
          {updateHorse.isError ? <Text style={styles.fieldError}>Error al guardar. Intentá de nuevo.</Text> : null}
        </View>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, updateHorse.isPending && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={updateHorse.isPending}
          >
            {updateHorse.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={styles.submitBtnText}>Guardar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function EventCommentThread({ eventId, currentUserId }: { eventId: string; currentUserId?: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const { data: comments } = useEventComments(eventId, open);
  const add = useAddEventComment(eventId);
  const del = useDeleteEventComment(eventId);

  return (
    <View style={evStyles.commentRoot}>
      <TouchableOpacity style={evStyles.commentToggle} onPress={() => setOpen((p) => !p)} activeOpacity={0.7}>
        <Text style={evStyles.commentToggleText}>
          💬 {open ? 'Ocultar' : 'Comentarios'}{comments && comments.length > 0 ? ` (${comments.length})` : ''}
        </Text>
      </TouchableOpacity>

      {open && (
        <View style={evStyles.commentBody}>
          {comments?.map((c) => (
            <View key={c.id} style={evStyles.commentRow}>
              <View style={evStyles.commentAvatar}>
                <Text style={evStyles.commentAvatarText}>{c.user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={evStyles.commentAuthor}>{c.user?.name}</Text>
                  <Text style={evStyles.commentDate}>
                    {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={evStyles.commentText}>{c.text}</Text>
              </View>
              {c.user_id === currentUserId && (
                <TouchableOpacity onPress={() => del.mutate(c.id)} style={{ paddingLeft: 6 }}>
                  <Text style={{ fontSize: 14, color: '#d1d5db' }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <View style={evStyles.commentInputRow}>
            <TextInput
              style={evStyles.commentInput}
              value={text}
              onChangeText={setText}
              placeholder="Escribí un comentario..."
              placeholderTextColor="#9ca3af"
              multiline
            />
            <TouchableOpacity
              style={[evStyles.commentSendBtn, (!text.trim() || add.isPending) && { opacity: 0.4 }]}
              disabled={!text.trim() || add.isPending}
              onPress={async () => {
                await add.mutateAsync(text.trim());
                setText('');
              }}
              activeOpacity={0.8}
            >
              <Text style={evStyles.commentSendText}>{add.isPending ? '...' : '↑'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function EventCard({ event, currentUserId }: { event: Event; currentUserId?: string }) {
  const date = new Date(event.date + 'T12:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  return (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <EventTypeBadge type={event.type} />
        <Text style={styles.eventDate}>{date}</Text>
      </View>
      <Text style={styles.eventDesc}>{event.description}</Text>
      {event.amount != null && (
        <Text style={styles.eventAmount}>
          ${Number(event.amount).toLocaleString('es-AR')}
        </Text>
      )}
      <EventCommentThread eventId={event.id} currentUserId={currentUserId} />
    </View>
  );
}

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
  const [showAddMedical, setShowAddMedical] = useState(false);
  const [medicalForm, setMedicalForm] = useState<CreateMedicalRecordDto>({
    type: 'vacuna', name: '', date: new Date().toISOString().split('T')[0],
  });
  const todayISO = new Date().toISOString().split('T')[0];
  const todayRoutine = routines?.find((r) => r.date === todayISO);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(todayISO);
  const [activityType, setActivityType] = useState('otro');
  const deleteHorse = useDeleteHorse();
  const uploadImage = useUploadHorseImage();
  const [showEdit, setShowEdit] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos necesarios', 'Necesitamos acceso a tu galería para subir la foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadImage.mutateAsync({ id, uri: result.assets[0].uri });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar caballo',
      `¿Eliminás a ${horse?.name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            await deleteHorse.mutateAsync(id);
            router.back();
          },
        },
      ],
    );
  };

  if (isLoading) return <Spinner />;
  if (!horse) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Caballo no encontrado</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sortedEvents = [...(events ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const infoItems: { label: string; value: string }[] = [];
  if (horse.birth_date) {
    const diff = Date.now() - new Date(horse.birth_date + 'T12:00:00').getTime();
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    infoItems.push({ label: 'Nacimiento', value: `${new Date(horse.birth_date + 'T12:00:00').toLocaleDateString('es-AR')} (${years} años)` });
  }
  if (horse.microchip) infoItems.push({ label: 'Microchip', value: horse.microchip });
  if (horse.owner) infoItems.push({ label: 'Propietario', value: horse.owner.name });
  if (horse.establishment) infoItems.push({ label: 'Establecimiento', value: horse.establishment.name });
  if (horse.breed) infoItems.push({ label: 'Raza', value: horse.breed.name });
  if (horse.activity) infoItems.push({ label: 'Actividad', value: horse.activity.name });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      {/* Imagen hero */}
      <View style={styles.heroWrap}>
        {horse.image_url
          ? <Image source={{ uri: horse.image_url }} style={styles.heroImg} resizeMode="cover" />
          : <View style={[styles.heroImg, styles.heroPlaceholder]} />
        }
        <View style={styles.heroOverlay} />

        {/* Back button */}
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 12 }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>

        {/* Acciones (cámara / editar / eliminar) */}
        {(can('horses', 'update') || can('horses', 'delete')) && (
          <View style={[styles.heroActions, { top: insets.top + 12 }]}>
            {can('horses', 'update') && (
              <TouchableOpacity
                style={[styles.heroActionBtn, uploadImage.isPending && { opacity: 0.6 }]}
                onPress={handlePickImage}
                disabled={uploadImage.isPending}
                activeOpacity={0.8}
              >
                <Text style={styles.heroActionText}>📷</Text>
              </TouchableOpacity>
            )}
            {can('horses', 'update') && (
              <TouchableOpacity style={styles.heroActionBtn} onPress={() => setShowEdit(true)} activeOpacity={0.8}>
                <Text style={styles.heroActionText}>✎</Text>
              </TouchableOpacity>
            )}
            {can('horses', 'delete') && (
              <TouchableOpacity style={[styles.heroActionBtn, styles.heroActionDanger]} onPress={handleDelete} activeOpacity={0.8}>
                <Text style={styles.heroActionText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Nombre */}
        <View style={[styles.heroContent, { paddingBottom: insets.top > 0 ? 16 : 20 }]}>
          <Text style={styles.horseName}>{horse.name}</Text>
          <View style={styles.heroBadges}>
            {horse.breed && (
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{horse.breed.name}</Text>
              </View>
            )}
            {horse.activity && (
              <View style={[styles.heroBadge, styles.heroBadgeAmber]}>
                <Text style={styles.heroBadgeText}>{horse.activity.name}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Info */}
      {infoItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.infoGrid}>
            {infoItems.map((item) => (
              <InfoItem key={item.label} label={item.label} value={item.value} />
            ))}
          </View>
        </View>
      )}

      {/* Resumen financiero */}
      {financial && financial.total > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen financiero</Text>
          <View style={styles.financialCard}>
            <View style={styles.financialGrid}>
              <View style={[styles.financialStat, { backgroundColor: '#faf5ff' }]}>
                <Text style={[styles.financialStatValue, { color: colors.purple700 }]}>
                  ${financial.total.toLocaleString('es-AR')}
                </Text>
                <Text style={[styles.financialStatLabel, { color: colors.purple700 }]}>Total gastos</Text>
              </View>
              <View style={[styles.financialStat, { backgroundColor: colors.gray50 }]}>
                <Text style={styles.financialStatValue}>
                  ${financial.average_monthly.toLocaleString('es-AR')}
                </Text>
                <Text style={styles.financialStatLabel}>Promedio/mes</Text>
              </View>
            </View>
            {financial.monthly.slice(0, 5).map((m) => {
              const [year, month] = m.month.split('-');
              const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
              const maxVal = Math.max(...financial.monthly.slice(0, 5).map((x) => x.total));
              const pct = maxVal > 0 ? (m.total / maxVal) * 100 : 0;
              return (
                <View key={m.month} style={styles.barRow}>
                  <Text style={styles.barLabel}>{label}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.barValue}>${m.total.toLocaleString('es-AR')}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Documentos */}
      {documents && documents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documentos</Text>
          <View style={styles.docsCard}>
            {documents.map((doc, i) => (
              <View key={doc.id}>
                {i > 0 && <View style={styles.docDivider} />}
                <TouchableOpacity
                  style={styles.docRow}
                  onPress={() => Linking.openURL(doc.url)}
                  activeOpacity={0.7}
                >
                  <View style={styles.docIcon}>
                    <Text style={styles.docIconText}>📄</Text>
                  </View>
                  <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                  <Text style={styles.docArrow}>›</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ─── Peso y condición ─── */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { justifyContent: 'space-between' }]}>
          <Text style={styles.sectionTitle}>Peso y condición</Text>
          {can('horses', 'update') && (
            <TouchableOpacity onPress={() => setShowAddWeight(true)} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>+ Registrar</Text>
            </TouchableOpacity>
          )}
        </View>
        {!weightRecords?.length ? (
          <Text style={styles.emptyText}>Sin registros de peso</Text>
        ) : (
          <View style={styles.weightCard}>
            <View style={[styles.weightLatest]}>
              <Text style={styles.weightValue}>{Number(weightRecords[0].weight_kg)} kg</Text>
              {weightRecords[0].body_condition && (
                <Text style={styles.weightCC}>CC: {weightRecords[0].body_condition}/9</Text>
              )}
              <Text style={styles.weightDate}>
                {new Date(weightRecords[0].date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            {weightRecords.slice(1, 4).map((r) => (
              <View key={r.id} style={styles.weightRow}>
                <Text style={styles.weightRowValue}>{Number(r.weight_kg)} kg</Text>
                <Text style={styles.weightRowDate}>
                  {new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ─── Rutina de hoy ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rutina de hoy</Text>
        <View style={styles.routineGrid}>
          {ROUTINE_ITEMS.map(({ key, label, emoji }) => {
            const checked = todayRoutine?.[key] ?? false;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.routineItem, checked && styles.routineItemChecked]}
                onPress={() => upsertRoutine.mutate({ date: todayISO, [key]: !checked })}
                activeOpacity={0.7}
              >
                <Text style={styles.routineEmoji}>{emoji}</Text>
                <Text style={[styles.routineLabel, checked && styles.routineLabelChecked]}>{label}</Text>
                {checked && <Text style={styles.routineCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ─── Fotos verificadas ─── */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { justifyContent: 'space-between' }]}>
          <Text style={styles.sectionTitle}>Fotos verificadas</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.smallBtn}
              onPress={async () => {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') { Alert.alert('Permiso necesario', 'Necesitamos acceso a la cámara.'); return; }
                const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
                if (!result.canceled && result.assets[0]) {
                  await uploadActivityPhoto.mutateAsync({ uri: result.assets[0].uri, activity_type: activityType });
                }
              }}
            >
              <Text style={styles.smallBtnText}>📷 Foto</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Selector de tipo */}
        <View style={styles.activityTypeRow}>
          {Object.entries(ACTIVITY_TYPES).map(([v, m]) => (
            <TouchableOpacity
              key={v}
              style={[styles.activityTypeChip, activityType === v && { backgroundColor: m.bg }]}
              onPress={() => setActivityType(v)}
            >
              <Text style={[styles.activityTypeText, activityType === v && { color: m.color }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!activityPhotos?.length ? (
          <Text style={styles.emptyText}>Las fotos tomadas desde aquí tienen sello de fecha y autor.</Text>
        ) : (
          <View style={styles.photosGrid}>
            {activityPhotos.slice(0, 9).map((p) => {
              const meta = ACTIVITY_TYPES[p.activity_type] ?? ACTIVITY_TYPES.otro;
              return (
                <TouchableOpacity key={p.id} style={styles.photoWrap} onPress={() => Linking.openURL(p.url)}>
                  <Image source={{ uri: p.url }} style={styles.photoThumb} />
                  <View style={[styles.photoBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.photoBadgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ─── Modal agregar peso ─── */}
      <Modal visible={showAddWeight} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar peso</Text>
              <TouchableOpacity onPress={() => setShowAddWeight(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Peso (kg) *</Text>
              <TextInput
                style={styles.input}
                value={newWeight}
                onChangeText={setNewWeight}
                placeholder="450.0"
                placeholderTextColor={styles.fieldLabel.color}
                keyboardType="decimal-pad"
              />
              <DatePicker label="Fecha" value={newWeightDate} onChange={setNewWeightDate} maxDate={new Date()} />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={() => setShowAddWeight(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { flex: 1 }, (!newWeight || addWeight.isPending) && { opacity: 0.6 }]}
                disabled={!newWeight || addWeight.isPending}
                onPress={async () => {
                  await addWeight.mutateAsync({ weight_kg: newWeight, date: newWeightDate });
                  setNewWeight('');
                  setShowAddWeight(false);
                }}
              >
                {addWeight.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.submitBtnText}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Historial */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Historial</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{sortedEvents.length}</Text>
          </View>
        </View>

        {sortedEvents.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin eventos registrados</Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {sortedEvents.map((ev) => <EventCard key={ev.id} event={ev} currentUserId={user?.id} />)}
          </View>
        )}
      </View>

      {/* ─── Historial médico ─── */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { justifyContent: 'space-between' }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Historial médico</Text>
            {medicalRecords && medicalRecords.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{medicalRecords.length}</Text>
              </View>
            )}
          </View>
          {can('horses', 'update') && (
            <TouchableOpacity onPress={() => setShowAddMedical(true)} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>+ Agregar</Text>
            </TouchableOpacity>
          )}
        </View>

        {!medicalRecords?.length ? (
          <Text style={styles.emptyText}>Sin registros médicos. Agregá vacunas, desparasitaciones y tratamientos.</Text>
        ) : (
          <View style={medStyles.list}>
            {medicalRecords.map((rec) => {
              const c = MEDICAL_TYPE_COLORS[rec.type] ?? MEDICAL_TYPE_COLORS.tratamiento;
              return (
                <View key={rec.id} style={medStyles.card}>
                  <View style={medStyles.cardTop}>
                    <View style={[medStyles.typeBadge, { backgroundColor: c.bg }]}>
                      <Text style={[medStyles.typeText, { color: c.text }]}>{MEDICAL_TYPE_LABELS[rec.type] ?? rec.type}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={medStyles.name} numberOfLines={1}>{rec.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={medStyles.date}>
                        {new Date(rec.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                      {can('horses', 'update') && (
                        <TouchableOpacity onPress={() => Alert.alert('Eliminar', `¿Eliminás "${rec.name}"?`, [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Eliminar', style: 'destructive', onPress: () => deleteMedical.mutate(rec.id) },
                        ])}>
                          <Text style={{ color: '#d1d5db', fontSize: 14 }}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {(rec.next_due || rec.brand || rec.notes) && (
                    <View style={medStyles.meta}>
                      {rec.next_due && (
                        <Text style={medStyles.nextDue}>
                          Próxima: {new Date(rec.next_due + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                      )}
                      {rec.brand && <Text style={medStyles.brand}>Marca: {rec.brand}</Text>}
                      {rec.notes && <Text style={medStyles.notes}>{rec.notes}</Text>}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Modal agregar registro médico */}
      <Modal visible={showAddMedical} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo registro médico</Text>
              <TouchableOpacity onPress={() => { setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: todayISO }); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.modalBody, { paddingBottom: 8 }]}>
              <Text style={styles.fieldLabel}>Tipo</Text>
              <View style={medStyles.typeGrid}>
                {(['vacuna', 'desparasitacion', 'analisis', 'tratamiento'] as const).map((t) => {
                  const c = MEDICAL_TYPE_COLORS[t];
                  const active = medicalForm.type === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[medStyles.typeOption, active && { backgroundColor: c.bg, borderColor: c.text }]}
                      onPress={() => setMedicalForm((p) => ({ ...p, type: t }))}
                      activeOpacity={0.7}
                    >
                      <Text style={[medStyles.typeOptionText, active && { color: c.text, fontWeight: '700' }]}>
                        {MEDICAL_TYPE_LABELS[t]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Nombre / producto *</Text>
              <TextInput
                style={styles.input}
                value={medicalForm.name}
                onChangeText={(v) => setMedicalForm((p) => ({ ...p, name: v }))}
                placeholder="Ej: Triple viral, Ivermectina..."
                placeholderTextColor="#9ca3af"
              />

              <DatePicker label="Fecha *" value={medicalForm.date} onChange={(v) => setMedicalForm((p) => ({ ...p, date: v }))} maxDate={new Date()} />
              <DatePicker label="Próxima dosis" value={medicalForm.next_due ?? ''} onChange={(v) => setMedicalForm((p) => ({ ...p, next_due: v || undefined }))} />

              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Marca / laboratorio</Text>
              <TextInput
                style={styles.input}
                value={medicalForm.brand ?? ''}
                onChangeText={(v) => setMedicalForm((p) => ({ ...p, brand: v || undefined }))}
                placeholder="Opcional"
                placeholderTextColor="#9ca3af"
              />

              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Notas</Text>
              <TextInput
                style={[styles.input, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
                value={medicalForm.notes ?? ''}
                onChangeText={(v) => setMedicalForm((p) => ({ ...p, notes: v || undefined }))}
                placeholder="Observaciones adicionales"
                placeholderTextColor="#9ca3af"
                multiline
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={() => { setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: todayISO }); }}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { flex: 1 }, (!medicalForm.name.trim() || addMedical.isPending) && { opacity: 0.5 }]}
                disabled={!medicalForm.name.trim() || addMedical.isPending}
                onPress={async () => {
                  await addMedical.mutateAsync(medicalForm);
                  setShowAddMedical(false);
                  setMedicalForm({ type: 'vacuna', name: '', date: todayISO });
                }}
                activeOpacity={0.85}
              >
                {addMedical.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.submitBtnText}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal editar */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <EditHorseModal horse={horse} onClose={() => setShowEdit(false)} />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 15, color: colors.gray500 },
  backLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
  heroWrap: { position: 'relative', height: 260 },
  heroImg: { width: '100%', height: '100%' },
  heroPlaceholder: { backgroundColor: colors.gray200 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  backBtn: {
    position: 'absolute', left: 16,
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { fontSize: 24, color: colors.white, lineHeight: 28, marginTop: -2 },
  heroActions: { position: 'absolute', right: 16, flexDirection: 'row', gap: 8 },
  heroActionBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center',
  },
  heroActionDanger: { backgroundColor: 'rgba(220,38,38,0.5)' },
  heroActionText: { fontSize: 16, color: colors.white },
  // Modal editar
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.gray900 },
  modalClose: { fontSize: 18, color: colors.gray400 },
  modalBody: { padding: 20, gap: 10 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.gray100 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  input: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: colors.gray900, backgroundColor: colors.gray50 },
  fieldError: { fontSize: 13, color: colors.red500 },
  // Peso
  weightLatest: { backgroundColor: '#fff7ed', borderRadius: 12, padding: 12, marginBottom: 8 },
  weightValue: { fontSize: 28, fontWeight: '800', color: '#c2410c' },
  weightCC: { fontSize: 12, color: '#ea580c', marginTop: 2 },
  weightDate: { fontSize: 11, color: '#9a3412', marginTop: 2 },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.gray50 },
  weightRowValue: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  weightRowDate: { fontSize: 12, color: colors.gray400 },
  // Rutina
  routineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  routineItem: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.white },
  routineItemChecked: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  routineEmoji: { fontSize: 16 },
  routineLabel: { flex: 1, fontSize: 12, fontWeight: '500', color: colors.gray600 },
  routineLabelChecked: { color: '#15803d' },
  routineCheck: { fontSize: 12, color: '#16a34a', fontWeight: '700' },
  // Fotos verificadas
  activityTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  activityTypeChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  activityTypeText: { fontSize: 11, fontWeight: '600', color: colors.gray600 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photoWrap: { width: '31%', aspectRatio: 1, position: 'relative' },
  photoThumb: { width: '100%', height: '100%', borderRadius: 10 },
  photoBadge: { position: 'absolute', bottom: 3, left: 3, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  photoBadgeText: { fontSize: 8, fontWeight: '700' },
  smallBtn: { borderRadius: 8, borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.white },
  smallBtnText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  weightCard: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.gray100, padding: 12 },
  docsCard: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden' },
  docRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  docIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  docIconText: { fontSize: 16 },
  docName: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.gray700 },
  docArrow: { fontSize: 20, color: colors.gray300 },
  docDivider: { height: 1, backgroundColor: colors.gray50, marginHorizontal: 12 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  submitBtn: { flex: 1, borderRadius: 12, backgroundColor: colors.primary, paddingVertical: 13, alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  heroContent: { position: 'absolute', bottom: 0, left: 16, right: 16 },
  horseName: { fontSize: 26, fontWeight: '800', color: colors.white, marginBottom: 8 },
  heroBadges: { flexDirection: 'row', gap: 6 },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  heroBadgeAmber: { backgroundColor: 'rgba(245,158,11,0.3)' },
  heroBadgeText: { fontSize: 11, fontWeight: '600', color: colors.white },
  section: { margin: 16, gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.gray900 },
  countBadge: { backgroundColor: colors.gray200, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 11, fontWeight: '700', color: colors.gray600 },
  infoGrid: {
    backgroundColor: colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: colors.gray100, padding: 12,
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  infoItem: { width: '47%', backgroundColor: colors.gray50, borderRadius: 10, padding: 10 },
  infoLabel: { fontSize: 10, fontWeight: '600', color: colors.gray400, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.gray900, marginTop: 2 },
  empty: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: colors.gray400 },
  eventsList: { gap: 8 },
  eventCard: {
    backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 1, borderColor: colors.gray100, padding: 14, gap: 6,
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventDate: { fontSize: 11, color: colors.gray400 },
  eventDesc: { fontSize: 14, color: colors.gray700, lineHeight: 20 },
  eventAmount: { fontSize: 14, fontWeight: '700', color: colors.purple700 },
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
});

const evStyles = StyleSheet.create({
  commentRoot: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.gray100, paddingTop: 8 },
  commentToggle: { flexDirection: 'row', alignItems: 'center' },
  commentToggleText: { fontSize: 11, color: colors.gray400, fontWeight: '600' },
  commentBody: { marginTop: 8, gap: 8 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  commentAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.gray200, justifyContent: 'center', alignItems: 'center',
  },
  commentAvatarText: { fontSize: 10, fontWeight: '700', color: colors.gray600 },
  commentAuthor: { fontSize: 11, fontWeight: '700', color: colors.gray700 },
  commentDate: { fontSize: 10, color: colors.gray400 },
  commentText: { fontSize: 12, color: colors.gray700, marginTop: 2 },
  commentInputRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-end', marginTop: 4 },
  commentInput: {
    flex: 1, borderWidth: 1, borderColor: colors.gray200, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: colors.gray900,
    backgroundColor: colors.gray50, minHeight: 36, maxHeight: 80,
  },
  commentSendBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  commentSendText: { fontSize: 16, color: colors.white, fontWeight: '700' },
});

const medStyles = StyleSheet.create({
  list: { gap: 8 },
  card: {
    backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 1, borderColor: colors.gray100, padding: 12, gap: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  typeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: 10, fontWeight: '700' },
  name: { fontSize: 13, fontWeight: '600', color: colors.gray900 },
  date: { fontSize: 10, color: colors.gray400 },
  meta: { gap: 2, paddingLeft: 2 },
  nextDue: { fontSize: 11, color: '#d97706', fontWeight: '500' },
  brand: { fontSize: 11, color: colors.gray400 },
  notes: { fontSize: 11, color: colors.gray500, fontStyle: 'italic' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  typeOption: {
    borderRadius: 10, borderWidth: 1, borderColor: colors.gray200,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.white,
  },
  typeOptionText: { fontSize: 12, color: colors.gray600 },
});
