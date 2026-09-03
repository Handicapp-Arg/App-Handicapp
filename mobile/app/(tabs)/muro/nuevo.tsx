import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../lib/auth';
import { useCreatePost } from '../../../hooks/use-feed';
import { useHorses } from '../../../hooks/use-horses';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { Avatar as UserAvatar } from '../../../components/Avatar';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight } from '../../../styles/tokens';
import { fontFamily } from '../../../styles/fonts';
import { useToast } from '../../../components/Toast';
import { Images, Camera, X, PlayCircle, Tag, Megaphone, Check, ChevronRight } from 'lucide-react-native';
import { HorseIcon } from '../../../components/icons/equine';
import { AppImage } from '../../../components/AppImage';
import { ScreenHeader, HeaderButton } from '../../../components/ScreenHeader';
import { BottomSheet } from '../../../components/BottomSheet';

function FeedVideoPreview({ uri, style }: { uri: string; style: import('react-native').StyleProp<import('react-native').ViewStyle> }) {
  // Solo se necesita el indicador de reproducción acá; el video real se ve al publicar.
  return (
    <View style={style}>
      <AppImage source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <PlayCircle size={28} color="rgba(255,255,255,0.9)" strokeWidth={2} />
        </View>
      </View>
    </View>
  );
}

export default function NuevoPostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const createPost = useCreatePost();
  const toast = useToast();
  const { data: myHorses } = useHorses();
  const isAdmin = user?.role === 'admin';

  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ uri: string; isVideo: boolean }[]>([]);
  const [type, setType] = useState<'general' | 'horse_update' | 'announcement'>('general');
  const [selectedHorseId, setSelectedHorseId] = useState<string | undefined>(undefined);
  const [showHorseSelect, setShowHorseSelect] = useState(false);
  const selectedHorse = (myHorses ?? []).find((h) => h.id === selectedHorseId);

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

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Necesitamos acceso a la cámara para sacar fotos y videos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      videoMaxDuration: 120,
    });
    if (!result.canceled) addAssets(result.assets);
  };

  const canPost = (!!text.trim() || media.length > 0) && !createPost.isPending;

  const handlePost = async () => {
    if (!text.trim() && !media.length) return;
    haptic.medium();
    try {
      await createPost.mutateAsync({
        content: text.trim(),
        type: selectedHorseId ? 'horse_update' : type,
        horse_id: selectedHorseId,
        photoUris: media.filter((m) => !m.isVideo).map((m) => m.uri),
        videoUris: media.filter((m) => m.isVideo).map((m) => m.uri),
      });
      toast.success('Publicado');
      router.back();
    } catch {
      haptic.error();
      toast.error('No se pudo publicar. Intentá de nuevo.');
    }
  };

  if (!user) return null;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        scrollable
        showBack
        title="Nueva publicación"
        right={
          <HeaderButton
            label={createPost.isPending ? 'Publicando…' : 'Publicar'}
            onPress={() => { if (canPost) handlePost(); }}
          />
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
        {/* Tipo (solo admin) */}
        {isAdmin && (
          <View style={s.typeRow}>
            {(['general', 'horse_update', 'announcement'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.typeBtn, type === t && s.typeBtnActive]}
                onPress={() => setType(t)}
                activeOpacity={0.8}
              >
                {t === 'horse_update' && <Tag size={13} color={type === t ? colors.white : c.textMuted} strokeWidth={2} />}
                {t === 'announcement' && <Megaphone size={13} color={type === t ? colors.white : c.textMuted} strokeWidth={2} />}
                <Text style={[s.typeBtnText, type === t && s.typeBtnTextActive]}>
                  {t === 'general' ? 'General' : t === 'horse_update' ? 'Actualización' : 'Anuncio'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Textarea protagonista */}
        <View style={s.composerRow}>
          <UserAvatar name={user.name} avatarColor={user.avatar_color} size={38} />
          <TextInput
            style={s.composerInput}
            placeholder="¿Qué querés compartir?"
            placeholderTextColor={c.textFaint}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
          />
        </View>

        {/* Adjuntos */}
        {media.length > 0 && (
          <View style={[s.imageGrid, media.length === 1 ? s.imageGrid1 : s.imageGrid2]}>
            {media.map((item, i) => (
              <View key={i} style={media.length === 1 ? s.imageItem1 : s.imageItem2}>
                {item.isVideo ? (
                  <FeedVideoPreview uri={item.uri} style={StyleSheet.absoluteFill} />
                ) : (
                  <AppImage source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                )}
                <TouchableOpacity
                  style={s.removePhoto}
                  onPress={() => setMedia((p) => p.filter((_, idx) => idx !== i))}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar archivo adjunto"
                >
                  <X size={14} color={colors.white} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Fila de adjuntos: galería y cámara */}
        <View style={s.attachRow}>
          <TouchableOpacity
            onPress={pickFromLibrary}
            disabled={media.length >= 4}
            activeOpacity={0.7}
            style={s.photoBtn}
            accessibilityRole="button"
            accessibilityLabel="Adjuntar foto o video desde la galería"
          >
            <Images size={20} strokeWidth={2} color={media.length >= 4 ? c.textFaint : c.textMuted} />
            <Text style={[s.photoBtnText, media.length >= 4 && { color: c.textFaint }]}>Galería</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openCamera}
            disabled={media.length >= 4}
            activeOpacity={0.7}
            style={s.photoBtn}
            accessibilityRole="button"
            accessibilityLabel="Sacar foto o video con la cámara"
          >
            <Camera size={20} strokeWidth={2} color={media.length >= 4 ? c.textFaint : c.textMuted} />
            <Text style={[s.photoBtnText, media.length >= 4 && { color: c.textFaint }]}>Cámara</Text>
          </TouchableOpacity>
        </View>

        {/* Caballo a etiquetar: fila que abre su propio BottomSheet (una sola capa) */}
        {(myHorses?.length ?? 0) > 0 && (
          <TouchableOpacity
            onPress={() => { haptic.selection(); setShowHorseSelect(true); }}
            activeOpacity={0.7}
            style={s.tagRow}
            accessibilityRole="button"
            accessibilityLabel={selectedHorse ? `Caballo etiquetado: ${selectedHorse.name}` : 'Etiquetar un caballo'}
          >
            <HorseIcon size={18} color={c.textMuted} />
            <Text style={[s.tagRowText, selectedHorse && { color: c.text }]} numberOfLines={1}>
              {selectedHorse ? selectedHorse.name : 'Etiquetar caballo'}
            </Text>
            <ChevronRight size={18} color={c.textFaint} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </ScrollView>

      <BottomSheet
        visible={showHorseSelect}
        onClose={() => setShowHorseSelect(false)}
        title="Etiquetar un caballo"
      >
        <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={s.selectRow}
            activeOpacity={0.7}
            onPress={() => { haptic.selection(); setSelectedHorseId(undefined); setShowHorseSelect(false); }}
          >
            <View style={[s.selectThumb, s.selectThumbNone]}>
              <X size={18} color={c.textFaint} strokeWidth={2} />
            </View>
            <Text style={[s.selectRowText, !selectedHorseId && s.selectRowTextActive]}>Ninguno</Text>
            {!selectedHorseId && <Check size={20} color={c.brand} strokeWidth={2} />}
          </TouchableOpacity>
          {(myHorses ?? []).map((h) => (
            <TouchableOpacity
              key={h.id}
              style={s.selectRow}
              activeOpacity={0.7}
              onPress={() => { haptic.selection(); setSelectedHorseId(h.id); setShowHorseSelect(false); }}
            >
              <View style={s.selectThumb}>
                {h.image_url
                  ? <AppImage source={{ uri: h.image_url }} style={s.selectThumbImg} contentFit="cover" />
                  : <Text style={s.selectThumbInitial}>{h.name[0]?.toUpperCase()}</Text>}
              </View>
              <Text style={[s.selectRowText, selectedHorseId === h.id && s.selectRowTextActive]} numberOfLines={1}>{h.name}</Text>
              {selectedHorseId === h.id && <Check size={20} color={c.brand} strokeWidth={2} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[10], gap: space[4] },

  typeRow: { flexDirection: 'row', gap: space[2] },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[3], paddingVertical: space[1] + 2, borderRadius: radius.full, backgroundColor: c.surfaceAlt },
  typeBtnActive: { backgroundColor: c.brand },
  typeBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  typeBtnTextActive: { color: colors.white },

  composerRow: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
  composerInput: { flex: 1, fontSize: text.md, color: c.text, minHeight: 120, fontFamily: fontFamily.regular },

  imageGrid: { overflow: 'hidden', borderRadius: radius.lg, gap: 2 },
  imageGrid1: {},
  imageGrid2: { flexDirection: 'row', flexWrap: 'wrap' },
  imageItem1: { width: '100%', height: 220, borderRadius: radius.lg },
  imageItem2: { width: '49%', height: 140, borderRadius: radius.md },
  removePhoto: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.full, padding: 3 },

  attachRow: { flexDirection: 'row', gap: space[5] },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  photoBtnText: { fontSize: text.sm, color: c.textMuted, fontWeight: weight.medium, fontFamily: fontFamily.medium },

  tagRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], backgroundColor: c.surfaceAlt, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3] + 2 },
  tagRowText: { flex: 1, fontSize: text.md, color: c.textMuted, fontWeight: weight.medium, fontFamily: fontFamily.medium },

  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[3] + 2, paddingHorizontal: space[2], borderBottomWidth: 1, borderBottomColor: c.border },
  selectRowText: { fontSize: text.base, color: c.textMuted, fontFamily: fontFamily.medium, flex: 1 },
  selectRowTextActive: { color: c.text, fontFamily: fontFamily.semibold },
  selectThumb: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.surfaceAlt, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginRight: space[3] },
  selectThumbNone: { backgroundColor: c.surfaceAlt },
  selectThumbImg: { width: '100%', height: '100%' },
  selectThumbInitial: { color: c.textMuted, fontWeight: '800', fontSize: 15, fontFamily: fontFamily.bold },
});
