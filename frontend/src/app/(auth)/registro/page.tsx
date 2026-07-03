'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useInvitationByToken, ROLE_LABELS } from '@/hooks/use-organizations';
import { authInputClass, authTitleClass } from '@/lib/auth-ui';
import api from '@/lib/api';

const roleInfo: Record<string, { label: string; desc: string }> = {
  propietario:     { label: 'Propietario',     desc: 'Seguí el historial, eventos y documentos de tus caballos.' },
  establecimiento: { label: 'Establecimiento', desc: 'Gestioná caballos, eventos, contratos y tu equipo.' },
  veterinario:     { label: 'Veterinario',     desc: 'Atendé a tus pacientes con su historial clínico.' },
};

interface RoleOption {
  id: string;
  name: string;
}

function RegistroForm() {
  const { register } = useAuth();
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get('invitation') || '';

  // Cuando hay token, mostramos la info de la invitación y ocultamos el selector de rol.
  const { data: invitation } = useInvitationByToken(invitationToken || null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('');
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [roleOpen, setRoleOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Con invitación no hace falta elegir rol (lo define la invitación).
    if (invitationToken) return;
    api.get('/roles').then(({ data }) => {
      const filtered = (data as RoleOption[]).filter((r) => r.name !== 'admin');
      setRoles(filtered);
      if (filtered.length > 0) setRole(filtered[0].name);
    });
  }, [invitationToken]);

  // Prefijar el email de la invitación (debe coincidir en el backend).
  useEffect(() => {
    if (invitation?.email) setEmail(invitation.email);
  }, [invitation?.email]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Con invitación el backend ignora el rol enviado y usa el de la invitación,
      // pero el DTO exige un rol no vacío.
      await register(email, password, name, invitationToken ? 'propietario' : role, invitationToken || undefined);
    } catch {
      setError('Error al registrar. El email puede estar en uso o no coincidir con la invitación.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = authInputClass;

  return (
    <div className="space-y-5">
      <div>
        <h1 className={authTitleClass}>Creá tu cuenta</h1>
        <p className="mt-1 text-sm text-gray-400">
          {invitation ? 'Registrate para unirte a la organización' : 'Empezá a gestionar tus caballos'}
        </p>
      </div>

      {invitation && (
        <div className="rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-gray-700">
          Te unís a <span className="font-semibold text-gray-900">{invitation.organization.name}</span> como{' '}
          <span className="font-semibold text-[#c4922a]">{ROLE_LABELS[invitation.role_in_org]}</span>.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1.5">Nombre</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1.5">Correo electrónico</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            readOnly={!!invitation}
            className={inputClass + (invitation ? ' opacity-70 cursor-not-allowed' : '')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1.5">Contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className={inputClass + ' pr-11'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {!invitationToken && (
          <div className="relative">
            <label className="block text-sm font-medium text-gray-500 mb-1.5">Tipo de cuenta</label>
            <button
              type="button"
              onClick={() => setRoleOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-xl border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--color-primary)] cursor-pointer"
            >
              <span>{roleInfo[role]?.label ?? 'Elegí una opción'}</span>
              <ChevronDown className={`h-4 w-4 text-[var(--color-bark-400)] transition-transform ${roleOpen ? 'rotate-180' : ''}`} />
            </button>
            {roleOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setRoleOpen(false)} />
                <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-[var(--surface-card-border)] bg-[var(--surface-card)] shadow-[var(--shadow-lg)]">
                  {roles.map((r) => {
                    const info = roleInfo[r.name];
                    const active = role === r.name;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setRole(r.name); setRoleOpen(false); }}
                        className="flex w-full items-start gap-2 px-4 py-3 text-left transition hover:bg-[var(--sidebar-hover-bg)] cursor-pointer"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-[var(--foreground)]">{info?.label ?? r.name}</div>
                          {info?.desc && <div className="mt-0.5 text-xs leading-snug text-[var(--color-bark-400)]">{info.desc}</div>}
                        </div>
                        {active && <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (!invitationToken && !role)}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white bg-clay-500 hover:bg-clay-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creando cuenta...
            </span>
          ) : invitation ? 'Crear cuenta y unirme' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400">
        ¿Ya tenés cuenta?{' '}
        <Link
          href={invitationToken ? `/login?returnTo=${encodeURIComponent(`/invitacion/${invitationToken}`)}` : '/login'}
          className="font-semibold text-clay-500 hover:text-clay-600 transition"
        >
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={null}>
      <RegistroForm />
    </Suspense>
  );
}
