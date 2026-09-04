import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { Routes } from '../lib/routes';
import { useToast } from '../components/Toast';
import { useRequestJoin } from '../hooks/use-organizations';
import { haptic } from '../lib/haptics';
import { colors } from '../lib/colors';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight, touch } from '../styles/tokens';

export default function UnirmeScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);
  const requestJoin = useRequestJoin();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  const canSubmit = code.trim().length > 0 && !requestJoin.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    haptic.light();
    requestJoin.mutate(
      { join_code: code.trim(), message: message.trim() || undefined },
      {
        onSuccess: () => {
          haptic.success();
          toast.success('Solicitud enviada');
          router.back();
        },
        onError: () => {
          haptic.error();
          toast.error('No se pudo enviar. Verificá el código.');
        },
      },
    );
  };

  return (
    <View style={s.root}>
      <ScreenHeader title="Unirme a una caballeriza" showBack backTo={Routes.mas} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          <View style={s.iconWrap}>
            <KeyRound size={30} color={c.brand} strokeWidth={2} />
          </View>
          <Text style={s.lead}>
            Ingresá el código que te compartió la caballeriza. El administrador recibirá tu solicitud y te asignará un rol.
          </Text>

          <TextInput
            style={s.input}
            value={code}
            onChangeText={setCode}
            placeholder="Código *, ej. ABC123"
            placeholderTextColor={c.textFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
          />

          <TextInput
            style={[s.input, s.inputMultiline, { marginTop: space[4] }]}
            value={message}
            onChangeText={setMessage}
            placeholder="Mensaje (opcional): presentate o contá quién sos…"
            placeholderTextColor={c.textFaint}
            multiline
          />

          <TouchableOpacity
            style={[s.btn, s.btnPrimary, !canSubmit && { opacity: 0.5 }]}
            disabled={!canSubmit}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            {requestJoin.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.btnPrimaryText}>Enviar solicitud</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  content: { padding: space[4], paddingBottom: space[10] },
  iconWrap: {
    alignSelf: 'center', width: 64, height: 64, borderRadius: 32,
    backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center',
    marginTop: space[4], marginBottom: space[4],
  },
  lead: { fontSize: text.base, color: c.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: space[5] },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text, marginBottom: space[2] },
  input: {
    height: touch.field,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    fontSize: text.base, color: c.text, backgroundColor: c.isDark ? c.surfaceAlt : '#f2f0eb',
  },
  inputMultiline: { height: undefined, minHeight: 88, paddingVertical: space[3], textAlignVertical: 'top' },
  btn: { borderRadius: radius.md, height: touch.button, alignItems: 'center', justifyContent: 'center', marginTop: space[6] },
  btnPrimary: { backgroundColor: c.brand },
  btnPrimaryText: { fontSize: text.md, fontWeight: weight.bold, color: colors.white },
});
