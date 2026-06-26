import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, RefreshControl, Modal, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, ActionSheetIOS, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ShieldCheck, Building2, TrendingUp, ChevronRight,
  CheckCircle2, Info, Paperclip, FileText, Camera, Search, XCircle, Plus,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useHorses, useCreateHorse, useUploadHorseImage } from '../../../hooks/use-horses';
import { useSubmitClaim, useUploadClaimDocument, type HorseRecord } from '../../../hooks/use-horse-records';
import { useCreateEvent } from '../../../hooks/use-events';
import { useDashboard } from '../../../hooks/use-dashboard';
import { DatePicker } from '../../../components/DatePicker';
import { ScreenHeader, HeaderButton } from '../../../components/ScreenHeader';
import { HorseCardSkeleton } from '../../../components/Skeleton';
import { EmptyState } from '../../../components/EmptyState';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import type { Horse } from '../../../../packages/shared/src';

function HorseCard({ horse, monthlySpend }: {
  horse: Horse;
  monthlySpend?: number;
}) {
  const router = useRouter();
  const sexLabel: Record<string, string> = { macho: 'Macho', hembra: 'Hembra', castrado: 'Castrado' };
  const subtitle = [horse.breed?.name, horse.sex ? sexLabel[horse.sex] : null].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => { haptic.light(); router.push(`/(tabs)/caballos/${horse.id}`); }}
      activeOpacity={0.88}
    >
      {/* Photo */}
      <View style={styles.cardPhotoWrap}>
        {horse.image_url
          ? <Image source={{ uri: horse.image_url }} style={styles.cardPhoto} resizeMode="cover" />
          : (
            <View style={styles.cardPhotoPlaceholder}>
              <Text style={styles.cardPhotoInitial}>{horse.name[0]?.toUpperCase()}</Text>
            </View>
          )
        }
        {horse.horse_record_id && (
          <View style={styles.cardVerifiedDot}>
            <ShieldCheck size={9} color="#fff" strokeWidth={2} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName} numberOfLines={1}>{horse.name}</Text>
          {horse.activity && (
            <View style={styles.cardActivityPill}>
              <Text style={styles.cardActivityText}>{horse.activity.name}</Text>
            </View>
          )}
        </View>
        {subtitle ? <Text style={styles.cardBreed} numberOfLines={1}>{subtitle}</Text> : null}
        {horse.establishment && (
          <View style={styles.cardEstabRow}>
            <Building2 size={11} color={colors.gray400} strokeWidth={2} />
            <Text style={styles.cardEstab} numberOfLines={1}>{horse.establishment.name}</Text>
          </View>
        )}
        {monthlySpend != null && monthlySpend > 0 && (
          <View style={styles.cardSpendRow}>
            <TrendingUp size={12} color="#059669" strokeWidth={2} />
            <Text style={styles.cardSpend}>${monthlySpend.toLocaleString('es-AR')} este mes</Text>
          </View>
        )}
      </View>

      {/* Entrar al detalle */}
      <View style={styles.cardActions}>
        <ChevronRight size={18} color={colors.gray300} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

const GASTO_CATEGORIES = [
  { key: 'alimentacion', icon: '🌾', label: 'Alimentación' },
  { key: 'veterinario', icon: '💉', label: 'Veterinario' },
  { key: 'herradero', icon: '🔨', label: 'Herradero' },
  { key: 'entrenamiento', icon: '🏇', label: 'Entrenamiento' },
  { key: 'mantenimiento', icon: '🔧', label: 'Mantenimiento' },
  { key: 'transporte', icon: '🚛', label: 'Transporte' },
  { key: 'otros', icon: '📦', label: 'Otros' },
];

function QuickGastoModal({
  horses,
  initialHorse,
  onClose,
}: {
  horses: Horse[];
  initialHorse?: Horse | null;
  onClose: () => void;
}) {
  const createEvent = useCreateEvent();
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(
    initialHorse ?? (horses.length === 1 ? horses[0] : null),
  );
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('otros');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!selectedHorse) { setError('Seleccioná un caballo'); return; }
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) { setError('Ingresá un monto válido'); return; }
    setError('');
    try {
      const catLabel = GASTO_CATEGORIES.find((c) => c.key === category)?.label ?? 'Gasto';
      await createEvent.mutateAsync({
        type: 'gasto',
        description: description.trim() || catLabel,
        date: today,
        horse_id: selectedHorse.id,
        amount: String(parsed),
        expense_category: category,
        currency: 'ARS',
      });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      haptic.success();
      onClose();
    } catch {
      setError('No se pudo registrar. Intentá de nuevo.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View style={styles.modalCard} entering={SlideInDown.springify().damping(20).stiffness(170)}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>Registrar gasto</Text>
            {selectedHorse && <Text style={styles.quickModalSub}>{selectedHorse.name}</Text>}
          </View>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.quickModalBody} keyboardShouldPersistTaps="handled">
          {/* Horse selector */}
          {!initialHorse && horses.length > 1 && (
            <>
              <Text style={styles.fieldLabel}>¿Para qué caballo?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                  {horses.map((h) => (
                    <TouchableOpacity
                      key={h.id}
                      style={[styles.horseChip, selectedHorse?.id === h.id && styles.horseChipActive]}
                      onPress={() => { haptic.selection(); setSelectedHorse(h); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.horseChipText, selectedHorse?.id === h.id && styles.horseChipTextActive]}>
                        {h.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Amount */}
          <Text style={styles.fieldLabel}>Monto *</Text>
          <View style={styles.amountRow}>
            <View style={styles.amountPrefix}><Text style={styles.amountPrefixText}>$</Text></View>
            <TextInput
              style={[styles.input, styles.amountInput]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.gray400}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

          {/* Category */}
          <Text style={styles.fieldLabel}>Categoría</Text>
          <View style={styles.categoryGrid}>
            {GASTO_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.catChip, category === cat.key && styles.catChipActive]}
                onPress={() => { haptic.selection(); setCategory(cat.key); }}
                activeOpacity={0.7}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[styles.catLabel, category === cat.key && styles.catLabelActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Ej: Consulta Dr. García, alimento marca X..."
            placeholderTextColor={colors.gray400}
            autoCapitalize="sentences"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, createEvent.isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={createEvent.isPending}
          >
            {createEvent.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={styles.submitBtnText}>Registrar gasto</Text>
            }
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  studbook_ar: 'Studbook AR',
  sra: 'SRA',
  aqha: 'AQHA',
  allbreed: 'AllBreed',
  pedigreequery: 'PedigreeQuery',
  manual: 'Manual',
};

function RecordMatchModal({
  matches,
  microchip,
  birthDate,
  horseId,
  onClose,
}: {
  matches: HorseRecord[];
  microchip: string;
  birthDate: string;
  horseId: string;
  onClose: () => void;
}) {
  const submitClaim = useSubmitClaim();
  const uploadDoc = useUploadClaimDocument();
  const [step, setStep] = useState<'list' | 'form' | 'done'>('list');
  const [selectedRecord, setSelectedRecord] = useState<HorseRecord | null>(null);
  const [docUri, setDocUri] = useState<string | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [error, setError] = useState('');

  const pickDoc = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso necesario', 'Necesitamos acceso a la cámara.'); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: false });
      if (!result.canceled) setDocUri(result.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso necesario', 'Necesitamos acceso a la galería.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.9, allowsEditing: false });
      if (!result.canceled) setDocUri(result.assets[0].uri);
    }
  };

  const handlePickDoc = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', 'Tomar foto', 'Elegir de galería'], cancelButtonIndex: 0 },
        (i) => { if (i === 1) pickDoc('camera'); else if (i === 2) pickDoc('gallery'); },
      );
    } else {
      Alert.alert('Documento', '¿Cómo querés adjuntar el documento?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: '📷 Tomar foto', onPress: () => pickDoc('camera') },
        { text: '🖼️ Elegir de galería', onPress: () => pickDoc('gallery') },
      ]);
    }
  };

  const handleSendClaim = async () => {
    if (!docUri && !registrationNumber.trim()) {
      setError('Subí un documento o ingresá el número de registro para continuar.');
      return;
    }
    setError('');
    try {
      let document_url: string | undefined;
      let document_public_id: string | undefined;
      if (docUri) {
        const uploaded = await uploadDoc.mutateAsync(docUri);
        document_url = uploaded.url;
        document_public_id = uploaded.public_id;
      }
      await submitClaim.mutateAsync({
        horse_record_id: selectedRecord!.id,
        horse_id: horseId,
        microchip: microchip || undefined,
        claimed_birth_date: birthDate || undefined,
        registration_number: registrationNumber.trim() || undefined,
        document_url,
        document_public_id,
      });
      setStep('done');
    } catch {
      setError('No se pudo enviar el reclamo. Intentá de nuevo.');
    }
  };

  const isBusy = uploadDoc.isPending || submitClaim.isPending;

  if (step === 'done') {
    return (
      <Animated.View style={styles.matchCard} entering={SlideInDown.springify().damping(20).stiffness(170)}>
        <View style={styles.matchDoneWrap}>
          <CheckCircle2 size={52} color="#047857" strokeWidth={2} />
          <Text style={styles.matchDoneTitle}>¡Reclamo aprobado!</Text>
          <Text style={styles.matchDoneSub}>Tu caballo quedó vinculado al registro oficial del padrón.</Text>
          <TouchableOpacity style={styles.submitBtn} onPress={onClose}>
            <Text style={styles.submitBtnText}>Listo</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  if (step === 'form' && selectedRecord) {
    return (
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={styles.matchCard} entering={SlideInDown.springify().damping(20).stiffness(170)}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Validar posesión</Text>
              <Text style={styles.matchSubtitle}>{selectedRecord.name}</Text>
            </View>
            <TouchableOpacity onPress={() => { setStep('list'); setDocUri(null); setRegistrationNumber(''); setError(''); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <View style={styles.claimInfoBox}>
              <Info size={16} color={colors.gray500} strokeWidth={2} />
              <Text style={styles.claimInfoText}>
                Necesitamos al menos un documento oficial o el número de registro para validar la posesión.
              </Text>
            </View>

            {/* Número de registro */}
            <Text style={styles.fieldLabel}>Número de registro (opcional)</Text>
            <TextInput
              style={styles.input}
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              placeholder="Ej: STB-2018-00142"
              placeholderTextColor={colors.gray400}
              autoCapitalize="characters"
            />

            {/* Upload documento */}
            <Text style={styles.fieldLabel}>Documento de propiedad</Text>
            <TouchableOpacity style={styles.docPickerBtn} onPress={handlePickDoc} activeOpacity={0.8}>
              {docUri ? (
                <View style={styles.docPreviewRow}>
                  <Image source={{ uri: docUri }} style={styles.docThumb} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docPickedText}>Documento adjunto</Text>
                    <Text style={styles.docPickedSub}>Tocá para cambiar</Text>
                  </View>
                  <CheckCircle2 size={20} color="#047857" strokeWidth={2} />
                </View>
              ) : (
                <View style={styles.docPlaceholder}>
                  <Paperclip size={28} color={colors.gray400} strokeWidth={2} />
                  <Text style={styles.photoPlaceholderText}>Adjuntar certificado</Text>
                  <Text style={styles.photoPlaceholderSub}>Foto del certificado del Studbook, DNE u otro</Text>
                </View>
              )}
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setStep('list'); setDocUri(null); setRegistrationNumber(''); }}>
              <Text style={styles.cancelBtnText}>Volver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, isBusy && { opacity: 0.6 }]}
              onPress={handleSendClaim}
              disabled={isBusy}
            >
              {isBusy
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={styles.submitBtnText}>Enviar reclamo</Text>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <Animated.View style={styles.matchCard} entering={SlideInDown.springify().damping(20).stiffness(170)}>
      <View style={styles.modalHeader}>
        <View>
          <Text style={styles.modalTitle}>Posibles coincidencias</Text>
          <Text style={styles.matchSubtitle}>Encontramos este caballo en el padrón</Text>
        </View>
        <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {matches.map((r) => (
          <View key={r.id} style={styles.matchRow}>
            <View style={styles.matchInfo}>
              <Text style={styles.matchName}>{r.name}</Text>
              <View style={styles.matchMeta}>
                {r.birth_year && <Text style={styles.matchDetail}>{r.birth_year}</Text>}
                {r.sex && <Text style={styles.matchDetail}>{r.sex}</Text>}
                {r.breed && <Text style={styles.matchDetail}>{r.breed}</Text>}
                {r.color && <Text style={styles.matchDetail}>{r.color}</Text>}
              </View>
              <View style={styles.matchSourceRow}>
                <FileText size={11} color={colors.gray400} strokeWidth={2} />
                <Text style={styles.matchSource}>{SOURCE_LABELS[r.registration_source as string] ?? r.registration_source ?? 'Padrón'}</Text>
                {r.ownership_status === 'pending_claim' && (
                  <Text style={styles.matchPending}>· Reclamo pendiente</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.claimBtn}
              onPress={() => { setSelectedRecord(r); setStep('form'); }}
            >
              <Text style={styles.claimBtnText}>Reclamar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <View style={styles.modalFooter}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Omitir por ahora</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function CreateHorseModal({ onClose }: { onClose: () => void }) {
  const createHorse = useCreateHorse();
  const uploadImage = useUploadHorseImage();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<{ records: HorseRecord[]; horseId: string } | null>(null);

  const pickPhoto = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso necesario', 'Necesitamos acceso a la cámara.'); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [4, 3] });
      if (!result.canceled) setPhotoUri(result.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso necesario', 'Necesitamos acceso a la galería.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: [4, 3] });
      if (!result.canceled) setPhotoUri(result.assets[0].uri);
    }
  };

  const handlePickPhoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', 'Tomar foto', 'Elegir de galería'], cancelButtonIndex: 0 },
        (i) => { if (i === 1) pickPhoto('camera'); else if (i === 2) pickPhoto('gallery'); },
      );
    } else {
      Alert.alert('Foto del caballo', '¿De dónde querés subir la foto?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: '📷 Tomar foto', onPress: () => pickPhoto('camera') },
        { text: '🖼️ Elegir de galería', onPress: () => pickPhoto('gallery') },
      ]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    setError('');
    const result = await createHorse.mutateAsync({
      name: name.trim(),
      birth_date: birthDate || undefined,
      microchip: microchip || undefined,
    });
    if (photoUri) {
      await uploadImage.mutateAsync({ id: result.horse.id, uri: photoUri });
    }
    if (result.record_matches.length > 0) {
      setMatches({ records: result.record_matches, horseId: result.horse.id });
    } else {
      onClose();
    }
  };

  const isBusy = createHorse.isPending || uploadImage.isPending;

  if (matches !== null) {
    return (
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <RecordMatchModal
          matches={matches.records}
          microchip={microchip}
          birthDate={birthDate}
          horseId={matches.horseId}
          onClose={onClose}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View style={styles.modalCard} entering={SlideInDown.springify().damping(20).stiffness(170)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Nuevo caballo</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>

          {/* Foto */}
          <TouchableOpacity style={styles.photoPickerBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Camera size={28} color={colors.gray400} strokeWidth={2} />
                <Text style={styles.photoPlaceholderText}>Agregar foto</Text>
                <Text style={styles.photoPlaceholderSub}>Cámara o galería</Text>
              </View>
            )}
            {photoUri && (
              <View style={styles.photoEditBadge}>
                <Camera size={13} color="#fff" strokeWidth={2} />
              </View>
            )}
          </TouchableOpacity>

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
            label="Fecha de nacimiento (opcional)"
            value={birthDate}
            onChange={setBirthDate}
            maxDate={new Date()}
          />
          <Text style={styles.fieldLabel}>Microchip (15 dígitos, opcional)</Text>
          <TextInput
            style={styles.input}
            value={microchip}
            onChangeText={(v) => setMicrochip(v.replace(/\D/g, '').slice(0, 15))}
            placeholder="123456789012345"
            placeholderTextColor={colors.gray400}
            keyboardType="numeric"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {(createHorse.isError || uploadImage.isError) ? <Text style={styles.errorText}>No se pudo crear el caballo.</Text> : null}
        </ScrollView>
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, isBusy && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isBusy}
          >
            {isBusy
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={styles.submitBtnText}>Crear</Text>
            }
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

export default function CaballosScreen() {
  const { can } = useAuth();
  const { data: horses, isLoading, refetch, isRefetching } = useHorses();
  const { data: dashboard } = useDashboard();
  const [search, setSearch] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterEstab, setFilterEstab] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [quickGastoHorse, setQuickGastoHorse] = useState<Horse | null | undefined>(undefined);
  const insets = useSafeAreaInsets();

  const spendMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of dashboard?.spend_by_horse ?? []) map[s.horse_id] = s.total;
    return map;
  }, [dashboard?.spend_by_horse]);

  // Opciones de filtro dinámicas según los datos disponibles
  const activityOptions = [...new Set((horses ?? []).map((h) => h.activity?.name).filter(Boolean))] as string[];
  const estabOptions = [...new Set((horses ?? []).map((h) => h.establishment?.name).filter(Boolean))] as string[];
  const hasFilters = activityOptions.length > 1 || estabOptions.length > 1;

  const filtered = (horses ?? []).filter((h) => {
    const q = search.toLowerCase();
    const matchSearch = !search || (
      h.name.toLowerCase().includes(q) ||
      (h.breed?.name ?? '').toLowerCase().includes(q) ||
      (h.microchip ?? '').includes(q)
    );
    const matchActivity = !filterActivity || h.activity?.name === filterActivity;
    const matchEstab = !filterEstab || h.establishment?.name === filterEstab;
    return matchSearch && matchActivity && matchEstab;
  });

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader
          scrollable
          title="Caballos"
          right={can('horses', 'create') ? <HeaderButton label="+ Nuevo" onPress={() => setShowCreate(true)} /> : undefined}
        />
        <View style={{ padding: 16, gap: 12 }}>
          {[1, 2, 3].map((i) => <HorseCardSkeleton key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <FlatList
        data={filtered}
        keyExtractor={(h) => h.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <ScreenHeader
              scrollable
              title="Caballos"
              right={can('horses', 'create') ? (
                <HeaderButton label="+ Nuevo" onPress={() => { haptic.medium(); setShowCreate(true); }} />
              ) : undefined}
            />
            {/* Buscador */}
            <View style={styles.searchWrap}>
              <Search size={16} color={colors.gray400} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar"
                placeholderTextColor={colors.gray400}
                clearButtonMode="while-editing"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                  <XCircle size={16} color={colors.gray300} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filtros por actividad y establecimiento */}
            {hasFilters && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                style={{ maxHeight: 44 }}
              >
                {activityOptions.map((act) => (
                  <TouchableOpacity
                    key={act}
                    style={[styles.filterChip, filterActivity === act && styles.filterChipActive]}
                    onPress={() => { haptic.selection(); setFilterActivity(filterActivity === act ? '' : act); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.filterChipText, filterActivity === act && styles.filterChipTextActive]}>{act}</Text>
                  </TouchableOpacity>
                ))}
                {estabOptions.map((est) => (
                  <TouchableOpacity
                    key={est}
                    style={[styles.filterChip, filterEstab === est && styles.filterChipActive]}
                    onPress={() => { haptic.selection(); setFilterEstab(filterEstab === est ? '' : est); }}
                    activeOpacity={0.75}
                  >
                    <Building2 size={11} color={filterEstab === est ? colors.white : colors.gray500} strokeWidth={2} />
                    <Text style={[styles.filterChipText, filterEstab === est && styles.filterChipTextActive]}>{est}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon={search ? 'search-outline' : 'paw-outline'}
            title={search ? 'Sin resultados' : 'No hay caballos registrados'}
            message={search ? `No encontramos resultados para "${search}"` : 'Registrá el primer caballo para empezar a gestionar su historial.'}
            actionLabel={!search && can('horses', 'create') ? 'Registrar caballo' : undefined}
            onAction={() => { haptic.medium(); setShowCreate(true); }}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)} style={{ paddingHorizontal: 12 }}>
            <HorseCard
              horse={item}
              monthlySpend={spendMap[item.id]}
            />
          </Animated.View>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB — agregar gasto rápido */}
      {(horses?.length ?? 0) > 0 && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 16 }]}
          onPress={() => { haptic.medium(); setQuickGastoHorse(null); }}
          activeOpacity={0.85}
        >
          <Plus size={26} color="#fff" strokeWidth={2} />
          <Text style={styles.fabLabel}>Gasto</Text>
        </TouchableOpacity>
      )}

      {/* Modal: crear caballo */}
      <Modal visible={showCreate} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <CreateHorseModal onClose={() => setShowCreate(false)} />
        </View>
      </Modal>

      {/* Modal: registrar gasto rápido */}
      <Modal
        visible={quickGastoHorse !== undefined}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setQuickGastoHorse(undefined)}
      >
        <View style={styles.modalOverlay}>
          {quickGastoHorse !== undefined && (
            <QuickGastoModal
              horses={horses ?? []}
              initialHorse={quickGastoHorse}
              onClose={() => setQuickGastoHorse(undefined)}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f2f5' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginVertical: 10,
    backgroundColor: colors.white, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 2, gap: 8,
    shadowColor: '#0f1f3d', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.gray900 },
  list: { paddingBottom: 100, gap: 10 },
  // ─── Horse Card (list style) ───────────────────────────────────────────────
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: 16,
    padding: 12, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardPhotoWrap: { position: 'relative' },
  cardPhoto: { width: 68, height: 68, borderRadius: 12 },
  cardPhotoPlaceholder: {
    width: 68, height: 68, borderRadius: 12,
    backgroundColor: '#e8ecf4', justifyContent: 'center', alignItems: 'center',
  },
  cardPhotoInitial: { fontSize: 26, fontWeight: '800', color: colors.brand, opacity: 0.5 },
  cardVerifiedDot: {
    position: 'absolute', bottom: -3, right: -3,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#059669', borderWidth: 2, borderColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
  },
  cardBody: { flex: 1, gap: 3 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.gray900, flex: 1 },
  cardActivityPill: {
    backgroundColor: '#eff6ff', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0,
  },
  cardActivityText: { fontSize: 10, fontWeight: '700', color: '#1d4ed8' },
  cardBreed: { fontSize: 12, color: colors.gray500 },
  cardEstabRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardEstab: { fontSize: 12, color: colors.gray400, flex: 1 },
  cardSpendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardSpend: { fontSize: 12, fontWeight: '600', color: '#059669' },
  cardActions: { alignItems: 'center', gap: 6 },
  cardQuickBtn: { padding: 2 },
  // ─── FAB ──────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute', right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.brand, borderRadius: 28,
    paddingVertical: 12, paddingHorizontal: 18,
    shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  fabLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  // ─── Quick gasto modal ─────────────────────────────────────────────────────
  quickModalBody: { padding: 20, gap: 14, paddingBottom: 8 },
  quickModalSub: { fontSize: 12, color: colors.gray400, marginTop: 1 },
  horseChip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200,
  },
  horseChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  horseChipText: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  horseChipTextActive: { color: colors.white },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  amountPrefix: {
    height: 46, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200,
    borderTopLeftRadius: 10, borderBottomLeftRadius: 10, borderRightWidth: 0,
  },
  amountPrefixText: { fontSize: 16, fontWeight: '700', color: colors.gray500 },
  amountInput: { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, fontSize: 18, fontWeight: '700' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: colors.gray50, borderWidth: 1.5, borderColor: colors.gray200,
  },
  catChipActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  catIcon: { fontSize: 14 },
  catLabel: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  catLabelActive: { color: '#1d4ed8' },
  // ─── Filtros ───────────────────────────────────────────────────────────────
  filterRow: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200 },
  filterChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  filterChipTextActive: { color: colors.white },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.gray900 },
  modalClose: { fontSize: 18, color: colors.gray400 },
  modalBody: { padding: 20, gap: 10 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.gray100 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  input: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: colors.gray900, backgroundColor: colors.gray50 },
  errorText: { fontSize: 13, color: colors.red500 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  submitBtn: { flex: 1, borderRadius: 12, backgroundColor: colors.brand, paddingVertical: 13, alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  photoPickerBtn: { alignSelf: 'center', marginBottom: 6, position: 'relative' },
  photoPreview: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: colors.brand },
  photoPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.gray100, borderWidth: 2, borderColor: colors.gray200, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  photoPlaceholderText: { fontSize: 12, fontWeight: '700', color: colors.gray500 },
  photoPlaceholderSub: { fontSize: 10, color: colors.gray400 },
  photoEditBadge: { position: 'absolute', bottom: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.brand, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  // Match modal
  matchCard: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  matchSubtitle: { fontSize: 12, color: colors.gray400, marginTop: 1 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.gray50, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.gray200 },
  matchInfo: { flex: 1, gap: 4 },
  matchName: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  matchMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  matchDetail: { fontSize: 12, color: colors.gray500, backgroundColor: colors.gray200, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  matchSourceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  matchSource: { fontSize: 11, color: colors.gray400 },
  matchPending: { fontSize: 11, color: colors.amber600 },
  claimBtn: { backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, minWidth: 80, alignItems: 'center' },
  claimBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  matchDoneWrap: { alignItems: 'center', padding: 32, gap: 12 },
  matchDoneTitle: { fontSize: 18, fontWeight: '700', color: colors.gray900 },
  matchDoneSub: { fontSize: 14, color: colors.gray500, textAlign: 'center', lineHeight: 20 },
  claimInfoBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.gray100, borderRadius: 10, padding: 12 },
  claimInfoText: { flex: 1, fontSize: 12, color: colors.gray600, lineHeight: 17 },
  docPickerBtn: { borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 14, borderStyle: 'dashed', overflow: 'hidden' },
  docPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 6 },
  docPreviewRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  docThumb: { width: 56, height: 56, borderRadius: 8 },
  docPickedText: { fontSize: 13, fontWeight: '600', color: colors.gray900 },
  docPickedSub: { fontSize: 11, color: colors.gray400, marginTop: 2 },
});
