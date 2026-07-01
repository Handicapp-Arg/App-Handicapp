import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, Switch, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import {
  User, ChevronRight, Lock, LogOut, Crown, Check, ShieldCheck, Camera,
  Phone,
  type LucideIcon,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { WhatsappLogo } from '../../components/icons/WhatsappLogo';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { avatarColor, initialsOf, AVATAR_PALETTE } from '../../lib/avatar-color';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, shadow } from '../../styles/tokens';
import { usePlanStatus, useAdminPlanUsers, useAdminSetPlan, type AdminPlanUser } from '../../hooks/use-plan';
import { VetVerifiedBadge, isVetVerified } from '../../components/VerifiedBadge';

const ROLE_LABELS: Record<string, string> = {
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
  veterinario: 'Veterinario',
  admin: 'Administrador',
};

const MONTHS_OPTIONS = [
  { label: '1 mes', value: 1 },
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
];

/* ─── Plan Card ─── */

function PlanCard({ plan, horseCount, horseLimit, isLimited, c, s }: {
  plan: string; horseCount: number; horseLimit: number | null; isLimited: boolean;
  c: ThemeColors; s: Styles;
}) {
  const isPro = plan === 'pro';
  const pct = horseLimit ? Math.min((horseCount / horseLimit) * 100, 100) : 0;

  if (isPro) {
    return (
      <LinearGradient
        colors={['#241910', '#5f3f18', '#a87330']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.planPro}
      >
        <View style={s.planProTop}>
          <View style={s.planProBadge}>
            <Crown size={13} color="#241910" strokeWidth={2.5} />
            <Text style={s.planProBadgeText}>PRO</Text>
          </View>
        </View>
        <Text style={s.planProTitle}>Acceso ilimitado</Text>
        <Text style={s.planProSub}>{horseCount} caballos · todas las funciones</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={s.planFree}>
      <View style={s.planProTop}>
        <View style={s.planFreeBadge}>
          <Text style={s.planFreeBadgeText}>Gratis</Text>
        </View>
        <Text style={s.planFreeUsage}>{horseCount}{horseLimit ? `/${horseLimit}` : ''} caballos</Text>
      </View>
      {horseLimit && (
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: isLimited ? colors.amber600 : c.brand }]} />
        </View>
      )}
      <Text style={s.planFreeMsg}>
        {isLimited ? 'Límite alcanzado. Pasate a Pro para caballos ilimitados.' : 'Pasate a Pro para caballos ilimitados.'}
      </Text>
    </View>
  );
}

/* ─── Admin User Row ─── */

function AdminUserRow({ u, onActivate, onRevoke, isPending, c, s }: {
  u: AdminPlanUser;
  onActivate: (userId: string, months: number) => void;
  onRevoke: (userId: string) => void;
  isPending: boolean;
  c: ThemeColors; s: Styles;
}) {
  const [months, setMonths] = useState(1);
  const [showMonths, setShowMonths] = useState(false);
  const isPro = u.plan === 'pro';
  const expiresStr = u.plan_expires_at
    ? new Date(u.plan_expires_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <View style={s.adminRow}>
      <View style={s.adminRowTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.adminRowName} numberOfLines={1}>{u.name}</Text>
          <Text style={s.adminRowEmail} numberOfLines={1}>{u.email}</Text>
          <Text style={s.adminRowMeta}>{ROLE_LABELS[u.role] ?? u.role} · {u.horse_count} caballos</Text>
        </View>
        <View style={[s.planPill, isPro ? s.planPillPro : s.planPillFree]}>
          <Text style={[s.planPillText, isPro ? s.planPillTextPro : s.planPillTextFree]}>
            {isPro ? 'Pro' : 'Gratis'}
          </Text>
        </View>
      </View>
      {isPro && expiresStr && <Text style={s.adminExpires}>Vence: {expiresStr}</Text>}
      {!isPro && (
        <>
          <TouchableOpacity onPress={() => setShowMonths((p) => !p)} style={s.monthsToggle}>
            <Text style={s.monthsToggleText}>Duración: {months} {months === 1 ? 'mes' : 'meses'} ▾</Text>
          </TouchableOpacity>
          {showMonths && (
            <View style={s.monthsGrid}>
              {MONTHS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { setMonths(opt.value); setShowMonths(false); }}
                  style={[s.monthsOption, months === opt.value && s.monthsOptionActive]}
                >
                  <Text style={[s.monthsOptionText, months === opt.value && s.monthsOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity style={s.activateBtn} onPress={() => onActivate(u.id, months)} disabled={isPending} activeOpacity={0.85}>
            {isPending
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={s.activateBtnText}>Activar Pro</Text>
            }
          </TouchableOpacity>
        </>
      )}
      {isPro && (
        <TouchableOpacity
          style={s.revokeBtn}
          onPress={() => Alert.alert('Revocar Pro', `¿Querés quitar el plan Pro a ${u.name}?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Revocar', style: 'destructive', onPress: () => onRevoke(u.id) },
          ])}
          disabled={isPending}
          activeOpacity={0.85}
        >
          <Text style={s.revokeBtnText}>Revocar Pro</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ─── Main Screen ─── */

function EditProfileModal({ visible, user, onClose, c, s }: {
  visible: boolean;
  user: { name: string; email: string };
  onClose: () => void;
  c: ThemeColors; s: Styles;
}) {
  const { updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre no puede estar vacío'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Email inválido'); return; }
    setError('');
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim().toLowerCase() });
      onClose();
    } catch {
      setError('No se pudo actualizar el perfil. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose} />
        <Animated.View style={s.editModalSheet} entering={SlideInDown.springify().damping(26).stiffness(190)}>
          <View style={s.editModalHandle} />
          <Text style={s.editModalTitle}>Editar perfil</Text>
          {error ? <Text style={s.editModalError}>{error}</Text> : null}
          <View style={s.editField}>
            <Text style={s.editLabel}>Nombre</Text>
            <TextInput
              style={s.editInput}
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={c.textFaint}
              autoCapitalize="words"
            />
          </View>
          <View style={s.editField}>
            <Text style={s.editLabel}>Email</Text>
            <TextInput
              style={s.editInput}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor={c.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity
            style={[s.editSaveBtn, saving && s.editSaveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.editSaveBtnText}>Guardar cambios</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={s.editCancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.editCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChangePasswordModal({ visible, onClose, c, s }: { visible: boolean; onClose: () => void; c: ThemeColors; s: Styles }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!current || !newPass || !confirm) { setError('Completá todos los campos'); return; }
    if (newPass.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres'); return; }
    if (newPass !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setError('');
    setSaving(true);
    try {
      await changePassword(current, newPass);
      Alert.alert('Contraseña actualizada', 'Tu contraseña fue cambiada correctamente.');
      setCurrent(''); setNewPass(''); setConfirm('');
      onClose();
    } catch {
      setError('Contraseña actual incorrecta o error del servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose} />
        <Animated.View style={s.editModalSheet} entering={SlideInDown.springify().damping(26).stiffness(190)}>
          <View style={s.editModalHandle} />
          <Text style={s.editModalTitle}>Cambiar contraseña</Text>
          {error ? <Text style={s.editModalError}>{error}</Text> : null}
          {[
            { label: 'Contraseña actual', value: current, setter: setCurrent },
            { label: 'Nueva contraseña', value: newPass, setter: setNewPass },
            { label: 'Confirmar nueva contraseña', value: confirm, setter: setConfirm },
          ].map((f) => (
            <View key={f.label} style={s.editField}>
              <Text style={s.editLabel}>{f.label}</Text>
              <TextInput
                style={s.editInput}
                value={f.value}
                onChangeText={f.setter}
                secureTextEntry
                placeholderTextColor={c.textFaint}
                placeholder="••••••••"
                autoComplete="off"
                textContentType="oneTimeCode"
              />
            </View>
          ))}
          <TouchableOpacity
            style={[s.editSaveBtn, saving && s.editSaveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.editSaveBtnText}>Guardar contraseña</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={s.editCancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.editCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Avatar Color Picker ─── */

function AvatarColorSection({ user, c, s }: {
  user: { name: string; avatar_color?: string | null };
  c: ThemeColors; s: Styles;
}) {
  const { updateProfile } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);
  const current = user.avatar_color ?? null;

  const choose = async (id: string | null) => {
    if (id === current || saving) return;
    haptic.selection();
    setSaving(id ?? 'auto');
    try {
      await updateProfile({ avatar_color: id });
    } catch {
      Alert.alert('Error', 'No se pudo guardar el color. Intentá de nuevo.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Color de avatar</Text>
      <View style={s.colorCard}>
        <View style={s.colorPreviewRow}>
          <View style={[s.colorPreview, { backgroundColor: avatarColor(user.name, current) }]}>
            <Text style={s.colorPreviewText}>{initialsOf(user.name)}</Text>
          </View>
          <Text style={s.colorHint}>Elegí el color con el que aparecés en la app. Así te ven los demás.</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.colorScroll}
        >
          <TouchableOpacity
            onPress={() => choose(null)}
            activeOpacity={0.8}
            style={[s.colorDotWrap, current === null && s.colorDotWrapActive]}
          >
            <View style={[s.colorDot, s.colorDotAuto]}>
              {saving === 'auto'
                ? <ActivityIndicator size="small" color={c.textMuted} />
                : <Text style={s.colorDotAutoText}>Auto</Text>}
            </View>
          </TouchableOpacity>
          {AVATAR_PALETTE.map((p) => {
            const active = current === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => choose(p.id)}
                activeOpacity={0.8}
                style={[s.colorDotWrap, active && s.colorDotWrapActive]}
              >
                <View style={[s.colorDot, { backgroundColor: p.to }]}>
                  {saving === p.id
                    ? <ActivityIndicator size="small" color={colors.white} />
                    : active ? <Check size={16} color={colors.white} strokeWidth={3} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

/* ─── Contacto / WhatsApp ─── */

function ContactSection({ user, c, s }: {
  user: { phone?: string | null; whatsapp_opt_in?: boolean };
  c: ThemeColors; s: Styles;
}) {
  const { updateProfile } = useAuth();
  const [phone, setPhone] = useState(user.phone ?? '');
  const [optIn, setOptIn] = useState(!!user.whatsapp_opt_in);
  const [savingPhone, setSavingPhone] = useState(false);
  const [togglingOptIn, setTogglingOptIn] = useState(false);

  const handleSavePhone = async () => {
    haptic.medium();
    setSavingPhone(true);
    try {
      await updateProfile({ phone: phone.trim() || null });
    } catch {
      Alert.alert('Error', 'No se pudo guardar el teléfono. Intentá de nuevo.');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleToggle = async (next: boolean) => {
    haptic.selection();
    setOptIn(next);
    setTogglingOptIn(true);
    try {
      await updateProfile({ whatsapp_opt_in: next });
    } catch {
      setOptIn(!next); // revertir en caso de error
      Alert.alert('Error', 'No se pudo actualizar la preferencia. Intentá de nuevo.');
    } finally {
      setTogglingOptIn(false);
    }
  };

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Contacto / WhatsApp</Text>
      <View style={s.vetCard}>
        <View style={s.editField}>
          <Text style={s.editLabel}>Teléfono</Text>
          <View style={s.inputWithIcon}>
            <Phone size={17} color={c.textFaint} strokeWidth={2} />
            <TextInput
              style={s.inputWithIconField}
              value={phone}
              onChangeText={setPhone}
              placeholder="+54 9 11 ..."
              placeholderTextColor={c.textFaint}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>
          <Text style={s.fieldHint}>Formato internacional, con código de país.</Text>
        </View>
        <TouchableOpacity
          style={[s.editSaveBtn, savingPhone && s.editSaveBtnDisabled]}
          onPress={handleSavePhone}
          disabled={savingPhone}
          activeOpacity={0.85}
        >
          {savingPhone
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.editSaveBtnText}>Guardar teléfono</Text>}
        </TouchableOpacity>

        <View style={s.whatsappRow}>
          <View style={[s.whatsappIcon, { backgroundColor: 'transparent' }]}>
            <WhatsappLogo size={30} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.accountRowLabel}>Recordatorios por WhatsApp</Text>
            <Text style={s.accountRowSub}>Disponible según tu plan.</Text>
          </View>
          <Switch
            value={optIn}
            onValueChange={handleToggle}
            disabled={togglingOptIn}
            trackColor={{ false: c.borderStrong, true: c.brand }}
            thumbColor={colors.white}
          />
        </View>
      </View>
    </View>
  );
}

/* ─── Matrícula profesional (solo veterinarios) ─── */

type LicenseMeta = { label: string; color: string; bgLight: string; bgDark: string };
const LICENSE_STATUS: Record<string, LicenseMeta> = {
  none:     { label: 'Sin cargar', color: '#9ca3af', bgLight: '#f3f4f6',     bgDark: 'rgba(156,163,175,0.16)' },
  pending:  { label: 'Pendiente',  color: '#d97706', bgLight: '#fffbeb',     bgDark: 'rgba(217,119,6,0.20)' },
  approved: { label: 'Aprobada',   color: '#16a34a', bgLight: '#f0fdf4',     bgDark: 'rgba(34,197,94,0.20)' },
  rejected: { label: 'Rechazada',  color: '#ef4444', bgLight: '#fef2f2',     bgDark: 'rgba(239,68,68,0.20)' },
};

function VetLicenseSection({ user, c, s }: {
  user: { vet_license_number?: string | null; vet_province?: string | null; vet_license_url?: string | null; vet_license_status?: string };
  c: ThemeColors; s: Styles;
}) {
  const { refreshUser } = useAuth();
  const [number, setNumber] = useState(user.vet_license_number ?? '');
  const [province, setProvince] = useState(user.vet_province ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const status = user.vet_license_status ?? 'none';
  const badge = LICENSE_STATUS[status] ?? LICENSE_STATUS.none;

  const pickPhoto = async () => {
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para adjuntar la foto de la matrícula.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!number.trim() || !province.trim()) {
      Alert.alert('Datos incompletos', 'Ingresá el número de matrícula y la provincia.');
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
      Alert.alert('Matrícula enviada', 'Un administrador va a validar tu matrícula.');
    } catch {
      Alert.alert('Error', 'No se pudo enviar la matrícula. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Matrícula profesional</Text>
      <View style={s.vetCard}>
        <View style={s.vetStatusRow}>
          <View style={s.vetStatusIcon}>
            <ShieldCheck size={17} color={c.brand} strokeWidth={2.1} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.vetStatusLabel}>Estado de tu matrícula</Text>
            <Text style={s.vetStatusSub}>Se valida manualmente por un administrador.</Text>
          </View>
          <View style={[s.vetBadge, { backgroundColor: c.isDark ? badge.bgDark : badge.bgLight }]}>
            {status === 'approved'
              ? <Check size={12} color={badge.color} strokeWidth={3.2} />
              : <View style={[s.vetBadgeDot, { backgroundColor: badge.color }]} />}
            <Text style={[s.vetBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={s.editField}>
          <Text style={s.editLabel}>Número de matrícula</Text>
          <TextInput
            style={s.editInput}
            value={number}
            onChangeText={setNumber}
            placeholder="Ej. 12345"
            placeholderTextColor={c.textFaint}
            autoCapitalize="none"
          />
        </View>
        <View style={s.editField}>
          <Text style={s.editLabel}>Provincia</Text>
          <TextInput
            style={s.editInput}
            value={province}
            onChangeText={setProvince}
            placeholder="Ej. Buenos Aires"
            placeholderTextColor={c.textFaint}
            autoCapitalize="words"
          />
        </View>

        {(photoUri || user.vet_license_url) && (
          <View style={s.vetPreviewRow}>
            <Image source={{ uri: photoUri ?? user.vet_license_url ?? undefined }} style={s.vetPreviewImg} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.accountRowLabel}>{photoUri ? 'Nueva foto seleccionada' : 'Foto cargada'}</Text>
              <Text style={s.accountRowSub}>{photoUri ? 'Se enviará al validar.' : 'Ya guardada en tu perfil.'}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={s.vetPhotoBtn} onPress={pickPhoto} activeOpacity={0.8}>
          <Camera size={16} color={c.text} strokeWidth={2} />
          <Text style={s.vetPhotoBtnText}>
            {photoUri ? 'Cambiar foto' : user.vet_license_url ? 'Cambiar foto' : 'Subir foto de la matrícula'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.editSaveBtn, saving && s.editSaveBtnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.editSaveBtnText}>Enviar para validación</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: planStatus } = usePlanStatus();
  const { data: adminUsers, isLoading: loadingAdminUsers } = useAdminPlanUsers(user?.role === 'admin');
  const setPlan = useAdminSetPlan();
  const [adminSearch, setAdminSearch] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!user) return null;

  const initials = initialsOf(user.name);
  const isAdmin = user.role === 'admin';
  const showPlan = user.role === 'propietario' || user.role === 'establecimiento';

  const filteredAdminUsers = adminUsers?.filter((u) =>
    adminSearch
      ? u.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(adminSearch.toLowerCase())
      : true,
  );

  const handleLogout = () => {
    // En web (preview), Alert.alert no ejecuta los botones — usamos confirm del navegador.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('¿Querés cerrar tu sesión?')) logout();
      return;
    }
    Alert.alert('Cerrar sesión', '¿Querés cerrar tu sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: space[10] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={[s.avatar, { backgroundColor: avatarColor(user.name, user.avatar_color) }]}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.userNameRow}>
            <Text style={s.userName}>{user.name}</Text>
            {isVetVerified(user) && <VetVerifiedBadge size="md" />}
          </View>
          <Text style={s.userEmail}>{user.email}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleText}>{ROLE_LABELS[user.role] ?? user.role}</Text>
          </View>
        </View>

        <View style={s.sheet}>
          {/* Plan */}
          {showPlan && planStatus && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Mi plan</Text>
              <PlanCard
                plan={planStatus.plan}
                horseCount={planStatus.horse_count}
                horseLimit={planStatus.horse_limit}
                isLimited={planStatus.is_limited}
                c={c}
                s={s}
              />
            </View>
          )}

          {/* Gestión de planes (solo admin) */}
          {isAdmin && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Gestión de planes</Text>
              <Text style={s.sectionSubtitle}>Activá o revocá el plan Pro para propietarios y establecimientos.</Text>
              <TextInput
                style={s.searchInput}
                value={adminSearch}
                onChangeText={setAdminSearch}
                placeholder="Buscar por nombre o email..."
                placeholderTextColor={c.textFaint}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {loadingAdminUsers ? (
                <ActivityIndicator size="small" color={c.brand} style={{ marginTop: space[3] }} />
              ) : !filteredAdminUsers?.length ? (
                <Text style={s.emptyText}>No hay usuarios registrados.</Text>
              ) : (
                <View style={{ gap: space[3] }}>
                  {filteredAdminUsers.map((u, index) => (
                    <Animated.View key={u.id} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                      <AdminUserRow
                        u={u}
                        onActivate={(userId, months) => setPlan.mutate({ userId, plan: 'pro', months })}
                        onRevoke={(userId) => setPlan.mutate({ userId, plan: 'free' })}
                        isPending={setPlan.isPending}
                        c={c}
                        s={s}
                      />
                    </Animated.View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Account settings */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Mi cuenta</Text>
            <View style={s.accountCard}>
              <TouchableOpacity
                style={s.accountRow}
                onPress={() => setShowEditProfile(true)}
                activeOpacity={0.8}
              >
                <User size={18} color={c.text} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={s.accountRowLabel}>Editar datos personales</Text>
                  <Text style={s.accountRowSub}>{user.name} · {user.email}</Text>
                </View>
                <ChevronRight size={16} color={c.textFaint} strokeWidth={2} />
              </TouchableOpacity>
              <View style={s.accountDivider} />
              <TouchableOpacity
                style={s.accountRow}
                onPress={() => setShowChangePassword(true)}
                activeOpacity={0.8}
              >
                <Lock size={18} color={c.text} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={s.accountRowLabel}>Cambiar contraseña</Text>
                </View>
                <ChevronRight size={16} color={c.textFaint} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Contacto / WhatsApp */}
          <ContactSection user={user} c={c} s={s} />

          {/* Matrícula profesional (solo veterinarios) */}
          {user.role === 'veterinario' && <VetLicenseSection user={user} c={c} s={s} />}

          {/* Color de avatar */}
          <AvatarColorSection user={user} c={c} s={s} />

          {/* Logout */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <LogOut size={18} color={colors.red500} strokeWidth={2} />
            <Text style={s.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>

      {user && (
        <>
          <EditProfileModal
            visible={showEditProfile}
            user={user}
            onClose={() => setShowEditProfile(false)}
            c={c}
            s={s}
          />
          <ChangePasswordModal
            visible={showChangePassword}
            onClose={() => setShowChangePassword(false)}
            c={c}
            s={s}
          />
        </>
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  hero: {
    alignItems: 'center',
    gap: space[1] + 2,
    backgroundColor: c.brand,
    paddingBottom: space[10],
    paddingTop: space[5],
    paddingHorizontal: space[5],
  },
  sheet: {
    backgroundColor: c.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: space[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  avatar: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: text.xl, fontWeight: weight.extrabold, color: colors.white },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: text.base, fontWeight: weight.extrabold, color: colors.white },
  userEmail: { fontSize: text.sm, color: 'rgba(255,255,255,0.55)' },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full,
    paddingHorizontal: space[3], paddingVertical: space[1],
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  roleText: { fontSize: 10, fontWeight: weight.bold, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.5 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space[1] + 2, paddingVertical: space[3],
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: c.brand },
  tabLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint },
  tabLabelActive: { color: c.brand },

  /* My posts */
  postsList: { padding: space[4], gap: space[3] },
  postCard: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: c.border,
    overflow: 'hidden',
    ...shadow.sm,
  },
  postThumb: { width: '100%', height: 160 },
  postBody: { padding: space[3], gap: space[1] + 2 },
  postContent: { fontSize: text.sm, color: c.text, lineHeight: 20 },
  postHorse: { fontSize: text.xs, color: c.textMuted },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[1] },
  postStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postStatText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  postTime: { fontSize: text.xs, color: c.textFaint, marginLeft: 'auto' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyActivity: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[2], paddingHorizontal: space[8], paddingTop: 60 },
  emptyActivityTitle: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  emptyActivitySub: { fontSize: text.sm, color: c.textFaint, textAlign: 'center', lineHeight: 20 },

  section: { gap: space[2] + 2, paddingHorizontal: space[5], marginTop: space[5] },
  sectionTitle: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  sectionSubtitle: { fontSize: text.sm, color: c.textMuted },
  emptyText: { fontSize: text.sm, color: c.textFaint },
  searchInput: {
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: c.text, backgroundColor: c.surfaceAlt,
  },

  // Plan Pro (gradiente premium)
  planPro: { borderRadius: radius.xl, padding: space[4] + 2, overflow: 'hidden' },
  planProTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[2] },
  planProBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e8c787', borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: 3 },
  planProBadgeText: { fontSize: text.xs, fontWeight: weight.bold, color: '#241910', letterSpacing: 1 },
  planProTitle: { fontSize: text.lg, fontWeight: weight.bold, color: colors.white },
  planProSub: { fontSize: text.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  // Plan Free
  planFree: { backgroundColor: c.surface, borderRadius: radius.xl, padding: space[4], gap: space[2], borderWidth: 1, borderColor: c.border },
  planFreeBadge: { backgroundColor: c.surfaceAlt, borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: space[1] },
  planFreeBadgeText: { fontSize: text.xs, fontWeight: weight.bold, color: c.textMuted },
  planFreeUsage: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  progressTrack: { height: 6, backgroundColor: c.surfaceAlt, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },
  planFreeMsg: { fontSize: text.xs, color: c.textFaint },

  adminRow: {
    backgroundColor: c.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: c.borderStrong,
    padding: space[4], gap: space[2] + 2,
  },
  adminRowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  adminRowName: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  adminRowEmail: { fontSize: text.xs, color: c.textMuted, marginTop: 2 },
  adminRowMeta: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },
  adminExpires: { fontSize: text.xs, color: c.textFaint },
  planPill: { borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: space[1] },
  planPillFree: { backgroundColor: c.surfaceAlt },
  planPillPro: { backgroundColor: colors.amber50 },
  planPillText: { fontSize: text.xs, fontWeight: weight.bold },
  planPillTextFree: { color: c.textMuted },
  planPillTextPro: { color: colors.amber600 },
  monthsToggle: {
    borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong,
    paddingHorizontal: space[3], paddingVertical: space[2], backgroundColor: c.surfaceAlt,
  },
  monthsToggleText: { fontSize: text.sm, color: c.text },
  monthsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  monthsOption: {
    borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong,
    paddingHorizontal: space[3], paddingVertical: space[2], backgroundColor: c.surface,
  },
  monthsOptionActive: { borderColor: c.brand, backgroundColor: '#eff6ff' },
  monthsOptionText: { fontSize: text.sm, color: c.textMuted },
  monthsOptionTextActive: { color: c.brand, fontWeight: weight.semibold },
  activateBtn: { backgroundColor: colors.amber600, borderRadius: radius.md, paddingVertical: space[3], alignItems: 'center' },
  activateBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  revokeBtn: {
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: radius.md,
    paddingVertical: space[3], alignItems: 'center', backgroundColor: c.surfaceAlt,
  },
  revokeBtnText: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
    backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.borderStrong,
    paddingVertical: space[3] + 2, marginHorizontal: space[4], marginTop: space[5],
  },
  logoutText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.red500 },

  accountCard: {
    backgroundColor: c.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: c.borderStrong, overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingHorizontal: space[4], paddingVertical: space[4],
  },
  accountRowLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  accountRowSub: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },
  accountDivider: { height: 1, backgroundColor: c.border, marginHorizontal: space[4] },

  colorCard: {
    backgroundColor: c.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: c.borderStrong,
    padding: space[4], gap: space[4],
  },
  colorPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  colorPreview: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  colorPreviewText: { fontSize: text.lg, fontWeight: weight.extrabold, color: colors.white },
  colorHint: { flex: 1, fontSize: text.xs, color: c.textFaint, lineHeight: 16 },
  colorScroll: { gap: space[2] + 2, paddingVertical: space[1], paddingRight: space[2] },
  colorDotWrap: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  colorDotWrapActive: { borderColor: c.brand },
  colorDot: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  colorDotAuto: { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.borderStrong },
  colorDotAutoText: { fontSize: 10, fontWeight: weight.bold, color: c.textMuted },

  vetCard: {
    backgroundColor: c.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: c.borderStrong,
    padding: space[4], gap: space[3],
  },
  vetStatusRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space[3],
  },
  vetStatusIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center',
  },
  vetStatusLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  vetStatusSub: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },
  vetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: space[1] + 1,
  },
  vetBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  vetBadgeText: { fontSize: text.xs, fontWeight: weight.bold },
  vetPreviewRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space[2],
  },
  vetPreviewImg: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: c.border },
  vetPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: radius.md,
    paddingVertical: space[3], backgroundColor: c.surfaceAlt,
  },
  vetPhotoBtnText: { fontSize: text.sm, fontWeight: weight.medium, color: c.text },

  /* Input con ícono (teléfono) */
  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: radius.lg,
    paddingHorizontal: 14, backgroundColor: c.surfaceAlt,
  },
  inputWithIconField: { flex: 1, paddingVertical: 12, fontSize: 14, color: c.text },
  fieldHint: { fontSize: text.xs, color: c.textFaint },

  whatsappRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderTopWidth: 1, borderTopColor: c.border, paddingTop: space[3], marginTop: space[1],
  },
  whatsappIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: 'rgba(22,163,74,0.12)', alignItems: 'center', justifyContent: 'center',
  },

  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: c.overlay,
  },
  editModalSheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: space[6], paddingBottom: space[8],
    gap: space[3],
    marginTop: 'auto',
  },
  editModalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong,
    alignSelf: 'center', marginBottom: space[2],
  },
  editModalTitle: { fontSize: text.lg, fontWeight: weight.bold, color: c.text },
  editModalError: { fontSize: text.sm, color: colors.red700, backgroundColor: '#fef2f2', padding: space[3], borderRadius: radius.md },
  editField: { gap: space[1] + 2 },
  editLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  editInput: {
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: c.text, backgroundColor: c.surfaceAlt,
  },
  editSaveBtn: {
    backgroundColor: c.brand, borderRadius: radius.lg,
    paddingVertical: space[4], alignItems: 'center', marginTop: space[2],
  },
  editSaveBtnDisabled: { opacity: 0.6 },
  editSaveBtnText: { fontSize: text.base, fontWeight: weight.bold, color: colors.white },
  editCancelBtn: { alignItems: 'center', paddingVertical: space[2] },
  editCancelText: { fontSize: text.sm, color: c.textFaint, fontWeight: weight.medium },
});
