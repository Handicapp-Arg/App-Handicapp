import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ShieldCheck, Camera, ChevronRight } from 'lucide-react-native';
import Animated from 'react-native-reanimated';

import { useHorse, useUpdateHorse, useDeleteHorse, useUploadHorseImage } from '../../../../hooks/use-horses';
import { useAuth } from '../../../../lib/auth';
import { DatePicker } from '../../../../components/DatePicker';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { PressableScale } from '../../../../components/PressableScale';
import { AppImage } from '../../../../components/AppImage';
import { useToast } from '../../../../components/Toast';
import { Skeleton } from '../../../../components/Skeleton';
import { haptic } from '../../../../lib/haptics';
import { colors } from '../../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch, shadow, brandShadow } from '../../../../styles/tokens';
import { entradaFila } from '../../../../styles/motion';
import { Routes, nav } from '../../../../lib/routes';
import { useCommonStyles } from '../../../../styles/common';

const FOTO = 96;

export default function EditarCaballoScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { can } = useAuth();
  const { c } = useTheme();
  const { input: inputStyle } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const toast = useToast();

  const { data: horse, isLoading } = useHorse(id);
  const updateHorse = useUpdateHorse();
  const deleteHorse = useDeleteHorse();
  const uploadImage = useUploadHorseImage();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [error, setError] = useState('');
  const [precargado, setPrecargado] = useState(false);
  // Al guardar con éxito salimos con back: el guardia de descarte no debe interceptar.
  const guardado = useRef(false);

  // Precargar los datos del caballo una sola vez, cuando llegan.
  useEffect(() => {
    if (!horse || precargado) return;
    setName(horse.name);
    setBirthDate(horse.birth_date ?? '');
    setMicrochip(horse.microchip ?? '');
    setPrecargado(true);
  }, [horse, precargado]);

  const isDirty = !!horse && precargado && (
    name !== horse.name ||
    birthDate !== (horse.birth_date ?? '') ||
    microchip !== (horse.microchip ?? '')
  );
  const canSubmit = !!name.trim() && isDirty && !updateHorse.isPending;

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
    if (!horse) return;
    if (!name.trim()) { setError('El nombre es obligatorio'); haptic.error(); return; }
    setError('');
    try {
      await updateHorse.mutateAsync({ id: horse.id, name: name.trim(), birth_date: birthDate || null, microchip: microchip || null });
      haptic.success();
      toast.success('Cambios guardados');
      guardado.current = true;
      router.back();
    } catch {
      haptic.error();
      setError('No se pudieron guardar los cambios. Intentá de nuevo.');
    }
  };

  const cambiarFoto = async () => {
    if (!horse) return;
    haptic.light();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { toast.error('Necesitamos acceso a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]) return;
    try {
      await uploadImage.mutateAsync({ id: horse.id, uri: result.assets[0].uri });
      haptic.success();
      toast.success('Foto actualizada');
    } catch {
      haptic.error();
      toast.error('No se pudo subir la foto. Probá de nuevo.');
    }
  };

  const eliminarCaballo = () => {
    if (!horse) return;
    Alert.alert(
      'Eliminar este caballo',
      `Se borra "${horse.name}" con todo su historial. No se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHorse.mutateAsync(horse.id);
              haptic.success();
              toast.success('Caballo eliminado');
              guardado.current = true;   // ya no hay nada que descartar
              router.back();
            } catch {
              haptic.error();
              toast.error('No se pudo eliminar. Probá de nuevo.');
            }
          },
        },
      ],
    );
  };

  if (isLoading || !horse) {
    // Silueta real: foto cuadrada + botón, y después los campos.
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Editar" />
        <View style={{ paddingHorizontal: space[4], paddingTop: space[5], flexDirection: 'row', gap: space[4], alignItems: 'center' }}>
          <Skeleton width={FOTO} height={FOTO} borderRadius={radius.sheet} />
          <View style={{ flex: 1, gap: space[2] }}>
            <Skeleton width={150} height={touch.min} borderRadius={radius.full} />
            <Skeleton width="60%" height={13} />
          </View>
        </View>
        <View style={{ paddingHorizontal: space[4], marginTop: space[6], gap: space[4] }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={touch.field} borderRadius={radius.field} />)}
        </View>
      </View>
    );
  }

  const puedeEliminar = can('horses', 'delete');

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Editar" subtitle={horse.name} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* ─── Foto ─── */}
        <Animated.View entering={entradaFila(0)} style={s.fotoRow}>
          {horse.image_url
            ? <AppImage source={{ uri: horse.image_url }} style={s.foto} />
            : <View style={[s.foto, s.fotoVacia]}><Camera size={26} color={c.textFaint} strokeWidth={1.8} /></View>}
          <View style={{ flex: 1, gap: space[2] }}>
            <PressableScale
              style={s.fotoBtn}
              disabled={uploadImage.isPending}
              onPress={cambiarFoto}
              accessibilityRole="button"
              accessibilityLabel="Cambiar la foto del caballo"
            >
              {uploadImage.isPending
                ? <ActivityIndicator size="small" color={c.text} />
                : <Text style={s.fotoBtnText}>Cambiar la foto</Text>}
            </PressableScale>
            <Text style={s.fotoAyuda}>Es la que se ve en la ficha y en el listado.</Text>
          </View>
        </Animated.View>

        <TextInput
          style={inputStyle.base}
          value={name}
          onChangeText={setName}
          placeholder="Nombre del caballo"
          placeholderTextColor={c.textFaint}
          autoCapitalize="words"
          textContentType="name"
          returnKeyType="next"
        />

        {/* Filas de selección, patrón Ajustes de iOS. */}
        <View>
          <DatePicker label="Nació el" value={birthDate} onChange={setBirthDate} maxDate={new Date()} />
        </View>

        <TextInput
          style={inputStyle.base}
          value={microchip}
          onChangeText={(v) => setMicrochip(v.replace(/\D/g, '').slice(0, 15))}
          placeholder="Microchip (15 dígitos)"
          placeholderTextColor={c.textFaint}
          keyboardType="numeric"
          returnKeyType="done"
        />

        {/* ─── Padrón ───────────────────────────────────────────────────────
            Si ya está vinculado, muestra el número. Si no, ofrece vincularlo:
            el alta manda a esa pantalla al crear el caballo, pero un caballo
            registrado antes se quedaba sin ninguna puerta para hacerlo. */}
        {horse.registration_number ? (
          <View style={s.padron}>
            <View style={s.padronIcono}>
              <ShieldCheck size={19} color={c.brand} strokeWidth={1.9} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.padronTitulo}>En el padrón</Text>
              <Text style={s.padronNumero} numberOfLines={1}>{horse.registration_number}</Text>
            </View>
          </View>
        ) : (
          <PressableScale
            style={s.padron}
            onPress={() => { haptic.selection(); nav.push(router, Routes.vincularPadron(horse.id)); }}
            accessibilityRole="button"
            accessibilityLabel="Vincular al padrón"
          >
            <View style={s.padronIcono}>
              <ShieldCheck size={19} color={c.textMuted} strokeWidth={1.9} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.padronTitulo}>Vincularlo al padrón</Text>
              <Text style={s.padronNumero} numberOfLines={1}>Traés su pedigrí y su número oficial</Text>
            </View>
            <ChevronRight size={17} color={c.textFaint} strokeWidth={2.2} />
          </PressableScale>
        )}

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        {puedeEliminar && (
          <PressableScale
            style={s.eliminar}
            disabled={deleteHorse.isPending}
            onPress={eliminarCaballo}
            accessibilityRole="button"
            accessibilityLabel="Eliminar este caballo"
          >
            <Text style={s.eliminarText}>Eliminar este caballo</Text>
          </PressableScale>
        )}
      </ScrollView>

      {/* Un solo CTA: el verde vive acá y en ningún otro lado. */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <PressableScale
          style={[s.cta, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Guardar los cambios del caballo"
        >
          {updateHorse.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.ctaText}>Guardar los cambios</Text>}
        </PressableScale>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[4], paddingBottom: space[8], gap: space[5] },

  /* Foto */
  fotoRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  foto: { width: FOTO, height: FOTO, borderRadius: radius.sheet + 2, backgroundColor: c.surfaceAlt },
  fotoVacia: { alignItems: 'center', justifyContent: 'center' },
  fotoBtn: {
    alignSelf: 'flex-start', height: touch.min, paddingHorizontal: space[4] + 2,
    borderRadius: radius.full, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  fotoBtnText: { fontSize: text.base - 1, fontWeight: weight.semibold, color: c.text },
  fotoAyuda: { fontSize: text.sm - 1, color: c.textFaint },

  /* Padrón: es una tarjeta de contenido real, así que sí lleva superficie. */
  padron: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surface, borderRadius: radius.button, padding: space[4] - 2,
    ...(c.isDark ? {} : shadow.md),
  },
  padronIcono: { width: 40, height: 40, borderRadius: radius.thumb - 2, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' },
  padronTitulo: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  padronNumero: { fontSize: text.sm - 1, color: c.textMuted, marginTop: 2, fontVariant: ['tabular-nums'] },

  eliminar: {
    alignSelf: 'flex-start', height: 48, paddingHorizontal: space[4] + 2,
    borderRadius: radius.full, backgroundColor: c.dangerSoft, alignItems: 'center', justifyContent: 'center',
  },
  eliminarText: { fontSize: text.base - 1, fontWeight: weight.semibold, color: c.danger },

  errorText: { fontSize: text.sm, color: c.danger },
  footer: { paddingHorizontal: space[4], paddingTop: space[3] },
  cta: {
    height: touch.button, borderRadius: radius.button, backgroundColor: c.brand,
    alignItems: 'center', justifyContent: 'center',
    ...(c.isDark ? {} : brandShadow(c.brand)),
  },
  ctaText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
});
