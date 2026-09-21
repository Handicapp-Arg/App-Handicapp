import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';

import { useAuth } from '../../../lib/auth';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Avatar } from '../../../components/Avatar';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { useCommonStyles } from '../../../styles/common';
import { entradaFila } from '../../../styles/motion';
import { space, text } from '../../../styles/tokens';

/** Editar datos personales — pantalla empujada, patrón Ajustes de iOS. */
export default function EditarPerfilScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { input: inputStyle, button, typography } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [focus, setFocus] = useState<'name' | 'email' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Al guardar con éxito salimos con back: el guardia de descarte no debe interceptar.
  const guardado = useRef(false);

  const isDirty = !!user && (name !== user.name || email !== user.email);
  const canSubmit = isDirty && !saving;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as never, (e: any) => {
      if (!isDirty || guardado.current) return;
      e.preventDefault();
      Alert.alert('¿Descartar cambios?', 'Vas a perder lo que editaste.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre no puede estar vacío'); haptic.error(); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Email inválido'); haptic.error(); return; }
    setError('');
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim().toLowerCase() });
      haptic.success();
      guardado.current = true;
      router.back();
    } catch {
      haptic.error();
      setError('No se pudo actualizar el perfil. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <View style={s.root}>
      <ScreenHeader showBack title="Mis datos" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* El avatar acompaña lo que se está tipeando (las iniciales cambian
            con el nombre). La foto no se sube: el back solo guarda el color,
            que se elige en la pantalla anterior. */}
        <Animated.View entering={entradaFila(0)} style={s.avatarRow}>
          <Avatar name={name || user.name} avatarColor={user.avatar_color} size={74} />
          <Text style={s.avatarHint}>Tus iniciales y tu color son cómo te ve el resto.</Text>
        </Animated.View>

        <Animated.View entering={entradaFila(1)} style={s.campos}>
          <Text style={typography.sectionEyebrow}>Quién sos</Text>
          <TextInput
            style={[inputStyle.base, focus === 'name' && inputStyle.focused]}
            value={name}
            onChangeText={setName}
            onFocus={() => setFocus('name')}
            onBlur={() => setFocus(null)}
            placeholder="Nombre"
            placeholderTextColor={c.textFaint}
            autoCapitalize="words"
            textContentType="name"
            returnKeyType="next"
          />
          <TextInput
            style={[inputStyle.base, focus === 'email' && inputStyle.focused]}
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocus('email')}
            onBlur={() => setFocus(null)}
            placeholder="Email"
            placeholderTextColor={c.textFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={handleSave}
          />
          {error ? <Text style={s.errorText}>{error}</Text> : null}
        </Animated.View>
      </ScrollView>

      {/* Un solo CTA: el verde vive acá y en ningún otro lado */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <TouchableOpacity
          style={[button.primary, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={handleSave}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Guardar cambios del perfil"
        >
          {saving
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={button.primaryText}>Guardar</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: space[8] },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  avatarHint: { flex: 1, fontSize: text.sm, color: c.textMuted, lineHeight: 20 },
  campos: { marginTop: space[7], gap: space[3] },
  errorText: { fontSize: text.sm, color: c.danger },
  footer: { paddingHorizontal: space[5], paddingTop: space[3] },
});
