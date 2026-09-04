import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Switch,
} from 'react-native';
import { useState, useMemo } from 'react';
import { Phone } from 'lucide-react-native';
import { WhatsappLogo } from '../../../components/icons/WhatsappLogo';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight } from '../../../styles/tokens';
import { useToast } from '../../../components/Toast';
import { ScreenHeader } from '../../../components/ScreenHeader';

export default function ContactoScreen() {
  const { user, updateProfile } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const toast = useToast();

  const [phone, setPhone] = useState(user?.phone ?? '');
  const [optIn, setOptIn] = useState(!!user?.whatsapp_opt_in);
  const [savingPhone, setSavingPhone] = useState(false);
  const [togglingOptIn, setTogglingOptIn] = useState(false);

  if (!user) return null;

  const handleSavePhone = async () => {
    haptic.medium();
    setSavingPhone(true);
    try {
      await updateProfile({ phone: phone.trim() || null });
      toast.success('Teléfono guardado');
    } catch {
      toast.error('No se pudo guardar el teléfono. Intentá de nuevo.');
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
      toast.error('No se pudo actualizar la preferencia. Intentá de nuevo.');
    } finally {
      setTogglingOptIn(false);
    }
  };

  return (
    <View style={s.root}>
      <ScreenHeader showBack title="Contacto y WhatsApp" />
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
            <View style={s.field}>
              <Text style={s.fieldLabel}>Teléfono</Text>
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
                  textContentType="telephoneNumber"
                  returnKeyType="done"
                  onSubmitEditing={handleSavePhone}
                />
              </View>
              <Text style={s.fieldHint}>Formato internacional, con código de país.</Text>
            </View>
            <TouchableOpacity
              style={[s.saveBtn, savingPhone && s.saveBtnDisabled]}
              onPress={handleSavePhone}
              disabled={savingPhone}
              activeOpacity={0.85}
            >
              {savingPhone
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={s.saveBtnText}>Guardar teléfono</Text>}
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
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  section: { paddingHorizontal: space[5], marginTop: space[5] },
  card: { gap: space[3] },

  accountRowLabel: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  accountRowSub: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },

  field: { gap: space[1] + 2 },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  fieldHint: { fontSize: text.xs, color: c.textFaint },

  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    borderWidth: 1, borderColor: 'transparent', borderRadius: radius.lg,
    paddingHorizontal: space[4], backgroundColor: c.isDark ? c.surfaceAlt : '#f2f0eb',
  },
  inputWithIconField: { flex: 1, paddingVertical: space[3], fontSize: text.base, color: c.text },

  saveBtn: {
    backgroundColor: c.brand, borderRadius: radius.lg,
    paddingVertical: space[4], alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: text.base, fontWeight: weight.bold, color: colors.white },

  whatsappRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderTopWidth: 1, borderTopColor: c.border, paddingTop: space[3], marginTop: space[1],
  },
  whatsappIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: c.successSoft, alignItems: 'center', justifyContent: 'center',
  },
});
