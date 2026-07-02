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
import { space, text, radius, weight } from '../styles/tokens';

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
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.iconWrap}>
            <KeyRound size={30} color={c.brand} strokeWidth={2} />
          </View>
          <Text style={s.lead}>
            Ingresá el código que te compartió la caballeriza. El administrador recibirá tu solicitud y te asignará un rol.
          </Text>

          <Text style={s.fieldLabel}>Código *</Text>
          <TextInput
            style={s.input}
            value={code}
            onChangeText={setCode}
            placeholder="Ej. ABC123"
            placeholderTextColor={c.textFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
          />

          <Text style={[s.fieldLabel, { marginTop: space[4] }]}>Mensaje (opcional)</Text>
          <TextInput
            style={[s.input, s.inputMultiline]}
            value={message}
            onChangeText={setMessage}
            placeholder="Presentate o contá quién sos…"
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
  lead: { fontSize: text.sm, color: c.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: space[5] },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text, marginBottom: space[2] },
  input: {
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: radius.md,
    paddingHorizontal: space[4], paddingVertical: space[3],
    fontSize: text.base, color: c.text, backgroundColor: c.surface,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  btn: { borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: space[6] },
  btnPrimary: { backgroundColor: c.brand },
  btnPrimaryText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
});
