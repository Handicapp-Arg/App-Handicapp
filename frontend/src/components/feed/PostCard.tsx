'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Heart, MessageCircle, Trash2, Pin, EyeOff, Eye, MoreHorizontal, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeedPost, FeedComment } from '@/types';
import { useAuth } from '@/lib/auth-context';
import {
  useToggleLike, useDeletePost, useTogglePin, useToggleHide,
  useFeedComments, useAddComment, useDeleteComment,
} from '@/hooks/use-feed';

// ─── Role config ───────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; gradient: string; badge: string }> = {
  propietario:    { label: 'Propietario',    gradient: 'from-blue-500 to-blue-700',     badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' },
  establecimiento:{ label: 'Establecimiento',gradient: 'from-emerald-500 to-emerald-700',badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' },
  veterinario:    { label: 'Veterinario',    gradient: 'from-violet-500 to-violet-700', badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100' },
  admin:          { label: 'Admin',          gradient: 'from-slate-500 to-slate-700',   badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
};

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, role, size = 'md' }: { name: string; role?: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const gradClass = ROLE_CONFIG[role ?? '']?.gradient ?? 'from-slate-500 to-slate-700';
  return (
    <div className={cn(
      'rounded-full bg-gradient-to-br text-white font-bold flex items-center justify-center flex-shrink-0 shadow-sm',
      gradClass,
      size === 'md' ? 'h-10 w-10 text-sm' : 'h-7 w-7 text-[11px]',
    )}>
      {initials}
    </div>
  );
}

// ─── Image grid ────────────────────────────────────────────────────────────────
function ImageGrid({ urls }: { urls: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const count = urls.length;

  return (
    <>
      <div className={cn(
        'grid gap-1 rounded-xl overflow-hidden',
        count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2' : count === 3 ? 'grid-cols-3' : 'grid-cols-2',
      )}>
        {urls.slice(0, 4).map((url, i) => (
          <div
            key={i}
            className={cn(
              'relative bg-gray-100 cursor-pointer overflow-hidden group',
              count === 1 ? 'aspect-video' : 'aspect-square',
              count === 3 && i === 0 ? 'col-span-2 aspect-video' : '',
            )}
            onClick={() => setLightbox(url)}
          >
            <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-300" />
            {i === 3 && count > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xl backdrop-blur-sm">
                +{count - 4}
              </div>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-5 right-5 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
            <X className="h-5 w-5" />
          </button>
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

// ─── Comments ──────────────────────────────────────────────────────────────────
function CommentsSection({ postId, currentUserId }: { postId: string; currentUserId: string }) {
  const { data: comments = [], isLoading } = useFeedComments(postId);
  const addComment = useAddComment(postId);
  const deleteComment = useDeleteComment(postId);
  const { user } = useAuth();
  const [text, setText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await addComment.mutateAsync(text.trim());
    setText('');
  };

  return (
    <div className="pt-3 border-t border-gray-100 space-y-3">
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-9 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {comments.map((c: FeedComment) => (
            <div key={c.id} className="flex gap-2.5 group">
              <Avatar name={c.user?.name ?? 'U'} role={c.user?.role} size="sm" />
              <div className="flex-1 min-w-0 bg-gray-50 rounded-xl px-3 py-2">
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-xs font-semibold text-gray-900">{c.user?.name}</span>
                  <span className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(c.created_at), { addSuffix: false, locale: es })}</span>
                </div>
                <p className="text-sm text-gray-700 leading-snug">{c.content}</p>
              </div>
              {(c.user_id === currentUserId || user?.role === 'admin') && (
                <button
                  onClick={() => deleteComment.mutate(c.id)}
                  className="opacity-0 group-hover:opacity-100 self-center p-1 text-gray-300 hover:text-red-400 transition shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">Todavía no hay comentarios. ¡Sé el primero!</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        {user && <Avatar name={user.name} role={user.role} size="sm" />}
        <div className="flex-1 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribí un comentario…"
            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-1.5 outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-50 transition"
          />
          <button
            type="submit"
            disabled={!text.trim() || addComment.isPending}
            className="px-3.5 py-1.5 bg-[#0f1f3d] text-white text-xs font-semibold rounded-xl hover:bg-[#1a3366] transition disabled:opacity-40"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── PostCard ──────────────────────────────────────────────────────────────────
interface Props { post: FeedPost; }

export default function PostCard({ post }: Props) {
  const { user } = useAuth();
  const toggleLike = useToggleLike();
  const deletePost = useDeletePost();
  const togglePin = useTogglePin();
  const toggleHide = useToggleHide();
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwner = user?.id === post.author_id;
  const isAdmin = user?.role === 'admin';
  const authorName = post.author?.name ?? 'Usuario';
  const authorRole = post.author?.role ?? '';
  const roleConfig = ROLE_CONFIG[authorRole];
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es });

  return (
    <article className={cn(
      'bg-white rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md',
      post.is_pinned ? 'border-amber-200' : 'border-gray-200',
      post.is_hidden ? 'opacity-60' : '',
    )}>
      {/* Pinned top strip */}
      {post.is_pinned && (
        <div className="h-0.5 bg-gradient-to-r from-amber-400 to-amber-300" />
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={authorName} role={authorRole} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-gray-900 truncate">{authorName}</span>
                {roleConfig && (
                  <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium leading-tight', roleConfig.badge)}>
                    {roleConfig.label}
                  </span>
                )}
                {post.is_pinned && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100 font-medium flex items-center gap-1 leading-tight">
                    <Pin className="h-3 w-3" /> Fijado
                  </span>
                )}
                {post.is_hidden && isAdmin && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 ring-1 ring-red-100 font-medium leading-tight">
                    Oculto
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-gray-400">{timeAgo}</span>
                {post.horse && (
                  <span className="text-xs text-gray-400 flex items-center gap-0.5">
                    · <span className="text-gray-300">🐴</span> <span className="text-gray-500 font-medium">{post.horse.name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions menu */}
          {(isOwner || isAdmin) && (
            <div className="relative shrink-0">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-20 bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-[160px]">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => { togglePin.mutate(post.id); setMenuOpen(false); }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <Pin className="h-4 w-4 text-amber-500" />
                          {post.is_pinned ? 'Desfijar' : 'Fijar post'}
                        </button>
                        <button
                          onClick={() => { toggleHide.mutate(post.id); setMenuOpen(false); }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          {post.is_hidden
                            ? <Eye className="h-4 w-4 text-emerald-500" />
                            : <EyeOff className="h-4 w-4 text-orange-400" />
                          }
                          {post.is_hidden ? 'Mostrar' : 'Ocultar'}
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                      </>
                    )}
                    {(isOwner || isAdmin) && (
                      <button
                        onClick={() => { if (confirm('¿Eliminar este post?')) deletePost.mutate(post.id); setMenuOpen(false); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>

        {/* Images */}
        {post.image_urls && post.image_urls.length > 0 && (
          <ImageGrid urls={post.image_urls} />
        )}

        {/* Videos */}
        {post.video_urls && post.video_urls.length > 0 && (
          <div className="space-y-2">
            {post.video_urls.map((url, i) => (
              <video
                key={i}
                src={url}
                controls
                className="w-full rounded-xl max-h-72 bg-black"
                preload="metadata"
              />
            ))}
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center gap-1 pt-0.5 -mx-1">
          <button
            onClick={() => toggleLike.mutate(post.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition',
              post.liked_by_me
                ? 'text-red-500 bg-red-50 hover:bg-red-100'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
            )}
          >
            <Heart className={cn('h-4 w-4 transition-transform active:scale-125', post.liked_by_me && 'fill-current')} />
            <span className="text-xs">{post.likes_count > 0 ? post.likes_count : 'Me gusta'}</span>
          </button>

          <button
            onClick={() => setShowComments((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition',
              showComments
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
            )}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{post.comments_count > 0 ? post.comments_count : 'Comentar'}</span>
          </button>
        </div>

        {/* Comments */}
        {showComments && user && (
          <CommentsSection postId={post.id} currentUserId={user.id} />
        )}
      </div>
    </article>
  );
}

export { Avatar };
