import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { User, ChevronRight, Lock, Check } from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { AVATAR_PALETTE } from '../../../lib/avatar-color';
import { Avatar } from '../../../components/Avatar';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight } from '../../../styles/tokens';
import { useToast } from '../../../components/Toast';
import { FormSheet } from '../../../components/FormSheet';
import { ScreenHeader } from '../../../components/ScreenHeader';

/* ─── Editar datos personales ─── */

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

  // El FormSheet ya no se destruye al cerrarse: limpiamos el formulario al abrir.
  useEffect(() => {
    if (!visible) return;
    setName(user.name); setEmail(user.email); setError('');
  }, [visible, user.name, user.email]);

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
    <FormSheet
      visible={visible}
      onClose={onClose}
      title="Editar perfil"
      footer={
        <>
          <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, { flex: 1 }, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.saveBtnText}>Guardar cambios</Text>
            }
          </TouchableOpacity>
        </>
      }
    >
      <>
        {error ? <Text style={s.modalError}>{error}</Text> : null}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Nombre</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            placeholderTextColor={c.textFaint}
            autoCapitalize="words"
            textContentType="name"
            returnKeyType="next"
          />
        </View>
        <View style={s.field}>
          <Text style={s.fieldLabel}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            placeholderTextColor={c.textFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={handleSave}
          />
        </View>
      </>
    </FormSheet>
  );
}

/* ─── Cambiar contraseña ─── */

function ChangePasswordModal({ visible, onClose, c, s }: { visible: boolean; onClose: () => void; c: ThemeColors; s: Styles }) {
  const { changePassword } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // El FormSheet ya no se destruye al cerrarse: limpiamos el formulario al abrir.
  useEffect(() => {
    if (!visible) return;
    setCurrent(''); setNewPass(''); setConfirm(''); setError('');
  }, [visible]);

  const handleSave = async () => {
    if (!current || !newPass || !confirm) { setError('Completá todos los campos'); return; }
    if (newPass.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres'); return; }
    if (newPass !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setError('');
    setSaving(true);
    try {
      await changePassword(current, newPass);
      toast.success('Contraseña actualizada');
      onClose();
    } catch {
      setError('Contraseña actual incorrecta o error del servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title="Cambiar contraseña"
      footer={
        <>
          <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, { flex: 1 }, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.saveBtnText}>Guardar contraseña</Text>
            }
          </TouchableOpacity>
        </>
      }
    >
      <>
        {error ? <Text style={s.modalError}>{error}</Text> : null}
        {[
          { label: 'Contraseña actual', value: current, setter: setCurrent, textContentType: 'password' as const },
          { label: 'Nueva contraseña', value: newPass, setter: setNewPass, textContentType: 'newPassword' as const },
          { label: 'Confirmar nueva contraseña', value: confirm, setter: setConfirm, textContentType: 'newPassword' as const },
        ].map((f) => (
          <View key={f.label} style={s.field}>
            <Text style={s.fieldLabel}>{f.label}</Text>
            <TextInput
              style={s.input}
              value={f.value}
              onChangeText={f.setter}
              secureTextEntry
              placeholderTextColor={c.textFaint}
              placeholder="••••••••"
              autoComplete="off"
              textContentType={f.textContentType}
            />
          </View>
        ))}
      </>
    </FormSheet>
  );
}

/* ─── Color de avatar ─── */

function AvatarColorSection({ user, c, s }: {
  user: { name: string; avatar_color?: string | null };
  c: ThemeColors; s: Styles;
}) {
  const { updateProfile } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const current = user.avatar_color ?? null;

  const choose = async (id: string | null) => {
    if (id === current || saving) return;
    haptic.selection();
    setSaving(id ?? 'auto');
    try {
      await updateProfile({ avatar_color: id });
      toast.success('Color actualizado');
    } catch {
      toast.error('No se pudo guardar el color. Intentá de nuevo.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Color de avatar</Text>
      <View style={s.colorCard}>
        <View style={s.colorPreviewRow}>
          <Avatar name={user.name} avatarColor={current} size={56} />
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
            accessibilityRole="button"
            accessibilityLabel={current === null ? 'Color automático, seleccionado' : 'Elegir color automático'}
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
                accessibilityRole="button"
                accessibilityLabel={active ? `Color ${p.id}, seleccionado` : `Elegir color ${p.id}`}
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

/* ─── Main ─── */

export default function CuentaScreen() {
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!user) return null;

  return (
    <View style={s.root}>
      <ScreenHeader showBack title="Mi cuenta" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.section}>
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

        <AvatarColorSection user={user} c={c} s={s} />
      </ScrollView>

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
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  section: { gap: space[2] + 2, paddingHorizontal: space[5], marginTop: space[5] },
  sectionTitle: { fontSize: text.base, fontWeight: weight.bold, color: c.text },

  accountRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: 52, paddingVertical: space[2] + 2,
  },
  accountRowLabel: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  accountRowSub: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },
  accountDivider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border },

  colorCard: { gap: space[4] },
  colorPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
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
  colorDotAuto: { backgroundColor: c.surfaceAlt },
  colorDotAutoText: { fontSize: 10, fontWeight: weight.bold, color: c.textMuted },

  modalError: { fontSize: text.sm, color: c.danger, backgroundColor: c.dangerSoft, padding: space[3], borderRadius: radius.md },
  field: { gap: space[1] + 2 },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  input: {
    borderWidth: 1, borderColor: 'transparent', borderRadius: radius.lg,
    paddingHorizontal: space[4], paddingVertical: space[3],
    fontSize: text.base, color: c.text, backgroundColor: c.isDark ? c.surfaceAlt : '#f2f0eb',
  },
  saveBtn: {
    backgroundColor: c.brand, borderRadius: radius.lg,
    paddingVertical: space[4], alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: text.base, fontWeight: weight.bold, color: colors.white },
  cancelBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: space[4],
    borderRadius: radius.lg, backgroundColor: c.surfaceAlt,
  },
  cancelText: { fontSize: text.base, color: c.textMuted, fontWeight: weight.semibold },
});
