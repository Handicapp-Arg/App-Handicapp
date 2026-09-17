import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';

import { useAuth } from '../../../lib/auth';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useToast } from '../../../components/Toast';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../styles/tokens';
import { useCommonStyles } from '../../../styles/common';

/** Cambiar contraseña — pantalla empujada, patrón Ajustes de iOS. */
export default function CambiarContrasenaScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { input: inputStyle } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const { changePassword } = useAuth();
  const toast = useToast();

  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Al guardar con éxito salimos con back: el guardia de descarte no debe interceptar.
  const guardado = useRef(false);

  const isDirty = !!current || !!newPass || !!confirm;
  const canSubmit = !!current && !!newPass && !!confirm && !saving;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as never, (e: any) => {
      if (!isDirty || guardado.current) return;
      e.preventDefault();
      Alert.alert('¿Descartar cambios?', 'Vas a perder lo que escribiste.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  const handleSave = async () => {
    if (!current || !newPass || !confirm) { setError('Completá todos los campos'); haptic.error(); return; }
    if (newPass.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres'); haptic.error(); return; }
    if (newPass !== confirm) { setError('Las contraseñas no coinciden'); haptic.error(); return; }
    setError('');
    setSaving(true);
    try {
      await changePassword(current, newPass);
      haptic.success();
      toast.success('Contraseña actualizada');
      guardado.current = true;
      router.back();
    } catch {
      haptic.error();
      setError('Contraseña actual incorrecta o error del servidor.');
    } finally {
      setSaving(false);
    }
  };

  const campos = [
    { key: 'actual', placeholder: 'Contraseña actual', value: current, setter: setCurrent, textContentType: 'password' as const },
    { key: 'nueva', placeholder: 'Nueva contraseña', value: newPass, setter: setNewPass, textContentType: 'newPassword' as const },
    { key: 'confirmar', placeholder: 'Confirmar nueva contraseña', value: confirm, setter: setConfirm, textContentType: 'newPassword' as const },
  ];

  return (
    <View style={s.root}>
      <ScreenHeader showBack title="Cambiar contraseña" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {campos.map((f, i) => (
          <TextInput
            key={f.key}
            style={inputStyle.base}
            value={f.value}
            onChangeText={f.setter}
            secureTextEntry
            placeholder={f.placeholder}
            placeholderTextColor={c.textFaint}
            autoComplete="off"
            textContentType={f.textContentType}
            returnKeyType={i === campos.length - 1 ? 'go' : 'next'}
            onSubmitEditing={i === campos.length - 1 ? handleSave : undefined}
          />
        ))}
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
          accessibilityLabel="Guardar contraseña"
        >
          {saving
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.submitBtnText}>Guardar contraseña</Text>
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
