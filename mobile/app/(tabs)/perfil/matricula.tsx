import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { useState, useMemo, useRef } from 'react';
import { ShieldCheck, Check, Camera, ChevronRight } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../lib/auth';
import api from '../../../lib/api';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight } from '../../../styles/tokens';
import { useToast } from '../../../components/Toast';
import { AppImage } from '../../../components/AppImage';
import { ScreenHeader } from '../../../components/ScreenHeader';

type LicenseMeta = { label: string; color: string; bg: string };
const makeLicenseStatus = (c: ThemeColors): Record<string, LicenseMeta> => ({
  none:     { label: 'Sin cargar', color: c.textMuted, bg: c.surfaceAlt },
  pending:  { label: 'Pendiente',  color: c.warning,   bg: c.warningSoft },
  approved: { label: 'Aprobada',   color: c.success,   bg: c.successSoft },
  rejected: { label: 'Rechazada',  color: c.danger,    bg: c.dangerSoft },
});

export default function MatriculaScreen() {
  const { user, refreshUser } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const toast = useToast();

  const [number, setNumber] = useState(user?.vet_license_number ?? '');
  const [province, setProvince] = useState(user?.vet_province ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const provinceRef = useRef<TextInput>(null);

  if (!user) return null;

  const status = user.vet_license_status ?? 'none';
  const licenseStatus = makeLicenseStatus(c);
  const badge = licenseStatus[status] ?? licenseStatus.none;

  const pickPhoto = async () => {
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== 'granted') {
      toast.error('Necesitamos acceso a tu galería para adjuntar la foto de la matrícula.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!number.trim() || !province.trim()) {
      toast.error('Ingresá el número de matrícula y la provincia.');
      return;
    }
    haptic.medium();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('number', number.trim());
      formData.append('province', province.trim());
      if (photoUri) {
        formData.append('file', { uri: photoUri, name: 'matricula.jpg', type: 'image/jpeg' } as unknown as Blob);
      }
      await api.post('/auth/vet-license', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      setPhotoUri(null);
      toast.success('Matrícula enviada. Un administrador va a validarla.');
    } catch {
      toast.error('No se pudo enviar la matrícula. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.root}>
      <ScreenHeader showBack title="Matrícula profesional" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={s.section}>
          <View style={s.card}>
            <View style={s.statusRow}>
              <View style={s.rowIconWrap}>
                <ShieldCheck size={20} color={c.text} strokeWidth={1.7} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.statusLabel}>Estado de tu matrícula</Text>
                <Text style={s.statusSub}>Se valida manualmente por un administrador.</Text>
              </View>
              <View style={[s.badge, { backgroundColor: badge.bg }]}>
                {status === 'approved'
                  ? <Check size={12} color={badge.color} strokeWidth={3.2} />
                  : <View style={[s.badgeDot, { backgroundColor: badge.color }]} />}
                <Text style={[s.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            </View>

            <TextInput
              style={s.input}
              value={number}
              onChangeText={setNumber}
              placeholder="Número de matrícula"
              placeholderTextColor={c.textFaint}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => provinceRef.current?.focus()}
              blurOnSubmit={false}
            />
            <TextInput
              ref={provinceRef}
              style={s.input}
              value={province}
              onChangeText={setProvince}
              placeholder="Provincia"
              placeholderTextColor={c.textFaint}
              autoCapitalize="words"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            {(photoUri || user.vet_license_url) && (
              <View style={s.previewRow}>
                <AppImage source={{ uri: photoUri ?? user.vet_license_url ?? undefined }} style={s.previewImg} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.accountRowLabel}>{photoUri ? 'Nueva foto seleccionada' : 'Foto cargada'}</Text>
                  <Text style={s.accountRowSub}>{photoUri ? 'Se enviará al validar.' : 'Ya guardada en tu perfil.'}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={s.photoRow}
              onPress={pickPhoto}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel={photoUri || user.vet_license_url ? 'Cambiar foto de la matrícula' : 'Subir foto de la matrícula'}
            >
              <View style={s.rowIconWrap}>
                <Camera size={20} color={c.text} strokeWidth={1.7} />
              </View>
              <Text style={s.photoRowText}>
                {photoUri || user.vet_license_url ? 'Cambiar foto' : 'Subir foto de la matrícula'}
              </Text>
              <ChevronRight size={16} color={c.textFaint} strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={s.saveBtnText}>Enviar para validación</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  section: { paddingHorizontal: space[5], marginTop: space[5] },
  card: { gap: space[3] },

  accountRowLabel: { fontSize: text.md, fontWeight: weight.regular, color: c.text, letterSpacing: -0.2 },
  accountRowSub: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },

  rowIconWrap: { width: 28, alignItems: 'center', flexShrink: 0 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: 52, paddingBottom: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  statusLabel: { fontSize: text.md, fontWeight: weight.regular, color: c.text, letterSpacing: -0.2 },
  statusSub: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: space[1] + 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: text.xs, fontWeight: weight.bold },

  input: {
    borderWidth: 1, borderColor: 'transparent', borderRadius: radius.lg,
    paddingHorizontal: space[4], paddingVertical: space[3],
    fontSize: text.base, color: c.text, backgroundColor: c.surfaceAlt,
  },

  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: 52, paddingVertical: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  previewImg: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: c.border },

  photoRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  photoRowText: { flex: 1, fontSize: text.md, fontWeight: weight.regular, color: c.text, letterSpacing: -0.2 },

  saveBtn: {
    backgroundColor: c.brand, borderRadius: radius.lg,
    paddingVertical: space[4], alignItems: 'center', justifyContent: 'center',
    marginTop: space[2],
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
});
