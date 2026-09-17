import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';

import { useAuth } from '../../../lib/auth';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../styles/tokens';
import { useCommonStyles } from '../../../styles/common';

/** Editar datos personales — pantalla empujada, patrón Ajustes de iOS. */
export default function EditarPerfilScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { input: inputStyle } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
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
      <ScreenHeader showBack title="Editar perfil" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <TextInput
          style={inputStyle.base}
          value={name}
          onChangeText={setName}
          placeholder="Nombre"
          placeholderTextColor={c.textFaint}
          autoCapitalize="words"
          textContentType="name"
          returnKeyType="next"
        />
        <TextInput
          style={inputStyle.base}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={c.textFaint}
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          returnKeyType="go"
          onSubmitEditing={handleSave}
        />
        {error ? <Text style={s.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Un solo CTA: el cuero vive acá y en ningún otro lado */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={handleSave}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Guardar cambios del perfil"
        >
          {saving
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.submitBtnText}>Guardar cambios</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[8], gap: space[5] },
  errorText: { fontSize: text.sm, color: colors.red500 },
  footer: { paddingHorizontal: space[4], paddingTop: space[3] },
  submitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.brand, alignItems: 'center' },
  submitBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: colors.white },
});
