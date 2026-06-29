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
  CheckCircle2, Info, Paperclip, FileText, Camera, Search, XCircle, Plus, X,
  Wheat, Syringe, Hammer, Activity, Wrench, Truck, Package,
  type LucideIcon,
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
import { useTheme, type ThemeColors } from '../../../lib/theme';
import type { Horse } from '../../../../packages/shared/src';

function HorseCard({ horse, monthlySpend, c, s }: {
  horse: Horse;
  monthlySpend?: number;
  c: ThemeColors;
  s: Styles;
}) {
  const router = useRouter();
  const sexLabel: Record<string, string> = { macho: 'Macho', hembra: 'Hembra', castrado: 'Castrado' };
  const subtitle = [horse.breed?.name, horse.sex ? sexLabel[horse.sex] : null].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => { haptic.light(); router.push(`/(tabs)/caballos/${horse.id}`); }}
      activeOpacity={0.88}
    >
      {/* Photo */}
      <View style={s.cardPhotoWrap}>
        {horse.image_url
          ? <Image source={{ uri: horse.image_url }} style={s.cardPhoto} resizeMode="cover" />
          : (
            <View style={s.cardPhotoPlaceholder}>
              <Text style={s.cardPhotoInitial}>{horse.name[0]?.toUpperCase()}</Text>
            </View>
          )
        }
        {horse.horse_record_id && (
          <View style={s.cardVerifiedDot}>
            <ShieldCheck size={9} color="#fff" strokeWidth={2} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={s.cardBody}>
        <View style={s.cardNameRow}>
          <Text style={s.cardName} numberOfLines={1}>{horse.name}</Text>
          {horse.activity && (
            <View style={s.cardActivityPill}>
              <Text style={s.cardActivityText}>{horse.activity.name}</Text>
            </View>
          )}
        </View>
        {subtitle ? <Text style={s.cardBreed} numberOfLines={1}>{subtitle}</Text> : null}
        {horse.establishment && (
          <View style={s.cardEstabRow}>
            <Building2 size={11} color={c.textFaint} strokeWidth={2} />
            <Text style={s.cardEstab} numberOfLines={1}>{horse.establishment.name}</Text>
          </View>
        )}
        {monthlySpend != null && monthlySpend > 0 && (
          <View style={s.cardSpendRow}>
            <TrendingUp size={12} color="#059669" strokeWidth={2} />
            <Text style={s.cardSpend}>${monthlySpend.toLocaleString('es-AR')} este mes</Text>
          </View>
        )}
      </View>

      {/* Entrar al detalle */}
      <View style={s.cardActions}>
        <ChevronRight size={18} color={c.textFaint} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

const GASTO_CATEGORIES: { key: string; Icon: LucideIcon; color: string; label: string }[] = [
  { key: 'alimentacion', Icon: Wheat, color: '#16a34a', label: 'Alimentación' },
  { key: 'veterinario', Icon: Syringe, color: '#dc2626', label: 'Veterinario' },
  { key: 'herradero', Icon: Hammer, color: '#d97706', label: 'Herradero' },
  { key: 'entrenamiento', Icon: Activity, color: '#a16207', label: 'Entrenamiento' },
  { key: 'mantenimiento', Icon: Wrench, color: '#0284c7', label: 'Mantenimiento' },
  { key: 'transporte', Icon: Truck, color: '#0891b2', label: 'Transporte' },
  { key: 'otros', Icon: Package, color: '#6b7280', label: 'Otros' },
];

function QuickGastoModal({
  horses,
  initialHorse,
  onClose,
  c,
  s,
}: {
  horses: Horse[];
  initialHorse?: Horse | null;
  onClose: () => void;
  c: ThemeColors;
  s: Styles;
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
    <KeyboardAvoidingView style={s.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View style={s.modalCard} entering={SlideInDown.springify().damping(26).stiffness(190)}>
        <View style={s.modalHeader}>
          <View>
            <Text style={s.modalTitle}>Registrar gasto</Text>
            {selectedHorse && <Text style={s.quickModalSub}>{selectedHorse.name}</Text>}
          </View>
          <TouchableOpacity onPress={onClose}><X size={22} color={c.textFaint} strokeWidth={2} /></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.quickModalBody} keyboardShouldPersistTaps="handled">
          {/* Horse selector */}
          {!initialHorse && horses.length > 1 && (
            <>
              <Text style={s.fieldLabel}>¿Para qué caballo?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                  {horses.map((h) => (
                    <TouchableOpacity
                      key={h.id}
                      style={[s.horseChip, selectedHorse?.id === h.id && s.horseChipActive]}
                      onPress={() => { haptic.selection(); setSelectedHorse(h); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.horseChipText, selectedHorse?.id === h.id && s.horseChipTextActive]}>
                        {h.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Amount */}
          <Text style={s.fieldLabel}>Monto *</Text>
          <View style={s.amountRow}>
            <View style={s.amountPrefix}><Text style={s.amountPrefixText}>$</Text></View>
            <TextInput
              style={[s.input, s.amountInput]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={c.textFaint}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

          {/* Category */}
          <Text style={s.fieldLabel}>Categoría</Text>
          <View style={s.categoryGrid}>
            {GASTO_CATEGORIES.map((cat) => {
              const CatIcon = cat.Icon;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[s.catChip, category === cat.key && s.catChipActive]}
                  onPress={() => { haptic.selection(); setCategory(cat.key); }}
                  activeOpacity={0.7}
                >
                  <CatIcon size={14} color={cat.color} strokeWidth={2} />
                  <Text style={[s.catLabel, category === cat.key && s.catLabelActive]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Description */}
          <Text style={s.fieldLabel}>Descripción (opcional)</Text>
          <TextInput
            style={s.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Ej: Consulta Dr. García, alimento marca X..."
            placeholderTextColor={c.textFaint}
            autoCapitalize="sentences"
          />

          {error ? <Text style={s.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={s.modalFooter}>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.submitBtn, createEvent.isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={createEvent.isPending}
          >
            {createEvent.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.submitBtnText}>Registrar gasto</Text>
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
  c,
  s,
}: {
  matches: HorseRecord[];
  microchip: string;
  birthDate: string;
  horseId: string;
  onClose: () => void;
  c: ThemeColors;
  s: Styles;
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
        { text: 'Tomar foto', onPress: () => pickDoc('camera') },
        { text: 'Elegir de galería', onPress: () => pickDoc('gallery') },
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
      <Animated.View style={s.matchCard} entering={SlideInDown.springify().damping(26).stiffness(190)}>
        <View style={s.matchDoneWrap}>
          <CheckCircle2 size={52} color="#047857" strokeWidth={2} />
          <Text style={s.matchDoneTitle}>¡Reclamo aprobado!</Text>
          <Text style={s.matchDoneSub}>Tu caballo quedó vinculado al registro oficial del padrón.</Text>
          <TouchableOpacity style={s.submitBtn} onPress={onClose}>
            <Text style={s.submitBtnText}>Listo</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  if (step === 'form' && selectedRecord) {
    return (
      <KeyboardAvoidingView style={s.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={s.matchCard} entering={SlideInDown.springify().damping(26).stiffness(190)}>
          <View style={s.modalHeader}>
            <View>
              <Text style={s.modalTitle}>Validar posesión</Text>
              <Text style={s.matchSubtitle}>{selectedRecord.name}</Text>
            </View>
            <TouchableOpacity onPress={() => { setStep('list'); setDocUri(null); setRegistrationNumber(''); setError(''); }}>
              <X size={22} color={c.textFaint} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <View style={s.claimInfoBox}>
              <Info size={16} color={c.textMuted} strokeWidth={2} />
              <Text style={s.claimInfoText}>
                Necesitamos al menos un documento oficial o el número de registro para validar la posesión.
              </Text>
            </View>

            {/* Número de registro */}
            <Text style={s.fieldLabel}>Número de registro (opcional)</Text>
            <TextInput
              style={s.input}
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              placeholder="Ej: STB-2018-00142"
              placeholderTextColor={c.textFaint}
              autoCapitalize="characters"
            />

            {/* Upload documento */}
            <Text style={s.fieldLabel}>Documento de propiedad</Text>
            <TouchableOpacity style={s.docPickerBtn} onPress={handlePickDoc} activeOpacity={0.8}>
              {docUri ? (
                <View style={s.docPreviewRow}>
                  <Image source={{ uri: docUri }} style={s.docThumb} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.docPickedText}>Documento adjunto</Text>
                    <Text style={s.docPickedSub}>Tocá para cambiar</Text>
                  </View>
                  <CheckCircle2 size={20} color="#047857" strokeWidth={2} />
                </View>
              ) : (
                <View style={s.docPlaceholder}>
                  <Paperclip size={28} color={c.textFaint} strokeWidth={2} />
                  <Text style={s.photoPlaceholderText}>Adjuntar certificado</Text>
                  <Text style={s.photoPlaceholderSub}>Foto del certificado del Studbook, DNE u otro</Text>
                </View>
              )}
            </TouchableOpacity>

            {error ? <Text style={s.errorText}>{error}</Text> : null}
          </ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => { setStep('list'); setDocUri(null); setRegistrationNumber(''); }}>
              <Text style={s.cancelBtnText}>Volver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, isBusy && { opacity: 0.6 }]}
              onPress={handleSendClaim}
              disabled={isBusy}
            >
              {isBusy
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={s.submitBtnText}>Enviar reclamo</Text>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <Animated.View style={s.matchCard} entering={SlideInDown.springify().damping(26).stiffness(190)}>
      <View style={s.modalHeader}>
        <View>
          <Text style={s.modalTitle}>Posibles coincidencias</Text>
          <Text style={s.matchSubtitle}>Encontramos este caballo en el padrón</Text>
        </View>
        <TouchableOpacity onPress={onClose}><X size={22} color={c.textFaint} strokeWidth={2} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {matches.map((r) => (
          <View key={r.id} style={s.matchRow}>
            <View style={s.matchInfo}>
              <Text style={s.matchName}>{r.name}</Text>
              <View style={s.matchMeta}>
                {r.birth_year && <Text style={s.matchDetail}>{r.birth_year}</Text>}
                {r.sex && <Text style={s.matchDetail}>{r.sex}</Text>}
                {r.breed && <Text style={s.matchDetail}>{r.breed}</Text>}
                {r.color && <Text style={s.matchDetail}>{r.color}</Text>}
              </View>
              <View style={s.matchSourceRow}>
                <FileText size={11} color={c.textFaint} strokeWidth={2} />
                <Text style={s.matchSource}>{SOURCE_LABELS[r.registration_source as string] ?? r.registration_source ?? 'Padrón'}</Text>
                {r.ownership_status === 'pending_claim' && (
                  <Text style={s.matchPending}>· Reclamo pendiente</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={s.claimBtn}
              onPress={() => { setSelectedRecord(r); setStep('form'); }}
            >
              <Text style={s.claimBtnText}>Reclamar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <View style={s.modalFooter}>
        <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
          <Text style={s.cancelBtnText}>Omitir por ahora</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function CreateHorseModal({ onClose, c, s }: { onClose: () => void; c: ThemeColors; s: Styles }) {
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
      const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true });
      if (!result.canceled) setPhotoUri(result.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso necesario', 'Necesitamos acceso a la galería.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true });
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
        { text: 'Tomar foto', onPress: () => pickPhoto('camera') },
        { text: 'Elegir de galería', onPress: () => pickPhoto('gallery') },
      ]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    setError('');
    try {
      const result = await createHorse.mutateAsync({
        name: name.trim(),
        birth_date: birthDate || undefined,
        microchip: microchip || undefined,
      });
      if (photoUri) {
        try {
          await uploadImage.mutateAsync({ id: result.horse.id, uri: photoUri });
        } catch {
          // El caballo ya se creó; si la foto falla, no bloqueamos el alta.
        }
      }
      if (result.record_matches.length > 0) {
        setMatches({ records: result.record_matches, horseId: result.horse.id });
      } else {
        onClose();
      }
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'No se pudo crear el caballo. Intentá de nuevo.');
    }
  };

  const isBusy = createHorse.isPending || uploadImage.isPending;

  if (matches !== null) {
    return (
      <KeyboardAvoidingView style={s.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <RecordMatchModal
          matches={matches.records}
          microchip={microchip}
          birthDate={birthDate}
          horseId={matches.horseId}
          onClose={onClose}
          c={c}
          s={s}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={s.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View style={s.modalCard} entering={SlideInDown.springify().damping(26).stiffness(190)}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>Nuevo caballo</Text>
          <TouchableOpacity onPress={onClose}><X size={22} color={c.textFaint} strokeWidth={2} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Foto */}
          <TouchableOpacity style={s.photoPickerBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={s.photoPreview} resizeMode="cover" />
            ) : (
              <View style={s.photoPlaceholder}>
                <Camera size={28} color={c.textFaint} strokeWidth={2} />
                <Text style={s.photoPlaceholderText}>Agregar foto</Text>
                <Text style={s.photoPlaceholderSub}>Cámara o galería</Text>
              </View>
            )}
            {photoUri && (
              <View style={s.photoEditBadge}>
                <Camera size={13} color="#fff" strokeWidth={2} />
              </View>
            )}
          </TouchableOpacity>

          <Text style={s.fieldLabel}>Nombre *</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Nombre del caballo"
            placeholderTextColor={c.textFaint}
            autoCapitalize="words"
          />
          <DatePicker
            label="Fecha de nacimiento (opcional)"
            value={birthDate}
            onChange={setBirthDate}
            maxDate={new Date()}
          />
          <Text style={s.fieldLabel}>Microchip (15 dígitos, opcional)</Text>
          <TextInput
            style={s.input}
            value={microchip}
            onChangeText={(v) => setMicrochip(v.replace(/\D/g, '').slice(0, 15))}
            placeholder="123456789012345"
            placeholderTextColor={c.textFaint}
            keyboardType="numeric"
          />
          {error ? <Text style={s.errorText}>{error}</Text> : null}
          {(createHorse.isError || uploadImage.isError) ? <Text style={s.errorText}>No se pudo crear el caballo.</Text> : null}
        </ScrollView>
        <View style={s.modalFooter}>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.submitBtn, isBusy && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isBusy}
          >
            {isBusy
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.submitBtnText}>Crear</Text>
            }
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

export default function CaballosScreen() {
  const { can } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: horses, isLoading, refetch, isRefetching } = useHorses();
  const { data: dashboard } = useDashboard();
  const [search, setSearch] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterEstab, setFilterEstab] = useState('');
  const [showCreate, setShowCreate] = useState(false);
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
      <View style={[s.root, { paddingTop: insets.top }]}>
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
    <View style={[s.root, { paddingTop: insets.top }]}>
      <FlatList
        data={filtered}
        keyExtractor={(h) => h.id}
        contentContainerStyle={s.list}
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
            <View style={s.searchWrap}>
              <Search size={16} color={c.textFaint} strokeWidth={2} />
              <TextInput
                style={s.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar"
                placeholderTextColor={c.textFaint}
                clearButtonMode="while-editing"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                  <XCircle size={16} color={c.textFaint} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filtros por actividad y establecimiento */}
            {hasFilters && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterRow}
                style={{ maxHeight: 44 }}
              >
                {activityOptions.map((act) => (
                  <TouchableOpacity
                    key={act}
                    style={[s.filterChip, filterActivity === act && s.filterChipActive]}
                    onPress={() => { haptic.selection(); setFilterActivity(filterActivity === act ? '' : act); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.filterChipText, filterActivity === act && s.filterChipTextActive]}>{act}</Text>
                  </TouchableOpacity>
                ))}
                {estabOptions.map((est) => (
                  <TouchableOpacity
                    key={est}
                    style={[s.filterChip, filterEstab === est && s.filterChipActive]}
                    onPress={() => { haptic.selection(); setFilterEstab(filterEstab === est ? '' : est); }}
                    activeOpacity={0.75}
                  >
                    <Building2 size={11} color={filterEstab === est ? colors.white : c.textMuted} strokeWidth={2} />
                    <Text style={[s.filterChipText, filterEstab === est && s.filterChipTextActive]}>{est}</Text>
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
              c={c}
              s={s}
            />
          </Animated.View>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Modal: crear caballo */}
      <Modal visible={showCreate} animationType="fade" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={s.modalOverlay}>
          <CreateHorseModal onClose={() => setShowCreate(false)} c={c} s={s} />
        </View>
      </Modal>

    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginVertical: 10,
    backgroundColor: c.surface, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 2, gap: 8,
    shadowColor: '#0f1f3d', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: c.text },
  list: { paddingBottom: 100, gap: 10 },
  // ─── Horse Card (list style) ───────────────────────────────────────────────
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.surface, borderRadius: 16,
    padding: 12, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardPhotoWrap: { position: 'relative' },
  cardPhoto: { width: 68, height: 68, borderRadius: 12 },
  cardPhotoPlaceholder: {
    width: 68, height: 68, borderRadius: 12,
    backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center',
  },
  cardPhotoInitial: { fontSize: 26, fontWeight: '800', color: c.brand, opacity: 0.5 },
  cardVerifiedDot: {
    position: 'absolute', bottom: -3, right: -3,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#059669', borderWidth: 2, borderColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
  },
  cardBody: { flex: 1, gap: 3 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 15, fontWeight: '700', color: c.text, flex: 1 },
  cardActivityPill: {
    backgroundColor: '#eff6ff', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0,
  },
  cardActivityText: { fontSize: 10, fontWeight: '700', color: '#1d4ed8' },
  cardBreed: { fontSize: 12, color: c.textMuted },
  cardEstabRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardEstab: { fontSize: 12, color: c.textFaint, flex: 1 },
  cardSpendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardSpend: { fontSize: 12, fontWeight: '600', color: '#059669' },
  cardActions: { alignItems: 'center', gap: 6 },
  cardQuickBtn: { padding: 2 },
  // ─── FAB ──────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute', right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.brand, borderRadius: 28,
    paddingVertical: 12, paddingHorizontal: 18,
    shadowColor: c.brand, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 7, elevation: 4,
  },
  fabLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  // ─── Quick gasto modal ─────────────────────────────────────────────────────
  quickModalBody: { padding: 20, gap: 14, paddingBottom: 8 },
  quickModalSub: { fontSize: 12, color: c.textFaint, marginTop: 1 },
  horseChip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border,
  },
  horseChipActive: { backgroundColor: c.brand, borderColor: c.brand },
  horseChipText: { fontSize: 13, fontWeight: '600', color: c.text },
  horseChipTextActive: { color: colors.white },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  amountPrefix: {
    height: 46, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border,
    borderTopLeftRadius: 10, borderBottomLeftRadius: 10, borderRightWidth: 0,
  },
  amountPrefixText: { fontSize: 16, fontWeight: '700', color: c.textMuted },
  amountInput: { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, fontSize: 18, fontWeight: '700' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: c.surfaceAlt, borderWidth: 1.5, borderColor: c.border,
  },
  catChipActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  catIcon: { fontSize: 14 },
  catLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  catLabelActive: { color: '#1d4ed8' },
  // ─── Filtros ───────────────────────────────────────────────────────────────
  filterRow: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  filterChipActive: { backgroundColor: c.brand, borderColor: c.brand },
  filterChipText: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  filterChipTextActive: { color: colors.white },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: c.border },
  modalTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  modalClose: { fontSize: 18, color: c.textFaint },
  modalBody: { padding: 20, gap: 10 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: c.border },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: c.text },
  input: { borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: c.text, backgroundColor: c.surfaceAlt },
  errorText: { fontSize: 13, color: colors.red500 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  submitBtn: { flex: 1, borderRadius: 12, backgroundColor: c.brand, paddingVertical: 13, alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  photoPickerBtn: { alignSelf: 'center', marginBottom: 6, position: 'relative' },
  photoPreview: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: c.brand },
  photoPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: c.surfaceAlt, borderWidth: 2, borderColor: c.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  photoPlaceholderText: { fontSize: 12, fontWeight: '700', color: c.textMuted },
  photoPlaceholderSub: { fontSize: 10, color: c.textFaint },
  photoEditBadge: { position: 'absolute', bottom: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  // Match modal
  matchCard: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  matchSubtitle: { fontSize: 12, color: c.textFaint, marginTop: 1 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.border },
  matchInfo: { flex: 1, gap: 4 },
  matchName: { fontSize: 15, fontWeight: '700', color: c.text },
  matchMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  matchDetail: { fontSize: 12, color: c.textMuted, backgroundColor: c.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  matchSourceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  matchSource: { fontSize: 11, color: c.textFaint },
  matchPending: { fontSize: 11, color: colors.amber600 },
  claimBtn: { backgroundColor: c.brand, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, minWidth: 80, alignItems: 'center' },
  claimBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  matchDoneWrap: { alignItems: 'center', padding: 32, gap: 12 },
  matchDoneTitle: { fontSize: 18, fontWeight: '700', color: c.text },
  matchDoneSub: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
  claimInfoBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: c.surfaceAlt, borderRadius: 10, padding: 12 },
  claimInfoText: { flex: 1, fontSize: 12, color: c.textMuted, lineHeight: 17 },
  docPickerBtn: { borderWidth: 1.5, borderColor: c.border, borderRadius: 14, borderStyle: 'dashed', overflow: 'hidden' },
  docPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 6 },
  docPreviewRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  docThumb: { width: 56, height: 56, borderRadius: 8 },
  docPickedText: { fontSize: 13, fontWeight: '600', color: c.text },
  docPickedSub: { fontSize: 11, color: c.textFaint, marginTop: 2 },
});
