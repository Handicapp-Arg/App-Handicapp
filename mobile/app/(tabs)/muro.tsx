import { useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import { space, text, radius, weight, shadow } from '../../styles/tokens';
import type { FeedPost, FeedComment } from '../../../packages/shared/src/types';

const ROLE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  propietario: { label: 'Propietario', bg: '#eff6ff', color: '#1d4ed8' },
  establecimiento: { label: 'Establecimiento', bg: '#f0fdf4', color: '#15803d' },
  veterinario: { label: 'Veterinario', bg: '#faf5ff', color: '#7e22ce' },
  admin: { label: 'Admin', bg: '#f3f4f6', color: '#374151' },
};

function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

function timeAgo(date: string) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

// ─── Comments Sheet ──────────────────────────────────────────────────────────
function CommentsSheet({ post, onClose, currentUserId, isAdmin }: {
  post: FeedPost;
  onClose: () => void;
  currentUserId: string;
  isAdmin: boolean;
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
          <Ionicons name="close" size={22} color={colors.gray500} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ margin: space[6] }} />
      ) : (
        <ScrollView contentContainerStyle={s.commentsList} showsVerticalScrollIndicator={false}>
          {comments.length === 0 && (
            <Text style={s.emptyComments}>Sin comentarios aún. ¡Sé el primero!</Text>
          )}
          {(comments as FeedComment[]).map((c) => (
            <View key={c.id} style={s.commentRow}>
              <Avatar name={c.user?.name ?? 'U'} size={30} />
              <View style={s.commentBubble}>
                <Text style={s.commentAuthor}>{c.user?.name}</Text>
                <Text style={s.commentText}>{c.content}</Text>
              </View>
              {(c.user_id === currentUserId || isAdmin) && (
                <TouchableOpacity
                  onPress={() => { haptic.light(); deleteComment.mutate(c.id); }}
                  activeOpacity={0.7}
                  style={s.commentDelete}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.gray300} />
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
          placeholderTextColor={colors.gray400}
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
          <Ionicons name="send" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Post Card ───────────────────────────────────────────────────────────────
function PostItem({ post, currentUserId, isAdmin, onComment }: {
  post: FeedPost;
  currentUserId: string;
  isAdmin: boolean;
  onComment: (post: FeedPost) => void;
}) {
  const toggleLike = useToggleLike();
  const deletePost = useDeletePost();
  const togglePin = useTogglePin();
  const toggleHide = useToggleHide();
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwner = post.author_id === currentUserId;
  const badge = ROLE_BADGE[post.author?.role ?? ''];

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
        <Avatar name={post.author?.name ?? 'U'} />
        <View style={s.authorInfo}>
          <View style={s.authorRow}>
            <Text style={s.authorName}>{post.author?.name ?? 'Usuario'}</Text>
            {badge && (
              <View style={[s.roleBadge, { backgroundColor: badge.bg }]}>
                <Text style={[s.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            )}
            {post.is_pinned && (
              <View style={s.pinnedBadge}>
                <Ionicons name="pin" size={10} color="#b45309" />
                <Text style={s.pinnedText}>Fijado</Text>
              </View>
            )}
          </View>
          <Text style={s.timeAgo}>
            {timeAgo(post.created_at)}{post.horse ? ` · 🐴 ${post.horse.name}` : ''}
          </Text>
        </View>

        {(isOwner || isAdmin) && (
          <TouchableOpacity onPress={() => setMenuOpen(true)} activeOpacity={0.7} style={s.menuBtn}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.gray400} />
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
          <Ionicons
            name={post.liked_by_me ? 'heart' : 'heart-outline'}
            size={20}
            color={post.liked_by_me ? '#ef4444' : colors.gray400}
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
          <Ionicons name="chatbubble-outline" size={19} color={colors.gray400} />
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
                  <Ionicons name="pin-outline" size={18} color={colors.gray700} />
                  <Text style={s.menuItemText}>{post.is_pinned ? 'Desfijar' : 'Fijar post'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.menuItem}
                  onPress={() => { haptic.light(); toggleHide.mutate(post.id); setMenuOpen(false); }}
                  activeOpacity={0.75}
                >
                  <Ionicons name={post.is_hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.gray700} />
                  <Text style={s.menuItemText}>{post.is_hidden ? 'Mostrar' : 'Ocultar'}</Text>
                </TouchableOpacity>
                <View style={s.menuDivider} />
              </>
            )}
            {(isOwner || isAdmin) && (
              <TouchableOpacity style={s.menuItem} onPress={handleDelete} activeOpacity={0.75}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
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
function Composer({ user }: { user: { name: string; role: string } }) {
  const createPost = useCreatePost();
  const { data: myHorses } = useHorses();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ uri: string; isVideo: boolean }[]>([]);
  const [type, setType] = useState<'general' | 'horse_update' | 'announcement'>('general');
  const [selectedHorseId, setSelectedHorseId] = useState<string | undefined>(undefined);
  const isAdmin = user.role === 'admin';

  const pickMedia = async (mediaType: 'images' | 'videos') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para adjuntar fotos y videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4 - media.length,
      videoMaxDuration: 120,
    });
    if (!result.canceled) {
      const newItems = result.assets.map((a) => ({
        uri: a.uri,
        isVideo: a.type === 'video',
      }));
      setMedia((p) => [...p, ...newItems].slice(0, 4));
    }
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
    } catch {
      Alert.alert('Error', 'No se pudo publicar. Intentá de nuevo.');
    }
  };

  if (!open) {
    return (
      <TouchableOpacity style={s.composerClosed} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Avatar name={user.name} size={34} />
        <Text style={s.composerPlaceholder}>¿Qué querés compartir?</Text>
        <Ionicons name="image-outline" size={20} color={colors.gray300} />
      </TouchableOpacity>
    );
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.composerModal}>
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
                    <Text style={[s.typeBtnText, type === t && s.typeBtnTextActive]}>
                      {t === 'general' ? 'General' : t === 'horse_update' ? '🐴 Caballo' : '📌 Anuncio'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={s.composerRow}>
              <Avatar name={user.name} />
              <TextInput
                style={s.composerInput}
                placeholder="¿Qué querés compartir?"
                placeholderTextColor={colors.gray400}
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
                        <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.9)" />
                      </View>
                    )}
                    <TouchableOpacity
                      style={s.removePhoto}
                      onPress={() => setMedia((p) => p.filter((_, idx) => idx !== i))}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={14} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Horse tag picker */}
          {(myHorses?.length ?? 0) > 0 && (
            <View style={s.horsePickerRow}>
              <Ionicons name="paw-outline" size={14} color={colors.gray400} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
                <TouchableOpacity
                  style={[s.horseChip, !selectedHorseId && s.horseChipActive]}
                  onPress={() => setSelectedHorseId(undefined)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.horseChipText, !selectedHorseId && s.horseChipTextActive]}>Sin caballo</Text>
                </TouchableOpacity>
                {(myHorses ?? []).map((h) => (
                  <TouchableOpacity
                    key={h.id}
                    style={[s.horseChip, selectedHorseId === h.id && s.horseChipActive]}
                    onPress={() => setSelectedHorseId(h.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.horseChipText, selectedHorseId === h.id && s.horseChipTextActive]}>{h.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={s.composerFooter}>
            <TouchableOpacity onPress={() => pickMedia('images')} disabled={media.length >= 4} activeOpacity={0.75} style={s.photoBtn}>
              <Ionicons name="image-outline" size={22} color={media.length >= 4 ? colors.gray300 : colors.primary} />
              <Text style={[s.photoBtnText, media.length >= 4 && { color: colors.gray300 }]}>Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pickMedia('videos')} disabled={media.length >= 4} activeOpacity={0.75} style={[s.photoBtn, { marginLeft: space[4] }]}>
              <Ionicons name="videocam-outline" size={22} color={media.length >= 4 ? colors.gray300 : colors.primary} />
              <Text style={[s.photoBtnText, media.length >= 4 && { color: colors.gray300 }]}>Video</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function MuroTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { posts, isLoading, isFetchingMore, isRefreshing, loadMore, refresh } = useFeedPosts(
    isAdmin ? { include_hidden: true } : undefined,
  );
  const [commentPost, setCommentPost] = useState<FeedPost | null>(null);

  const renderItem = useCallback(({ item }: { item: FeedPost }) => (
    <PostItem
      post={item}
      currentUserId={user?.id ?? ''}
      isAdmin={isAdmin}
      onComment={setCommentPost}
    />
  ), [user?.id, isAdmin]);

  const ListHeader = (
    <View style={{ paddingHorizontal: space[4], paddingBottom: space[3] }}>
      <View style={s.screenHeader}>
        <Text style={s.screenTitle}>Muro</Text>
        {isAdmin && (
          <View style={s.adminBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#7e22ce" />
            <Text style={s.adminBadgeText}>Moderación</Text>
          </View>
        )}
      </View>
      {user && <Composer user={user} />}
    </View>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
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
              ? <ActivityIndicator color={colors.gray300} style={{ marginVertical: space[4] }} />
              : null
          }
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="newspaper-outline" size={52} color={colors.gray300} />
              <Text style={s.emptyTitle}>Todavía no hay publicaciones</Text>
              <Text style={s.emptySub}>¡Sé el primero en compartir algo!</Text>
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
          />
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: space[10] },

  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[3] },
  screenTitle: { fontSize: text['2xl'], fontWeight: weight.extrabold, color: colors.gray900, letterSpacing: -0.5 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#faf5ff', paddingHorizontal: space[2] + 2, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: '#e9d5ff' },
  adminBadgeText: { fontSize: 11, fontWeight: weight.semibold, color: '#7e22ce' },

  // Avatar
  avatar: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: colors.white, fontWeight: weight.bold },

  // Card
  card: { backgroundColor: colors.white, marginHorizontal: space[4], marginBottom: space[3], borderRadius: radius.xl, borderWidth: 1, borderColor: colors.gray200, overflow: 'hidden', ...shadow.sm },
  cardPinned: { borderColor: '#fcd34d', backgroundColor: '#fffbeb' },
  cardHidden: { opacity: 0.55, borderColor: '#fca5a5' },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: space[4], paddingBottom: 0, gap: space[3] },
  authorInfo: { flex: 1 },
  authorRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  authorName: { fontSize: text.sm, fontWeight: weight.bold, color: colors.gray900 },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  roleBadgeText: { fontSize: 10, fontWeight: weight.semibold },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  pinnedText: { fontSize: 10, color: '#b45309', fontWeight: weight.semibold },
  timeAgo: { fontSize: text.xs, color: colors.gray400, marginTop: 2 },
  menuBtn: { padding: 4, marginTop: -2 },

  content: { fontSize: text.sm, color: colors.gray800, lineHeight: 20, paddingHorizontal: space[4], paddingVertical: space[3] },

  imageGrid: { overflow: 'hidden', marginHorizontal: space[4], marginBottom: space[3], borderRadius: radius.lg, gap: 2 },
  imageGrid1: {},
  imageGrid2: { flexDirection: 'row', flexWrap: 'wrap' },
  imageItem: {},
  imageItem1: { width: '100%', height: 200, borderRadius: radius.lg },
  imageItem2: { width: '49%', height: 120, borderRadius: radius.md },

  actions: { flexDirection: 'row', gap: space[5], paddingHorizontal: space[4], paddingVertical: space[3], borderTopWidth: 1, borderTopColor: colors.gray100 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray400 },

  // Menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  menuSheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: space[8], paddingTop: space[2] },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[5], paddingVertical: space[4] },
  menuItemText: { fontSize: text.base, color: colors.gray700 },
  menuDivider: { height: 1, backgroundColor: colors.gray100, marginVertical: space[1] },

  // Composer closed
  composerClosed: { flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.gray200, padding: space[3], ...shadow.sm },
  composerPlaceholder: { flex: 1, fontSize: text.sm, color: colors.gray400 },

  // Composer modal
  composerModal: { flex: 1, backgroundColor: colors.white },
  composerModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  composerModalTitle: { fontSize: text.base, fontWeight: weight.bold, color: colors.gray900 },
  composerCancel: { fontSize: text.sm, color: colors.gray500 },
  postBtn: { backgroundColor: colors.primary, paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.full },
  postBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  typeRow: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3] },
  typeBtn: { paddingHorizontal: space[3], paddingVertical: space[1] + 2, borderRadius: radius.full, borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.white },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray500 },
  typeBtnTextActive: { color: colors.white },
  composerRow: { flexDirection: 'row', gap: space[3], padding: space[4], alignItems: 'flex-start' },
  composerInput: { flex: 1, fontSize: text.base, color: colors.gray900, minHeight: 100 },
  horsePickerRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[2], borderTopWidth: 1, borderTopColor: colors.gray50 },
  horseChip: { borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: 5, borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.white },
  horseChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  horseChipText: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray600 },
  horseChipTextActive: { color: colors.white },
  composerFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.gray100, paddingHorizontal: space[4], paddingVertical: space[3] },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  photoBtnText: { fontSize: text.sm, color: colors.primary, fontWeight: weight.semibold },
  removePhoto: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.full, padding: 3 },
  videoIndicator: { position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  videoPlayer: { width: '100%', height: 220, backgroundColor: '#000', borderRadius: radius.lg },

  // Comments sheet
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  sheetTitle: { fontSize: text.base, fontWeight: weight.bold, color: colors.gray900 },
  commentsList: { padding: space[4], gap: space[3] },
  emptyComments: { textAlign: 'center', color: colors.gray400, fontSize: text.sm, paddingVertical: space[6] },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  commentBubble: { flex: 1, backgroundColor: colors.gray50, borderRadius: radius.lg, paddingHorizontal: space[3], paddingVertical: space[2] },
  commentAuthor: { fontSize: 11, fontWeight: weight.bold, color: colors.gray700, marginBottom: 2 },
  commentText: { fontSize: text.sm, color: colors.gray800 },
  commentDelete: { padding: space[1], marginTop: space[2] },
  commentInput: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3], borderTopWidth: 1, borderTopColor: colors.gray100, alignItems: 'flex-end' },
  commentInputField: { flex: 1, backgroundColor: colors.gray50, borderRadius: radius.xl, paddingHorizontal: space[3], paddingVertical: space[2] + 2, fontSize: text.sm, color: colors.gray900, maxHeight: 100 },
  sendBtn: { backgroundColor: colors.primary, borderRadius: radius.full, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },

  // Empty
  emptyBox: { alignItems: 'center', paddingTop: 60, paddingHorizontal: space[6], gap: space[3] },
  emptyTitle: { fontSize: text.lg, fontWeight: weight.bold, color: colors.gray700 },
  emptySub: { fontSize: text.sm, color: colors.gray400, textAlign: 'center' },
});
