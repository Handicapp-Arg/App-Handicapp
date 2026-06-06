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

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  propietario: { label: 'Propietario', color: 'bg-blue-50 text-blue-700' },
  establecimiento: { label: 'Establecimiento', color: 'bg-green-50 text-green-700' },
  veterinario: { label: 'Veterinario', color: 'bg-purple-50 text-purple-700' },
  admin: { label: 'Admin', color: 'bg-gray-100 text-gray-700' },
};

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={cn(
      'rounded-full bg-black text-white font-semibold flex items-center justify-center flex-shrink-0',
      size === 'md' ? 'h-10 w-10 text-sm' : 'h-7 w-7 text-xs',
    )}>
      {initials}
    </div>
  );
}

function ImageGrid({ urls }: { urls: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const count = urls.length;

  return (
    <>
      <div className={cn(
        'grid gap-1 rounded-lg overflow-hidden',
        count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2' : count === 3 ? 'grid-cols-3' : 'grid-cols-2',
      )}>
        {urls.slice(0, 4).map((url, i) => (
          <div
            key={i}
            className={cn(
              'relative bg-gray-100 cursor-pointer overflow-hidden',
              count === 1 ? 'aspect-video' : 'aspect-square',
              count === 3 && i === 0 ? 'col-span-2 aspect-video' : '',
            )}
            onClick={() => setLightbox(url)}
          >
            <img src={url} alt="" className="w-full h-full object-cover hover:opacity-95 transition" />
            {i === 3 && count > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xl">
                +{count - 4}
              </div>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white hover:text-gray-300 transition">
            <X className="h-6 w-6" />
          </button>
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

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
          {[1, 2].map((i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {comments.map((c: FeedComment) => (
            <div key={c.id} className="flex gap-2 group">
              <Avatar name={c.user?.name ?? 'U'} size="sm" />
              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <span className="font-semibold text-gray-900 text-xs">{c.user?.name}</span>
                <p className="text-gray-700 mt-0.5">{c.content}</p>
              </div>
              {(c.user_id === currentUserId || user?.role === 'admin') && (
                <button
                  onClick={() => deleteComment.mutate(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        {user && <Avatar name={user.name} size="sm" />}
        <div className="flex-1 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribí un comentario…"
            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 outline-none focus:border-gray-400 transition"
          />
          <button
            type="submit"
            disabled={!text.trim() || addComment.isPending}
            className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-full hover:bg-gray-800 transition disabled:opacity-40"
          >
            Comentar
          </button>
        </div>
      </form>
    </div>
  );
}

interface Props {
  post: FeedPost;
}

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
  const roleBadge = ROLE_BADGES[post.author?.role ?? ''];
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es });

  return (
    <article className={cn(
      'bg-white rounded-xl border shadow-sm overflow-hidden',
      post.is_pinned ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200',
      post.is_hidden ? 'opacity-60 ring-1 ring-red-200' : '',
    )}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar name={authorName} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-gray-900">{authorName}</span>
                {roleBadge && (
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roleBadge.color)}>
                    {roleBadge.label}
                  </span>
                )}
                {post.is_pinned && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex items-center gap-1">
                    <Pin className="h-3 w-3" /> Fijado
                  </span>
                )}
                {post.is_hidden && isAdmin && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                    Oculto
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{timeAgo}</span>
                {post.horse && (
                  <span className="text-xs text-gray-400">
                    · 🐴 {post.horse.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions menu */}
          {(isOwner || isAdmin) && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition"
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
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Pin className="h-4 w-4" />
                          {post.is_pinned ? 'Desfijar' : 'Fijar post'}
                        </button>
                        <button
                          onClick={() => { toggleHide.mutate(post.id); setMenuOpen(false); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {post.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          {post.is_hidden ? 'Mostrar' : 'Ocultar'}
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                      </>
                    )}
                    {(isOwner || isAdmin) && (
                      <button
                        onClick={() => { if (confirm('¿Eliminar este post?')) deletePost.mutate(post.id); setMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50"
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
                className="w-full rounded-lg max-h-72 bg-black"
                preload="metadata"
              />
            ))}
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={() => toggleLike.mutate(post.id)}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium transition',
              post.liked_by_me ? 'text-red-500' : 'text-gray-400 hover:text-red-400',
            )}
          >
            <Heart className={cn('h-4 w-4 transition-transform active:scale-125', post.liked_by_me && 'fill-current')} />
            {post.likes_count > 0 && <span>{post.likes_count}</span>}
          </button>

          <button
            onClick={() => setShowComments((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-600 transition"
          >
            <MessageCircle className="h-4 w-4" />
            {post.comments_count > 0 && <span>{post.comments_count}</span>}
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
