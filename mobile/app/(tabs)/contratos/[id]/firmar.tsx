import { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContracts, useSignContract } from '../../../../hooks/use-contracts';
import { useAuth } from '../../../../lib/auth';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { Spinner } from '../../../../components/Spinner';
import { PressableScale } from '../../../../components/PressableScale';
import { haptic } from '../../../../lib/haptics';
import { colors } from '../../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../../styles/tokens';
import { useToast } from '../../../../components/Toast';

export default function FirmarContratoScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: contracts, isLoading } = useContracts();
  const signContract = useSignContract();
  const toast = useToast();

  const contract = contracts?.find((ct) => ct.id === id) ?? null;

  const [signedName, setSignedName] = useState(user?.name ?? '');
  const signatureRef = useRef<SignatureViewRef>(null);

  const submitSignature = async (signature: string) => {
    if (!contract) return;
    if (!signature || signature === 'data:,') {
      Alert.alert('Firma requerida', 'Dibujá tu firma en el recuadro antes de confirmar.');
      return;
    }
    try {
      await signContract.mutateAsync({ id: contract.id, signature, signed_name: signedName.trim() });
      haptic.success();
      toast.success('Contrato firmado');
      router.back();
    } catch {
      haptic.error();
      toast.error('No se pudo firmar el contrato. Intentá de nuevo.');
    }
  };

  const signatureWebStyle = useMemo(() => `
    .m-signature-pad { box-shadow: none; border: none; margin: 0; background-color: ${c.surfaceAlt}; }
    .m-signature-pad--body { border: none; }
    .m-signature-pad--body canvas { background-color: ${c.surfaceAlt}; }
    .m-signature-pad--footer { display: none; margin: 0; }
    body, html { margin: 0; height: 100%; background-color: ${c.surfaceAlt}; }
  `, [c]);

  if (isLoading || !contract) return <Spinner />;

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader scrollable showBack title="Firmar digitalmente" subtitle={contract.title} />

      <View style={s.body}>
        <TextInput
          style={s.input} value={signedName} onChangeText={setSignedName}
          placeholder="Tu nombre completo" placeholderTextColor={c.textFaint}
          autoCapitalize="words"
          textContentType="name"
          returnKeyType="done"
        />

        <View style={s.signHeaderRow}>
          <Text style={s.fieldLabel}>Dibujá tu firma</Text>
          <PressableScale onPress={() => signatureRef.current?.clearSignature()} hitSlop={8}>
            <Text style={s.clearLink}>Limpiar</Text>
          </PressableScale>
        </View>

        {/* Sin ScrollView alrededor: el pad captura el gesto de trazo completo,
            sin conflicto de scroll robando el toque a mitad de firma. */}
        <View style={s.signPad} onTouchStart={() => Keyboard.dismiss()}>
          <SignatureScreen
            ref={signatureRef}
            onOK={submitSignature}
            onEmpty={() => Alert.alert('Firma requerida', 'Dibujá tu firma en el recuadro antes de confirmar.')}
            webStyle={signatureWebStyle}
            penColor={c.brand}
            backgroundColor="transparent"
            autoClear={false}
            descriptionText=""
          />
        </View>
        <Text style={s.hint}>Al confirmar, la firma quedará registrada con fecha y hora.</Text>
      </View>

      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <PressableScale style={[s.cancelBtn, { flex: 1 }]} onPress={() => router.back()}>
          <Text style={s.cancelBtnText}>Cancelar</Text>
        </PressableScale>
        <PressableScale
          style={[s.submitBtn, { flex: 1 }, (!signedName.trim() || signContract.isPending) && { opacity: 0.5 }]}
          disabled={!signedName.trim() || signContract.isPending}
          onPress={() => signatureRef.current?.readSignature()}
        >
          {signContract.isPending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.submitBtnText}>Confirmar firma</Text>
          }
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { flex: 1, paddingHorizontal: space[4], paddingTop: space[3], gap: space[2] },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  input: { borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.base, color: c.text, backgroundColor: c.surfaceAlt },
  signHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[3] },
  clearLink: { fontSize: text.sm, fontWeight: weight.bold, color: c.brand },
  signPad: { flex: 1, borderRadius: radius.md, backgroundColor: c.surfaceAlt, overflow: 'hidden', minHeight: 260 },
  hint: { fontSize: text.xs, color: c.textFaint, marginTop: space[2] },
  footer: { flexDirection: 'row', gap: space[3], paddingHorizontal: space[4], paddingTop: space[3], borderTopWidth: 1, borderTopColor: c.border },
  cancelBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.surfaceAlt, alignItems: 'center' },
  cancelBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: c.textMuted },
  submitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.success, alignItems: 'center' },
  submitBtnText: { fontSize: text.md, fontWeight: weight.extrabold, color: colors.white },
});
