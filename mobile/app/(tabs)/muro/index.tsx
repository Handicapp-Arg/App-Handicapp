import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput,
  StyleSheet, ActivityIndicator,
  Alert, RefreshControl,
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
import { useAgenda, APPOINTMENT_TYPES } from '../../../hooks/use-agenda';
import { useHorses } from '../../../hooks/use-horses';
import { useBills, monthLabel } from '../../../hooks/use-billing';
import { useNotifications } from '../../../lib/notifications';
import { Routes } from '../../../lib/routes';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { formatMoney } from '../../../lib/currency';
import { Avatar as UserAvatar } from '../../../components/Avatar';
import { PressableScale } from '../../../components/PressableScale';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, shadow, touch } from '../../../styles/tokens';
import { entradaFila } from '../../../styles/motion';
import { fontFamily } from '../../../styles/fonts';
import {
  Trash2, Send, Pin, MoreHorizontal, Heart, MessageCircle,
  Eye, EyeOff, Bell, Plus, ChevronRight, FileText,
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
import { fechaHumana, diaLargo, hace, hora, vence } from '../../../lib/fechas';

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

// ─── Pendientes (tarjeta invertida) ──────────────────────────────────────────

/** Un pendiente ya normalizado: sale de datos reales (sanidad vencida o factura). */
type Pendiente = {
  id: string;
  titulo: string;
  detalle: string;
  /** Foto del caballo, cuando el pendiente tiene una. */
  fotoUrl?: string | null;
  accion: string;
  /** El principal se marca con el chip sólido; el resto con el chip velado. */
  solido: boolean;
  onPress: () => void;
};

/**
 * Chip sobre la tarjeta invertida. El "velado" no usa un rgba literal: apila un
 * velo del color del fondo con opacidad, así funciona igual en claro y oscuro
 * (donde la tarjeta invertida pasa a ser crema sobre negro).
 */
function ChipInverso({ label, solido, onPress, s }: {
  label: string; solido: boolean; onPress: () => void; s: Styles;
}) {
  return (
    <PressableScale
      onPress={() => { haptic.selection(); onPress(); }}
      style={[s.chipInv, solido && s.chipInvSolido]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {!solido && <View style={[StyleSheet.absoluteFill, s.velo]} />}
      <Text style={[s.chipInvText, solido && s.chipInvTextSolido]}>{label}</Text>
    </PressableScale>
  );
}

function TarjetaPendientes({ pendientes, c, s }: { pendientes: Pendiente[]; c: ThemeColors; s: Styles }) {
  return (
    <View style={s.pendientes}>
      <View style={s.pendientesHead}>
        <View style={s.puntoAlerta} />
        <Text style={s.pendientesHeadText}>
          {pendientes.length === 1 ? '1 cosa para resolver' : `${pendientes.length} cosas para resolver`}
        </Text>
      </View>

      {pendientes.map((p, i) => (
        <View key={p.id}>
          {i > 0 && <View style={s.divisorInv} />}
          <View style={s.pendienteFila}>
            {p.fotoUrl ? (
              <AppImage source={{ uri: p.fotoUrl }} style={s.pendienteThumb} contentFit="cover" />
            ) : (
              <View style={[s.pendienteThumb, s.pendienteThumbVacio]}>
                <View style={[StyleSheet.absoluteFill, s.velo]} />
                <FileText size={20} color={c.bg} strokeWidth={1.9} />
              </View>
            )}
            <View style={s.pendienteTexto}>
              <Text style={s.pendienteTitulo} numberOfLines={1}>{p.titulo}</Text>
              {!!p.detalle && <Text style={s.pendienteDetalle} numberOfLines={1}>{p.detalle}</Text>}
            </View>
            <ChipInverso label={p.accion} solido={p.solido} onPress={p.onPress} s={s} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Próximo turno ───────────────────────────────────────────────────────────

function TarjetaProximoTurno({ turno, onPress, c, s }: {
  turno: NonNullable<ReturnType<typeof useAgenda>['data']>[number];
  onPress: () => void;
  c: ThemeColors;
  s: Styles;
}) {
  const meta = APPOINTMENT_TYPES[turno.type] ?? APPOINTMENT_TYPES.otro;
  // El título lo escribe el usuario: si repite la etiqueta del tipo, no lo
  // mostramos dos veces.
  const bajada = [turno.title !== meta.label ? turno.title : '', fechaHumana(turno.scheduled_at)]
    .filter(Boolean).join(' · ');

  return (
    <PressableScale
      onPress={() => { haptic.selection(); onPress(); }}
      style={s.turno}
      accessibilityRole="button"
      accessibilityLabel={`Próximo turno: ${meta.label}${turno.horse ? `, ${turno.horse.name}` : ''}`}
    >
      <View style={s.turnoHora}>
        <Text style={s.turnoHoraText}>{hora(turno.scheduled_at)}</Text>
      </View>
      <View style={s.turnoTexto}>
        <Text style={s.turnoTitulo} numberOfLines={1}>
          {meta.label}{turno.horse ? ` · ${turno.horse.name}` : ''}
        </Text>
        {!!bajada && <Text style={s.turnoBajada} numberOfLines={1}>{bajada}</Text>}
      </View>
      <ChevronRight size={17} color={c.textFaint} strokeWidth={2.3} />
    </PressableScale>
  );
}

// ─── Fila del muro ───────────────────────────────────────────────────────────

/**
 * Una novedad del muro: miniatura a la izquierda, texto al costado. Es una fila
 * sobre el lienzo, no una tarjeta: la publicación no es un objeto autónomo, es
 * una línea del día (regla "el fondo es el lienzo").
 */
function FilaMuro({ post, currentUserId, isAdmin, onComment, c, s }: {
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

  const handleDelete = () => {
    Alert.alert('Eliminar post', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { haptic.medium(); deletePost.mutate(post.id); } },
    ]);
    setMenuOpen(false);
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
            <FeedVideo key={i} uri={url} style={s.videoPlayer} contentFit="contain" />
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
            onPress={() => { haptic.selection(); setMenuOpen(true); }}
            style={[s.accionBtn, s.accionMenu]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Más opciones de la publicación"
          >
            <MoreHorizontal size={18} color={c.textFaint} strokeWidth={2} />
          </PressableScale>
        )}
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

// ─── Encabezado del Inicio ───────────────────────────────────────────────────

/**
 * Encabezado de Inicio: saludo, lo que hay para resolver y el próximo turno.
 * Es lo que separa un feed genérico de un inicio con propósito: la primera
 * pantalla te saluda, te dice qué está pendiente y qué se viene.
 */
function InicioHeader({ c, s }: { c: ThemeColors; s: Styles }) {
  const router = useRouter();
  const { user } = useAuth();
  const { unread } = useNotifications();
  const { data: turnos } = useAgenda(true);
  const { data: caballos } = useHorses();
  const { data: facturas } = useBills();

  const nombre = (user?.name ?? '').split(' ')[0] || 'Hola';
  const fecha = diaLargo(new Date().toISOString());
  const proximoTurno = (turnos ?? []).filter(Boolean)[0];

  // Los pendientes salen de datos reales: sanidad en rojo (viene en el listado
  // de caballos) y facturas enviadas sin responder. Si no hay nada, la tarjeta
  // no se dibuja — no inventamos un "todo en orden" que el backend no afirma.
  const pendientes = useMemo<Pendiente[]>(() => {
    const deSanidad: Pendiente[] = (caballos ?? [])
      .filter((h) => h.health?.status === 'rojo')
      .map((h) => ({
        id: `sanidad-${h.id}`,
        titulo: `${h.name}, ${h.health!.name}`,
        detalle: vence(h.health!.next_due),
        fotoUrl: h.image_url,
        accion: 'Resolver',
        solido: true,
        onPress: () => router.push(Routes.caballo(h.id) as never),
      }));

    const deFacturas: Pendiente[] = (facturas ?? [])
      .filter((b) => b.status === 'enviada')
      .map((b) => ({
        id: `factura-${b.id}`,
        titulo: `Factura de ${monthLabel(b.month, b.year)}`,
        detalle: [b.horse?.name, formatMoney(b.total, b.currency)].filter(Boolean).join(' · '),
        accion: 'Ver',
        solido: false,
        onPress: () => router.push(Routes.factura(b.id) as never),
      }));

    return [...deSanidad, ...deFacturas].slice(0, 3);
  }, [caballos, facturas, router]);

  return (
    <View>
      <View style={s.saludo}>
        <View style={s.saludoTexto}>
          <Text style={s.saludoFecha}>{fecha}</Text>
          <Text style={s.saludoHola}>Hola, {nombre}</Text>
        </View>
        <PressableScale
          onPress={() => { haptic.selection(); router.push(Routes.notificaciones as never); }}
          style={s.campana}
          accessibilityRole="button"
          accessibilityLabel={unread > 0 ? `Avisos, ${unread} sin leer` : 'Avisos'}
        >
          <Bell size={21} color={c.text} strokeWidth={1.9} />
          {unread > 0 && <View style={s.campanaPunto} />}
        </PressableScale>
      </View>

      {pendientes.length > 0 && (
        <View style={s.bloque}>
          <TarjetaPendientes pendientes={pendientes} c={c} s={s} />
        </View>
      )}

      {proximoTurno && (
        <View style={s.bloque}>
          <TarjetaProximoTurno
            turno={proximoTurno}
            onPress={() => router.push(Routes.tabsAgenda as never)}
            c={c}
            s={s}
          />
        </View>
      )}

      <View style={s.seccion}>
        <Text style={s.seccionTitulo}>Novedades</Text>
        <PressableScale
          onPress={() => { haptic.selection(); router.push(Routes.muroNuevo as never); }}
          style={s.seccionBtn}
          accessibilityRole="button"
          accessibilityLabel="Crear publicación"
        >
          <Plus size={20} color={c.text} strokeWidth={2.1} />
        </PressableScale>
      </View>
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
    <Animated.View entering={entradaFila(index)}>
      <FilaMuro
        post={item}
        currentUserId={user?.id ?? ''}
        isAdmin={isAdmin}
        onComment={setCommentPost}
        c={c}
        s={s}
      />
    </Animated.View>
  ), [user?.id, isAdmin, c, s]);

  const Encabezado = <InicioHeader c={c} s={s} />;

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
        />
      )}

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
  list: { paddingBottom: 120 },
  bloque: { paddingHorizontal: space[4], paddingTop: space[4] },
  deshabilitado: { opacity: 0.4 },
  /** Velo del color del fondo: reemplaza cualquier rgba literal sobre la tarjeta invertida. */
  velo: { backgroundColor: c.bg, opacity: 0.13, borderRadius: radius.full },

  // --- Saludo ---------------------------------------------------------------
  saludo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space[3],
    paddingHorizontal: space[4], paddingTop: space[3],
  },
  saludoTexto: { flex: 1 },
  saludoFecha: { fontSize: text.sm, color: c.textMuted, textTransform: 'capitalize', fontFamily: fontFamily.regular },
  saludoHola: {
    fontSize: text['2xl'], fontWeight: weight.bold, color: c.text,
    letterSpacing: -1.1, marginTop: space[1], fontFamily: fontFamily.semibold,
  },
  campana: {
    width: 46, height: 46, borderRadius: radius.thumb,
    backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
    ...(c.isDark ? {} : shadow.sm),
  },
  campanaPunto: {
    position: 'absolute', top: 9, right: 10,
    width: 9, height: 9, borderRadius: radius.full,
    backgroundColor: c.danger,
    // El anillo del color de la tarjeta despega el punto del ícono.
    borderWidth: 2.5, borderColor: c.surface,
  },

  // --- Pendientes (superficie invertida) -----------------------------------
  pendientes: { backgroundColor: c.text, borderRadius: radius.sheet, padding: space[4] + 2 },
  pendientesHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  puntoAlerta: { width: 7, height: 7, borderRadius: radius.full, backgroundColor: c.danger },
  pendientesHeadText: { fontSize: text.sm, color: c.textFaint, fontFamily: fontFamily.regular },
  divisorInv: { height: 1, backgroundColor: c.bg, opacity: 0.1, marginVertical: space[3] + 2 },
  pendienteFila: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[3] + 2 },
  pendienteThumb: { width: 44, height: 44, borderRadius: radius.thumb - 1, overflow: 'hidden' },
  pendienteThumbVacio: { alignItems: 'center', justifyContent: 'center' },
  pendienteTexto: { flex: 1, minWidth: 0 },
  pendienteTitulo: { fontSize: text.base, fontWeight: weight.semibold, color: c.bg, fontFamily: fontFamily.semibold },
  pendienteDetalle: { fontSize: text.sm, color: c.textFaint, marginTop: 2, fontFamily: fontFamily.regular },
  chipInv: {
    height: 34, paddingHorizontal: space[3] + 1, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  chipInvSolido: { backgroundColor: c.bg },
  chipInvText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.bg, fontFamily: fontFamily.semibold },
  chipInvTextSolido: { color: c.text },

  // --- Próximo turno --------------------------------------------------------
  turno: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surface, borderRadius: radius['2xl'],
    paddingHorizontal: space[4], paddingVertical: space[4] - 1,
    ...(c.isDark ? {} : shadow.md),
  },
  turnoHora: {
    width: 46, height: 46, borderRadius: radius.thumb,
    backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center',
  },
  turnoHoraText: {
    fontSize: 15, fontWeight: weight.bold, color: c.brand,
    fontVariant: ['tabular-nums'], fontFamily: fontFamily.bold,
  },
  turnoTexto: { flex: 1, minWidth: 0 },
  turnoTitulo: { fontSize: text.base, fontWeight: weight.semibold, color: c.text, fontFamily: fontFamily.semibold },
  turnoBajada: { fontSize: text.sm, color: c.textMuted, marginTop: 2, fontFamily: fontFamily.regular },

  // --- Sección Novedades ----------------------------------------------------
  seccion: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[4], paddingTop: space[6], paddingBottom: space[3],
  },
  seccionTitulo: {
    fontSize: text.md, fontWeight: weight.bold, color: c.text,
    letterSpacing: -0.4, fontFamily: fontFamily.semibold,
  },
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
  filaContenido: { flex: 1, fontSize: text.base, color: c.text, lineHeight: 21, fontFamily: fontFamily.regular },
  filaMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  filaMeta: { fontSize: text.xs, color: c.textFaint, fontFamily: fontFamily.regular },
  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: c.warningSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full,
  },
  pinnedText: { fontSize: text.xs, color: c.warning, fontWeight: weight.semibold },
  filaVideos: { marginTop: space[3], marginLeft: 62 + space[3] + 1, gap: space[2] },
  // El video se recuesta sobre surfaceAlt (no sobre negro literal) para que la
  // caja funcione igual en claro y en oscuro.
  videoPlayer: { width: '100%', height: 200, backgroundColor: c.surfaceAlt, borderRadius: radius.lg },
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
