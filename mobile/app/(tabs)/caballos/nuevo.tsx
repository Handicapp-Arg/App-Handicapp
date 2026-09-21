import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform, ActionSheetIOS,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronRight, ShieldCheck } from 'lucide-react-native';

import { useCreateHorse, useUploadHorseImage } from '../../../hooks/use-horses';
import { useActividades } from '../../../hooks/use-catalog';
import { useMyOrganizations } from '../../../hooks/use-organizations';
import { useAuth } from '../../../lib/auth';
import { AppImage } from '../../../components/AppImage';
import { DatePicker } from '../../../components/DatePicker';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { ActionSheet, type Accion } from '../../../components/ActionSheet';
import { FilaSelector } from '../../../components/FilaSelector';
import { PressableScale } from '../../../components/PressableScale';
import { useToast } from '../../../components/Toast';
import { haptic } from '../../../lib/haptics';
import { Routes, nav } from '../../../lib/routes';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch, shadow } from '../../../styles/tokens';
import { useCommonStyles } from '../../../styles/common';

/** Las tres opciones que acepta el backend, con el nombre que usa el campo. */
const SEXOS = [
  { value: 'macho',    label: 'Macho' },
  { value: 'hembra',   label: 'Hembra' },
  { value: 'castrado', label: 'Castrado' },
] as const;

type Sexo = (typeof SEXOS)[number]['value'];

export default function NuevoCaballoScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { input: inputStyle } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const createHorse = useCreateHorse();
  const uploadImage = useUploadHorseImage();
  const toast = useToast();
  const { user } = useAuth();
  const { data: actividades } = useActividades();
  const { data: organizaciones } = useMyOrganizations();

  const [name, setName] = useState('');
  const [activityId, setActivityId] = useState('');
  const [sex, setSex] = useState<Sexo | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [establishmentId, setEstablishmentId] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState<'actividad' | 'sexo' | 'establecimiento' | null>(null);

  /**
   * "Dónde está" son los establecimientos a los que el usuario pertenece. El
   * backend guarda el establecimiento como el USUARIO dueño de la organización
   * (`owner_id`), y desde ahí resuelve la organización del caballo.
   * Se saca la propia: nadie se elige a sí mismo como establecimiento.
   */
  const establecimientos = useMemo(
    () => (organizaciones ?? []).filter((o) => o.owner_id !== user?.id),
    [organizaciones, user?.id],
  );
  // Al guardar con éxito salimos navegando: el guardia de descarte no debe interceptar.
  const guardado = useRef(false);

  const pickPhoto = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { toast.error('Necesitamos acceso a la cámara.'); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true });
      if (!result.canceled) setPhotoUri(result.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { toast.error('Necesitamos acceso a la galería.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true });
      if (!result.canceled) setPhotoUri(result.assets[0].uri);
    }
  };

  const handlePickPhoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', 'Tomar foto', 'Elegir de galería'], cancelButtonIndex: 0 },
        (i) => { if (i === 1) pickPhoto('camera'); else if (i === 2) pickPhoto('gallery'); },
      );
    } else {
      Alert.alert('Foto del caballo', '¿De dónde querés subir la foto?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tomar foto', onPress: () => pickPhoto('camera') },
        { text: 'Elegir de galería', onPress: () => pickPhoto('gallery') },
      ]);
    }
  };

  const isDirty = !!name.trim() || !!birthDate || !!microchip || !!photoUri
    || !!activityId || !!sex || !!establishmentId;
  const isBusy = createHorse.isPending || uploadImage.isPending;
  const canSubmit = !!name.trim() && !isBusy;

  // Confirmar descarte solo si el formulario está sucio (y no acabamos de guardar).
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

  const actividadSel = (actividades ?? []).find((a) => a.id === activityId);
  const sexoSel = SEXOS.find((x) => x.value === sex);
  const establecimientoSel = establecimientos.find((o) => o.owner_id === establishmentId);

  const accionesActividad: Accion[] = (actividades ?? []).map((a) => ({
    label: a.name,
    onPress: () => setActivityId(a.id),
  }));
  const accionesSexo: Accion[] = SEXOS.map((x) => ({
    label: x.label,
    onPress: () => setSex(x.value),
  }));
  const accionesEstablecimiento: Accion[] = establecimientos.map((o) => ({
    label: o.name,
    onPress: () => setEstablishmentId(o.owner_id),
  }));

  const handleSubmit = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); haptic.error(); return; }
    if (microchip && microchip.length !== 15) { setError('El microchip debe tener 15 dígitos (o dejalo vacío).'); return; }
    setError('');
    try {
      // El payload va en una variable y no como literal a propósito: el tipo
      // del `mutationFn` de `useCreateHorse` todavía no declara activity_id ni
      // sex (el hook lo mantiene otro frente), y el backend ya los acepta.
      const payload = {
        name: name.trim(),
        birth_date: birthDate || undefined,
        microchip: microchip || undefined,
        activity_id: activityId || undefined,
        sex: sex || undefined,
        establishment_id: establishmentId || undefined,
      };
      const result = await createHorse.mutateAsync(payload);
      let fotoFallo = false;
      if (photoUri) {
        try {
          await uploadImage.mutateAsync({ id: result.horse.id, uri: photoUri });
        } catch {
          // El caballo ya se creó, así que no bloqueamos el alta — pero se avisa:
          // tragarse este error hacía que el usuario viera "guardado" y la foto
          // nunca apareciera, sin ninguna pista de por qué.
          fotoFallo = true;
        }
      }
      if (fotoFallo) {
        toast.error('Caballo guardado, pero no pudimos subir la foto. Probá cargarla desde su ficha.');
      } else {
        toast.success('Caballo guardado');
      }
      haptic.success();
      guardado.current = true;
      if (result.record_matches.length === 0) {
        nav.replace(router, Routes.caballo(result.horse.id));
      } else {
        nav.replace(router, `${Routes.vincularPadron(result.horse.id)}?matches=${encodeURIComponent(JSON.stringify(result.record_matches))}&microchip=${encodeURIComponent(microchip)}&birthDate=${encodeURIComponent(birthDate)}`);
      }
    } catch (err) {
      haptic.error();
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'No se pudo crear el caballo. Intentá de nuevo.');
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Nuevo caballo" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Foto */}
        <TouchableOpacity
          style={s.photoPickerBtn}
          onPress={handlePickPhoto}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={photoUri ? 'Cambiar foto del caballo' : 'Agregar foto del caballo'}
        >
          {photoUri ? (
            <AppImage source={{ uri: photoUri }} style={s.photoPreview} />
          ) : (
            <View style={s.photoPlaceholder}>
              <Camera size={28} color={c.textFaint} strokeWidth={2} />
              <Text style={s.photoPlaceholderText}>Agregar foto</Text>
              <Text style={s.photoPlaceholderSub}>Cámara o galería</Text>
            </View>
          )}
          {photoUri && (
            <View style={s.photoEditBadge}>
              <Camera size={13} color={colors.white} strokeWidth={2} />
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={inputStyle.base}
          value={name}
          onChangeText={setName}
          placeholder="Nombre del caballo *"
          placeholderTextColor={c.textFaint}
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* Grupo de filas estilo Ajustes: lo que se elige de una lista no se
            tipea. Todo opcional — un caballo se puede dar de alta con el
            nombre solo y completarse después desde su ficha. */}
        <View style={s.grupo}>
          <FilaSelector
            primera
            label="Para qué lo tenés"
            valor={actividadSel?.name}
            onPress={() => setSheet('actividad')}
          />
          <FilaSelector
            label="Sexo"
            valor={sexoSel?.label}
            onPress={() => setSheet('sexo')}
          />
        </View>

        <DatePicker
          label="Fecha de nacimiento (opcional)"
          value={birthDate}
          onChange={setBirthDate}
          maxDate={new Date()}
        />

        {/* Sin establecimientos a mano la fila no tiene nada que ofrecer. */}
        {establecimientos.length > 0 ? (
          <View style={s.grupo}>
            <FilaSelector
              primera
              label="Dónde está"
              valor={establecimientoSel?.name}
              onPress={() => setSheet('establecimiento')}
            />
          </View>
        ) : null}

        <TextInput
          style={inputStyle.base}
          value={microchip}
          onChangeText={(v) => setMicrochip(v.replace(/\D/g, '').slice(0, 15))}
          placeholder="Microchip de 15 dígitos (opcional)"
          placeholderTextColor={c.textFaint}
          keyboardType="numeric"
          returnKeyType="done"
        />

        {/* El padrón es la promesa fuerte del producto: si el caballo ya está
            registrado, se trae el pedigrí en vez de tipearlo. Va como tarjeta
            porque es una propuesta, no un campo más del formulario. */}
        <PressableScale
          style={s.padronCard}
          onPress={() => { haptic.light(); nav.push(router, Routes.padron); }}
          accessibilityRole="button"
          accessibilityLabel="Buscar el caballo en el padrón"
        >
          <View style={s.padronIcono}>
            <ShieldCheck size={20} color={c.brand} strokeWidth={2.2} />
          </View>
          <View style={s.padronTexto}>
            <Text style={s.padronTitulo}>¿Está en el padrón?</Text>
            <Text style={s.padronBajada}>Buscalo y traé su pedigrí</Text>
          </View>
          <ChevronRight size={18} color={c.textFaint} strokeWidth={2} />
        </PressableScale>

        {error ? <Text style={s.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Un solo CTA: el cuero vive acá y en ningún otro lado */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          {isBusy
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.submitBtnText}>Guardar el caballo</Text>
          }
        </TouchableOpacity>
      </View>

      <ActionSheet
        visible={sheet === 'actividad'}
        onClose={() => setSheet(null)}
        title="Para qué lo tenés"
        acciones={accionesActividad}
      />
      <ActionSheet
        visible={sheet === 'sexo'}
        onClose={() => setSheet(null)}
        title="Sexo"
        acciones={accionesSexo}
      />
      <ActionSheet
        visible={sheet === 'establecimiento'}
        onClose={() => setSheet(null)}
        title="Dónde está"
        acciones={accionesEstablecimiento}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[8], gap: space[5] },
  errorText: { fontSize: text.sm, color: c.danger },
  // Cuadrado de 132 con las esquinas muy redondeadas, no un círculo: un caballo
  // se reconoce por el cuerpo y el círculo le recortaba media foto.
  photoPickerBtn: { alignSelf: 'center', marginBottom: space[1], position: 'relative' },
  photoPreview: { width: 132, height: 132, borderRadius: radius['2xl'] + 4 },
  photoPlaceholder: { width: 132, height: 132, borderRadius: radius['2xl'] + 4, backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center', gap: 4 },
  photoPlaceholderText: { fontSize: text.xs, fontWeight: weight.bold, color: c.textMuted },
  photoPlaceholderSub: { fontSize: text.xs, color: c.textFaint },
  photoEditBadge: { position: 'absolute', bottom: 6, right: 6, width: 28, height: 28, borderRadius: radius.full, backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.white },

  /* ─── Filas de selección ───────────────────────────────────────────────── */
  // El grupo vive sobre el fondo, sin caja: la línea fina entre filas alcanza.
  grupo: { marginTop: -space[1] },

  /* ─── Tarjeta del padrón ───────────────────────────────────────────────── */
  padronCard: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    padding: space[4], borderRadius: radius.card,
    backgroundColor: c.surface,
    ...(c.isDark ? {} : shadow.sm),
  },
  padronIcono: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center',
  },
  padronTexto: { flex: 1, minWidth: 0 },
  padronTitulo: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  padronBajada: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },
  footer: { paddingHorizontal: space[4], paddingTop: space[3] },
  submitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.lg, backgroundColor: c.brand, alignItems: 'center' },
  submitBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: colors.white },
});
