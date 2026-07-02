import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl,
  Modal, KeyboardAvoidingView, Platform, TextInput, ActivityIndicator, Alert, Linking, ActionSheetIOS,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X, MessageCircle, ArrowUp, ChevronLeft, MoreHorizontal, QrCode, Link2,
  ShieldCheck, Megaphone, ChevronRight, User, Users, XCircle, FileText,
  Trash2, CheckCircle2, Camera, Pencil, Stethoscope, Network,
  Info, Clock, Images, Banknote,
  Sunrise, Sun, Moon, Droplets, Sprout, Activity, HeartPulse,
  Wheat, Syringe, Hammer, Wrench, Truck, Package,
  MoreVertical, Download,
  AlertTriangle, Lock, CalendarClock,
  type LucideIcon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

import { useHorse, useFinancialSummary, useUpdateHorse, useDeleteHorse, useUploadHorseImage, useHorseDocuments, useWeightRecords, useAddWeightRecord, useHorseVets, useAssignVet, useRemoveVet, useVeterinarios, useHorseAssignees, useHorseOrgMembers, useAssignMember, useRemoveMember, useTransferHorse, usePropietarios, useHorseMovements, useUploadDocument, useDeleteDocument } from '../../../hooks/use-horses';
import { useRoutines, useUpsertRoutine, ROUTINE_ITEMS } from '../../../hooks/use-routines';
import { useActivityPhotos, useUploadActivityPhoto, ACTIVITY_TYPES } from '../../../hooks/use-activity-photos';
import { useMedicalRecords, useAddMedicalRecord, useDeleteMedicalRecord, useDownloadMedicalPdf, useDownloadHealthCertificate, MEDICAL_TYPE_LABELS, MEDICAL_TYPE_COLORS, SANITARY_DISEASES, healthStatusFromNextDue, type HealthStatus, type CreateMedicalRecordDto } from '../../../hooks/use-medical';
import { usePlanStatus } from '../../../hooks/use-plan';
import { useEventComments, useAddEventComment, useDeleteEventComment } from '../../../hooks/use-event-comments';
import { useEventsByHorse, useCreateEvent } from '../../../hooks/use-events';
import { TrainingMetricsPanel } from '../../../components/TrainingMetricsPanel';
import { PedigreeTab } from '../../../components/PedigreeTab';
import { formatCurrency } from '../../../lib/currency';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { Routes, nav } from '../../../lib/routes';
import { DatePicker } from '../../../components/DatePicker';
import { Spinner } from '../../../components/Spinner';
import { EventTypeBadge } from '../../../components/EventTypeBadge';
import { Avatar } from '../../../components/Avatar';
import { useToast } from '../../../components/Toast';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight } from '../../../styles/tokens';
import type { Event, Horse } from '../../../../packages/shared/src';

// Base URL para el enlace público del caballo (QR). Configurable via EXPO_PUBLIC_APP_URL
// (ej. IP LAN http://192.168.x.x:3005) para que el QR sea accesible desde otros dispositivos.
const PUBLIC_BASE = process.env.EXPO_PUBLIC_APP_URL ?? 'https://app.handicapp.com';

type Tab = 'info' | 'historial' | 'medico' | 'fotos' | 'pedigree' | 'finanzas';

type TabIcon = LucideIcon;
const TABS: { key: Tab; label: string; icon: TabIcon }[] = [
  { key: 'info',      label: 'Info',      icon: Info },
  { key: 'historial', label: 'Historial', icon: Clock },
  { key: 'medico',    label: 'Médico',    icon: Stethoscope },
  { key: 'fotos',     label: 'Fotos',     icon: Images },
  { key: 'pedigree',  label: 'Pedigrí',   icon: Network },
  { key: 'finanzas',  label: 'Finanzas',  icon: Banknote },
];

const HEALTH_STATUS_META: Record<HealthStatus, { dot: string; bg: string; text: string; label: string; Icon: LucideIcon }> = {
  verde:    { dot: '#22c55e', bg: '#f0fdf4', text: '#15803d', label: 'Vigente',    Icon: ShieldCheck },
  amarillo: { dot: '#f59e0b', bg: '#fffbeb', text: '#b45309', label: 'Por vencer', Icon: AlertTriangle },
  rojo:     { dot: '#ef4444', bg: '#fef2f2', text: '#b91c1c', label: 'Vencido',    Icon: XCircle },
};

const EXPENSE_CATEGORY_META: Record<string, { Icon: LucideIcon; color: string }> = {
  alimentacion:  { Icon: Wheat,    color: '#16a34a' },
  veterinario:   { Icon: Syringe,  color: '#dc2626' },
  herradero:     { Icon: Hammer,   color: '#d97706' },
  entrenamiento: { Icon: Activity, color: '#a16207' },
  mantenimiento: { Icon: Wrench,   color: '#0284c7' },
  transporte:    { Icon: Truck,    color: '#0891b2' },
  otros:         { Icon: Package,  color: '#6b7280' },
};

/* ─── EditHorseModal ─── */
function EditHorseModal({ horse, onClose, c, s }: { horse: Horse; onClose: () => void; c: ThemeColors; s: Styles }) {
  const updateHorse = useUpdateHorse();
  const toast = useToast();
  const [name, setName] = useState(horse.name);
  const [birthDate, setBirthDate] = useState(horse.birth_date ?? '');
  const [microchip, setMicrochip] = useState(horse.microchip ?? '');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    setError('');
    await updateHorse.mutateAsync({ id: horse.id, name: name.trim(), birth_date: birthDate || null, microchip: microchip || null });
    toast.success('Cambios guardados');
    onClose();
  };

  return (
    <KeyboardAvoidingView style={s.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.modalCard}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>Editar {horse.name}</Text>
          <TouchableOpacity onPress={onClose}><X size={22} color={c.textFaint} strokeWidth={2} /></TouchableOpacity>
        </View>
        <View style={s.modalBody}>
          <Text style={s.fieldLabel}>Nombre *</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Nombre del caballo" placeholderTextColor={c.textFaint} autoCapitalize="words" />
          <DatePicker label="Fecha de nacimiento" value={birthDate} onChange={setBirthDate} maxDate={new Date()} />
          <Text style={s.fieldLabel}>Microchip (15 dígitos)</Text>
          <TextInput style={s.input} value={microchip} onChangeText={(v) => setMicrochip(v.replace(/\D/g, '').slice(0, 15))} placeholder="123456789012345" placeholderTextColor={c.textFaint} keyboardType="numeric" />
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
/** Íconos de la rutina diaria — lucide con color (en vez de emojis). */
const ROUTINE_ICON: Record<string, { Icon: LucideIcon; color: string }> = {
  morning_feed:   { Icon: Sunrise,    color: '#f59e0b' },
  afternoon_feed: { Icon: Sun,        color: '#eab308' },
  evening_feed:   { Icon: Moon,       color: '#6366f1' },
  water_ok:       { Icon: Droplets,   color: '#3b82f6' },
  paddock:        { Icon: Sprout,     color: '#22c55e' },
  trained:        { Icon: Activity,   color: '#f97316' },
  health_check:   { Icon: HeartPulse, color: '#ef4444' },
};

function InfoItem({ label, value, s }: { label: string; value: string; s: Styles }) {
  return (
    <View style={s.infoItem}>
      <Text style={s.infoLabel} numberOfLines={1}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

/* ─── EventCommentThread ─── */
function EventCommentThread({ eventId, currentUserId, c, s }: { eventId: string; currentUserId?: string; c: ThemeColors; s: Styles }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const { data: comments } = useEventComments(eventId, open);
  const add = useAddEventComment(eventId);
  const del = useDeleteEventComment(eventId);

  return (
    <View style={s.commentRoot}>
      <TouchableOpacity style={s.commentToggle} onPress={() => setOpen((p) => !p)} activeOpacity={0.7}>
        <MessageCircle size={12} color={c.textFaint} strokeWidth={2} />
        <Text style={s.commentToggleText}>
          {open ? 'Ocultar' : 'Comentarios'}{comments && comments.length > 0 ? ` (${comments.length})` : ''}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={s.commentBody}>
          {comments?.map((c) => (
            <View key={c.id} style={s.commentRow}>
              <Avatar name={c.user?.name} size={24} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.commentAuthor}>{c.user?.name}</Text>
                  <Text style={s.commentDate}>{new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</Text>
                </View>
                <Text style={s.commentText}>{c.text}</Text>
              </View>
              {c.user_id === currentUserId && (
                <TouchableOpacity onPress={() => del.mutate(c.id)} style={{ paddingLeft: 6 }}>
                  <X size={14} color={colors.gray300} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <View style={s.commentInputRow}>
            <TextInput style={s.commentInput} value={text} onChangeText={setText} placeholder="Escribí un comentario..." placeholderTextColor={c.textFaint} multiline />
            <TouchableOpacity
              style={[s.commentSend, (!text.trim() || add.isPending) && { opacity: 0.4 }]}
              disabled={!text.trim() || add.isPending}
              onPress={async () => { await add.mutateAsync(text.trim()); setText(''); }}
              activeOpacity={0.8}
            >
              <ArrowUp size={16} color={colors.white} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

/* ─── EventCard ─── */
function EventCard({ event, currentUserId, canEdit, c, s }: { event: Event; currentUserId?: string; canEdit?: boolean; c: ThemeColors; s: Styles }) {
  let _ed = new Date(event.date + 'T12:00:00');
  if (isNaN(_ed.getTime())) _ed = new Date(event.date);
  const date = isNaN(_ed.getTime()) ? '' : _ed.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <View style={s.eventCard}>
      <View style={s.eventHeader}>
        <EventTypeBadge type={event.type} />
        <Text style={s.eventDate}>{date}</Text>
      </View>
      <Text style={s.eventDesc}>{event.description}</Text>
      {event.amount != null && (
        <Text style={s.eventAmount}>{formatCurrency(event.amount, event.currency ?? 'ARS')}</Text>
      )}
      {event.type === 'entrenamiento' && (
        <TrainingMetricsPanel eventId={event.id} canEdit={canEdit ?? false} />
      )}
      <EventCommentThread eventId={event.id} currentUserId={currentUserId} c={c} s={s} />
    </View>
  );
}

/* ─── Main ─── */
export default function HorseDetailScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can, user } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);

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
  const { download: downloadPdf, loading: pdfLoading } = useDownloadMedicalPdf(id, horse?.name ?? '');
  const { download: downloadCert, loading: certLoading } = useDownloadHealthCertificate(id, horse?.name ?? '');
  const { data: planStatus } = usePlanStatus();
  // Gating (doble condición): vet con matrícula aprobada + feature del plan.
  const isApprovedVet = user?.role === 'veterinario' && user?.vet_license_status === 'approved';
  const canCertify = isApprovedVet && (planStatus?.features?.includes('libreta_digital') ?? false);

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

  // Documentos upload
  const uploadDoc = useUploadDocument(id);
  const deleteDoc = useDeleteDocument(id);

  // Crear evento
  const createEvent = useCreateEvent();

  const todayISO = new Date().toISOString().split('T')[0];
  const todayRoutine = routines?.find((r) => r.date === todayISO);
  const deleteHorse = useDeleteHorse();
  const uploadImage = useUploadHorseImage();

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [showEdit, setShowEdit] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(todayISO);
  const [activityType, setActivityType] = useState('all');
  const [showAddMedical, setShowAddMedical] = useState(false);
  const [medicalForm, setMedicalForm] = useState<CreateMedicalRecordDto>({ type: 'vacuna', name: '', date: todayISO });

  // Vet modal
  const [showAssignVet, setShowAssignVet] = useState(false);
  const [selectedVetId, setSelectedVetId] = useState('');

  // Team modal
  const [showAssignTeam, setShowAssignTeam] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  // Transfer modal
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferOwnerId, setTransferOwnerId] = useState('');

  // Doc upload modal
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [docName, setDocName] = useState('');

  // Add event modal
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventType, setNewEventType] = useState<'salud' | 'entrenamiento' | 'carrera' | 'nota'>('nota');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDate, setNewEventDate] = useState(todayISO);
  const [newEventError, setNewEventError] = useState('');

  const handleAddEvent = async () => {
    if (!newEventDesc.trim()) { setNewEventError('La descripción es obligatoria'); return; }
    setNewEventError('');
    try {
      await createEvent.mutateAsync({
        type: newEventType,
        description: newEventDesc.trim(),
        date: newEventDate,
        horse_id: id,
      });
      haptic.success();
      toast.success('Evento agregado');
      setShowAddEvent(false);
      setNewEventDesc('');
      setNewEventType('nota');
      setNewEventDate(todayISO);
    } catch {
      setNewEventError('No se pudo guardar el evento.');
    }
  };

  const handlePickImage = () => {
    const doUpload = async (source: 'camera' | 'gallery') => {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { toast.error('Necesitamos acceso a la cámara.'); return; }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 });
        if (!result.canceled && result.assets[0]) { await uploadImage.mutateAsync({ id, uri: result.assets[0].uri }); toast.success('Foto actualizada'); }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { toast.error('Necesitamos acceso a la galería.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
        if (!result.canceled && result.assets[0]) { await uploadImage.mutateAsync({ id, uri: result.assets[0].uri }); toast.success('Foto actualizada'); }
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', 'Tomar foto', 'Elegir de galería'], cancelButtonIndex: 0 },
        (i) => { if (i === 1) doUpload('camera'); else if (i === 2) doUpload('gallery'); },
      );
    } else {
      Alert.alert('Foto del caballo', '¿De dónde querés actualizar la foto?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tomar foto', onPress: () => doUpload('camera') },
        { text: 'Elegir de galería', onPress: () => doUpload('gallery') },
      ]);
    }
  };

  const handlePickDocument = () => {
    const options = ['Imagen de galería', 'Documento (PDF, Word...)', 'Cancelar'];
    const pick = async (choice: number) => {
      if (choice === 0) {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { toast.error('Necesitamos acceso a tu galería.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
        if (!result.canceled && result.assets[0]) {
          const name = docName.trim() || 'Documento';
          await uploadDoc.mutateAsync({ uri: result.assets[0].uri, name });
          setShowUploadDoc(false); setDocName(''); haptic.success(); toast.success('Documento subido');
        }
      } else if (choice === 1) {
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
        if (result.assets && result.assets[0]) {
          const asset = result.assets[0];
          const name = docName.trim() || asset.name || 'Documento';
          await uploadDoc.mutateAsync({ uri: asset.uri, name });
          setShowUploadDoc(false); setDocName(''); haptic.success(); toast.success('Documento subido');
        }
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 2 }, pick);
    } else {
      Alert.alert('Subir documento', '¿Qué tipo de archivo querés subir?', [
        { text: 'Imagen de galería', onPress: () => pick(0) },
        { text: 'Documento (PDF, Word...)', onPress: () => pick(1) },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

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

  const orgRoleLabel: Record<string, string> = { jinete: 'Jinete', peon: 'Peón', encargado: 'Encargado' };

  const handleTransfer = () => {
    if (!transferOwnerId) return;
    Alert.alert('Confirmar transferencia', '¿Transferís la propiedad de este caballo? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Transferir',
        style: 'destructive',
        onPress: async () => {
          await transferHorse.mutateAsync({ id, new_owner_id: transferOwnerId });
          haptic.success();
          toast.success('Caballo transferido');
          setShowTransfer(false);
          setTransferOwnerId('');
        },
      },
    ]);
  };

  const handleDeleteDoc = (docId: string, docName: string) => {
    Alert.alert('Eliminar documento', `¿Eliminás "${docName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteDoc.mutate(docId) },
    ]);
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
        <Text style={{ fontSize: 15, color: c.textMuted }}>Caballo no encontrado</Text>
        <TouchableOpacity onPress={() => router.navigate(Routes.tabsCaballos as never)}><Text style={{ fontSize: 14, fontWeight: '600', color: c.brand }}>← Volver</Text></TouchableOpacity>
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
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
    >
      {/* ─── Hero: aspect ratio, Dynamic Island safe ─── */}
      <View style={s.heroWrap}>
        {horse.image_url
          ? <Image source={{ uri: horse.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : (
            <View style={[StyleSheet.absoluteFill, s.heroPlaceholder]}>
              <Text style={s.heroPlaceholderInitial}>{horse.name[0]?.toUpperCase()}</Text>
            </View>
          )
        }
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.75)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Back */}
        <TouchableOpacity style={[s.heroPill, { top: insets.top + 10, left: 14 }]} onPress={() => { haptic.light(); router.navigate(Routes.tabsCaballos as never); }} activeOpacity={0.8}>
          <ChevronLeft size={20} color={colors.white} strokeWidth={2} />
        </TouchableOpacity>

        {/* Acciones — menú de 3 puntitos */}
        {(can('horses', 'update') || can('horses', 'delete')) && (
          <View style={[s.heroActions, { top: insets.top + 10 }]}>
            <TouchableOpacity style={[s.heroPill, s.heroPillStatic]} onPress={() => { haptic.light(); setShowMenu(true); }} activeOpacity={0.8}>
              <MoreHorizontal size={20} color={colors.white} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        {/* Nombre + QR + badges */}
        <View style={s.heroContent}>
          <View style={s.heroNameRow}>
            <Text style={[s.horseName, { flex: 1 }]} numberOfLines={2}>{horse.name}</Text>
            {horse.public_token && (
              <TouchableOpacity
                style={[s.heroPill, s.heroPillStatic, s.heroPillQr]}
                onPress={() => { haptic.light(); setShowQR(true); }} activeOpacity={0.85}
              >
                <QrCode size={18} color={c.isDark ? '#1a1207' : colors.white} strokeWidth={2.2} />
              </TouchableOpacity>
            )}
          </View>
          <View style={s.heroBadges}>
            {horse.horse_record_id && (
              <View style={[s.heroBadge, s.heroBadgeVerified]}>
                <ShieldCheck size={11} color="#fff" strokeWidth={2} />
                <Text style={s.heroBadgeText}>Verificado en padrón</Text>
              </View>
            )}
            {horse.breed && <View style={s.heroBadge}><Text style={s.heroBadgeText} numberOfLines={1}>{horse.breed.name}</Text></View>}
            {horse.activity && <View style={[s.heroBadge, s.heroBadgeAmber]}><Text style={s.heroBadgeText} numberOfLines={1}>{horse.activity.name}</Text></View>}
          </View>
        </View>
      </View>

      {/* ─── Hoja de contenido (se monta sobre la imagen) ─── */}
      <View style={s.sheet}>

      {/* ─── Tab bar ─── */}
      <View style={s.tabBar}>
        {TABS.map(({ key, label, icon }) => {
          const TabIconCmp = icon;
          const tabColor = activeTab === key ? c.text : c.textFaint;
          return (
            <TouchableOpacity
              key={key}
              style={[s.tabItem, activeTab === key && s.tabItemActive]}
              onPress={() => { haptic.selection(); setActiveTab(key); }}
              activeOpacity={0.7}
            >
              <TabIconCmp size={17} color={tabColor} strokeWidth={2} />
              <Text style={[s.tabLabel, activeTab === key && s.tabLabelActive]} numberOfLines={1}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ════════════════ TAB: INFO ════════════════ */}
      {activeTab === 'info' && (
        <View style={{ gap: 0 }}>

          {/* Info grid */}
          {infoItems.length > 0 && (
            <View style={s.section}>
              <View style={s.infoGrid}>
                {infoItems.map((item) => <InfoItem key={item.label} label={item.label} value={item.value} s={s} />)}
              </View>
            </View>
          )}

          {/* Resumen financiero */}
          {financial && financial.total > 0 && (
            <View style={s.section}>
              <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
                <Text style={s.sectionTitle}>Finanzas</Text>
                <TouchableOpacity onPress={() => setActiveTab('finanzas')}>
                  <Text style={{ fontSize: 12, color: c.brand, fontWeight: '600' }}>Ver detalle →</Text>
                </TouchableOpacity>
              </View>
              <View style={s.financialCard}>
                <View style={s.financialGrid}>
                  <View style={[s.financialStat, { backgroundColor: c.brandSoft }]}>
                    <Text style={[s.financialStatValue, { color: c.brand }]} numberOfLines={1} adjustsFontSizeToFit>
                      ${financial.total.toLocaleString('es-AR')}
                    </Text>
                    <Text style={[s.financialStatLabel, { color: c.brand }]}>Total gastos</Text>
                  </View>
                  <View style={[s.financialStat, { backgroundColor: c.surfaceAlt }]}>
                    <Text style={s.financialStatValue} numberOfLines={1} adjustsFontSizeToFit>
                      ${financial.average_monthly.toLocaleString('es-AR')}
                    </Text>
                    <Text style={s.financialStatLabel}>Promedio/mes</Text>
                  </View>
                </View>
                {(financial.by_category ?? []).slice(0, 4).map((cat) => {
                  const meta = EXPENSE_CATEGORY_META[cat.category] ?? { Icon: Package, color: '#6b7280' };
                  const MetaIcon = meta.Icon;
                  const maxVal = Math.max(...(financial.by_category ?? []).map((x) => x.total), 1);
                  const pct = (cat.total / maxVal) * 100;
                  return (
                    <View key={cat.category} style={s.barRow}>
                      <View style={s.barIcon}><MetaIcon size={15} color={meta.color} strokeWidth={2} /></View>
                      <View style={s.barTrack}><View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: meta.color }]} /></View>
                      <Text style={s.barValue}>${cat.total.toLocaleString('es-AR')}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ─── Veterinarios asignados ─── */}
          {(can('horses', 'update') || (horseVets && horseVets.length > 0)) && (
            <View style={s.section}>
              <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
                <Text style={s.sectionTitle}>Veterinarios</Text>
                {can('horses', 'update') && (
                  <TouchableOpacity onPress={() => setShowAssignVet(true)} style={s.smallBtn}>
                    <Text style={s.smallBtnText}>+ Asignar</Text>
                  </TouchableOpacity>
                )}
              </View>
              {!horseVets?.length ? (
                <Text style={s.emptyText}>Sin veterinarios asignados</Text>
              ) : (
                <View style={s.docsCard}>
                  {horseVets.map((v, i) => (
                    <View key={v.id}>
                      {i > 0 && <View style={s.docDivider} />}
                      <View style={s.docRow}>
                        <Avatar name={v.user.name} size={36} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.docName}>{v.user.name}</Text>
                          <Text style={{ fontSize: 11, color: c.textFaint }}>{v.user.email}</Text>
                        </View>
                        {can('horses', 'update') && (
                          <TouchableOpacity onPress={() => handleRemoveVet(v.user_id, v.user.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <XCircle size={20} color={c.textFaint} strokeWidth={2} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ─── Equipo asignado (jinete / peón / encargado) ─── */}
          {(canManageTeam || (assignees && assignees.length > 0)) && (
            <View style={s.section}>
              <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
                <Text style={s.sectionTitle}>Equipo</Text>
                {canManageTeam && (
                  <TouchableOpacity onPress={() => { setSelectedMemberId(''); setShowAssignTeam(true); }} style={s.smallBtn}>
                    <Text style={s.smallBtnText}>+ Asignar</Text>
                  </TouchableOpacity>
                )}
              </View>
              {!assignees?.length ? (
                <Text style={s.emptyText}>Sin personas asignadas. Jinetes y peones solo ven los caballos que les asignes.</Text>
              ) : (
                <View style={s.docsCard}>
                  {assignees.map((m, i) => (
                    <View key={m.id}>
                      {i > 0 && <View style={s.docDivider} />}
                      <View style={s.docRow}>
                        <Avatar name={m.user.name} size={36} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.docName}>{m.user.name}</Text>
                          <Text style={{ fontSize: 11, color: c.textFaint }}>{m.user.email}</Text>
                        </View>
                        {canManageTeam && (
                          <TouchableOpacity onPress={() => handleRemoveMember(m.user_id, m.user.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <XCircle size={20} color={c.textFaint} strokeWidth={2} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ─── Transferencia de propiedad ─── */}
          {user?.role === 'propietario' && horse.owner_id === user.id && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Propiedad</Text>
              <TouchableOpacity
                style={[s.smallBtn, { alignSelf: 'flex-start', borderColor: colors.red500 }]}
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
                        {new Date(m.created_at).toLocaleDateString('es-AR')}
                      </Text>
                      <Text style={{ fontSize: 11, color: c.textMuted, flex: 1 }}>{m.description}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ─── Documentos ─── */}
          <View style={s.section}>
            <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
              <Text style={s.sectionTitle}>Documentos</Text>
              {can('horses', 'update') && (
                <TouchableOpacity onPress={() => setShowUploadDoc(true)} style={s.smallBtn}>
                  <Text style={s.smallBtnText}>+ Subir</Text>
                </TouchableOpacity>
              )}
            </View>
            {!documents?.length ? (
              <Text style={s.emptyText}>Sin documentos adjuntos</Text>
            ) : (
              <View style={s.docsCard}>
                {documents.map((doc, i) => (
                  <View key={doc.id}>
                    {i > 0 && <View style={s.docDivider} />}
                    <View style={s.docRow}>
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }} onPress={() => Linking.openURL(doc.url)} activeOpacity={0.7}>
                        <View style={s.docIcon}><FileText size={18} color={colors.red500} strokeWidth={2} /></View>
                        <Text style={s.docName} numberOfLines={1}>{doc.name}</Text>
                      </TouchableOpacity>
                      {can('horses', 'update') && (
                        <TouchableOpacity onPress={() => handleDeleteDoc(doc.id, doc.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Trash2 size={16} color={c.textFaint} strokeWidth={2} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

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
            <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
              <Text style={s.sectionTitle}>Rutina de hoy</Text>
              {/* % de cumplimiento semanal */}
              {routines && routines.length > 0 && (() => {
                const totalChecks = routines.reduce((acc, r) =>
                  acc + ROUTINE_ITEMS.filter(({ key }) => r[key]).length, 0);
                const maxChecks = routines.length * ROUTINE_ITEMS.length;
                const pct = maxChecks > 0 ? Math.round((totalChecks / maxChecks) * 100) : 0;
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: text.xs, color: pct >= 70 ? '#16a34a' : pct >= 40 ? colors.amber600 : colors.red500, fontWeight: weight.bold }}>
                      {pct}%
                    </Text>
                    <Text style={{ fontSize: 10, color: c.textFaint }}>últimos {routines.length}d</Text>
                  </View>
                );
              })()}
            </View>

            <View style={s.routineGrid}>
              {ROUTINE_ITEMS.map(({ key, label }) => {
                const checked = todayRoutine?.[key] ?? false;
                const ri = ROUTINE_ICON[key];
                const RIcon = ri?.Icon ?? Info;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[s.routineItem, checked && s.routineItemChecked]}
                    onPress={() => { haptic.selection(); upsertRoutine.mutate({ date: todayISO, [key]: !checked }); }}
                    activeOpacity={0.7}
                  >
                    <RIcon size={16} color={ri?.color ?? c.textFaint} strokeWidth={2} />
                    <Text style={[s.routineLabel, checked && s.routineLabelChecked]} numberOfLines={1}>{label}</Text>
                    {checked && <CheckCircle2 size={16} color="#16a34a" strokeWidth={2} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Prueba de trabajo: quién cargó la rutina de hoy */}
            {todayRoutine?.filler?.name && (
              <View style={s.routineAuthor}>
                <User size={12} color={c.textFaint} strokeWidth={2} />
                <Text style={s.routineAuthorText}>
                  Cargó {todayRoutine.filler.name}
                  {todayRoutine.created_at
                    ? ` · ${new Date(todayRoutine.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </Text>
              </View>
            )}

            {/* Tendencia de los últimos días */}
            {routines && routines.length > 1 && (
              <View style={s.routineTrend}>
                <Text style={s.routineTrendTitle}>Últimos {routines.length} días</Text>
                <View style={s.routineTrendDays}>
                  {[...routines].reverse().map((r) => {
                    const completedCount = ROUTINE_ITEMS.filter(({ key }) => r[key]).length;
                    const pct = completedCount / ROUTINE_ITEMS.length;
                    const dayLabel = new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'narrow' });
                    const isToday = r.date === todayISO;
                    return (
                      <View key={r.date} style={s.routineTrendDay}>
                        <View style={[s.routineTrendBar, {
                          height: Math.max(4, pct * 36),
                          backgroundColor: pct >= 0.7 ? '#16a34a' : pct >= 0.4 ? colors.amber600 : pct > 0 ? colors.red500 : c.borderStrong,
                        }]} />
                        <Text style={[s.routineTrendLabel, isToday && { color: c.brand, fontWeight: weight.bold }]}>{dayLabel}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ════════════════ TAB: HISTORIAL ════════════════ */}
      {activeTab === 'historial' && (
        <View style={s.section}>
          <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Historial de eventos</Text>
              {sortedEvents.length > 0 && (
                <View style={s.countBadge}><Text style={s.countText}>{sortedEvents.length}</Text></View>
              )}
            </View>
            {can('events', 'create') && (
              <TouchableOpacity onPress={() => { haptic.light(); setShowAddEvent(true); }} style={s.smallBtn}>
                <Text style={s.smallBtnText}>+ Agregar</Text>
              </TouchableOpacity>
            )}
          </View>
          {sortedEvents.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyText}>Sin eventos registrados</Text></View>
          ) : (
            <View style={s.eventsList}>
              {sortedEvents.map((ev) => <EventCard key={ev.id} event={ev} currentUserId={user?.id} canEdit={can('events', 'create')} c={c} s={s} />)}
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
                <TouchableOpacity onPress={() => setShowAddMedical(true)} style={s.smallBtn}>
                  <Text style={s.smallBtnText}>+ Agregar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Libreta sanitaria */}
          <View style={s.healthBook}>
            <View style={s.healthBookHeader}>
              <View style={s.healthBookIcon}>
                <ShieldCheck size={13} color={c.brand} strokeWidth={2.4} />
              </View>
              <Text style={s.healthBookTitle}>Libreta sanitaria</Text>
            </View>
            {SANITARY_DISEASES.map((d) => {
              const last = medicalRecords?.filter((r) => r.type === 'sanidad').find((r) => d.match.test(r.name)) ?? null;
              const nextDue = last?.next_due ?? null;
              const status = healthStatusFromNextDue(nextDue);
              const meta = HEALTH_STATUS_META[status];
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
                        {nextDue
                          ? status === 'rojo'
                            ? `Venció el ${new Date(nextDue + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}`
                            : `Vence el ${new Date(nextDue + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}`
                          : 'Sin registro'}
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
                      onPress={() => { haptic.light(); setMedicalForm({ type: 'sanidad', name: d.name, date: todayISO }); setShowAddMedical(true); }}
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
                  ? <ShieldCheck size={15} color="#fff" strokeWidth={2.2} />
                  : <Lock size={14} color={c.textMuted} strokeWidth={2.2} />}
                <Text style={[s.certifyBtnText, !canCertify && { color: c.textMuted }]}>
                  {certLoading ? 'Emitiendo...' : 'Emitir certificado'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {!medicalRecords?.length ? (
            <Text style={s.emptyText}>Sin registros médicos. Agregá vacunas, desparasitaciones y tratamientos.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {medicalRecords.map((rec) => {
                const mc = MEDICAL_TYPE_COLORS[rec.type] ?? MEDICAL_TYPE_COLORS.tratamiento;
                return (
                  <View key={rec.id} style={s.medCard}>
                    <View style={s.medCardTop}>
                      <View style={[s.medTypeBadge, { backgroundColor: mc.bg }]}>
                        <Text style={[s.medTypeText, { color: mc.text }]}>{MEDICAL_TYPE_LABELS[rec.type] ?? rec.type}</Text>
                      </View>
                      <Text style={s.medName} numberOfLines={1}>{rec.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.medDate}>{new Date(rec.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                        {can('horses', 'update') && (
                          <TouchableOpacity onPress={() => Alert.alert('Eliminar', `¿Eliminás "${rec.name}"?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Eliminar', style: 'destructive', onPress: () => { haptic.medium(); deleteMedical.mutate(rec.id); } },
                          ])}>
                            <MoreVertical size={18} color={c.textFaint} strokeWidth={2} />
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
              style={s.captureBtn}
              activeOpacity={0.85}
              onPress={async () => {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') { toast.error('Necesitamos acceso a la cámara.'); return; }
                const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
                if (!result.canceled && result.assets[0]) {
                  await uploadActivityPhoto.mutateAsync({ uri: result.assets[0].uri, activity_type: activityType === 'all' ? 'otro' : activityType });
                  haptic.success();
                  toast.success('Foto agregada');
                }
              }}
            >
              <Camera size={15} color={c.surface} strokeWidth={2.2} />
              <Text style={s.captureBtnText}>Capturar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.activityTypeRow}
            contentContainerStyle={{ flexDirection: 'row', gap: 6, paddingRight: 8 }}
          >
            <TouchableOpacity
              style={[s.activityChip, activityType === 'all' && { backgroundColor: c.surfaceAlt, borderColor: c.text }]}
              onPress={() => setActivityType('all')}
            >
              <Text style={[s.activityChipText, activityType === 'all' && { color: c.text }]}>Todas</Text>
            </TouchableOpacity>
            {Object.entries(ACTIVITY_TYPES).map(([v, m]) => (
              <TouchableOpacity key={v} style={[s.activityChip, activityType === v && { backgroundColor: c.isDark ? m.color + '26' : m.bg, borderColor: m.color }]} onPress={() => setActivityType(v)}>
                <Text style={[s.activityChipText, activityType === v && { color: m.color }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {!activityPhotos?.length ? (
            <Text style={s.emptyText}>Las fotos tomadas incluyen sello de fecha y autor verificado.</Text>
          ) : (
            <View style={s.photosGrid}>
              {activityPhotos.filter((p) => activityType === 'all' || p.activity_type === activityType).slice(0, 9).map((p) => {
                const meta = ACTIVITY_TYPES[p.activity_type] ?? ACTIVITY_TYPES.otro;
                const stamp = p.taken_at
                  ? new Date(p.taken_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : '';
                return (
                  <TouchableOpacity key={p.id} style={s.photoWrap} onPress={() => Linking.openURL(p.url)} activeOpacity={0.85}>
                    <Image source={{ uri: p.url }} style={s.photoThumb} />
                    <View style={[s.photoBadge, { backgroundColor: c.isDark ? meta.color + '26' : meta.bg }]}>
                      <Text style={[s.photoBadgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    {(p.photographer?.name || stamp) && (
                      <View style={s.photoStamp}>
                        {!!p.photographer?.name && (
                          <Text style={s.photoStampAuthor} numberOfLines={1}>{p.photographer.name}</Text>
                        )}
                        {!!stamp && <Text style={s.photoStampTime} numberOfLines={1}>{stamp}</Text>}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      </View>

      {/* ─── Menú de acciones ─── */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={[s.menuSheet, { paddingBottom: insets.bottom + 16 }]}>
            {can('horses', 'update') && (
              <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); handlePickImage(); }} activeOpacity={0.7}>
                <Camera size={20} color={c.text} strokeWidth={2} />
                <Text style={s.menuItemText}>Cambiar foto</Text>
              </TouchableOpacity>
            )}
            {can('horses', 'update') && (
              <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); setShowEdit(true); }} activeOpacity={0.7}>
                <Pencil size={20} color={c.text} strokeWidth={2} />
                <Text style={s.menuItemText}>Editar caballo</Text>
              </TouchableOpacity>
            )}
            {(user?.role === 'propietario' || can('auctions', 'create')) && (
              <TouchableOpacity
                style={s.menuItem}
                onPress={() => { setShowMenu(false); haptic.medium(); nav.push(router, `${Routes.remateCrear}?horse=${horse.id}` as never); }}
                activeOpacity={0.7}
              >
                <Megaphone size={20} color={c.text} strokeWidth={2} />
                <Text style={s.menuItemText}>Publicar en venta</Text>
              </TouchableOpacity>
            )}
            {can('horses', 'delete') && (
              <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); handleDelete(); }} activeOpacity={0.7}>
                <Trash2 size={20} color={colors.red500} strokeWidth={2} />
                <Text style={[s.menuItemText, { color: colors.red500 }]}>Eliminar caballo</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Modal QR ─── */}
      <Modal visible={showQR} animationType="fade" transparent>
        <View style={s.qrOverlay}>
          <Animated.View style={[s.qrCard, { paddingBottom: insets.bottom + 8 }]} entering={SlideInDown.springify().damping(26).stiffness(190)}>
            <View style={s.qrGrabber} />
            <View style={s.qrHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.qrSub}>Código QR</Text>
                <Text style={s.qrTitle} numberOfLines={1}>{horse.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQR(false)} style={s.qrClose} activeOpacity={0.7}>
                <X size={18} color={c.textFaint} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={s.qrWrap}>
              <View style={s.qrInner}>
                {horse.public_token && (
                  <QRCode value={`${PUBLIC_BASE}/caballo/${horse.public_token}`} size={200} color="#111827" backgroundColor="#ffffff" />
                )}
              </View>
            </View>
            <Text style={s.qrHint}>Escaneá para ver el perfil público del caballo</Text>
            <TouchableOpacity style={s.qrLinkBtn} onPress={() => Alert.alert('Enlace', `${PUBLIC_BASE}/caballo/${horse.public_token}`, [{ text: 'OK' }])} activeOpacity={0.85}>
              <Link2 size={15} color={c.brand} strokeWidth={2.2} />
              <Text style={s.qrLinkBtnText}>Ver enlace</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── Modal agregar peso ─── */}
      <Modal visible={showAddWeight} animationType="fade" transparent>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Registrar peso</Text>
              <TouchableOpacity onPress={() => setShowAddWeight(false)}><X size={22} color={c.textFaint} strokeWidth={2} /></TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <Text style={s.fieldLabel}>Peso (kg) *</Text>
              <TextInput style={s.input} value={newWeight} onChangeText={setNewWeight} placeholder="450.0" placeholderTextColor={c.textFaint} keyboardType="decimal-pad" />
              <DatePicker label="Fecha" value={newWeightDate} onChange={setNewWeightDate} maxDate={new Date()} />
            </View>
            <View style={s.modalFooter}>
              <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => setShowAddWeight(false)}><Text style={s.btnSecondaryText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, { flex: 1 }, (!newWeight || addWeight.isPending) && { opacity: 0.6 }]}
                disabled={!newWeight || addWeight.isPending}
                onPress={async () => { await addWeight.mutateAsync({ weight_kg: newWeight, date: newWeightDate }); setNewWeight(''); setShowAddWeight(false); haptic.success(); toast.success('Peso registrado'); }}
              >
                {addWeight.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Modal agregar registro médico ─── */}
      <Modal visible={showAddMedical} animationType="fade" transparent>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.modalCard, { maxHeight: '85%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nuevo registro médico</Text>
              <TouchableOpacity onPress={() => { setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: todayISO }); }}>
                <X size={22} color={c.textFaint} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.modalBody, { paddingBottom: 8 }]}>
              <Text style={s.fieldLabel}>Tipo</Text>
              <View style={s.medTypeGrid}>
                {(['vacuna', 'desparasitacion', 'analisis', 'tratamiento', 'sanidad'] as const).map((t) => {
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
              <TextInput style={s.input} value={medicalForm.name} onChangeText={(v) => setMedicalForm((p) => ({ ...p, name: v }))} placeholder="Ej: Triple viral, Ivermectina..." placeholderTextColor={c.textFaint} />
              <DatePicker label="Fecha *" value={medicalForm.date} onChange={(v) => setMedicalForm((p) => ({ ...p, date: v }))} maxDate={new Date()} />
              <DatePicker label="Próxima dosis" value={medicalForm.next_due ?? ''} onChange={(v) => setMedicalForm((p) => ({ ...p, next_due: v || undefined }))} />
              <Text style={[s.fieldLabel, { marginTop: 10 }]}>Marca / laboratorio</Text>
              <TextInput style={s.input} value={medicalForm.brand ?? ''} onChangeText={(v) => setMedicalForm((p) => ({ ...p, brand: v || undefined }))} placeholder="Opcional" placeholderTextColor={c.textFaint} />
              <Text style={[s.fieldLabel, { marginTop: 10 }]}>Notas</Text>
              <TextInput style={[s.input, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]} value={medicalForm.notes ?? ''} onChangeText={(v) => setMedicalForm((p) => ({ ...p, notes: v || undefined }))} placeholder="Observaciones adicionales" placeholderTextColor={c.textFaint} multiline />
            </ScrollView>
            <View style={s.modalFooter}>
              <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => { setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: todayISO }); }}><Text style={s.btnSecondaryText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, { flex: 1 }, (!medicalForm.name.trim() || addMedical.isPending) && { opacity: 0.5 }]}
                disabled={!medicalForm.name.trim() || addMedical.isPending}
                onPress={async () => { await addMedical.mutateAsync(medicalForm); setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: todayISO }); haptic.success(); toast.success('Registro médico agregado'); }}
                activeOpacity={0.85}
              >
                {addMedical.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Modal editar ─── */}
      <Modal visible={showEdit} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <EditHorseModal horse={horse} onClose={() => setShowEdit(false)} c={c} s={s} />
        </View>
      </Modal>

      {/* ─── Modal asignar veterinario ─── */}
      <Modal visible={showAssignVet} animationType="fade" transparent onRequestClose={() => setShowAssignVet(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Asignar veterinario</Text>
              <TouchableOpacity onPress={() => setShowAssignVet(false)}><X size={22} color={c.textFaint} strokeWidth={2} /></TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <Text style={s.fieldLabel}>Veterinario</Text>
              {!veterinarios?.length ? (
                <Text style={s.emptyText}>No hay veterinarios registrados en el sistema.</Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {veterinarios
                    .filter((v) => !horseVets?.some((a) => a.user_id === v.id))
                    .map((v) => (
                      <TouchableOpacity
                        key={v.id}
                        style={[s.smallBtn, { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }, selectedVetId === v.id && { backgroundColor: colors.brand, borderColor: colors.brand }]}
                        onPress={() => setSelectedVetId(v.id)}
                        activeOpacity={0.75}
                      >
                        <User size={16} color={selectedVetId === v.id ? colors.white : c.brand} strokeWidth={2} />
                        <Text style={[s.smallBtnText, selectedVetId === v.id && { color: colors.white }]}>{v.name}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              )}
            </View>
            <View style={s.modalFooter}>
              <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => setShowAssignVet(false)}>
                <Text style={s.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, { flex: 1 }, (!selectedVetId || assignVet.isPending) && { opacity: 0.5 }]}
                disabled={!selectedVetId || assignVet.isPending}
                onPress={async () => {
                  await assignVet.mutateAsync(selectedVetId);
                  haptic.success();
                  toast.success('Veterinario asignado');
                  setShowAssignVet(false);
                  setSelectedVetId('');
                }}
                activeOpacity={0.85}
              >
                {assignVet.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Asignar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Modal asignar equipo ─── */}
      <Modal visible={showAssignTeam} animationType="fade" transparent onRequestClose={() => setShowAssignTeam(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Asignar equipo</Text>
              <TouchableOpacity onPress={() => setShowAssignTeam(false)}><X size={22} color={c.textFaint} strokeWidth={2} /></TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 12 }}>
                Jinetes y peones solo ven los caballos que les asignes.
              </Text>
              <Text style={s.fieldLabel}>Persona</Text>
              {!orgMembers?.length ? (
                <Text style={s.emptyText}>No hay miembros (jinete / peón / encargado) en la organización de este caballo.</Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {orgMembers
                    .filter((m) => !assignees?.some((a) => a.user_id === m.user_id))
                    .map((m) => (
                      <TouchableOpacity
                        key={m.user_id}
                        style={[s.smallBtn, { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }, selectedMemberId === m.user_id && { backgroundColor: colors.brand, borderColor: colors.brand }]}
                        onPress={() => setSelectedMemberId(m.user_id)}
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
            </View>
            <View style={s.modalFooter}>
              <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => setShowAssignTeam(false)}>
                <Text style={s.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, { flex: 1 }, (!selectedMemberId || assignMember.isPending) && { opacity: 0.5 }]}
                disabled={!selectedMemberId || assignMember.isPending}
                onPress={async () => {
                  await assignMember.mutateAsync(selectedMemberId);
                  haptic.success();
                  toast.success('Miembro asignado');
                  setShowAssignTeam(false);
                  setSelectedMemberId('');
                }}
                activeOpacity={0.85}
              >
                {assignMember.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Asignar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Modal transferir ─── */}
      <Modal visible={showTransfer} animationType="fade" transparent onRequestClose={() => setShowTransfer(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalSheet}>
            <View style={[s.modalHeader, { backgroundColor: colors.red500 }]}>
              <Text style={[s.modalTitle, { color: colors.white }]}>Transferir propiedad</Text>
              <TouchableOpacity onPress={() => setShowTransfer(false)}><X size={22} color="rgba(255,255,255,0.7)" strokeWidth={2} /></TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <Text style={[s.fieldLabel, { marginBottom: 8 }]}>Nuevo propietario</Text>
              <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 12 }}>Esta acción transfiere la propiedad de {horse.name} y no se puede deshacer.</Text>
              {!propietarios?.length ? (
                <Text style={s.emptyText}>No hay otros propietarios en el sistema.</Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {propietarios
                    .filter((p) => p.id !== user?.id)
                    .map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[s.smallBtn, { alignSelf: 'stretch', paddingVertical: 12 }, transferOwnerId === p.id && { backgroundColor: colors.red500, borderColor: colors.red500 }]}
                        onPress={() => setTransferOwnerId(p.id)}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.smallBtnText, transferOwnerId === p.id && { color: colors.white }]}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              )}
            </View>
            <View style={s.modalFooter}>
              <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => setShowTransfer(false)}>
                <Text style={s.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { flex: 1, backgroundColor: colors.red500, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' }, (!transferOwnerId || transferHorse.isPending) && { opacity: 0.5 }]}
                disabled={!transferOwnerId || transferHorse.isPending}
                onPress={handleTransfer}
                activeOpacity={0.85}
              >
                {transferHorse.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[s.btnPrimaryText]}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Modal subir documento ─── */}
      <Modal visible={showUploadDoc} animationType="fade" transparent onRequestClose={() => setShowUploadDoc(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.modalSheet, { maxHeight: '45%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Subir documento</Text>
              <TouchableOpacity onPress={() => setShowUploadDoc(false)}><X size={22} color={c.textFaint} strokeWidth={2} /></TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <Text style={s.fieldLabel}>Nombre del documento</Text>
              <TextInput
                style={s.input}
                value={docName}
                onChangeText={setDocName}
                placeholder="Ej: Pedigree, Certificado..."
                placeholderTextColor={c.textFaint}
                autoCapitalize="sentences"
              />
              <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 8 }}>Seleccioná una imagen de tu galería para adjuntarla.</Text>
            </View>
            <View style={s.modalFooter}>
              <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => setShowUploadDoc(false)}>
                <Text style={s.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, { flex: 1 }, uploadDoc.isPending && { opacity: 0.5 }]}
                disabled={uploadDoc.isPending}
                onPress={handlePickDocument}
                activeOpacity={0.85}
              >
                {uploadDoc.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Seleccionar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════════════════ MODAL: AGREGAR EVENTO ════════════════ */}
      <Modal visible={showAddEvent} animationType="fade" transparent onRequestClose={() => setShowAddEvent(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Registrar evento</Text>
              <TouchableOpacity onPress={() => setShowAddEvent(false)}>
                <X size={22} color={c.textFaint} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalBody}>
              {/* Tipo */}
              <Text style={s.fieldLabel}>Tipo de evento</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                {([
                  { key: 'nota', label: '📝 Nota', color: '#6b7280' },
                  { key: 'entrenamiento', label: '🏇 Entrenamiento', color: '#a16207' },
                  { key: 'salud', label: '💉 Salud', color: '#dc2626' },
                  { key: 'carrera', label: '🏁 Carrera', color: '#d97706' },
                ] as const).map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      s.typeChip,
                      newEventType === t.key && { backgroundColor: t.color + '18', borderColor: t.color },
                    ]}
                    onPress={() => { haptic.selection(); setNewEventType(t.key); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.typeChipText, newEventType === t.key && { color: t.color }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Fecha */}
              <DatePicker label="Fecha" value={newEventDate} onChange={setNewEventDate} maxDate={new Date()} />

              {/* Descripción */}
              <Text style={s.fieldLabel}>Descripción *</Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                value={newEventDesc}
                onChangeText={setNewEventDesc}
                placeholder={
                  newEventType === 'nota' ? 'Ej: El caballo come bien, buen estado general' :
                  newEventType === 'entrenamiento' ? 'Ej: Galope 1200m, tiempo 1:14, buena respuesta' :
                  newEventType === 'salud' ? 'Ej: Vacunación influenza equina Dr. García' :
                  'Ej: Gran Premio Palermo 1200m - 3° puesto'
                }
                placeholderTextColor={c.textFaint}
                multiline
                autoCapitalize="sentences"
              />
              {newEventError ? <Text style={s.fieldError}>{newEventError}</Text> : null}
            </ScrollView>
            <View style={s.modalFooter}>
              <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => setShowAddEvent(false)}>
                <Text style={s.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, { flex: 1 }, createEvent.isPending && { opacity: 0.6 }]}
                onPress={handleAddEvent}
                disabled={createEvent.isPending}
              >
                {createEvent.isPending
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={s.btnPrimaryText}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════════════════ TAB: PEDIGRÍ ════════════════ */}
      {activeTab === 'pedigree' && (
        <PedigreeTab
          horseId={horse.id}
          horseName={horse.name}
          canEdit={can('horses', 'update') || (user?.role === 'propietario' && horse.owner_id === user.id) || user?.role === 'admin'}
        />
      )}

      {activeTab === 'finanzas' && (
        <View style={s.section}>
          {!financial || financial.total === 0 ? (
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 32 }}>💰</Text>
              <Text style={s.emptyTitle}>Sin gastos registrados</Text>
              <Text style={s.emptyText}>Creá un evento de tipo "Gasto" para ver el dashboard</Text>
            </View>
          ) : (
            <>
              {/* KPIs */}
              <View style={s.financialGrid}>
                <View style={[s.financialStat, { backgroundColor: c.brandSoft }]}>
                  <Text style={[s.financialStatValue, { color: c.brand }]} numberOfLines={1} adjustsFontSizeToFit>
                    ${financial.total.toLocaleString('es-AR')}
                  </Text>
                  <Text style={[s.financialStatLabel, { color: c.brand }]}>Total acumulado</Text>
                </View>
                <View style={[s.financialStat, { backgroundColor: c.brandSoft }]}>
                  <Text style={[s.financialStatValue, { color: c.brand }]} numberOfLines={1} adjustsFontSizeToFit>
                    ${financial.average_monthly.toLocaleString('es-AR')}
                  </Text>
                  <Text style={[s.financialStatLabel, { color: c.brand }]}>Promedio/mes</Text>
                </View>
              </View>

              {/* Por categoría */}
              {(financial.by_category ?? []).length > 0 && (
                <View style={[s.financialCard, { marginTop: 14 }]}>
                  <Text style={[s.sectionTitle, { marginBottom: 10 }]}>Por categoría</Text>
                  {financial.by_category.map((cat) => {
                    const meta = EXPENSE_CATEGORY_META[cat.category] ?? { Icon: Package, color: '#6b7280' };
                    const MetaIcon = meta.Icon;
                    const pct = financial.total > 0 ? (cat.total / financial.total) * 100 : 0;
                    const maxVal = Math.max(...financial.by_category.map((x) => x.total), 1);
                    return (
                      <View key={cat.category} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                            <MetaIcon size={14} color={meta.color} strokeWidth={2} />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>
                              {EXPENSE_CATEGORY_META[cat.category] ? cat.category.charAt(0).toUpperCase() + cat.category.slice(1) : cat.category}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, color: c.textFaint }}>{pct.toFixed(0)}%</Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>${cat.total.toLocaleString('es-AR')}</Text>
                          </View>
                        </View>
                        <View style={s.barTrack}>
                          <View style={[s.barFill, { width: `${(cat.total / maxVal) * 100}%` as any, backgroundColor: meta.color }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Evolución mensual */}
              {(financial.monthly ?? []).length > 0 && (
                <View style={[s.financialCard, { marginTop: 14 }]}>
                  <Text style={[s.sectionTitle, { marginBottom: 10 }]}>Evolución mensual</Text>
                  {(financial.monthly ?? []).slice(0, 6).map((m) => {
                    const [year, month] = m.month.split('-');
                    const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
                    const maxVal = Math.max(...(financial.monthly ?? []).map((x) => x.total), 1);
                    return (
                      <View key={m.month} style={s.barRow}>
                        <Text style={s.barLabel}>{label}</Text>
                        <View style={s.barTrack}><View style={[s.barFill, { width: `${(m.total / maxVal) * 100}%` as any }]} /></View>
                        <Text style={s.barValue}>${m.total.toLocaleString('es-AR')}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Últimos gastos */}
              {(financial.recent_expenses ?? []).length > 0 && (
                <View style={[s.financialCard, { marginTop: 14 }]}>
                  <Text style={[s.sectionTitle, { marginBottom: 10 }]}>Últimos gastos</Text>
                  {financial.recent_expenses.map((exp) => {
                    const meta = EXPENSE_CATEGORY_META[exp.expense_category ?? ''] ?? { Icon: Package, color: '#6b7280' };
                    const MetaIcon = meta.Icon;
                    return (
                      <View key={exp.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
                        <MetaIcon size={18} color={meta.color} strokeWidth={2} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }} numberOfLines={1}>{exp.description}</Text>
                          <Text style={{ fontSize: 11, color: c.textFaint }}>
                            {(() => { let d = new Date(exp.date + 'T12:00:00'); if (isNaN(d.getTime())) d = new Date(exp.date); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }); })()}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>${exp.amount.toLocaleString('es-AR')}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

  /* Hero */
  heroWrap: { aspectRatio: 16 / 9, position: 'relative', backgroundColor: colors.gray900 },
  heroPlaceholder: { backgroundColor: colors.gray900, alignItems: 'center', justifyContent: 'center' },
  heroPlaceholderInitial: { fontSize: 80, fontWeight: '800', color: colors.brand300 },
  heroPill: {
    position: 'absolute', width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroPillDanger: { backgroundColor: 'rgba(220,38,38,0.55)' },
  heroPillQr: { backgroundColor: c.brand, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  heroPillStatic: { position: 'relative', top: undefined, left: undefined },
  heroActions: { position: 'absolute', right: 14, flexDirection: 'row', gap: 8 },
  menuOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  menuSheet: { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingVertical: 15 },
  menuItemText: { fontSize: 15, fontWeight: '600', color: c.text },
  heroContent: { position: 'absolute', bottom: 0, left: 16, right: 16, paddingBottom: 20 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  horseName: { fontSize: 24, fontWeight: '800', color: colors.white, lineHeight: 30, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroBadges: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeAmber: { backgroundColor: 'rgba(245,158,11,0.35)' },
  heroBadgeVerified: { backgroundColor: 'rgba(16,163,127,0.9)', flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroBadgeText: { fontSize: 11, fontWeight: '600', color: colors.white },

  /* Tab bar */
  sheet: {
    marginTop: -10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: c.bg,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, paddingHorizontal: 2, gap: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: c.text },
  tabLabel: { fontSize: 10.5, fontWeight: '600', color: c.textFaint },
  tabLabelActive: { color: c.text },

  /* Sections */
  section: { margin: 16, gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: c.text },
  countBadge: { backgroundColor: c.surfaceAlt, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 11, fontWeight: '700', color: c.textMuted },
  emptyText: { fontSize: 13, color: c.textFaint },
  empty: { alignItems: 'center', paddingVertical: 24 },
  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: c.text },

  /* Info */
  infoGrid: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoItem: { width: '47%', backgroundColor: c.surfaceAlt, borderRadius: 10, padding: 10 },
  infoLabel: { fontSize: 10, fontWeight: '600', color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 13, fontWeight: '600', color: c.text, marginTop: 2 },

  /* Financial */
  financialCard: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, gap: 10 },
  financialGrid: { flexDirection: 'row', gap: 10 },
  financialStat: { flex: 1, borderRadius: 12, padding: 12 },
  financialStatValue: { fontSize: 18, fontWeight: '800', color: c.text },
  financialStatLabel: { fontSize: 10, fontWeight: '600', color: c.textMuted, marginTop: 2, textTransform: 'uppercase' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barIcon: { width: 24, alignItems: 'center' },
  barLabel: { width: 36, fontSize: 10, color: c.textFaint, textAlign: 'right' },
  barTrack: { flex: 1, height: 6, backgroundColor: c.border, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: c.brand, borderRadius: 999 },
  barValue: { width: 64, fontSize: 10, fontWeight: '600', color: c.textMuted, textAlign: 'right' },

  /* Docs */
  docsCard: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  docRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  docIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  docName: { flex: 1, fontSize: 14, fontWeight: '500', color: c.text },
  docDivider: { height: 1, backgroundColor: c.border, marginHorizontal: 12 },

  /* Peso */
  weightCard: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 12 },
  weightLatest: { backgroundColor: '#fff7ed', borderRadius: 12, padding: 12, marginBottom: 8 },
  weightValue: { fontSize: 28, fontWeight: '800', color: '#c2410c' },
  weightCC: { fontSize: 12, color: '#ea580c', marginTop: 2 },
  weightDate: { fontSize: 11, color: '#9a3412', marginTop: 2 },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.border },
  weightRowValue: { fontSize: 14, fontWeight: '600', color: c.text },
  weightRowDate: { fontSize: 12, color: c.textFaint },

  /* Rutina */
  routineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  routineItem: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surface },
  routineItemChecked: { borderColor: c.isDark ? 'rgba(34,197,94,0.4)' : '#86efac', backgroundColor: c.isDark ? 'rgba(34,197,94,0.14)' : '#f0fdf4' },
  routineLabel: { flex: 1, fontSize: 12, fontWeight: '500', color: c.textMuted },
  routineLabelChecked: { color: c.isDark ? '#86efac' : '#15803d' },
  routineAuthor: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  routineAuthorText: { fontSize: 11, color: c.textFaint, fontWeight: weight.medium },
  routineTrend: { marginTop: 12, backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space[3] },
  routineTrendTitle: { fontSize: 10, fontWeight: weight.semibold, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  routineTrendDays: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 52 },
  routineTrendDay: { alignItems: 'center', gap: 4, flex: 1 },
  routineTrendBar: { width: 14, borderRadius: 4, minHeight: 4 },
  routineTrendLabel: { fontSize: 9, color: c.textFaint, fontWeight: weight.medium },

  /* Eventos */
  eventsList: { gap: 8 },
  eventCard: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14, gap: 6 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventDate: { fontSize: 11, color: c.textFaint },
  eventDesc: { fontSize: 14, color: c.text, lineHeight: 20 },
  eventAmount: { fontSize: 14, fontWeight: '700', color: c.brand },

  /* Comentarios */
  commentRoot: { marginTop: 8, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 },
  commentToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentToggleText: { fontSize: 11, color: c.textFaint, fontWeight: '600' },
  commentBody: { marginTop: 8, gap: 8 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  commentAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 10, fontWeight: '700', color: c.textMuted },
  commentAuthor: { fontSize: 11, fontWeight: '700', color: c.text },
  commentDate: { fontSize: 10, color: c.textFaint },
  commentText: { fontSize: 12, color: c.text, marginTop: 2 },
  commentInputRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-end', marginTop: 4 },
  commentInput: { flex: 1, borderWidth: 1, borderColor: c.borderStrong, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: c.text, backgroundColor: c.surfaceAlt, minHeight: 36, maxHeight: 80 },
  commentSend: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center' },

  /* Médico */
  healthBook: { backgroundColor: c.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 12, marginBottom: 12, gap: 8 },
  healthBookHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  healthBookIcon: { width: 22, height: 22, borderRadius: 7, backgroundColor: c.brandSoft, justifyContent: 'center', alignItems: 'center' },
  healthBookTitle: { fontSize: 11, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingLeft: 12, paddingRight: 10, paddingVertical: 8, overflow: 'hidden' },
  healthAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  healthIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  healthName: { fontSize: 13, fontWeight: '600', color: c.text },
  healthDueRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  healthDue: { fontSize: 10, color: c.textFaint, flexShrink: 1 },
  healthBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  healthBadgeDot: { width: 5, height: 5, borderRadius: 999 },
  healthBadgeText: { fontSize: 9, fontWeight: '700' },
  healthCertifyBtn: { borderRadius: 999, borderWidth: 1, borderColor: c.brand, paddingHorizontal: 10, paddingVertical: 5 },
  healthCertifyText: { fontSize: 10, fontWeight: '700', color: c.brand },
  certifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: c.brand, borderRadius: 12, paddingVertical: 11, marginTop: 2 },
  certifyBtnLocked: { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.borderStrong },
  certifyBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  medCard: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 12 },
  medCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  medTypeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  medTypeText: { fontSize: 10, fontWeight: '700' },
  medName: { flex: 1, fontSize: 13, fontWeight: '600', color: c.text },
  medDate: { fontSize: 10, color: c.textFaint },
  medNextDue: { fontSize: 11, color: '#d97706', fontWeight: '500' },
  medBrand: { fontSize: 11, color: c.textFaint },
  medNotes: { fontSize: 11, color: c.textMuted, fontStyle: 'italic' },
  medTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  medTypeOption: { borderRadius: 10, borderWidth: 1, borderColor: c.borderStrong, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: c.surface },
  medTypeOptionText: { fontSize: 12, color: c.textMuted },

  /* Fotos */
  activityTypeRow: { marginBottom: 10, flexGrow: 0 },
  captureBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: c.text },
  captureBtnText: { fontSize: 12, fontWeight: '700', color: c.surface },
  activityChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border },
  activityChipText: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photoWrap: { width: '31%', aspectRatio: 1, position: 'relative' },
  photoThumb: { width: '100%', height: '100%', borderRadius: 10 },
  photoBadge: { position: 'absolute', top: 3, left: 3, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  photoBadgeText: { fontSize: 8, fontWeight: '700' },
  photoStamp: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, paddingHorizontal: 4, paddingVertical: 3 },
  photoStampAuthor: { fontSize: 8, fontWeight: '700', color: '#fff' },
  photoStampTime: { fontSize: 8, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },

  /* Botones pequeños */
  smallBtn: { borderRadius: 999, borderWidth: 1, borderColor: c.borderStrong, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.surfaceAlt },
  smallBtnText: { fontSize: 11, fontWeight: '600', color: c.text },
  typeChip: { borderRadius: 20, borderWidth: 1.5, borderColor: c.borderStrong, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: c.surfaceAlt },
  typeChipText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.isDark ? 'rgba(239,68,68,0.16)' : '#fef2f2', minWidth: 44, justifyContent: 'center' },
  pdfBtnText: { fontSize: 11, fontWeight: '700', color: c.isDark ? '#fca5a5' : '#dc2626' },

  /* QR Modal */
  qrOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  qrCard: { backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, width: '100%', overflow: 'hidden', borderTopWidth: 1, borderColor: c.border },
  qrGrabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, alignSelf: 'center', marginTop: 10 },
  qrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  qrSub: { fontSize: 11, fontWeight: '700', color: c.brand, textTransform: 'uppercase', letterSpacing: 0.8 },
  qrTitle: { fontSize: 20, fontWeight: '800', color: c.text, marginTop: 2 },
  qrClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  qrWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 18 },
  qrInner: { backgroundColor: '#ffffff', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  qrHint: { textAlign: 'center', fontSize: 13, fontWeight: '500', color: c.textMuted, paddingHorizontal: 24, lineHeight: 18 },
  qrLinkBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, margin: 16, marginTop: 14, borderRadius: 14, backgroundColor: c.surfaceAlt, paddingVertical: 13 },
  qrLinkBtnText: { fontSize: 14, fontWeight: '700', color: c.brand },

  /* Modales generales */
  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalCloseText: { fontSize: 18, color: c.textFaint },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: c.border },
  modalTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  modalBody: { padding: 20, gap: 10 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: c.border },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: c.text },
  fieldError: { fontSize: 13, color: colors.red500 },
  input: { borderWidth: 1, borderColor: c.borderStrong, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: c.text, backgroundColor: c.surfaceAlt },
  btn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: c.brand },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: colors.white },
  btnSecondary: { borderWidth: 1, borderColor: c.borderStrong },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
});
