import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, ScrollView,
  Alert, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../../lib/auth';
import {
  useFeedPosts, useToggleLike, useDeletePost,
  useFeedComments, useAddComment, useDeleteComment,
  useTogglePin, useToggleHide,
} from '../../../hooks/use-feed';
import { useAgenda, APPOINTMENT_TYPES } from '../../../hooks/use-agenda';
import { useNotifications } from '../../../lib/notifications';
import { Routes } from '../../../lib/routes';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { Avatar as UserAvatar } from '../../../components/Avatar';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, shadow } from '../../../styles/tokens';
import { fontFamily } from '../../../styles/fonts';
import {
  Images, Trash2, Send, Pin, MoreHorizontal, Heart, MessageCircle,
  Eye, EyeOff, Newspaper, Bell,
  CalendarPlus, CalendarClock, ScanLine,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { HorseIcon } from '../../../components/icons/equine';
import { AppImage } from '../../../components/AppImage';
import { PostSkeleton } from '../../../components/Skeleton';
import { InlineSearch } from '../../../components/InlineSearch';
import { VetVerifiedBadge, isVetVerified } from '../../../components/VerifiedBadge';
import type { FeedPost, FeedComment } from '../../../../packages/shared/src/types';
import { ActionSheet } from '../../../components/ActionSheet';
import { ErrorState } from '../../../components/ErrorState';
import { FormSheet } from '../../../components/FormSheet';
import { useToast } from '../../../components/Toast';
import { fechaHumana, diaLargo } from '../../../lib/fechas';

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

function Avatar({ name, colorId, size = 38 }: { name: string; colorId?: string | null; size?: number }) {
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
  const toast = useToast();

  useEffect(() => { if (visible) setText(''); }, [visible]);

  const handleSend = async () => {
    if (!text.trim()) return;
    haptic.light();
    try {
      await addComment.mutateAsync(text.trim());
      setText('');
    } catch {
      haptic.error();
      toast.error('No se pudo enviar el comentario');
    }
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
              <Avatar name={cm.user?.name ?? 'U'} colorId={cm.user?.avatar_color} size={30} />
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
        <Avatar name={post.author?.name ?? 'U'} colorId={post.author?.avatar_color} />
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

// ─── Composer (disparador) ───────────────────────────────────────────────────
// El formulario en sí vive en pantalla completa (muro/nuevo.tsx); acá solo
// queda la fila que dispara el push.
function ComposerTrigger({ user, c, s }: { user: { name: string; avatar_color?: string | null }; c: ThemeColors; s: Styles }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={s.composerClosed}
      onPress={() => { haptic.selection(); router.push(Routes.muroNuevo as never); }}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Crear publicación"
    >
      <Avatar name={user.name} colorId={user.avatar_color} size={34} />
      <Text style={s.composerPlaceholder}>¿Qué querés compartir?</Text>
      <Images size={20} color={c.textFaint} strokeWidth={2} />
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

/**
 * Encabezado de Inicio: saludo, acciones rapidas y proximos turnos.
 * Es lo que separa un feed generico de un inicio con proposito (Uber/YPF):
 * la primera pantalla te saluda, te ofrece lo que viniste a hacer y te
 * adelanta lo que se viene.
 */
function InicioHeader({ c, s }: { c: ThemeColors; s: Styles }) {
  const router = useRouter();
  const { user } = useAuth();
  const { unread } = useNotifications();
  const { data: turnos } = useAgenda(true);
  const proximos = (turnos ?? []).filter(Boolean).slice(0, 5);

  const nombre = (user?.name ?? '').split(' ')[0] || 'Hola';
  const fecha = diaLargo(new Date().toISOString());

  const acciones = [
    { label: 'Evento', Icon: CalendarPlus, onPress: () => router.push('/eventos') },
    { label: 'Turno', Icon: CalendarClock, onPress: () => router.push('/agenda') },
    { label: 'Escanear', Icon: ScanLine, onPress: () => router.push('/escanear') },
    { label: 'Caballos', Icon: HorseIcon, onPress: () => router.push('/caballos') },
  ];

  return (
    <View>
      {/* Saludo */}
      <View style={s.inicioTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.inicioHola}>Hola, {nombre} 👋</Text>
          <Text style={s.inicioFecha}>{fecha}</Text>
        </View>
        <TouchableOpacity
          onPress={() => { haptic.selection(); router.push('/notificaciones'); }}
          hitSlop={8}
          style={s.inicioBell}
          accessibilityRole="button"
          accessibilityLabel={unread > 0 ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
        >
          <Bell size={23} color={c.text} strokeWidth={2} />
          {unread > 0 && (
            <View style={s.inicioBadge}>
              <Text style={s.inicioBadgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { haptic.selection(); router.push('/perfil'); }}
          accessibilityRole="button"
          accessibilityLabel="Mi perfil"
        >
          <UserAvatar name={user?.name ?? ''} avatarColor={user?.avatar_color} size={40} />
        </TouchableOpacity>
      </View>

      {/* Acciones rápidas */}
      <View style={s.inicioAcciones}>
        {acciones.map(({ label, Icon, onPress }) => (
          <TouchableOpacity
            key={label}
            style={s.inicioAccion}
            onPress={() => { haptic.selection(); onPress(); }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <View style={s.inicioAccionIcon}>
              <Icon size={22} color={c.brand} strokeWidth={2.1} />
            </View>
            <Text style={s.inicioAccionLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Próximos turnos */}
      {proximos.length > 0 && (
        <View style={s.inicioTurnos}>
          <View style={s.inicioTurnosHead}>
            <Text style={s.inicioSeccion}>Próximos turnos</Text>
            <TouchableOpacity onPress={() => { haptic.selection(); router.push('/agenda'); }} hitSlop={6}>
              <Text style={s.inicioVerTodo}>Ver agenda</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.inicioTurnosRow}>
            {proximos.map((t) => {
              const meta = APPOINTMENT_TYPES[t!.type] ?? APPOINTMENT_TYPES.otro;
              return (
                <TouchableOpacity
                  key={t!.id}
                  style={s.inicioTurno}
                  onPress={() => { haptic.selection(); router.push('/agenda'); }}
                  activeOpacity={0.85}
                >
                  <Text style={[s.inicioTurnoDia, { color: meta.color }]}>{fechaHumana(t!.scheduled_at)}</Text>
                  <Text style={s.inicioTurnoTitulo} numberOfLines={1}>{t!.title}</Text>
                  {t!.horse && <Text style={s.inicioTurnoCaballo} numberOfLines={1}>{t!.horse.name}</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function MuroTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const isAdmin = user?.role === 'admin';
  const { posts, isLoading, isError, isFetchingMore, isRefreshing, loadMore, refresh } = useFeedPosts(
    isAdmin ? { include_hidden: true } : undefined,
  );
  const [commentPost, setCommentPost] = useState<FeedPost | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const listRef = useRef<FlatList<FeedPost>>(null);
  useScrollToTop(listRef);

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

  const Navbar = <InicioHeader c={c} s={s} />;

  const ListHeader = (
    <View>
      {Navbar}
      <View style={{ paddingHorizontal: space[4], paddingBottom: space[3], paddingTop: space[2] }}>
        {user && <ComposerTrigger user={user} c={c} s={s} />}
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
          ref={listRef}
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
  // --- Inicio ---------------------------------------------------------------
  inicioTop: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[3],
  },
  inicioHola: { fontSize: text.xl, fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.6, fontFamily: fontFamily.semibold },
  inicioFecha: { fontSize: text.sm, color: c.textFaint, marginTop: 1, textTransform: 'capitalize' },
  inicioBell: { position: 'relative', padding: 4 },
  inicioBadge: {
    position: 'absolute', top: 0, right: -2,
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center',
  },
  inicioBadgeText: { fontSize: 10, fontWeight: weight.extrabold, color: colors.white },
  inicioAcciones: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: space[5], paddingBottom: space[4],
  },
  inicioAccion: { alignItems: 'center', gap: 6, width: 68 },
  inicioAccionIcon: {
    width: 54, height: 54, borderRadius: radius.full,
    backgroundColor: c.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  inicioAccionLabel: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  inicioTurnos: { paddingBottom: space[3] },
  inicioTurnosHead: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: space[4], marginBottom: space[2],
  },
  inicioSeccion: { fontSize: text.base, fontWeight: weight.bold, color: c.text, letterSpacing: -0.3 },
  inicioVerTodo: { fontSize: text.sm, fontWeight: weight.bold, color: c.brand },
  inicioTurnosRow: { paddingHorizontal: space[4], gap: space[2] + 2 },
  inicioTurno: {
    width: 150, borderRadius: radius.lg, padding: space[3],
    backgroundColor: c.surface,
    ...(c.isDark ? {} : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }),
  },
  inicioTurnoDia: { fontSize: text.xs, fontWeight: weight.extrabold, textTransform: 'uppercase', letterSpacing: 0.4 },
  inicioTurnoTitulo: { fontSize: text.sm, fontWeight: weight.bold, color: c.text, marginTop: 3 },
  inicioTurnoCaballo: { fontSize: text.xs, color: c.textMuted, marginTop: 1 },

  root: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 120 },

  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[3] },
  navTitle: { fontSize: text.xl, fontWeight: weight.semibold, fontFamily: fontFamily.semibold, color: c.text, letterSpacing: -0.3 },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: space[5] },

  // Avatar
  avatar: { backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: colors.white, fontWeight: weight.bold },

  // Card
  card: { backgroundColor: c.surface, marginHorizontal: space[4], marginBottom: space[3], borderRadius: radius.xl, overflow: 'hidden', ...(c.isDark ? {} : shadow.sm) },
  cardPinned: { backgroundColor: c.warningSoft },
  cardHidden: { opacity: 0.55 },

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
  videoPlayer: { width: '100%', height: 220, backgroundColor: '#000', borderRadius: radius.lg },

  // Composer closed (disparador de la pantalla completa)
  composerClosed: { flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: c.surface, borderRadius: radius.xl, padding: space[3], ...(c.isDark ? {} : shadow.sm) },
  composerPlaceholder: { flex: 1, fontSize: text.sm, color: c.textFaint },

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
