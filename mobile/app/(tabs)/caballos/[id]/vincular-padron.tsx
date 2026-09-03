import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckCircle2, Info, Paperclip, FileText,
} from 'lucide-react-native';

import { useSubmitClaim, useUploadClaimDocument, type HorseRecord } from '../../../../hooks/use-horse-records';
import { useHorse } from '../../../../hooks/use-horses';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { AppImage } from '../../../../components/AppImage';
import { haptic } from '../../../../lib/haptics';
import { colors } from '../../../../lib/colors';
import { Routes, nav } from '../../../../lib/routes';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../../styles/tokens';

const SOURCE_LABELS: Record<string, string> = {
  studbook_ar: 'Studbook AR',
  sra: 'SRA',
  aqha: 'AQHA',
  allbreed: 'AllBreed',
  pedigreequery: 'PedigreeQuery',
  manual: 'Manual',
};

export default function VincularPadronScreen() {
  const params = useLocalSearchParams<{ id: string; matches?: string; microchip?: string; birthDate?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const microchip = Array.isArray(params.microchip) ? params.microchip[0] : (params.microchip ?? '');
  const birthDate = Array.isArray(params.birthDate) ? params.birthDate[0] : (params.birthDate ?? '');
  const matchesParam = Array.isArray(params.matches) ? params.matches[0] : params.matches;

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: horse } = useHorse(id);
  const submitClaim = useSubmitClaim();
  const uploadDoc = useUploadClaimDocument();

  const matches: HorseRecord[] = useMemo(() => {
    if (!matchesParam) return [];
    try {
      return JSON.parse(matchesParam) as HorseRecord[];
    } catch {
      return [];
    }
  }, [matchesParam]);

  const [step, setStep] = useState<'list' | 'form' | 'done'>('list');
  const [selectedRecord, setSelectedRecord] = useState<HorseRecord | null>(null);
  const [docUri, setDocUri] = useState<string | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [error, setError] = useState('');

  const pickDoc = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: false });
      if (!result.canceled) setDocUri(result.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
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

  const handleSelectRecord = (record: HorseRecord) => {
    haptic.selection();
    setSelectedRecord(record);
    setDocUri(null);
    setRegistrationNumber('');
    setError('');
    setStep('form');
  };

  const handleSendClaim = async () => {
    if (!selectedRecord) return;
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
        horse_record_id: selectedRecord.id,
        horse_id: id,
        microchip: microchip || undefined,
        claimed_birth_date: birthDate || undefined,
        registration_number: registrationNumber.trim() || undefined,
        document_url,
        document_public_id,
      });
      haptic.success();
      setStep('done');
    } catch {
      haptic.error();
      setError('No se pudo enviar el reclamo. Intentá de nuevo.');
    }
  };

  const isBusy = uploadDoc.isPending || submitClaim.isPending;

  const goToHorse = () => { haptic.light(); nav.replace(router, Routes.caballo(id)); };

  const title = step === 'done' ? '¡Reclamo enviado!' : step === 'form' ? 'Validar posesión' : 'Posibles coincidencias';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title={title} subtitle={horse?.name} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
      >
        {step === 'done' && (
          <View style={s.doneWrap}>
            <CheckCircle2 size={52} color={c.success} strokeWidth={2} />
            <Text style={s.doneTitle}>¡Reclamo enviado!</Text>
            <Text style={s.doneSub}>
              Vamos a validar la documentación y te avisamos cuando tu caballo quede vinculado al registro oficial del padrón.
            </Text>
          </View>
        )}

        {step === 'list' && (
          <>
            <Text style={s.hint}>Encontramos estos ejemplares en el padrón oficial. Si alguno es tu caballo, reclamalo para verificarlo.</Text>
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
                <TouchableOpacity style={s.claimBtn} onPress={() => handleSelectRecord(r)} activeOpacity={0.85}>
                  <Text style={s.claimBtnText}>Reclamar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {step === 'form' && selectedRecord && (
          <>
            <Text style={s.matchSubtitle}>{selectedRecord.name}</Text>
            <View style={s.infoBox}>
              <Info size={16} color={c.textMuted} strokeWidth={2} />
              <Text style={s.infoText}>
                Necesitamos al menos un documento oficial o el número de registro para validar la posesión.
              </Text>
            </View>

            <Text style={s.fieldLabel}>Número de registro (opcional)</Text>
            <TextInput
              style={s.input}
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              placeholder="Ej: STB-2018-00142"
              placeholderTextColor={c.textFaint}
              autoCapitalize="characters"
            />

            <Text style={s.fieldLabel}>Documento de propiedad</Text>
            <TouchableOpacity style={s.docPickerBtn} onPress={handlePickDoc} activeOpacity={0.8}>
              {docUri ? (
                <View style={s.docPreviewRow}>
                  <AppImage source={{ uri: docUri }} style={s.docThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.docPickedText}>Documento adjunto</Text>
                    <Text style={s.docPickedSub}>Tocá para cambiar</Text>
                  </View>
                  <CheckCircle2 size={20} color={c.success} strokeWidth={2} />
                </View>
              ) : (
                <View style={s.docPlaceholder}>
                  <Paperclip size={28} color={c.textFaint} strokeWidth={2} />
                  <Text style={s.docPlaceholderText}>Adjuntar certificado</Text>
                  <Text style={s.docPlaceholderSub}>Foto del certificado del Studbook, DNE u otro</Text>
                </View>
              )}
            </TouchableOpacity>

            {error ? <Text style={s.errorText}>{error}</Text> : null}
          </>
        )}
      </ScrollView>

      {step === 'list' && (
        <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
          <TouchableOpacity style={[s.submitBtn, { flex: 1 }]} onPress={goToHorse} activeOpacity={0.85}>
            <Text style={s.submitBtnText}>Omitir por ahora</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'form' && (
        <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
          <TouchableOpacity
            style={[s.cancelBtn, { flex: 1 }]}
            onPress={() => { haptic.selection(); setStep('list'); setDocUri(null); setRegistrationNumber(''); setError(''); }}
            activeOpacity={0.8}
          >
            <Text style={s.cancelBtnText}>Volver</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.submitBtn, { flex: 1 }, isBusy && { opacity: 0.6 }]}
            onPress={handleSendClaim}
            disabled={isBusy}
            activeOpacity={0.85}
          >
            {isBusy
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.submitBtnText}>Enviar reclamo</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {step === 'done' && (
        <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
          <TouchableOpacity style={[s.submitBtn, { flex: 1 }]} onPress={goToHorse} activeOpacity={0.85}>
            <Text style={s.submitBtnText}>Listo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[1], paddingBottom: space[8], gap: space[3] },
  hint: { fontSize: text.sm, color: c.textMuted, lineHeight: 19, marginBottom: space[1] },

  matchRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: c.surfaceAlt, borderRadius: radius.lg, padding: space[4] },
  matchInfo: { flex: 1, gap: 4 },
  matchName: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  matchMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  matchDetail: { fontSize: text.xs, color: c.textMuted, backgroundColor: c.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  matchSourceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  matchSource: { fontSize: 11, color: c.textFaint },
  matchPending: { fontSize: 11, color: colors.amber600 },
  claimBtn: { backgroundColor: c.brand, borderRadius: radius.md, paddingHorizontal: space[4], minHeight: touch.min, minWidth: 84, alignItems: 'center', justifyContent: 'center' },
  claimBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },

  matchSubtitle: { fontSize: text.sm, color: c.textFaint },
  infoBox: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start', backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space[3] },
  infoText: { flex: 1, fontSize: text.xs, color: c.textMuted, lineHeight: 17 },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  input: { borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.base, color: c.text, backgroundColor: c.surfaceAlt },
  errorText: { fontSize: text.sm, color: colors.red500 },

  docPickerBtn: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.surfaceAlt },
  docPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: space[6], gap: 6 },
  docPlaceholderText: { fontSize: text.xs, fontWeight: weight.bold, color: c.textMuted },
  docPlaceholderSub: { fontSize: 10, color: c.textFaint },
  docPreviewRow: { flexDirection: 'row', alignItems: 'center', padding: space[3], gap: space[3] },
  docThumb: { width: 56, height: 56, borderRadius: radius.md },
  docPickedText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  docPickedSub: { fontSize: 11, color: c.textFaint, marginTop: 2 },

  doneWrap: { alignItems: 'center', paddingVertical: space[10], gap: space[3] },
  doneTitle: { fontSize: text.lg, fontWeight: weight.bold, color: c.text },
  doneSub: { fontSize: text.base, color: c.textMuted, textAlign: 'center', lineHeight: 20 },

  footer: { flexDirection: 'row', gap: space[3], paddingHorizontal: space[4], paddingTop: space[3], borderTopWidth: 1, borderTopColor: c.border },
  cancelBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.surfaceAlt, alignItems: 'center' },
  cancelBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: c.textMuted },
  submitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.brand, alignItems: 'center' },
  submitBtnText: { fontSize: text.md, fontWeight: weight.extrabold, color: colors.white },
});
