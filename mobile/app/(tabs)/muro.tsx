import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform, Alert, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../lib/auth';
import {
  useFeedPosts, useCreatePost, useToggleLike, useDeletePost,
  useFeedComments, useAddComment, useDeleteComment,
  useTogglePin, useToggleHide,
} from '../../hooks/use-feed';
import { useHorses } from '../../hooks/use-horses';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { Avatar as UserAvatar } from '../../components/Avatar';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, shadow } from '../../styles/tokens';
import { fontFamily } from '../../styles/fonts';
import { useToast } from '../../components/Toast';
import {
  Images, Camera, X, Trash2, Send, Pin, MoreHorizontal, Heart, MessageCircle,
  Eye, EyeOff, PlayCircle, Search, Bell, Newspaper, Check, Megaphone, Tag,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { HorseIcon } from '../../components/icons/equine';
import { AppImage } from '../../components/AppImage';
import { PostSkeleton } from '../../components/Skeleton';
import { InlineSearch } from '../../components/InlineSearch';
import { VetVerifiedBadge, isVetVerified } from '../../components/VerifiedBadge';
import type { FeedPost, FeedComment } from '../../../packages/shared/src/types';
import { ActionSheet } from '../../components/ActionSheet';
import { ErrorState } from '../../components/ErrorState';
import { FormSheet } from '../../components/FormSheet';
import { BottomSheet } from '../../components/BottomSheet';

/** Reproductor de un video del feed, con expo-video (expo-av está deprecado). */
function FeedVideo({ uri, style, contentFit = 'contain', controls = true }: {
  uri: string; style: import('react-native').StyleProp<import('react-native').ViewStyle>;
  contentFit?: 'contain' | 'cover';
  controls?: boolean;
}) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  return (
    <VideoView
      player={player}
      style={style}
      contentFit={contentFit}
      nativeControls={controls}
    />
  );
}

function Avatar({ name, colorId, size = 38, s }: { name: string; colorId?: string | null; size?: number; s: Styles }) {
  return <UserAvatar name={name} avatarColor={colorId} size={size} />;
}

function timeAgo(date: string) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

// ─── Comments Sheet ──────────────────────────────────────────────────────────
// Usa el FormSheet del sistema (header + cuerpo scrolleable + footer fijo) en
// vez de un <Modal> a mano. Guardamos el último post no nulo para que el
// contenido no desaparezca mientras la hoja anima su cierre.
function CommentsSheet({ visible, post, onClose, currentUserId, isAdmin, c, s }: {
  visible: boolean;
  post: FeedPost | null;
  onClose: () => void;
  currentUserId: string;
  isAdmin: boolean;
  c: ThemeColors;
  s: Styles;
}) {
  const [activePost, setActivePost] = useState<FeedPost | null>(post);
  useEffect(() => { if (post) setActivePost(post); }, [post]);

  const postId = activePost?.id ?? '';
  const { data: comments = [], isLoading } = useFeedComments(postId);
  const addComment = useAddComment(postId);
  const deleteComment = useDeleteComment(postId);
  const [text, setText] = useState('');

  useEffect(() => { if (visible) setText(''); }, [visible]);

  const handleSend = async () => {
    if (!text.trim()) return;
    haptic.light();
    await addComment.mutateAsync(text.trim());
    setText('');
  };

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title="Comentarios"
      footer={
        <View style={s.commentInput}>
          <TextInput
            style={s.commentInputField}
            placeholder="Escribí un comentario…"
            placeholderTextColor={c.textFaint}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim() || addComment.isPending}
            activeOpacity={0.75}
            style={[s.sendBtn, (!text.trim() || addComment.isPending) && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel="Enviar comentario"
          >
            <Send size={16} color={colors.white} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      }
    >
      {isLoading ? (
        <ActivityIndicator color={c.brand} style={{ margin: space[6] }} />
      ) : comments.length === 0 ? (
        <Text style={s.emptyComments}>Todavía no hay comentarios. ¡Sé el primero!</Text>
      ) : (
        <>
          {(comments as FeedComment[]).map((cm) => (
            <View key={cm.id} style={s.commentRow}>
              <Avatar name={cm.user?.name ?? 'U'} colorId={cm.user?.avatar_color} size={30} s={s} />
              <View style={s.commentBubble}>
                <View style={s.commentAuthorRow}>
                  <Text style={s.commentAuthor}>{cm.user?.name}</Text>
                  {isVetVerified(cm.user) && <VetVerifiedBadge />}
                </View>
                <Text style={s.commentText}>{cm.content}</Text>
              </View>
              {(cm.user_id === currentUserId || isAdmin) && (
                <TouchableOpacity
                  onPress={() => { haptic.light(); deleteComment.mutate(cm.id); }}
                  activeOpacity={0.7}
                  style={s.commentDelete}
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar comentario"
                  hitSlop={8}
                >
                  <Trash2 size={14} color={c.textFaint} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </>
      )}
    </FormSheet>
  );
}

// ─── Post Card ───────────────────────────────────────────────────────────────
function PostItem({ post, currentUserId, isAdmin, onComment, c, s }: {
  post: FeedPost;
  currentUserId: string;
  isAdmin: boolean;
  onComment: (post: FeedPost) => void;
  c: ThemeColors;
  s: Styles;
}) {
  const toggleLike = useToggleLike();
  const deletePost = useDeletePost();
  const togglePin = useTogglePin();
  const toggleHide = useToggleHide();
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwner = post.author_id === currentUserId;

  // El corazón responde al toque, no a la red: si el servidor rechaza, vuelve atrás.
  const [likeLocal, setLikeLocal] = useState<{ liked: boolean; total: number } | null>(null);
  const liked = likeLocal?.liked ?? Boolean(post.liked_by_me);
  const totalLikes = likeLocal?.total ?? post.likes_count;

  const handleLike = () => {
    haptic.selection();
    const previo = { liked: Boolean(post.liked_by_me), total: post.likes_count };
    const proximo = { liked: !liked, total: totalLikes + (liked ? -1 : 1) };
    setLikeLocal(proximo);
    toggleLike.mutate(post.id, {
      onError: () => { setLikeLocal(previo); haptic.error(); },
    });
  };

  const handleDelete = () => {
    Alert.alert('Eliminar post', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { haptic.medium(); deletePost.mutate(post.id); } },
    ]);
    setMenuOpen(false);
  };

  return (
    <View style={[
      s.card,
      post.is_pinned && s.cardPinned,
      post.is_hidden && s.cardHidden,
    ]}>
      {/* Header */}
      <View style={s.cardHeader}>
        <Avatar name={post.author?.name ?? 'U'} colorId={post.author?.avatar_color} s={s} />
        <View style={s.authorInfo}>
          <View style={s.authorRow}>
            <Text style={s.authorName}>{post.author?.name ?? 'Usuario'}</Text>
            {isVetVerified(post.author) && <VetVerifiedBadge />}
            {post.is_pinned && (
              <View style={s.pinnedBadge}>
                <Pin size={10} color={c.warning} strokeWidth={2} />
                <Text style={s.pinnedText}>Fijado</Text>
              </View>
            )}
          </View>
          <View style={s.timeAgoRow}>
            <Text style={s.timeAgo}>{timeAgo(post.created_at)}</Text>
            {post.horse && (
              <View style={s.timeAgoHorse}>
                <Text style={s.timeAgo}>· </Text>
                <HorseIcon size={12} color={c.textFaint} />
                <Text style={s.timeAgo}> {post.horse.name}</Text>
              </View>
            )}
          </View>
        </View>

        {(isOwner || isAdmin) && (
          <TouchableOpacity
            onPress={() => { haptic.selection(); setMenuOpen(true); }}
            activeOpacity={0.7}
            style={s.menuBtn}
            accessibilityRole="button"
            accessibilityLabel="Más opciones de la publicación"
            hitSlop={8}
          >
            <MoreHorizontal size={18} color={c.textFaint} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <Text style={s.content}>{post.content}</Text>

      {/* Images */}
      {post.image_urls && post.image_urls.length > 0 && (
        <View style={[
          s.imageGrid,
          post.image_urls.length === 1 ? s.imageGrid1 : s.imageGrid2,
        ]}>
          {post.image_urls.slice(0, 4).map((url, i) => (
            <AppImage
              key={i}
              source={{ uri: url }}
              style={[
                s.imageItem,
                post.image_urls!.length === 1 ? s.imageItem1 : s.imageItem2,
              ]}
              contentFit="cover"
            />
          ))}
        </View>
      )}

      {/* Videos */}
      {post.video_urls && post.video_urls.length > 0 && (
        <View style={{ marginHorizontal: space[4], marginBottom: space[3], gap: space[2] }}>
          {post.video_urls.map((url, i) => (
            <FeedVideo key={i} uri={url} style={s.videoPlayer} contentFit="contain" />
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity
          onPress={handleLike}
          activeOpacity={0.7}
          style={s.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Quitar me gusta' : 'Me gusta'}
        >
          <Heart
            size={20}
            color={liked ? c.danger : c.textFaint}
            fill={liked ? c.danger : 'none'}
            strokeWidth={2}
          />
          {totalLikes > 0 && (
            <Text style={[s.actionCount, liked && { color: c.danger }]}>
              {totalLikes}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { haptic.light(); onComment(post); }}
          activeOpacity={0.7}
          style={s.actionBtn}
          accessibilityRole="button"
          accessibilityLabel="Ver comentarios"
        >
          <MessageCircle size={19} color={c.textFaint} strokeWidth={2} />
          {post.comments_count > 0 && (
            <Text style={s.actionCount}>{post.comments_count}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        acciones={[
          ...(isAdmin ? [
            {
              label: post.is_pinned ? 'Desfijar' : 'Fijar post',
              Icon: Pin,
              onPress: () => togglePin.mutate(post.id),
            },
            {
              label: post.is_hidden ? 'Mostrar' : 'Ocultar',
              Icon: post.is_hidden ? Eye : EyeOff,
              onPress: () => toggleHide.mutate(post.id),
            },
          ] : []),
          ...((isOwner || isAdmin) ? [{
            label: 'Eliminar',
            Icon: Trash2,
            destructiva: true,
            onPress: handleDelete,
          }] : []),
        ]}
      />
    </View>
  );
}

// ─── Composer ────────────────────────────────────────────────────────────────
function Composer({ user, c, s }: { user: { name: string; role: string; avatar_color?: string | null }; c: ThemeColors; s: Styles }) {
  const createPost = useCreatePost();
  const toast = useToast();
  const { data: myHorses } = useHorses();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ uri: string; isVideo: boolean }[]>([]);
  const [type, setType] = useState<'general' | 'horse_update' | 'announcement'>('general');
  const [selectedHorseId, setSelectedHorseId] = useState<string | undefined>(undefined);
  const [showHorseSelect, setShowHorseSelect] = useState(false);
  const selectedHorse = (myHorses ?? []).find((h) => h.id === selectedHorseId);
  const isAdmin = user.role === 'admin';

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
      setOpen(false);
      toast.success('Publicado');
    } catch {
      toast.error('No se pudo publicar. Intentá de nuevo.');
    }
  };

  // El FormSheet ya no se destruye al cerrarse, así que el formulario se limpia al abrir.
  useEffect(() => {
    if (!open) return;
    setText(''); setMedia([]); setSelectedHorseId(undefined); setType('general');
  }, [open]);

  return (
    <>
      <TouchableOpacity
        style={s.composerClosed}
        onPress={() => { haptic.selection(); setOpen(true); }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Crear publicación"
      >
        <Avatar name={user.name} colorId={user.avatar_color} size={34} s={s} />
        <Text style={s.composerPlaceholder}>¿Qué querés compartir?</Text>
        <Images size={20} color={c.textFaint} strokeWidth={2} />
      </TouchableOpacity>

      <FormSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Nueva publicación"
        footer={
          <>
            <TouchableOpacity style={[s.composerCancelBtn, { flex: 1 }]} onPress={() => setOpen(false)} activeOpacity={0.8}>
              <Text style={s.composerCancel}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePost}
              disabled={(!text.trim() && !media.length) || createPost.isPending}
              activeOpacity={0.75}
              style={[s.postBtn, { flex: 1 }, (!text.trim() && !media.length) && { opacity: 0.4 }]}
            >
              {createPost.isPending
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={s.postBtnText}>Publicar</Text>}
            </TouchableOpacity>
          </>
        }
      >
        <>
          {isAdmin && (
            <View style={[s.typeRow, { paddingHorizontal: 0, paddingVertical: 0 }]}>
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

          <View style={[s.composerRow, { paddingHorizontal: 0, paddingVertical: 0 }]}>
            <Avatar name={user.name} colorId={user.avatar_color} s={s} />
            <TextInput
              style={s.composerInput}
              placeholder="¿Qué querés compartir?"
              placeholderTextColor={c.textFaint}
              value={text}
              onChangeText={setText}
              multiline
            />
          </View>

          {media.length > 0 && (
            <View style={[s.imageGrid, media.length === 1 ? s.imageGrid1 : s.imageGrid2, { marginHorizontal: 0 }]}>
              {media.map((item, i) => (
                <View key={i} style={media.length === 1 ? s.imageItem1 : s.imageItem2}>
                  {item.isVideo ? (
                    <FeedVideo uri={item.uri} style={StyleSheet.absoluteFill} contentFit="cover" controls={false} />
                  ) : (
                    <AppImage source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  )}
                  {item.isVideo && (
                    <View style={s.videoIndicator}>
                      <PlayCircle size={28} color="rgba(255,255,255,0.9)" strokeWidth={2} />
                    </View>
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

          <View style={[s.composerFooter, { paddingHorizontal: 0, borderTopWidth: 0, paddingVertical: space[2] }]}>
            <View style={s.footerLeft}>
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
                style={[s.photoBtn, { marginLeft: space[5] }]}
                accessibilityRole="button"
                accessibilityLabel="Sacar foto o video con la cámara"
              >
                <Camera size={20} strokeWidth={2} color={media.length >= 4 ? c.textFaint : c.textMuted} />
                <Text style={[s.photoBtnText, media.length >= 4 && { color: c.textFaint }]}>Cámara</Text>
              </TouchableOpacity>
            </View>
            {(myHorses?.length ?? 0) > 0 && (
              <TouchableOpacity
                onPress={() => setShowHorseSelect(true)}
                activeOpacity={0.7}
                style={s.tagBtn}
                accessibilityRole="button"
                accessibilityLabel={selectedHorse ? `Caballo etiquetado: ${selectedHorse.name}` : 'Etiquetar un caballo'}
              >
                <HorseIcon size={16} color={c.textMuted} />
                <Text style={[s.tagBtnText, selectedHorse && { color: c.text }]} numberOfLines={1}>
                  {selectedHorse ? selectedHorse.name : 'Etiquetar caballo'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      </FormSheet>

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
    </>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function MuroTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const isAdmin = user?.role === 'admin';
  const { posts, isLoading, isError, isFetchingMore, isRefreshing, loadMore, refresh } = useFeedPosts(
    isAdmin ? { include_hidden: true } : undefined,
  );
  const [commentPost, setCommentPost] = useState<FeedPost | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const renderItem = useCallback(({ item, index }: { item: FeedPost; index: number }) => (
    <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
      <PostItem
        post={item}
        currentUserId={user?.id ?? ''}
        isAdmin={isAdmin}
        onComment={setCommentPost}
        c={c}
        s={s}
      />
    </Animated.View>
  ), [user?.id, isAdmin, c, s]);

  const Navbar = (
    <View style={s.navbar}>
      <Text style={s.navTitle}>HandicApp</Text>
      <View style={s.navActions}>
        <TouchableOpacity
          onPress={() => { haptic.selection(); setSearchOpen(true); }}
          hitSlop={8}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Buscar"
        >
          <Search size={24} color={c.text} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { haptic.selection(); router.push('/notificaciones'); }}
          hitSlop={8}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Notificaciones"
        >
          <Bell size={24} color={c.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListHeader = (
    <View>
      {Navbar}
      <View style={{ paddingHorizontal: space[4], paddingBottom: space[3], paddingTop: space[2] }}>
        {user && <Composer user={user} c={c} s={s} />}
      </View>
    </View>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {isError && posts.length === 0 ? (
        <ErrorState onRetry={() => refresh()} />
      ) : isLoading ? (
        <View>
          {Navbar}
          <View style={{ paddingTop: space[2] }}>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </View>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={c.brand} />
          }
          ListFooterComponent={
            isFetchingMore
              ? <ActivityIndicator color={c.textFaint} style={{ marginVertical: space[4] }} />
              : null
          }
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <View style={s.emptyIcon}>
                <Newspaper size={32} color={c.textFaint} strokeWidth={2} />
              </View>
              <Text style={s.emptyTitle}>Todavía no hay publicaciones</Text>
              <Text style={s.emptySub}>Compartí una novedad, un logro o una foto y empezá la conversación con tu comunidad.</Text>
            </View>
          }
        />
      )}

      {/* Comments sheet */}
      <CommentsSheet
        visible={!!commentPost}
        post={commentPost}
        onClose={() => setCommentPost(null)}
        currentUserId={user?.id ?? ''}
        isAdmin={isAdmin}
        c={c}
        s={s}
      />

      {searchOpen && (
        <InlineSearch topInset={insets.top} onClose={() => setSearchOpen(false)} />
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: space[10] },

  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[3] },
  navTitle: { fontSize: text.xl, fontWeight: weight.semibold, fontFamily: fontFamily.semibold, color: c.text, letterSpacing: -0.3 },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: space[5] },

  // Avatar
  avatar: { backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: colors.white, fontWeight: weight.bold },

  // Card
  card: { backgroundColor: c.surface, marginHorizontal: space[4], marginBottom: space[3], borderRadius: radius.xl, borderWidth: 1, borderColor: c.borderStrong, overflow: 'hidden', ...shadow.sm },
  cardPinned: { borderColor: c.warning, backgroundColor: c.warningSoft },
  cardHidden: { opacity: 0.55, borderColor: c.danger },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: space[4], paddingBottom: 0, gap: space[3] },
  authorInfo: { flex: 1 },
  authorRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  authorName: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.warningSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  pinnedText: { fontSize: 10, color: c.warning, fontWeight: weight.semibold },
  timeAgo: { fontSize: text.xs, color: c.textFaint },
  timeAgoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 },
  timeAgoHorse: { flexDirection: 'row', alignItems: 'center' },
  menuBtn: { padding: 4, marginTop: -2 },

  content: { fontSize: text.base, color: c.text, lineHeight: 22, paddingHorizontal: space[4], paddingVertical: space[3] },

  imageGrid: { overflow: 'hidden', marginHorizontal: space[4], marginBottom: space[3], borderRadius: radius.lg, gap: 2 },
  imageGrid1: {},
  imageGrid2: { flexDirection: 'row', flexWrap: 'wrap' },
  imageItem: {},
  imageItem1: { width: '100%', height: 200, borderRadius: radius.lg },
  imageItem2: { width: '49%', height: 120, borderRadius: radius.md },

  actions: { flexDirection: 'row', gap: space[5], paddingHorizontal: space[4], paddingVertical: space[3], borderTopWidth: 1, borderTopColor: c.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint },

  // Menu

  // Composer closed
  composerClosed: { flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: c.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: c.borderStrong, padding: space[3], ...shadow.sm },
  composerPlaceholder: { flex: 1, fontSize: text.sm, color: c.textFaint },

  // Composer (FormSheet)
  composerCancelBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: space[3], borderRadius: radius.lg, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surfaceAlt },
  composerCancel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },
  postBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.brand, paddingHorizontal: space[4], paddingVertical: space[3], borderRadius: radius.lg },
  postBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  typeRow: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3] },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[3], paddingVertical: space[1] + 2, borderRadius: radius.full, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surface },
  typeBtnActive: { backgroundColor: c.brand, borderColor: c.brand },
  typeBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  typeBtnTextActive: { color: colors.white },
  composerRow: { flexDirection: 'row', gap: space[3], padding: space[4], alignItems: 'flex-start' },
  composerInput: { flex: 1, fontSize: text.base, color: c.text, minHeight: 100 },
  horsePickerRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[2], borderTopWidth: 1, borderTopColor: c.border },
  horseChip: { borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: 5, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surface },
  horseChipActive: { backgroundColor: c.brand, borderColor: c.brand },
  horseChipText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  horseChipTextActive: { color: colors.white },
  composerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: space[4], paddingVertical: space[3] },
  footerLeft: { flexDirection: 'row', alignItems: 'center' },
  tagBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: 160, backgroundColor: c.surfaceAlt, borderRadius: 20, paddingHorizontal: space[3], paddingVertical: space[2] },
  tagBtnText: { fontSize: text.sm, color: c.textMuted, fontWeight: weight.medium, fontFamily: fontFamily.medium },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[3] + 2, paddingHorizontal: space[2], borderBottomWidth: 1, borderBottomColor: c.border },
  selectRowText: { fontSize: text.base, color: c.textMuted, fontFamily: fontFamily.medium, flex: 1 },
  selectRowTextActive: { color: c.text, fontFamily: fontFamily.semibold },
  selectThumb: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.surfaceAlt, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginRight: space[3] },
  selectThumbNone: { backgroundColor: c.surfaceAlt },
  selectThumbImg: { width: '100%', height: '100%' },
  selectThumbInitial: { color: c.textMuted, fontWeight: '800', fontSize: 15, fontFamily: fontFamily.bold },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  photoBtnText: { fontSize: text.sm, color: c.textMuted, fontWeight: weight.medium, fontFamily: fontFamily.medium },
  removePhoto: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.full, padding: 3 },
  videoIndicator: { position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  videoPlayer: { width: '100%', height: 220, backgroundColor: '#000', borderRadius: radius.lg },

  // Comments sheet
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: c.border },
  sheetTitle: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  commentsList: { padding: space[4], gap: space[3] },
  emptyComments: { textAlign: 'center', color: c.textFaint, fontSize: text.sm, paddingVertical: space[6] },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  commentBubble: { flex: 1, backgroundColor: c.surfaceAlt, borderRadius: radius.lg, paddingHorizontal: space[3], paddingVertical: space[2] },
  commentAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  commentAuthor: { fontSize: 11, fontWeight: weight.bold, color: c.text },
  commentText: { fontSize: text.sm, color: c.text },
  commentDelete: { padding: space[1], marginTop: space[2] },
  commentInput: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3], borderTopWidth: 1, borderTopColor: c.border, alignItems: 'flex-end' },
  commentInputField: { flex: 1, backgroundColor: c.surfaceAlt, borderRadius: radius.xl, paddingHorizontal: space[3], paddingVertical: space[2] + 2, fontSize: text.sm, color: c.text, maxHeight: 100 },
  sendBtn: { backgroundColor: c.brand, borderRadius: radius.full, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },

  // Empty
  emptyBox: { alignItems: 'center', paddingTop: space[16], paddingHorizontal: space[6], gap: space[3] },
  emptyIcon: { width: 84, height: 84, borderRadius: radius.full, backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginBottom: space[1] },
  emptyTitle: { fontSize: text.lg, fontWeight: weight.bold, color: c.text },
  emptySub: { fontSize: text.sm, color: c.textFaint, textAlign: 'center' },
});
