import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform, ActionSheetIOS,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';

import { useCreateHorse, useUploadHorseImage } from '../../../hooks/use-horses';
import { AppImage } from '../../../components/AppImage';
import { DatePicker } from '../../../components/DatePicker';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useToast } from '../../../components/Toast';
import { haptic } from '../../../lib/haptics';
import { Routes, nav } from '../../../lib/routes';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../styles/tokens';
import { useCommonStyles } from '../../../styles/common';

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

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState('');
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

  const isDirty = !!name.trim() || !!birthDate || !!microchip || !!photoUri;
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

  const handleSubmit = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); haptic.error(); return; }
    if (microchip && microchip.length !== 15) { setError('El microchip debe tener 15 dígitos (o dejalo vacío).'); return; }
    setError('');
    try {
      const result = await createHorse.mutateAsync({
        name: name.trim(),
        birth_date: birthDate || undefined,
        microchip: microchip || undefined,
      });
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
        <DatePicker
          label="Fecha de nacimiento (opcional)"
          value={birthDate}
          onChange={setBirthDate}
          maxDate={new Date()}
        />
        <TextInput
          style={inputStyle.base}
          value={microchip}
          onChangeText={(v) => setMicrochip(v.replace(/\D/g, '').slice(0, 15))}
          placeholder="Microchip de 15 dígitos (opcional)"
          placeholderTextColor={c.textFaint}
          keyboardType="numeric"
          returnKeyType="done"
        />
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
            : <Text style={s.submitBtnText}>Crear caballo</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[8], gap: space[5] },
  errorText: { fontSize: text.sm, color: c.danger },
  photoPickerBtn: { alignSelf: 'center', marginBottom: space[1], position: 'relative' },
  photoPreview: { width: 110, height: 110, borderRadius: 55 },
  photoPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center', gap: 4 },
  photoPlaceholderText: { fontSize: text.xs, fontWeight: weight.bold, color: c.textMuted },
  photoPlaceholderSub: { fontSize: text.xs, color: c.textFaint },
  photoEditBadge: { position: 'absolute', bottom: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.white },
  footer: { paddingHorizontal: space[4], paddingTop: space[3] },
  submitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.lg, backgroundColor: c.brand, alignItems: 'center' },
  submitBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: colors.white },
});
