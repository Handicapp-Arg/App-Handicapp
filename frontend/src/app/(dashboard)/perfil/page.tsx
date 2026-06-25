'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useFeed } from '@/hooks/use-feed';
import PostCard from '@/components/feed/PostCard';
import api from '@/lib/api';
import { Spinner } from '@/components/ui/skeleton';

const roleLabel: Record<string, string> = {
  admin: 'Administrador',
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
  veterinario: 'Veterinario',
};

const planLabel: Record<string, string> = { free: 'Gratis', pro: 'Pro' };

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)]">
      <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-gray-400">{title}</h2>
      {children}
    </div>
  );
}

/** Pestaña con las publicaciones del usuario (relación con el muro). */
function MisPublicaciones({ userId }: { userId: string }) {
  const { data, isLoading } = useFeed({ author_id: userId });
  const posts = data?.pages.flatMap((p) => p.data) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-white shadow-[var(--shadow-card)]" />
        ))}
      </div>
    );
  }
  if (!posts.length) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
        <p className="text-sm font-semibold text-gray-700">Todavía no publicaste nada</p>
        <p className="mt-1 text-sm text-gray-400">Cuando compartas algo en el muro, va a aparecer acá.</p>
      </div>
    );
  }
  return <div className="space-y-4">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>;
}

function CameraIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 transition focus:border-clay-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-500/12 sm:max-w-sm';

function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative sm:max-w-sm">
      <input {...props} type={show ? 'text' : 'password'} className={inputCls + ' pr-10'} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
      >
        {show ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        )}
      </button>
    </div>
  );
}

type AlertType = 'success' | 'error';
function Alert({ type, message }: { type: AlertType; message: string }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${
      type === 'success'
        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
        : 'border-red-100 bg-red-50 text-red-600'
    }`}>
      {type === 'success' ? (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      )}
      {message}
    </div>
  );
}

export default function PerfilPage() {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [tab, setTab] = useState<'posts' | 'config'>('posts');

  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);

  const handleImageUpload = async (kind: 'avatar' | 'cover', file?: File) => {
    if (!file) return;
    setUploading(kind);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/auth/${kind}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
    } catch {
      /* noop */
    } finally {
      setUploading(null);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(''); setProfileError(''); setSavingProfile(true);
    try {
      await api.patch('/auth/profile', { name, email });
      await refreshUser();
      setProfileMsg('Datos actualizados correctamente');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { message: string } } }).response?.data?.message : null;
      setProfileError(msg || 'Error al actualizar');
    } finally { setSavingProfile(false); }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(''); setPasswordError('');
    if (newPassword !== confirmPassword) { setPasswordError('Las contraseñas nuevas no coinciden'); return; }
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPasswordMsg('Contraseña actualizada correctamente');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { message: string } } }).response?.data?.message : null;
      setPasswordError(msg || 'Error al cambiar contraseña');
    } finally { setSavingPassword(false); }
  };

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const memberSince = user?.created_at ? new Date(user.created_at).getFullYear() : null;
  const plan = (user as { plan?: string } | null)?.plan;

  return (
    <div className="mx-auto max-w-3xl space-y-5">

      <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload('avatar', e.target.files?.[0])} />
      <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload('cover', e.target.files?.[0])} />

      {/* Hero del perfil */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)]">
        {/* Banner / portada */}
        <div className="relative h-40 bg-gradient-to-r from-clay-400 via-clay-500 to-clay-600">
          {user?.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <button
            onClick={() => coverInput.current?.click()}
            disabled={uploading === 'cover'}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/35 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/55 disabled:opacity-60 cursor-pointer"
          >
            <CameraIcon />
            {uploading === 'cover' ? 'Subiendo…' : 'Portada'}
          </button>
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end gap-4">
            {/* Avatar editable */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 overflow-hidden rounded-2xl bg-gradient-to-br from-clay-400 to-clay-600 ring-4 ring-white">
                {user?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-extrabold text-white">{initials}</span>
                )}
              </div>
              <button
                onClick={() => avatarInput.current?.click()}
                disabled={uploading === 'avatar'}
                aria-label="Cambiar foto"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-clay-600 text-white ring-2 ring-white transition hover:bg-clay-700 disabled:opacity-60 cursor-pointer"
              >
                {uploading === 'avatar' ? <Spinner size="sm" color="white" /> : <CameraIcon />}
              </button>
            </div>
            <span className="mb-1 rounded-full bg-clay-50 px-3 py-1 text-xs font-bold text-clay-700 ring-1 ring-clay-100">
              {roleLabel[user?.role || ''] || user?.role}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">{user?.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
              {user?.email}
            </span>
            {plan && (
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-clay-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.664 1.319a.75.75 0 0 1 .672 0 41.06 41.06 0 0 1 8.198 5.424.75.75 0 0 1-.254 1.285 31.372 31.372 0 0 0-7.86 3.83.75.75 0 0 1-.84 0 31.508 31.508 0 0 0-2.08-1.287V9.394a.75.75 0 0 0-.293-.593 41.103 41.103 0 0 0-1.668-1.288.75.75 0 0 1 .619-1.318 41.7 41.7 0 0 1 3.328 1.81Z" /></svg>
                Plan {planLabel[plan] ?? plan}
              </span>
            )}
            {memberSince && <span>Miembro desde {memberSince}</span>}
          </div>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex gap-6 border-b border-gray-200">
        {([['posts', 'Publicaciones'], ['config', 'Configuración']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative -mb-px pb-3 text-sm font-semibold transition-colors cursor-pointer ${
              tab === key ? 'text-clay-700' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
            {tab === key && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-clay-500" />}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'posts' ? (
        user && <MisPublicaciones userId={user.id} />
      ) : (
        <div className="space-y-5">
          {/* Datos personales */}
          <SectionCard title="Datos personales">
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <Field label="Nombre completo">
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Correo electrónico" hint="Cambiar el email requiere verificación.">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </Field>
              {profileMsg && <Alert type="success" message={profileMsg} />}
              {profileError && <Alert type="error" message={profileError} />}
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 rounded-xl bg-clay-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-clay-600 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {savingProfile ? <><Spinner size="sm" color="white" /> Guardando...</> : 'Guardar cambios'}
              </button>
            </form>
          </SectionCard>

          {/* Seguridad */}
          <SectionCard title="Seguridad">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Field label="Contraseña actual">
                <PasswordInput required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field label="Nueva contraseña" hint="Mínimo 6 caracteres.">
                <PasswordInput required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field label="Confirmar nueva contraseña">
                <PasswordInput required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
              </Field>
              {passwordMsg && <Alert type="success" message={passwordMsg} />}
              {passwordError && <Alert type="error" message={passwordError} />}
              <button
                type="submit"
                disabled={savingPassword}
                className="flex items-center gap-2 rounded-xl bg-clay-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-clay-600 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {savingPassword ? <><Spinner size="sm" color="white" /> Cambiando...</> : 'Cambiar contraseña'}
              </button>
            </form>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
