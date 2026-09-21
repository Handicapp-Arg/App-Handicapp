import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../lib/auth';
import { useCreatePost } from '../../../hooks/use-feed';
import { useHorses } from '../../../hooks/use-horses';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { Avatar as UserAvatar } from '../../../components/Avatar';
import { PressableScale } from '../../../components/PressableScale';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight } from '../../../styles/tokens';
import { fontFamily } from '../../../styles/fonts';
import { useToast } from '../../../components/Toast';
import {
  Images, Camera, Video, X, PlayCircle, Tag, Megaphone, Check, ChevronRight, Plus,
} from 'lucide-react-native';
import { HorseIcon } from '../../../components/icons/equine';
import { AppImage } from '../../../components/AppImage';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { BottomSheet } from '../../../components/BottomSheet';

function FeedVideoPreview({ uri, style, c }: {
  uri: string;
  style: import('react-native').StyleProp<import('react-native').ViewStyle>;
  c: ThemeColors;
}) {
  // Solo se necesita el indicador de reproducción acá; el video real se ve al publicar.
  return (
    <View style={style}>
      <AppImage source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: c.overlay }]}>
        <PlayCircle size={28} color={colors.white} strokeWidth={2} />
      </View>
    </View>
  );
}

export default function NuevoPostScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const createPost = useCreatePost();
  const toast = useToast();
  const { data: myHorses } = useHorses();
  const isAdmin = user?.role === 'admin';

  const [contenido, setContenido] = useState('');
  const [media, setMedia] = useState<{ uri: string; isVideo: boolean }[]>([]);
  const [type, setType] = useState<'general' | 'horse_update' | 'announcement'>('general');
  const [selectedHorseId, setSelectedHorseId] = useState<string | undefined>(undefined);
  const [showHorseSelect, setShowHorseSelect] = useState(false);
  const selectedHorse = (myHorses ?? []).find((h) => h.id === selectedHorseId);
  const lleno = media.length >= 4;

  const addAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const newItems = assets.map((a) => ({ uri: a.uri, isVideo: a.type === 'video' }));
    setMedia((p) => [...p, ...newItems].slice(0, 4));
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Necesitamos acceso a tu galería para adjuntar fotos y videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4 - media.length,
      videoMaxDuration: 120,
    });
    if (!result.canceled) addAssets(result.assets);
  };

  /** La cámara sirve para foto y para video: es el mismo permiso y el mismo picker. */
  const openCamera = async (modo: 'images' | 'videos') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Necesitamos acceso a la cámara para sacar fotos y videos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: [modo],
      quality: 0.8,
      videoMaxDuration: 120,
    });
    if (!result.canceled) addAssets(result.assets);
  };

  const canPost = (!!contenido.trim() || media.length > 0) && !createPost.isPending;
  const isDirty = !!contenido.trim() || media.length > 0;

  // Intercepta salir (back del header, gesto o botón físico) y confirma solo
  // si hay texto o adjuntos sin publicar.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as never, (e: any) => {
      if (!isDirty) return;
      e.preventDefault();
      Alert.alert('¿Descartar publicación?', 'Vas a perder el texto o los adjuntos.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  const handlePost = async () => {
    if (!contenido.trim() && !media.length) return;
    haptic.medium();
    try {
      await createPost.mutateAsync({
        content: contenido.trim(),
        type: selectedHorseId ? 'horse_update' : type,
        horse_id: selectedHorseId,
        photoUris: media.filter((m) => !m.isVideo).map((m) => m.uri),
        videoUris: media.filter((m) => m.isVideo).map((m) => m.uri),
      });
      haptic.success();
      toast.success('Publicado');
      router.back();
    } catch {
      haptic.error();
      toast.error('No se pudo publicar. Intentá de nuevo.');
    }
  };

  if (!user) return null;

  const adjuntos: { label: string; Icon: typeof Camera; onPress: () => void }[] = [
    { label: 'Sacar foto', Icon: Camera, onPress: () => openCamera('images') },
    { label: 'Elegir de la galería', Icon: Images, onPress: pickFromLibrary },
    { label: 'Grabar un video', Icon: Video, onPress: () => openCamera('videos') },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        scrollable
        showBack
        title="Publicar"
        right={
          // CTA verde: la única pieza de marca de la pantalla (el verde es la acción).
          <PressableScale
            onPress={handlePost}
            disabled={!canPost}
            style={[s.cta, !canPost && s.ctaOff]}
            accessibilityRole="button"
            accessibilityLabel="Publicar"
          >
            <Text style={s.ctaText}>{createPost.isPending ? 'Publicando…' : 'Publicar'}</Text>
          </PressableScale>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Tipo (solo admin): no está en la maqueta, pero es capacidad real del rol. */}
        {isAdmin && (
          <View style={s.typeRow}>
            {(['general', 'horse_update', 'announcement'] as const).map((t) => (
              <PressableScale
                key={t}
                style={[s.typeBtn, type === t && s.typeBtnActive]}
                onPress={() => { haptic.selection(); setType(t); }}
                accessibilityRole="button"
                accessibilityLabel={t === 'general' ? 'General' : t === 'horse_update' ? 'Actualización' : 'Anuncio'}
              >
                {t === 'horse_update' && <Tag size={13} color={type === t ? c.text : c.textMuted} strokeWidth={2} />}
                {t === 'announcement' && <Megaphone size={13} color={type === t ? c.text : c.textMuted} strokeWidth={2} />}
                <Text style={[s.typeBtnText, type === t && s.typeBtnTextActive]}>
                  {t === 'general' ? 'General' : t === 'horse_update' ? 'Actualización' : 'Anuncio'}
                </Text>
              </PressableScale>
            ))}
          </View>
        )}

        {/* El texto es el protagonista: avatar al costado y nada de recuadro. */}
        <View style={s.composerRow}>
          <UserAvatar name={user.name} avatarColor={user.avatar_color} size={44} />
          <TextInput
            style={s.composerInput}
            placeholder="Contá algo de tus caballos…"
            placeholderTextColor={c.textFaint}
            value={contenido}
            onChangeText={setContenido}
            multiline
            autoFocus
          />
        </View>

        {/* Adjuntos elegidos + la baldosa para sumar otro */}
        {(media.length > 0) && (
          <View style={s.mediaRow}>
            {media.map((item, i) => (
              <View key={i} style={s.mediaTile}>
                {item.isVideo ? (
                  <FeedVideoPreview uri={item.uri} style={StyleSheet.absoluteFill} c={c} />
                ) : (
                  <AppImage source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                )}
                <PressableScale
                  style={s.mediaQuitar}
                  onPress={() => { haptic.light(); setMedia((p) => p.filter((_, idx) => idx !== i)); }}
                  accessibilityRole="button"
                  accessibilityLabel="Sacar este archivo"
                  hitSlop={8}
                >
                  <X size={13} color={colors.white} strokeWidth={2.6} />
                </PressableScale>
              </View>
            ))}
            {!lleno && (
              <PressableScale
                style={[s.mediaTile, s.mediaAgregar]}
                onPress={() => { haptic.selection(); void pickFromLibrary(); }}
                accessibilityRole="button"
                accessibilityLabel="Agregar otra foto o video"
              >
                <Plus size={24} color={c.textFaint} strokeWidth={1.9} />
                <Text style={s.mediaAgregarText}>Agregar</Text>
              </PressableScale>
            )}
          </View>
        )}

        {/* De qué caballo: fila que abre su propia hoja (una sola capa) */}
        {(myHorses?.length ?? 0) > 0 && (
          <PressableScale
            onPress={() => { haptic.selection(); setShowHorseSelect(true); }}
            style={s.filaOpcion}
            accessibilityRole="button"
            accessibilityLabel={selectedHorse ? `De qué caballo: ${selectedHorse.name}` : 'Elegir de qué caballo'}
          >
            <View style={s.filaThumb}>
              {selectedHorse?.image_url
                ? <AppImage source={{ uri: selectedHorse.image_url }} style={s.filaThumbImg} contentFit="cover" />
                : <HorseIcon size={17} color={c.textFaint} />}
            </View>
            <Text style={s.filaLabel}>De qué caballo</Text>
            <Text style={s.filaValor} numberOfLines={1}>{selectedHorse ? selectedHorse.name : 'Ninguno'}</Text>
            <ChevronRight size={17} color={c.textFaint} strokeWidth={2.2} />
          </PressableScale>
        )}
      </ScrollView>

      {/* Barra de adjuntos: siempre a mano, sobre el borde inferior seguro. */}
      <View style={[s.barra, { paddingBottom: insets.bottom + space[4] }]}>
        {adjuntos.map(({ label, Icon, onPress }) => (
          <PressableScale
            key={label}
            style={[s.barraBtn, lleno && s.barraBtnOff]}
            disabled={lleno}
            onPress={() => { haptic.selection(); onPress(); }}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Icon size={21} color={lleno ? c.textFaint : c.textMuted} strokeWidth={1.9} />
          </PressableScale>
        ))}
      </View>

      <BottomSheet
        visible={showHorseSelect}
        onClose={() => setShowHorseSelect(false)}
        title="De qué caballo"
      >
        <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
          <PressableScale
            style={s.selectRow}
            onPress={() => { haptic.selection(); setSelectedHorseId(undefined); setShowHorseSelect(false); }}
            accessibilityRole="button"
            accessibilityLabel="Ninguno"
          >
            <View style={s.selectThumb}>
              <X size={18} color={c.textFaint} strokeWidth={2} />
            </View>
            <Text style={[s.selectRowText, !selectedHorseId && s.selectRowTextActive]}>Ninguno</Text>
            {!selectedHorseId && <Check size={20} color={c.brand} strokeWidth={2} />}
          </PressableScale>
          {(myHorses ?? []).map((h) => (
            <PressableScale
              key={h.id}
              style={s.selectRow}
              onPress={() => { haptic.selection(); setSelectedHorseId(h.id); setShowHorseSelect(false); }}
              accessibilityRole="button"
              accessibilityLabel={h.name}
            >
              <View style={s.selectThumb}>
                {h.image_url
                  ? <AppImage source={{ uri: h.image_url }} style={s.selectThumbImg} contentFit="cover" />
                  : <Text style={s.selectThumbInitial}>{h.name[0]?.toUpperCase()}</Text>}
              </View>
              <Text style={[s.selectRowText, selectedHorseId === h.id && s.selectRowTextActive]} numberOfLines={1}>{h.name}</Text>
              {selectedHorseId === h.id && <Check size={20} color={c.brand} strokeWidth={2} />}
            </PressableScale>
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[10], gap: space[6] },

  cta: {
    height: 40, paddingHorizontal: space[4] + 2, borderRadius: radius.full,
    backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center',
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { fontSize: text.sm + 1, fontWeight: weight.semibold, color: colors.white, fontFamily: fontFamily.semibold },

  typeRow: { flexDirection: 'row', gap: space[2] },
  // El chip activo se marca con superficie neutra + texto pleno (el verde es del CTA).
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32,
    paddingHorizontal: space[3], paddingVertical: space[1] + 2,
    borderRadius: radius.full, backgroundColor: 'transparent',
  },
  typeBtnActive: { backgroundColor: c.surfaceAlt },
  typeBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  typeBtnTextActive: { color: c.text },

  composerRow: { flexDirection: 'row', gap: space[3] + 1, alignItems: 'flex-start' },
  composerInput: {
    flex: 1, fontSize: text.md + 1, color: c.text, minHeight: 120,
    paddingTop: space[2] + 2, fontFamily: fontFamily.regular,
  },

  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] + 2 },
  mediaTile: { width: 108, height: 108, borderRadius: radius.xl, overflow: 'hidden' },
  mediaQuitar: {
    position: 'absolute', top: 7, right: 7, width: 24, height: 24,
    borderRadius: radius.full, backgroundColor: c.overlay,
    alignItems: 'center', justifyContent: 'center',
  },
  mediaAgregar: { backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', gap: 7 },
  mediaAgregarText: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted, fontFamily: fontFamily.medium },

  filaOpcion: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingVertical: space[4] - 1,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  filaThumb: {
    width: 32, height: 32, borderRadius: radius.md - 1, overflow: 'hidden',
    backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  filaThumbImg: { width: '100%', height: '100%' },
  filaLabel: { flex: 1, fontSize: text.md, color: c.textMuted, fontFamily: fontFamily.regular },
  filaValor: { fontSize: text.md, fontWeight: weight.semibold, color: c.text, fontFamily: fontFamily.semibold, maxWidth: 160 },

  barra: { flexDirection: 'row', gap: space[2] + 2, paddingHorizontal: space[4], paddingTop: space[2] },
  barraBtn: {
    width: 50, height: 50, borderRadius: radius.field - 1,
    backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  barraBtnOff: { opacity: 0.4 },

  selectRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingVertical: space[3] + 2, paddingHorizontal: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  selectRowText: { fontSize: text.base, color: c.textMuted, fontFamily: fontFamily.medium, flex: 1 },
  selectRowTextActive: { color: c.text, fontFamily: fontFamily.semibold },
  selectThumb: {
    width: 38, height: 38, borderRadius: radius.full, backgroundColor: c.surfaceAlt,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  selectThumbImg: { width: '100%', height: '100%' },
  selectThumbInitial: { color: c.textMuted, fontWeight: weight.extrabold, fontSize: 15, fontFamily: fontFamily.bold },
});
