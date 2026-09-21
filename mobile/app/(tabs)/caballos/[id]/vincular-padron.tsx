import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Alert, Platform, ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Check, CheckCircle2, ChevronRight, Camera, Search } from 'lucide-react-native';

import { useSubmitClaim, useUploadClaimDocument, type HorseRecord } from '../../../../hooks/use-horse-records';
import { useHorse } from '../../../../hooks/use-horses';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { PressableScale } from '../../../../components/PressableScale';
import { AppImage } from '../../../../components/AppImage';
import { EmptyState } from '../../../../components/EmptyState';
import { haptic } from '../../../../lib/haptics';
import { colors } from '../../../../lib/colors';
import { Routes, nav } from '../../../../lib/routes';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch, shadow, brandShadow } from '../../../../styles/tokens';
import { entradaFila } from '../../../../styles/motion';

const SEX_LABEL: Record<string, string> = { macho: 'Macho', hembra: 'Hembra', castrado: 'Castrado' };

const SOURCE_LABELS: Record<string, string> = {
  studbook_ar: 'Stud Book AR',
  sra: 'SRA',
  aqha: 'AQHA',
  allbreed: 'AllBreed',
  pedigreequery: 'PedigreeQuery',
  manual: 'Manual',
};

/** Los tres datos que sirven para decidir si un registro es tu caballo. */
function Dato({ etiqueta, valor, s }: { etiqueta: string; valor: string; s: Styles }) {
  return (
    <View style={{ flexShrink: 1 }}>
      <Text style={s.datoEtiqueta}>{etiqueta}</Text>
      <Text style={s.datoValor} numberOfLines={1}>{valor}</Text>
    </View>
  );
}

export default function VincularPadronScreen() {
  const params = useLocalSearchParams<{ id: string; matches?: string; microchip?: string; birthDate?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const microchip = Array.isArray(params.microchip) ? params.microchip[0] : (params.microchip ?? '');
  const birthDate = Array.isArray(params.birthDate) ? params.birthDate[0] : (params.birthDate ?? '');
  const matchesParam = Array.isArray(params.matches) ? params.matches[0] : params.matches;

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: horse } = useHorse(id);
  const submitClaim = useSubmitClaim();
  const uploadDoc = useUploadClaimDocument();

  const matches: HorseRecord[] = useMemo(() => {
    if (!matchesParam) return [];
    try {
      return JSON.parse(matchesParam) as HorseRecord[];
    } catch {
      return [];
    }
  }, [matchesParam]);

  // Una sola pantalla en vez de la escalera lista → formulario → listo: elegir
  // el registro, adjuntar y enviar son un mismo trámite y se ven de una.
  const [enviado, setEnviado] = useState(false);
  const [elegido, setElegido] = useState<HorseRecord | null>(null);
  const [docUri, setDocUri] = useState<string | null>(null);
  const [registro, setRegistro] = useState('');
  const [error, setError] = useState('');

  const pickDoc = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: false });
      if (!result.canceled) setDocUri(result.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.9, allowsEditing: false });
      if (!result.canceled) setDocUri(result.assets[0].uri);
    }
  };

  const handlePickDoc = () => {
    haptic.light();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', 'Tomar foto', 'Elegir de galería'], cancelButtonIndex: 0 },
        (i) => { if (i === 1) pickDoc('camera'); else if (i === 2) pickDoc('gallery'); },
      );
    } else {
      Alert.alert('Certificado', '¿Cómo querés adjuntarlo?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tomar foto', onPress: () => pickDoc('camera') },
        { text: 'Elegir de galería', onPress: () => pickDoc('gallery') },
      ]);
    }
  };

  const elegir = (record: HorseRecord) => {
    haptic.selection();
    setError('');
    // Volver a tocar el elegido lo suelta: no hace falta un botón de deshacer.
    setElegido((prev) => (prev?.id === record.id ? null : record));
  };

  const enviar = async () => {
    if (!elegido) {
      setError('Elegí primero cuál de los registros es tu caballo.');
      return;
    }
    if (!docUri && !registro.trim()) {
      setError('Subí el certificado o ingresá el número de registro para continuar.');
      return;
    }
    setError('');
    try {
      let document_url: string | undefined;
      let document_public_id: string | undefined;
      if (docUri) {
        const uploaded = await uploadDoc.mutateAsync(docUri);
        document_url = uploaded.url;
        document_public_id = uploaded.public_id;
      }
      await submitClaim.mutateAsync({
        horse_record_id: elegido.id,
        horse_id: id,
        microchip: microchip || undefined,
        claimed_birth_date: birthDate || undefined,
        registration_number: registro.trim() || undefined,
        document_url,
        document_public_id,
      });
      haptic.success();
      setEnviado(true);
    } catch {
      haptic.error();
      setError('No se pudo enviar el reclamo. Intentá de nuevo.');
    }
  };

  const ocupado = uploadDoc.isPending || submitClaim.isPending;
  const irAlCaballo = () => { haptic.light(); nav.replace(router, Routes.caballo(id)); };

  if (enviado) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable title="Vincular al padrón" subtitle={horse?.name} />
        <View style={s.listoWrap}>
          <View style={s.listoIcono}>
            <CheckCircle2 size={44} color={c.brand} strokeWidth={1.9} />
          </View>
          <Text style={s.listoTitulo}>Reclamo enviado</Text>
          <Text style={s.listoTexto}>
            Vamos a revisar la documentación y te avisamos cuando {horse?.name ?? 'tu caballo'} quede
            vinculado al registro oficial.
          </Text>
        </View>
        <View style={[s.pie, { paddingBottom: insets.bottom + space[4] }]}>
          <PressableScale style={s.cta} onPress={irAlCaballo} accessibilityRole="button">
            <Text style={s.ctaTexto}>Listo</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Vincular al padrón" subtitle={horse?.name} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.cuerpo}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
      >
        <Text style={s.intro}>
          Si tu caballo está inscripto, vinculalo y traés su pedigrí, su fecha y su número oficial.
        </Text>

        {/* Lo que buscamos en el padrón fue el nombre del caballo: se muestra
            como campo lleno, no editable, para que se entienda de dónde salen
            los resultados de abajo. */}
        <View style={s.busqueda}>
          <Search size={18} color={c.textFaint} strokeWidth={1.9} />
          <Text style={s.busquedaTexto} numberOfLines={1}>{horse?.name ?? 'Tu caballo'}</Text>
        </View>

        {matches.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="Sin coincidencias"
            message="No encontramos ejemplares parecidos en el padrón oficial. Puede estar con otro nombre o sin inscribir."
          />
        ) : (
          <>
            <Text style={s.seccion}>Posibles coincidencias</Text>

            {matches.map((r, i) => {
              const on = elegido?.id === r.id;
              const vitales = [
                r.birth_year != null ? String(r.birth_year) : null,
                r.sex ? SEX_LABEL[r.sex].toLowerCase() : null,
                SOURCE_LABELS[r.registration_source as string] ?? r.registration_source,
              ].filter(Boolean).join(' · ');

              return (
                <Animated.View key={r.id} entering={entradaFila(i)}>
                  <PressableScale
                    style={on ? s.tarjeta : [s.fila, i > 0 && s.filaBorde]}
                    onPress={() => elegir(r)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Elegir el registro de ${r.name}`}
                  >
                    {on ? (
                      <>
                        <View style={s.tarjetaCabecera}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={s.tarjetaNombre} numberOfLines={1}>{r.name}</Text>
                            <Text style={s.tarjetaFuente}>
                              {SOURCE_LABELS[r.registration_source as string] ?? r.registration_source ?? 'Padrón'}
                              {r.ownership_status === 'pending_claim' ? ' · reclamo pendiente' : ''}
                            </Text>
                          </View>
                          <Check size={20} color={c.brand} strokeWidth={2.4} />
                        </View>
                        <View style={s.tarjetaDatos}>
                          {r.birth_year != null && <Dato etiqueta="Nació" valor={String(r.birth_year)} s={s} />}
                          {r.sex && <Dato etiqueta="Sexo" valor={SEX_LABEL[r.sex]} s={s} />}
                          {r.sire_name && <Dato etiqueta="Padre" valor={r.sire_name} s={s} />}
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.filaNombre} numberOfLines={1}>{r.name}</Text>
                          {vitales ? <Text style={s.filaVitales} numberOfLines={1}>{vitales}</Text> : null}
                        </View>
                        <ChevronRight size={17} color={c.textFaint} strokeWidth={2.2} />
                      </>
                    )}
                  </PressableScale>
                </Animated.View>
              );
            })}

            {/* La prueba solo se pide cuando ya hay un registro elegido: antes
                de eso no hay nada que probar y la pantalla sería un formulario. */}
            {elegido && (
              <Animated.View entering={entradaFila(matches.length)} style={{ gap: space[3] }}>
                <PressableScale
                  style={s.certificado}
                  onPress={handlePickDoc}
                  accessibilityRole="button"
                  accessibilityLabel={docUri ? 'Cambiar el certificado adjunto' : 'Subir el certificado'}
                >
                  {docUri ? (
                    <AppImage source={{ uri: docUri }} style={s.certificadoMiniatura} />
                  ) : (
                    <View style={s.certificadoIcono}>
                      <Camera size={19} color={c.textMuted} strokeWidth={1.9} />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.certificadoTitulo}>
                      {docUri ? 'Certificado adjunto' : 'Subir el certificado'}
                    </Text>
                    <Text style={s.certificadoSub}>
                      {docUri ? 'Tocá para cambiarlo' : 'Acelera la verificación'}
                    </Text>
                  </View>
                  {docUri
                    ? <Check size={19} color={c.brand} strokeWidth={2.4} />
                    : <ChevronRight size={17} color={c.textFaint} strokeWidth={2.2} />}
                </PressableScale>

                <TextInput
                  style={s.input}
                  value={registro}
                  onChangeText={setRegistro}
                  placeholder="Número de registro (si no tenés el certificado)"
                  placeholderTextColor={c.textFaint}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={enviar}
                />
              </Animated.View>
            )}
          </>
        )}

        {error ? <Text style={s.error}>{error}</Text> : null}

        <PressableScale
          style={s.omitir}
          onPress={irAlCaballo}
          accessibilityRole="button"
          accessibilityLabel="Omitir la vinculación por ahora"
        >
          <Text style={s.omitirTexto}>Omitir por ahora</Text>
        </PressableScale>
      </ScrollView>

      <View style={[s.pie, { paddingBottom: insets.bottom + space[4] }]}>
        <PressableScale
          style={[s.cta, (!elegido || ocupado) && s.ctaApagado]}
          onPress={enviar}
          disabled={ocupado}
          accessibilityRole="button"
          accessibilityState={{ disabled: ocupado, busy: ocupado }}
          accessibilityLabel="Vincular este registro"
        >
          {ocupado
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.ctaTexto}>Vincular este registro</Text>}
        </PressableScale>
        <Text style={s.piePie}>Lo revisa un administrador antes de quedar firme</Text>
      </View>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  cuerpo: { paddingHorizontal: space[4], paddingBottom: space[8] },

  intro: { fontSize: text.base, color: c.textMuted, lineHeight: 22 },

  busqueda: {
    marginTop: space[5],
    height: touch.min + 4,
    borderRadius: radius.thumb,
    backgroundColor: c.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + 2,
    paddingHorizontal: space[4],
    ...(c.isDark ? {} : shadow.sm),
  },
  busquedaTexto: { flex: 1, fontSize: text.base, color: c.text },

  seccion: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint, marginTop: space[5], marginBottom: space[3] },

  /* Sin elegir: fila plana, la lista se lee de un vistazo */
  fila: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4] },
  filaBorde: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  filaNombre: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  filaVitales: { fontSize: text.sm, color: c.textMuted, marginTop: 3 },

  /* Elegido: sube a tarjeta con el contorno de la marca. El verde marca la
     decisión tomada, que es la acción de esta pantalla. */
  tarjeta: {
    backgroundColor: c.surface,
    borderRadius: radius.card,
    padding: space[4],
    marginVertical: space[2],
    borderWidth: 2,
    borderColor: c.brand,
    ...(c.isDark ? {} : shadow.lg),
  },
  tarjetaCabecera: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  tarjetaNombre: { fontSize: text.lg - 4, fontWeight: weight.semibold, color: c.text },
  tarjetaFuente: { fontSize: text.sm, color: c.textMuted, marginTop: 3 },
  tarjetaDatos: { flexDirection: 'row', gap: space[5], marginTop: space[3] },
  datoEtiqueta: { fontSize: text.xs, color: c.textFaint },
  datoValor: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text, marginTop: 2 },

  certificado: {
    marginTop: space[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    backgroundColor: c.surface,
    borderRadius: radius.button,
    padding: space[3] + 2,
    ...(c.isDark ? {} : shadow.md),
  },
  certificadoIcono: {
    width: 40, height: 40, borderRadius: radius.md + 2, backgroundColor: c.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  certificadoMiniatura: { width: 40, height: 40, borderRadius: radius.md + 2, flexShrink: 0 },
  certificadoTitulo: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  certificadoSub: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },

  input: {
    height: touch.field,
    borderRadius: radius.field,
    paddingHorizontal: space[4],
    fontSize: text.base,
    color: c.text,
    backgroundColor: c.surfaceAlt,
  },

  error: { fontSize: text.sm, color: c.danger, marginTop: space[4] },

  omitir: { minHeight: touch.min, marginTop: space[5], alignItems: 'center', justifyContent: 'center' },
  omitirTexto: { fontSize: text.base, fontWeight: weight.semibold, color: c.textMuted },

  pie: { paddingHorizontal: space[4], paddingTop: space[3] },
  cta: {
    height: touch.button,
    borderRadius: radius.button,
    backgroundColor: c.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...(c.isDark ? {} : brandShadow(c.brand)),
  },
  ctaApagado: { opacity: 0.45, shadowOpacity: 0 },
  ctaTexto: { fontSize: text.md, fontWeight: weight.semibold, color: colors.white },
  piePie: { textAlign: 'center', fontSize: text.sm, color: c.textFaint, marginTop: space[3] },

  listoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[6], gap: space[3] },
  listoIcono: {
    width: 84, height: 84, borderRadius: radius.card,
    backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space[2],
  },
  listoTitulo: { fontSize: text.xl, fontWeight: weight.bold, color: c.text, letterSpacing: -0.6 },
  listoTexto: { fontSize: text.base, color: c.textMuted, textAlign: 'center', lineHeight: 23 },
});
