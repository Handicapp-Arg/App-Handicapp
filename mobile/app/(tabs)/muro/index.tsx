import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput,
  StyleSheet, ActivityIndicator,
  Alert, RefreshControl, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAuth } from '../../../lib/auth';
import {
  useFeedPosts, useToggleLike, useDeletePost,
  useFeedComments, useAddComment, useDeleteComment,
  useTogglePin, useToggleHide,
} from '../../../hooks/use-feed';
import { Routes } from '../../../lib/routes';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { Avatar as UserAvatar } from '../../../components/Avatar';
import { PressableScale } from '../../../components/PressableScale';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, shadow, touch } from '../../../styles/tokens';
import { entradaLista } from '../../../styles/motion';
import { fontFamily } from '../../../styles/fonts';
import {
  Trash2, Send, Pin, MoreHorizontal, Heart, MessageCircle,
  Eye, EyeOff, Plus, Play,
} from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { AppImage } from '../../../components/AppImage';
import { Skeleton } from '../../../components/Skeleton';
import { InlineSearch } from '../../../components/InlineSearch';
import { VetVerifiedBadge, isVetVerified } from '../../../components/VerifiedBadge';
import type { FeedPost, FeedComment } from '../../../../packages/shared/src/types';
import { ActionSheet } from '../../../components/ActionSheet';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { FormSheet } from '../../../components/FormSheet';
import { useToast } from '../../../components/Toast';
import { hace } from '../../../lib/fechas';

/**
 * Reproductor real (expo-video; expo-av está deprecado). Se monta recién cuando
 * el usuario pidió ver el video: `useVideoPlayer` abre un reproductor NATIVO, y
 * dentro de una celda reciclada de la lista eso significaba un decodificador
 * vivo por cada video que pasara por pantalla. Al desmontarse, el hook libera
 * el player solo, así que salir de la vista ya no deja nada corriendo.
 */
function FeedVideoPlayer({ uri, style, contentFit = 'contain', controls = true }: {
  uri: string; style: import('react-native').StyleProp<import('react-native').ViewStyle>;
  contentFit?: 'contain' | 'cover';
  controls?: boolean;
}) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; p.play(); });
  return (
    <VideoView
      player={player}
      style={style}
      contentFit={contentFit}
      nativeControls={controls}
    />
  );
}

/** Video del feed: caja quieta con botón de play hasta que alguien lo toca. */
function FeedVideo({ uri, style, contentFit = 'contain', controls = true, s }: {
  uri: string; style: import('react-native').StyleProp<import('react-native').ViewStyle>;
  contentFit?: 'contain' | 'cover';
  controls?: boolean;
  s: Styles;
}) {
  const [reproduciendo, setReproduciendo] = useState(false);

  if (!reproduciendo) {
    return (
      <Pressable
        style={style}
        onPress={() => { haptic.light(); setReproduciendo(true); }}
        accessibilityRole="button"
        accessibilityLabel="Reproducir video"
      >
        <View style={s.videoPoster}>
          <View style={s.videoPlayBtn}>
            <Play size={20} color={colors.white} fill={colors.white} strokeWidth={0} />
          </View>
        </View>
      </Pressable>
    );
  }

  return <FeedVideoPlayer uri={uri} style={style} contentFit={contentFit} controls={controls} />;
}

function Avatar({ name, colorId, size = 38 }: { name: string; colorId?: string | null; size?: number }) {
  return <UserAvatar name={name} avatarColor={colorId} size={size} />;
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
  const [borrador, setBorrador] = useState('');
  const toast = useToast();

  useEffect(() => { if (visible) setBorrador(''); }, [visible]);

  const handleSend = async () => {
    if (!borrador.trim()) return;
    haptic.light();
    try {
      await addComment.mutateAsync(borrador.trim());
      setBorrador('');
    } catch {
      haptic.error();
      toast.error('No se pudo enviar el comentario');
    }
  };

  const puedeEnviar = !!borrador.trim() && !addComment.isPending;

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
            value={borrador}
            onChangeText={setBorrador}
            multiline
          />
          <PressableScale
            onPress={handleSend}
            disabled={!puedeEnviar}
            style={[s.sendBtn, !puedeEnviar && s.deshabilitado]}
            accessibilityRole="button"
            accessibilityLabel="Enviar comentario"
          >
            <Send size={16} color={colors.white} strokeWidth={2} />
          </PressableScale>
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
              <View style={s.commentBody}>
                <View style={s.commentAuthorRow}>
                  <Text style={s.commentAuthor}>{cm.user?.name}</Text>
                  {isVetVerified(cm.user) && <VetVerifiedBadge />}
                </View>
                <Text style={s.commentText}>{cm.content}</Text>
              </View>
              {(cm.user_id === currentUserId || isAdmin) && (
                <PressableScale
                  onPress={() => { haptic.light(); deleteComment.mutate(cm.id); }}
                  style={s.commentDelete}
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar comentario"
                  hitSlop={8}
                >
                  <Trash2 size={14} color={c.textFaint} strokeWidth={2} />
                </PressableScale>
              )}
            </View>
          ))}
        </>
      )}
    </FormSheet>
  );
}

// ─── Fila del muro ───────────────────────────────────────────────────────────

/**
 * Una novedad del muro: miniatura a la izquierda, texto al costado. Es una fila
 * sobre el lienzo, no una tarjeta: la publicación no es un objeto autónomo, es
 * una línea del día (regla "el fondo es el lienzo").
 *
 * Memoizada: es la celda de una lista larga y, sin esto, cualquier estado de la
 * pantalla (abrir un menú, abrir comentarios) redibujaba todas las filas vivas.
 * El menú de acciones NO vive acá: ver la nota en `MuroTab`.
 */
const FilaMuro = memo(function FilaMuro({ post, currentUserId, isAdmin, onComment, onMenu, c, s }: {
  post: FeedPost;
  currentUserId: string;
  isAdmin: boolean;
  onComment: (post: FeedPost) => void;
  onMenu: (post: FeedPost) => void;
  c: ThemeColors;
  s: Styles;
}) {
  const toggleLike = useToggleLike();

  const isOwner = post.author_id === currentUserId;
  const fotos = post.image_urls ?? [];
  const videos = post.video_urls ?? [];

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

  const meta = [
    post.author?.name ?? 'Usuario',
    post.horse?.name ?? '',
    hace(post.created_at),
  ].filter(Boolean).join(' · ');

  return (
    <View style={[s.fila, post.is_hidden && s.filaOculta]}>
      <PressableScale
        onPress={() => { haptic.light(); onComment(post); }}
        style={s.filaCuerpo}
        accessibilityRole="button"
        accessibilityLabel={`Publicación de ${post.author?.name ?? 'un usuario'}`}
      >
        {/* Miniatura: la primera foto; si no hay, la identidad del autor. */}
        {fotos.length > 0 ? (
          <View style={s.filaThumbWrap}>
            <AppImage source={{ uri: fotos[0] }} style={s.filaThumb} contentFit="cover" />
            {fotos.length > 1 && (
              <View style={s.filaThumbMas}>
                <Text style={s.filaThumbMasText}>+{fotos.length - 1}</Text>
              </View>
            )}
          </View>
        ) : (
          <UserAvatar name={post.author?.name ?? 'U'} avatarColor={post.author?.avatar_color} size={62} />
        )}

        <View style={s.filaTexto}>
          <View style={s.filaTituloRow}>
            <Text style={s.filaContenido} numberOfLines={4}>{post.content}</Text>
          </View>

          <View style={s.filaMetaRow}>
            {isVetVerified(post.author) && <VetVerifiedBadge />}
            {post.is_pinned && (
              <View style={s.pinnedBadge}>
                <Pin size={10} color={c.warning} strokeWidth={2} />
                <Text style={s.pinnedText}>Fijado</Text>
              </View>
            )}
            <Text style={s.filaMeta} numberOfLines={1}>{meta}</Text>
          </View>
        </View>
      </PressableScale>

      {/* Videos: no entran en una miniatura de 62, van debajo del texto. */}
      {videos.length > 0 && (
        <View style={s.filaVideos}>
          {videos.map((url, i) => (
            <FeedVideo key={i} uri={url} style={s.videoPlayer} contentFit="contain" s={s} />
          ))}
        </View>
      )}

      <View style={s.filaAcciones}>
        <PressableScale
          onPress={handleLike}
          style={s.accionBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Quitar me gusta' : 'Me gusta'}
        >
          <Heart
            size={17}
            color={liked ? c.danger : c.textFaint}
            fill={liked ? c.danger : 'none'}
            strokeWidth={2}
          />
          {totalLikes > 0 && (
            <Text style={[s.accionCount, liked && { color: c.danger }]}>{totalLikes}</Text>
          )}
        </PressableScale>

        <PressableScale
          onPress={() => { haptic.light(); onComment(post); }}
          style={s.accionBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Ver comentarios"
        >
          <MessageCircle size={17} color={c.textFaint} strokeWidth={2} />
          {post.comments_count > 0 && (
            <Text style={s.accionCount}>{post.comments_count}</Text>
          )}
        </PressableScale>

        {(isOwner || isAdmin) && (
          <PressableScale
            onPress={() => { haptic.selection(); onMenu(post); }}
            style={[s.accionBtn, s.accionMenu]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Más opciones de la publicación"
          >
            <MoreHorizontal size={18} color={c.textFaint} strokeWidth={2} />
          </PressableScale>
        )}
      </View>
    </View>
  );
});

/** Misma silueta que `FilaMuro`: miniatura 62 + dos líneas + meta. */
function FilaMuroSkeleton({ s }: { s: Styles }) {
  return (
    <View style={s.fila}>
      <View style={s.filaCuerpo}>
        <Skeleton width={62} height={62} borderRadius={radius.xl} />
        <View style={s.filaTexto}>
          <Skeleton height={14} width="92%" />
          <Skeleton height={14} width="64%" style={{ marginTop: 6 }} />
          <Skeleton height={11} width="45%" style={{ marginTop: 10 }} />
        </View>
      </View>
    </View>
  );
}

// ─── Encabezado del muro ─────────────────────────────────────────────────────

/**
 * El saludo, los pendientes y el próximo turno se mudaron a `(tabs)/inicio`:
 * el muro dejó de ser la pantalla de arranque y hoy no tiene puerta de entrada
 * (ni barra ni "Más"). Queda con su propio título grande, como cualquier índice,
 * para que el día que vuelva a habilitarse no haya que rearmarlo.
 *
 * Memoizado: es el `ListHeaderComponent`, y sin esto cualquier estado del feed
 * (abrir un menú, abrir comentarios) lo redibujaba entero en cada scroll.
 */
const MuroHeader = memo(function MuroHeader({ c, s }: { c: ThemeColors; s: Styles }) {
  const router = useRouter();
  return (
    <View style={s.seccion}>
      <Text style={s.pageTitle}>Novedades</Text>
      <PressableScale
        onPress={() => { haptic.selection(); router.push(Routes.muroNuevo as never); }}
        style={s.seccionBtn}
        accessibilityRole="button"
        accessibilityLabel="Crear publicación"
      >
        <Plus size={20} color={c.text} strokeWidth={2.1} />
      </PressableScale>
    </View>
  );
});

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
  // Un solo menú para toda la lista: antes cada fila montaba su ActionSheet y,
  // aunque cerrado no dibuje nada, sus hooks corrían igual (shared values,
  // estilos animados y un gesto nuevo por fila). Ahora la fila sólo avisa cuál
  // se tocó y el menú vive una sola vez, acá.
  const [postAbierto, setPostAbierto] = useState<FeedPost | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const listRef = useRef<FlatList<FeedPost>>(null);
  useScrollToTop(listRef);

  // Las mutaciones del menú también suben de nivel: una instancia, no una por fila.
  const deletePost = useDeletePost();
  const togglePin = useTogglePin();
  const toggleHide = useToggleHide();

  const cerrarMenu = useCallback(() => setPostAbierto(null), []);

  const pedirBorrar = useCallback((post: FeedPost) => {
    Alert.alert('Eliminar post', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { haptic.medium(); deletePost.mutate(post.id); } },
    ]);
  }, [deletePost]);

  const accionesMenu = useMemo(() => {
    const post = postAbierto;
    if (!post) return [];
    const isOwner = post.author_id === user?.id;
    return [
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
        onPress: () => pedirBorrar(post),
      }] : []),
    ];
  }, [postAbierto, user?.id, isAdmin, togglePin, toggleHide, pedirBorrar]);

  const renderItem = useCallback(({ item }: { item: FeedPost }) => (
    <FilaMuro
      post={item}
      currentUserId={user?.id ?? ''}
      isAdmin={isAdmin}
      onComment={setCommentPost}
      onMenu={setPostAbierto}
      c={c}
      s={s}
    />
  ), [user?.id, isAdmin, c, s]);

  const Encabezado = useMemo(() => <MuroHeader c={c} s={s} />, [c, s]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {isError && posts.length === 0 ? (
        <ErrorState onRetry={() => refresh()} />
      ) : isLoading ? (
        <View>
          {Encabezado}
          <FilaMuroSkeleton s={s} />
          <FilaMuroSkeleton s={s} />
          <FilaMuroSkeleton s={s} />
        </View>
      ) : (
        // Entra la lista entera, una vez, desde el contenedor: animar cada celda
        // en el renderItem revivía la animación sobre vistas recicladas.
        <Animated.View entering={entradaLista()} style={s.flex}>
          <FlatList
            ref={listRef}
            data={posts}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={Encabezado}
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
              <EmptyState
                icon="newspaper-outline"
                title="Todavía no hay publicaciones"
                message="Compartí una novedad, un logro o una foto y empezá la conversación con tu comunidad."
              />
            }
            // Celdas caras (fotos, videos, acciones): pocas por tanda y ventana
            // corta, para que el scrollear no tenga que montar de más.
            initialNumToRender={5}
            maxToRenderPerBatch={4}
            windowSize={5}
          />
        </Animated.View>
      )}

      <ActionSheet
        visible={!!postAbierto}
        onClose={cerrarMenu}
        acciones={accionesMenu}
      />

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
  /** Contenedor de la lista: sólo existe para animar la entrada del conjunto. */
  flex: { flex: 1 },
  list: { paddingBottom: 120 },
  deshabilitado: { opacity: 0.4 },
  // --- Encabezado ------------------------------------------------------------
  seccion: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: space[3], paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[4],
  },
  pageTitle: {
    flex: 1, fontSize: text['2xl'], fontWeight: weight.bold, color: c.text,
    letterSpacing: -1.1, fontFamily: fontFamily.semibold,
  },
  // Botón cuadrado de índice: negro sobre la superficie, no cuero — crear desde
  // un índice no es la acción principal de la pantalla.
  seccionBtn: {
    width: touch.min, height: touch.min, borderRadius: radius.thumb,
    backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
    ...(c.isDark ? {} : shadow.sm),
  },

  // --- Fila del muro --------------------------------------------------------
  fila: { paddingHorizontal: space[4], paddingBottom: space[5] },
  filaOculta: { opacity: 0.55 },
  filaCuerpo: { flexDirection: 'row', gap: space[3] + 1, alignItems: 'flex-start' },
  filaThumbWrap: { width: 62, height: 62, borderRadius: radius.xl, overflow: 'hidden' },
  filaThumb: { width: '100%', height: '100%' },
  filaThumbMas: {
    position: 'absolute', right: 0, bottom: 0,
    paddingHorizontal: 6, paddingVertical: 2,
    borderTopLeftRadius: radius.sm, backgroundColor: c.overlay,
  },
  filaThumbMasText: { fontSize: text.xs, fontWeight: weight.bold, color: colors.white },
  filaTexto: { flex: 1, minWidth: 0, paddingTop: 2 },
  filaTituloRow: { flexDirection: 'row', alignItems: 'center' },
  filaContenido: { flex: 1, fontSize: text.base, color: c.text, lineHeight: 21 },
  filaMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  filaMeta: { fontSize: text.xs, color: c.textFaint },
  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: c.warningSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full,
  },
  pinnedText: { fontSize: text.xs, color: c.warning, fontWeight: weight.semibold },
  filaVideos: { marginTop: space[3], marginLeft: 62 + space[3] + 1, gap: space[2] },
  // El video se recuesta sobre surfaceAlt (no sobre negro literal) para que la
  // caja funcione igual en claro y en oscuro.
  videoPlayer: { width: '100%', height: 200, backgroundColor: c.surfaceAlt, borderRadius: radius.lg },
  // La caja previa ocupa exactamente el lugar del reproductor, así montarlo no
  // mueve nada de lo que ya está en pantalla.
  videoPoster: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  videoPlayBtn: {
    width: 52, height: 52, borderRadius: radius.full,
    backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center',
  },
  filaAcciones: {
    flexDirection: 'row', alignItems: 'center', gap: space[5],
    marginTop: space[2], marginLeft: 62 + space[3] + 1,
  },
  accionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  accionMenu: { marginLeft: 'auto' },
  accionCount: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textFaint },

  // --- Hoja de comentarios --------------------------------------------------
  emptyComments: { textAlign: 'center', color: c.textFaint, fontSize: text.sm, paddingVertical: space[6] },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], paddingVertical: space[2] },
  commentBody: { flex: 1 },
  commentAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  commentAuthor: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  commentText: { fontSize: text.md, color: c.text, lineHeight: 23 },
  commentDelete: { padding: space[1], marginTop: space[2] },
  commentInput: {
    flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3],
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, alignItems: 'flex-end',
  },
  commentInputField: {
    flex: 1, backgroundColor: c.surfaceAlt, borderRadius: radius.field,
    paddingHorizontal: space[3], paddingVertical: space[2] + 2,
    fontSize: text.md, color: c.text, maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: c.brand, borderRadius: radius.full,
    width: touch.min, height: touch.min, justifyContent: 'center', alignItems: 'center',
  },
});
