import { use, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl,
  Modal, KeyboardAvoidingView, Platform, TextInput, ActivityIndicator, Alert, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHorse, useFinancialSummary, useUpdateHorse, useDeleteHorse, useUploadHorseImage, useHorseDocuments } from '../../../hooks/use-horses';
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

function EventCard({ event }: { event: Event }) {
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
    </View>
  );
}

export default function HorseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { can } = useAuth();
  const { data: horse, isLoading, refetch, isRefetching } = useHorse(id);
  const { data: events } = useEventsByHorse(id);
  const { data: financial } = useFinancialSummary(id);
  const { data: documents } = useHorseDocuments(id);
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
            {sortedEvents.map((ev) => <EventCard key={ev.id} event={ev} />)}
          </View>
        )}
      </View>

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
