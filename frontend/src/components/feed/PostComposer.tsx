'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCreatePost } from '@/hooks/use-feed';
import { ImageIcon, Video, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
  veterinario: 'Veterinario',
  admin: 'Admin',
};

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={cn(
      'rounded-full bg-black text-white font-semibold flex items-center justify-center flex-shrink-0',
      size === 'md' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs',
    )}>
      {initials}
    </div>
  );
}

interface Props {
  onPosted?: () => void;
}

export default function PostComposer({ onPosted }: Props) {
  const { user } = useAuth();
  const createPost = useCreatePost();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; isVideo: boolean }[]>([]);
  const [type, setType] = useState<'general' | 'horse_update' | 'announcement'>('general');
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleFocus = () => setExpanded(true);

  const handleMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - media.length);
    setMedia((p) => [...p, ...files]);
    files.forEach((f) => {
      const url = URL.createObjectURL(f);
      setPreviews((p) => [...p, { url, isVideo: f.type.startsWith('video/') }]);
    });
    e.target.value = '';
  };

  const removeMedia = (i: number) => {
    URL.revokeObjectURL(previews[i].url);
    setMedia((p) => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!content.trim() && !media.length) return;
    const images = media.filter((f) => f.type.startsWith('image/'));
    const videos = media.filter((f) => f.type.startsWith('video/'));
    await createPost.mutateAsync({ content: content.trim(), type, photos: images, videos });
    setContent('');
    setMedia([]);
    setPreviews([]);
    setExpanded(false);
    onPosted?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  if (!user) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar name={user.name} />
        <div className="flex-1 min-w-0">
          {!expanded ? (
            <button
              onClick={handleFocus}
              className="w-full text-left px-4 py-2.5 rounded-full border border-gray-200 text-gray-400 text-sm hover:bg-gray-50 transition"
            >
              ¿Qué querés compartir?
            </button>
          ) : (
            <div className="space-y-3">
              {/* Type selector */}
              {user.role === 'admin' && (
                <div className="flex gap-2">
                  {(['general', 'horse_update', 'announcement'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium border transition',
                        type === t
                          ? 'bg-black text-white border-black'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                      )}
                    >
                      {t === 'general' ? 'General' : t === 'horse_update' ? 'Caballo' : '📌 Anuncio'}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                ref={textRef}
                autoFocus
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="¿Qué querés compartir con la comunidad?"
                rows={3}
                className="w-full resize-none text-sm text-gray-900 placeholder-gray-400 outline-none"
              />

              {/* Media previews */}
              {previews.length > 0 && (
                <div className={cn('grid gap-2', previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
                  {previews.map((item, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden aspect-video bg-gray-100">
                      {item.isVideo ? (
                        <video src={item.url} className="w-full h-full object-cover" controls />
                      ) : (
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => removeMedia(i)}
                        className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <div className="flex gap-1">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={media.length >= 4}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition disabled:opacity-40"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Foto / Video
                  </button>
                  <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMedia} />
                </div>

                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => { setExpanded(false); setContent(''); setMedia([]); setPreviews([]); }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={(!content.trim() && !media.length) || createPost.isPending}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {createPost.isPending ? 'Publicando…' : 'Publicar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { Avatar };
