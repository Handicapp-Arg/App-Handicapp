import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Switch,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useState, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone } from 'lucide-react-native';
import { WhatsappLogo } from '../../../components/icons/WhatsappLogo';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { useCommonStyles } from '../../../styles/common';
import { entradaFila } from '../../../styles/motion';
import { space, text, radius, weight, touch } from '../../../styles/tokens';
import { useToast } from '../../../components/Toast';
import { ScreenHeader } from '../../../components/ScreenHeader';

export default function ContactoScreen() {
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { button, typography } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const toast = useToast();

  const [phone, setPhone] = useState(user?.phone ?? '');
  const [focus, setFocus] = useState(false);
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
      <ScreenHeader showBack title="Contacto y avisos" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Animated.View entering={entradaFila(0)} style={s.bloque}>
          <Text style={typography.sectionEyebrow}>Dónde te ubicamos</Text>
          {/* Campo con ícono adentro: el relleno hace de borde, como en el
              resto de los formularios del sistema. */}
          <View style={[s.campo, focus && s.campoFoco]}>
            <Phone size={19} color={c.textFaint} strokeWidth={1.9} />
            <TextInput
              style={s.campoInput}
              value={phone}
              onChangeText={setPhone}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              placeholder="+54 9 11 5555 1234"
              placeholderTextColor={c.textFaint}
              keyboardType="phone-pad"
              autoCapitalize="none"
              textContentType="telephoneNumber"
              returnKeyType="done"
              onSubmitEditing={handleSavePhone}
            />
          </View>
          <Text style={s.hint}>Formato internacional, con código de país.</Text>
        </Animated.View>

        <Animated.View entering={entradaFila(1)} style={s.bloque}>
          <Text style={typography.sectionEyebrow}>Por dónde te avisamos</Text>
          {/* Solo WhatsApp: es el único canal que el perfil guarda hoy
              (`whatsapp_opt_in`). Push y correo no tienen preferencia por
              usuario en el back, así que no los dibujamos. */}
          <View style={s.toggleRow}>
            <View style={s.toggleIcon}>
              <WhatsappLogo size={28} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.toggleTitulo}>Por WhatsApp</Text>
              <Text style={s.toggleSub}>Vencimientos y turnos. Según tu plan.</Text>
            </View>
            <Switch
              value={optIn}
              onValueChange={handleToggle}
              disabled={togglingOptIn}
              trackColor={{ false: c.borderStrong, true: c.brand }}
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Un solo CTA: el verde vive acá y en ningún otro lado */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <TouchableOpacity
          style={[button.primary, savingPhone && { opacity: 0.6 }]}
          onPress={handleSavePhone}
          disabled={savingPhone}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Guardar teléfono"
        >
          {savingPhone
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={button.primaryText}>Guardar</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: space[8] },
  bloque: { gap: space[3], marginBottom: space[6] },

  campo: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    height: touch.field, paddingHorizontal: space[4],
    borderRadius: radius.field, backgroundColor: c.surfaceAlt,
    borderWidth: 2, borderColor: 'transparent',
  },
  campoFoco: { borderColor: c.brand },
  campoInput: { flex: 1, fontSize: text.md, color: c.text },
  hint: { fontSize: text.xs, color: c.textFaint, marginTop: -space[1] },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3] + 1,
    paddingVertical: space[3] + 2,
  },
  toggleIcon: {
    width: 40, height: 40, borderRadius: radius.thumb,
    backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  toggleTitulo: { fontSize: text.md, fontWeight: weight.medium, color: c.text },
  toggleSub: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },

  footer: { paddingHorizontal: space[5], paddingTop: space[3] },
});
