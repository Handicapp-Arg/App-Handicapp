'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCreatePost } from '@/hooks/use-feed';
import { ImageIcon, X, Send, Megaphone, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_GRADIENTS: Record<string, string> = {
  propietario:    'from-blue-500 to-blue-700',
  establecimiento:'from-emerald-500 to-emerald-700',
  veterinario:    'from-violet-500 to-violet-700',
  admin:          'from-slate-500 to-slate-700',
};

const POST_TYPES = [
  { value: 'general', label: 'General', icon: null },
  { value: 'horse_update', label: 'Actualización', icon: Tag },
  { value: 'announcement', label: 'Anuncio', icon: Megaphone },
] as const;

function ComposerAvatar({ name, role }: { name: string; role?: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const gradClass = ROLE_GRADIENTS[role ?? ''] ?? 'from-slate-500 to-slate-700';
  return (
    <div className={cn(
      'h-10 w-10 rounded-full bg-gradient-to-br text-white font-bold flex items-center justify-center shrink-0 shadow-sm text-sm',
      gradClass,
    )}>
      {initials}
    </div>
  );
}

interface Props { onPosted?: () => void; }

export default function PostComposer({ onPosted }: Props) {
  const { user } = useAuth();
  const createPost = useCreatePost();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; isVideo: boolean }[]>([]);
  const [type, setType] = useState<'general' | 'horse_update' | 'announcement'>('general');
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleCancel = () => {
    setExpanded(false);
    setContent('');
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setMedia([]);
    setPreviews([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
    if (e.key === 'Escape') handleCancel();
  };

  if (!user) return null;

  return (
    <div className={cn(
      'bg-white rounded-xl border shadow-sm transition-all duration-200',
      expanded ? 'border-gray-300 shadow-md' : 'border-gray-200',
    )}>
      <div className="flex gap-3 p-4">
        <ComposerAvatar name={user.name} role={user.role} />

        <div className="flex-1 min-w-0">
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-left px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-sm hover:bg-gray-100 hover:border-gray-300 transition"
            >
              ¿Qué querés compartir con la comunidad?
            </button>
          ) : (
            <div className="space-y-3">
              {/* Post type selector — admin only */}
              {user.role === 'admin' && (
                <div className="flex gap-1.5">
                  {POST_TYPES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setType(value)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition',
                        type === value
                          ? 'bg-[#0f1f3d] text-white border-[#0f1f3d]'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                      )}
                    >
                      {Icon && <Icon className="h-3 w-3" />}
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Textarea */}
              <textarea
                autoFocus
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="¿Qué querés compartir con la comunidad? (Ctrl+Enter para publicar)"
                rows={3}
                className="w-full resize-none text-sm text-gray-900 placeholder-gray-400 outline-none leading-relaxed"
              />

              {/* Media previews */}
              {previews.length > 0 && (
                <div className={cn('grid gap-1.5 rounded-xl overflow-hidden', previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
                  {previews.map((item, i) => (
                    <div key={item.url} className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                      {item.isVideo ? (
                        <video src={item.url} className="w-full h-full object-cover" controls />
                      ) : (
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => removeMedia(i)}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition shadow"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex gap-1">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={media.length >= 4}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition disabled:opacity-40"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Foto / Video
                  </button>
                  <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMedia} />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={(!content.trim() && !media.length) || createPost.isPending}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0f1f3d] text-white text-xs font-bold rounded-lg hover:bg-[#1a3366] transition disabled:opacity-40 shadow-sm"
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

export { ComposerAvatar as Avatar };
