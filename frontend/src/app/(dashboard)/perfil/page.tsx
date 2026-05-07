'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Spinner } from '@/components/ui/skeleton';

const roleLabel: Record<string, string> = {
  admin: 'Administrador',
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
  veterinario: 'Veterinario',
};

const roleColors: Record<string, { bg: string; text: string }> = {
  admin:          { bg: '#eff6ff', text: '#1d4ed8' },
  propietario:    { bg: '#f0fdf4', text: '#15803d' },
  establecimiento:{ bg: '#faf5ff', text: '#7e22ce' },
  veterinario:    { bg: '#fff7ed', text: '#c2410c' },
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6"
      style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0/0.05)' }}
    >
      <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-gray-400">{title}</h2>
      {children}
    </div>
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

const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 transition focus:border-[#0f1f3d] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f1f3d]/8 sm:max-w-sm';

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

  const roleColor = roleColors[user?.role || ''] ?? { bg: '#f3f4f6', text: '#6b7280' };

  return (
    <div className="max-w-2xl space-y-5">

      {/* Hero del perfil */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6"
        style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0/0.05)' }}
      >
        <div className="flex items-center gap-5">
          {/* Avatar grande */}
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold text-white"
            style={{ backgroundColor: '#0f1f3d' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 truncate">
              {user?.name}
            </h1>
            <p className="mt-0.5 text-sm text-gray-400">{user?.email}</p>
            <span
              className="mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold"
              style={{ backgroundColor: roleColor.bg, color: roleColor.text }}
            >
              {roleLabel[user?.role || ''] || user?.role}
            </span>
          </div>
        </div>
      </div>

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
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: '#0f1f3d' }}
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
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: '#0f1f3d' }}
          >
            {savingPassword ? <><Spinner size="sm" color="white" /> Cambiando...</> : 'Cambiar contraseña'}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
