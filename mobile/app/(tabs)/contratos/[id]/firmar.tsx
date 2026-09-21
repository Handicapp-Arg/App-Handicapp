import { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronRight, ShieldCheck } from 'lucide-react-native';
import { useContracts, useSignContract } from '../../../../hooks/use-contracts';
import { useAuth } from '../../../../lib/auth';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { Skeleton } from '../../../../components/Skeleton';
import { PressableScale } from '../../../../components/PressableScale';
import { haptic } from '../../../../lib/haptics';
import { colors } from '../../../../lib/colors';
import { fechaHumana } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch, shadow, brandShadow } from '../../../../styles/tokens';
import { entradaFila } from '../../../../styles/motion';
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
  // El texto entra recortado (el contrato completo tapa el pad de firma) y se
  // despliega acá mismo: mandar al usuario a otra pantalla en medio de la
  // firma le haría perder el trazo.
  const [textoAbierto, setTextoAbierto] = useState(false);
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
    .m-signature-pad { box-shadow: none; border: none; margin: 0; background-color: ${c.surface}; }
    .m-signature-pad--body { border: none; }
    .m-signature-pad--body canvas { background-color: ${c.surface}; }
    .m-signature-pad--footer { display: none; margin: 0; }
    body, html { margin: 0; height: 100%; background-color: ${c.surface}; }
  `, [c]);

  if (isLoading || !contract) {
    // Misma silueta que la pantalla real: tarjeta de texto, filas y pad.
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Firmar" />
        <View style={s.body}>
          <Skeleton width="100%" height={150} borderRadius={radius.card} />
          <View style={{ height: space[5] }} />
          <Skeleton width="60%" height={16} />
          <View style={{ height: space[5] }} />
          <Skeleton width="100%" height={176} borderRadius={radius.card} />
        </View>
      </View>
    );
  }

  const estabFirmo = !!contract.establishment_signed_at;
  const filas = [
    {
      Icon: Check,
      texto: estabFirmo ? 'Firmó la caballeriza' : 'La caballeriza no firmó todavía',
      detalle: estabFirmo ? fechaHumana(contract.establishment_signed_at) : '',
      tinta: estabFirmo ? c.brand : c.textFaint,
    },
    ...(contract.body_hash ? [{
      Icon: ShieldCheck, texto: 'Texto protegido', detalle: 'No se puede cambiar', tinta: c.brand,
    }] : []),
  ];

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader scrollable showBack title="Firmar" subtitle={contract.title} />

      <View style={s.body}>
        {/* Qué estás por firmar */}
        <View style={s.tarjetaTexto}>
          <Text style={s.bodyText} numberOfLines={textoAbierto ? undefined : 5}>{contract.body}</Text>
          {!textoAbierto && (
            <PressableScale
              style={s.leerTodo}
              onPress={() => { haptic.selection(); setTextoAbierto(true); }}
              accessibilityRole="button"
              accessibilityLabel="Leer todo el contrato"
            >
              <Text style={s.leerTodoText}>Leer todo</Text>
              <ChevronRight size={15} color={c.brand} strokeWidth={2.2} />
            </PressableScale>
          )}
        </View>

        {filas.map((f, i) => (
          <Animated.View key={f.texto} entering={entradaFila(i)} style={[s.estadoFila, i < filas.length - 1 && s.estadoDivisor]}>
            <f.Icon size={19} color={f.tinta} strokeWidth={2.2} />
            <Text style={s.estadoTexto}>{f.texto}</Text>
            {!!f.detalle && <Text style={s.estadoDetalle}>{f.detalle}</Text>}
          </Animated.View>
        ))}

        <View style={s.padHeader}>
          <Text style={s.grupo}>Firmá con el dedo</Text>
          <PressableScale
            onPress={() => { haptic.light(); signatureRef.current?.clearSignature(); }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Borrar la firma"
          >
            <Text style={s.borrarLink}>Borrar</Text>
          </PressableScale>
        </View>

        {/* Sin ScrollView alrededor: el pad captura el gesto de trazo completo,
            sin conflicto de scroll robando el toque a mitad de firma. */}
        <Animated.View entering={FadeIn.duration(280)} style={s.signPad} onTouchStart={() => Keyboard.dismiss()}>
          <SignatureScreen
            ref={signatureRef}
            onOK={submitSignature}
            onEmpty={() => Alert.alert('Firma requerida', 'Dibujá tu firma en el recuadro antes de confirmar.')}
            webStyle={signatureWebStyle}
            penColor={c.text}
            backgroundColor="transparent"
            autoClear={false}
            descriptionText=""
          />
          <View style={s.padLinea} />
          {/* El nombre va como campo, no como rótulo: es lo que se guarda como
              firmante y el usuario puede corregirlo. */}
          <TextInput
            style={s.padNombre}
            value={signedName}
            onChangeText={setSignedName}
            placeholder="Tu nombre completo"
            placeholderTextColor={c.textFaint}
            autoCapitalize="words"
            textContentType="name"
            returnKeyType="done"
          />
        </Animated.View>
      </View>

      {/* Un solo CTA: el back del header ya cancela */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <PressableScale
          style={[s.submitBtn, (!signedName.trim() || signContract.isPending) && { opacity: 0.5 }]}
          disabled={!signedName.trim() || signContract.isPending}
          onPress={() => { haptic.medium(); signatureRef.current?.readSignature(); }}
          accessibilityRole="button"
          accessibilityLabel="Firmar el contrato"
        >
          {signContract.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.submitBtnText}>Firmar el contrato</Text>
          }
        </PressableScale>
        <Text style={s.pie}>Al firmar queda cerrado para las dos partes</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { flex: 1, paddingHorizontal: space[4], paddingTop: space[2] },

  tarjetaTexto: { backgroundColor: c.surface, borderRadius: radius.card, padding: space[4] + 2, ...(c.isDark ? {} : shadow.md) },
  bodyText: { fontSize: text.sm, color: c.textMuted, lineHeight: 22 },
  leerTodo: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[2] + 2, minHeight: touch.min - 20 },
  leerTodoText: { fontSize: text.base, fontWeight: weight.semibold, color: c.brand },

  estadoFila: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], marginTop: space[1] },
  estadoDivisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  estadoTexto: { flex: 1, fontSize: text.base, color: c.text },
  estadoDetalle: { fontSize: text.sm, color: c.textFaint },

  padHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space[5] },
  grupo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint },
  borrarLink: { fontSize: text.base, fontWeight: weight.semibold, color: c.brand },

  signPad: { flex: 1, marginTop: space[3], borderRadius: radius.card, backgroundColor: c.surface, overflow: 'hidden', minHeight: 200, ...(c.isDark ? {} : shadow.md) },
  padLinea: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginHorizontal: space[6] },
  padNombre: { height: touch.min, marginHorizontal: space[6] - space[3], paddingHorizontal: space[3], fontSize: text.sm, color: c.textMuted },

  // Footer sin borde: solo aire, como eventos/nuevo.
  footer: { paddingHorizontal: space[4], paddingTop: space[3] },
  submitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.button, backgroundColor: c.brand, alignItems: 'center', ...(c.isDark ? {} : brandShadow(c.brand)) },
  submitBtnText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
  pie: { textAlign: 'center', fontSize: text.sm, color: c.textFaint, marginTop: space[3] },
});
