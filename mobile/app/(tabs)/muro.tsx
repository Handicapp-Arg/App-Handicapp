import { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
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
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { HorseIcon } from '../../components/icons/equine';
import { PostSkeleton } from '../../components/Skeleton';
import { InlineSearch } from '../../components/InlineSearch';
import { VetVerifiedBadge, isVetVerified } from '../../components/VerifiedBadge';
import type { FeedPost, FeedComment } from '../../../packages/shared/src/types';

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
function CommentsSheet({ post, onClose, currentUserId, isAdmin, c, s }: {
  post: FeedPost;
  onClose: () => void;
  currentUserId: string;
  isAdmin: boolean;
  c: ThemeColors;
  s: Styles;
}) {
  const { data: comments = [], isLoading } = useFeedComments(post.id);
  const addComment = useAddComment(post.id);
  const deleteComment = useDeleteComment(post.id);
  const [text, setText] = useState('');

  const handleSend = async () => {
    if (!text.trim()) return;
    haptic.light();
    await addComment.mutateAsync(text.trim());
    setText('');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={s.sheetHeader}>
        <Text style={s.sheetTitle}>Comentarios</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <X size={22} color={c.textMuted} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.brand} style={{ margin: space[6] }} />
      ) : (
        <ScrollView contentContainerStyle={s.commentsList} showsVerticalScrollIndicator={false}>
          {comments.length === 0 && (
            <Text style={s.emptyComments}>Sin comentarios aún. ¡Sé el primero!</Text>
          )}
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
                >
                  <Trash2 size={14} color={c.textFaint} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

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
        >
          <Send size={16} color={colors.white} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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

  const handleLike = () => {
    haptic.selection();
    toggleLike.mutate(post.id);
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
                <Pin size={10} color="#b45309" strokeWidth={2} />
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
          <TouchableOpacity onPress={() => setMenuOpen(true)} activeOpacity={0.7} style={s.menuBtn}>
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
            <Image
              key={i}
              source={{ uri: url }}
              style={[
                s.imageItem,
                post.image_urls!.length === 1 ? s.imageItem1 : s.imageItem2,
              ]}
              resizeMode="cover"
            />
          ))}
        </View>
      )}

      {/* Videos */}
      {post.video_urls && post.video_urls.length > 0 && (
        <View style={{ marginHorizontal: space[4], marginBottom: space[3], gap: space[2] }}>
          {post.video_urls.map((url, i) => (
            <Video
              key={i}
              source={{ uri: url }}
              style={s.videoPlayer}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              isLooping={false}
            />
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity onPress={handleLike} activeOpacity={0.7} style={s.actionBtn}>
          <Heart
            size={20}
            color={post.liked_by_me ? '#ef4444' : c.textFaint}
            fill={post.liked_by_me ? '#ef4444' : 'none'}
            strokeWidth={2}
          />
          {post.likes_count > 0 && (
            <Text style={[s.actionCount, post.liked_by_me && { color: '#ef4444' }]}>
              {post.likes_count}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { haptic.light(); onComment(post); }}
          activeOpacity={0.7}
          style={s.actionBtn}
        >
          <MessageCircle size={19} color={c.textFaint} strokeWidth={2} />
          {post.comments_count > 0 && (
            <Text style={s.actionCount}>{post.comments_count}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Context menu modal */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={s.menuSheet}>
            {isAdmin && (
              <>
                <TouchableOpacity
                  style={s.menuItem}
                  onPress={() => { haptic.light(); togglePin.mutate(post.id); setMenuOpen(false); }}
                  activeOpacity={0.75}
                >
                  <Pin size={18} color={c.text} strokeWidth={2} />
                  <Text style={s.menuItemText}>{post.is_pinned ? 'Desfijar' : 'Fijar post'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.menuItem}
                  onPress={() => { haptic.light(); toggleHide.mutate(post.id); setMenuOpen(false); }}
                  activeOpacity={0.75}
                >
                  {post.is_hidden
                    ? <Eye size={18} color={c.text} strokeWidth={2} />
                    : <EyeOff size={18} color={c.text} strokeWidth={2} />}
                  <Text style={s.menuItemText}>{post.is_hidden ? 'Mostrar' : 'Ocultar'}</Text>
                </TouchableOpacity>
                <View style={s.menuDivider} />
              </>
            )}
            {(isOwner || isAdmin) && (
              <TouchableOpacity style={s.menuItem} onPress={handleDelete} activeOpacity={0.75}>
                <Trash2 size={18} color="#ef4444" strokeWidth={2} />
                <Text style={[s.menuItemText, { color: '#ef4444' }]}>Eliminar</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Composer ────────────────────────────────────────────────────────────────
function Composer({ user, c, s }: { user: { name: string; role: string; avatar_color?: string | null }; c: ThemeColors; s: Styles }) {
  const createPost = useCreatePost();
  const toast = useToast();
  const { data: myHorses } = useHorses();
  const insets = useSafeAreaInsets();
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
      setText('');
      setMedia([]);
      setSelectedHorseId(undefined);
      setType('general');
      setOpen(false);
      toast.success('Publicado');
    } catch {
      toast.error('No se pudo publicar. Intentá de nuevo.');
    }
  };

  if (!open) {
    return (
      <TouchableOpacity style={s.composerClosed} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Avatar name={user.name} colorId={user.avatar_color} size={34} s={s} />
        <Text style={s.composerPlaceholder}>¿Qué querés compartir?</Text>
        <Images size={20} color={c.textFaint} strokeWidth={2} />
      </TouchableOpacity>
    );
  }

  return (
    <>
    <Modal visible animationType="slide" onRequestClose={() => setOpen(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[s.composerModal, { paddingTop: insets.top }]}>
          <View style={s.composerModalHeader}>
            <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.7}>
              <Text style={s.composerCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={s.composerModalTitle}>Nueva publicación</Text>
            <TouchableOpacity
              onPress={handlePost}
              disabled={(!text.trim() && !media.length) || createPost.isPending}
              activeOpacity={0.75}
              style={[s.postBtn, (!text.trim() && !media.length) && { opacity: 0.4 }]}
            >
              <Text style={s.postBtnText}>{createPost.isPending ? '…' : 'Publicar'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
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

            <View style={s.composerRow}>
              <Avatar name={user.name} colorId={user.avatar_color} s={s} />
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

            {media.length > 0 && (
              <View style={[s.imageGrid, media.length === 1 ? s.imageGrid1 : s.imageGrid2, { marginHorizontal: space[4] }]}>
                {media.map((item, i) => (
                  <View key={i} style={media.length === 1 ? s.imageItem1 : s.imageItem2}>
                    {item.isVideo ? (
                      <Video
                        source={{ uri: item.uri }}
                        style={StyleSheet.absoluteFill}
                        resizeMode={ResizeMode.COVER}
                        useNativeControls={false}
                        isLooping={false}
                      />
                    ) : (
                      <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
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
                    >
                      <X size={14} color={colors.white} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>


          <View style={s.composerFooter}>
            <View style={s.footerLeft}>
              <TouchableOpacity onPress={pickFromLibrary} disabled={media.length >= 4} activeOpacity={0.7} style={s.photoBtn}>
                <Images size={20} strokeWidth={2} color={media.length >= 4 ? c.textFaint : c.textMuted} />
                <Text style={[s.photoBtnText, media.length >= 4 && { color: c.textFaint }]}>Galería</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openCamera} disabled={media.length >= 4} activeOpacity={0.7} style={[s.photoBtn, { marginLeft: space[5] }]}>
                <Camera size={20} strokeWidth={2} color={media.length >= 4 ? c.textFaint : c.textMuted} />
                <Text style={[s.photoBtnText, media.length >= 4 && { color: c.textFaint }]}>Cámara</Text>
              </TouchableOpacity>
            </View>
            {(myHorses?.length ?? 0) > 0 && (
              <TouchableOpacity onPress={() => setShowHorseSelect(true)} activeOpacity={0.7} style={s.tagBtn}>
                <HorseIcon size={16} color={c.textMuted} />
                <Text style={[s.tagBtnText, selectedHorse && { color: c.text }]} numberOfLines={1}>
                  {selectedHorse ? selectedHorse.name : 'Etiquetar caballo'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <Modal visible={showHorseSelect} transparent animationType="fade" onRequestClose={() => setShowHorseSelect(false)} statusBarTranslucent>
      <TouchableOpacity style={s.selectOverlay} activeOpacity={1} onPress={() => setShowHorseSelect(false)}>
        <Animated.View style={s.selectSheet} entering={SlideInDown.springify().damping(26).stiffness(190)}>
          <View style={s.selectHandle} />
          <Text style={s.selectTitle}>Etiquetar un caballo</Text>
          <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={s.selectRow} activeOpacity={0.7} onPress={() => { setSelectedHorseId(undefined); setShowHorseSelect(false); }}>
              <View style={[s.selectThumb, s.selectThumbNone]}>
                <X size={18} color={c.textFaint} strokeWidth={2} />
              </View>
              <Text style={[s.selectRowText, !selectedHorseId && s.selectRowTextActive]}>Ninguno</Text>
              {!selectedHorseId && <Check size={20} color={c.brand} strokeWidth={2} />}
            </TouchableOpacity>
            {(myHorses ?? []).map((h) => (
              <TouchableOpacity key={h.id} style={s.selectRow} activeOpacity={0.7} onPress={() => { setSelectedHorseId(h.id); setShowHorseSelect(false); }}>
                <View style={s.selectThumb}>
                  {h.image_url
                    ? <Image source={{ uri: h.image_url }} style={s.selectThumbImg} resizeMode="cover" />
                    : <Text style={s.selectThumbInitial}>{h.name[0]?.toUpperCase()}</Text>}
                </View>
                <Text style={[s.selectRowText, selectedHorseId === h.id && s.selectRowTextActive]} numberOfLines={1}>{h.name}</Text>
                {selectedHorseId === h.id && <Check size={20} color={c.brand} strokeWidth={2} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
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
  const { posts, isLoading, isFetchingMore, isRefreshing, loadMore, refresh } = useFeedPosts(
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
        <TouchableOpacity onPress={() => setSearchOpen(true)} hitSlop={8} activeOpacity={0.7}>
          <Search size={24} color={c.text} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/notificaciones')} hitSlop={8} activeOpacity={0.7}>
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
      {isLoading ? (
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
          onRefresh={refresh}
          refreshing={isRefreshing}
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
              <Text style={s.emptySub}>¡Sé el primero en compartir algo con tu comunidad!</Text>
            </View>
          }
        />
      )}

      {/* Comments sheet */}
      <Modal
        visible={!!commentPost}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCommentPost(null)}
      >
        {commentPost && (
          <CommentsSheet
            post={commentPost}
            onClose={() => setCommentPost(null)}
            currentUserId={user?.id ?? ''}
            isAdmin={isAdmin}
            c={c}
            s={s}
          />
        )}
      </Modal>

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
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  navTitle: { fontSize: text.xl, fontWeight: weight.semibold, fontFamily: fontFamily.semibold, color: c.text, letterSpacing: -0.3 },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: space[5] },

  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[3] },
  screenTitle: { fontSize: text['2xl'], fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.5 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#faf5ff', paddingHorizontal: space[2] + 2, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: '#e9d5ff' },
  adminBadgeText: { fontSize: 11, fontWeight: weight.semibold, color: '#7e22ce' },

  // Avatar
  avatar: { backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: colors.white, fontWeight: weight.bold },

  // Card
  card: { backgroundColor: c.surface, marginHorizontal: space[4], marginBottom: space[3], borderRadius: radius.xl, borderWidth: 1, borderColor: c.borderStrong, overflow: 'hidden', ...shadow.sm },
  cardPinned: { borderColor: '#fcd34d', backgroundColor: '#fffbeb' },
  cardHidden: { opacity: 0.55, borderColor: '#fca5a5' },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: space[4], paddingBottom: 0, gap: space[3] },
  authorInfo: { flex: 1 },
  authorRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  authorName: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  roleBadgeText: { fontSize: 10, fontWeight: weight.semibold },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  pinnedText: { fontSize: 10, color: '#b45309', fontWeight: weight.semibold },
  timeAgo: { fontSize: text.xs, color: c.textFaint },
  timeAgoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 },
  timeAgoHorse: { flexDirection: 'row', alignItems: 'center' },
  menuBtn: { padding: 4, marginTop: -2 },

  content: { fontSize: text.sm, color: c.text, lineHeight: 20, paddingHorizontal: space[4], paddingVertical: space[3] },

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
  menuOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  menuSheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: space[8], paddingTop: space[2] },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[5], paddingVertical: space[4] },
  menuItemText: { fontSize: text.base, color: c.text },
  menuDivider: { height: 1, backgroundColor: c.border, marginVertical: space[1] },

  // Composer closed
  composerClosed: { flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: c.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: c.borderStrong, padding: space[3], ...shadow.sm },
  composerPlaceholder: { flex: 1, fontSize: text.sm, color: c.textFaint },

  // Composer modal
  composerModal: { flex: 1, backgroundColor: c.surface },
  composerModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: c.border },
  composerModalTitle: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  composerCancel: { fontSize: text.sm, color: c.textMuted },
  postBtn: { backgroundColor: c.brand, paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.full },
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
  selectOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  selectSheet: { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: space[4], paddingBottom: 36, paddingHorizontal: space[4] },
  selectTitle: { fontSize: text.base, fontWeight: weight.bold, fontFamily: fontFamily.semibold, color: c.text, marginBottom: space[2], paddingHorizontal: space[2] },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[3] + 2, paddingHorizontal: space[2], borderBottomWidth: 1, borderBottomColor: c.border },
  selectRowText: { fontSize: text.base, color: c.textMuted, fontFamily: fontFamily.medium, flex: 1 },
  selectRowTextActive: { color: c.text, fontFamily: fontFamily.semibold },
  selectHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, marginBottom: space[3] },
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
  emptyBox: { alignItems: 'center', paddingTop: 60, paddingHorizontal: space[6], gap: space[3] },
  emptyIcon: { width: 84, height: 84, borderRadius: radius.full, backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginBottom: space[1] },
  emptyTitle: { fontSize: text.lg, fontWeight: weight.bold, color: c.text },
  emptySub: { fontSize: text.sm, color: c.textFaint, textAlign: 'center' },
});
