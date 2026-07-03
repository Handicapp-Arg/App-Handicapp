'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { authInputClass, authTitleClass } from '@/lib/auth-ui';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

// Solo en desarrollo: en producción el bundler elimina este array (no expone credenciales).
const testUsers = process.env.NODE_ENV === 'production' ? [] : [
  { email: 'admin@handicapp.com',          password: 'handicapp2026', label: 'Admin' },
  { email: 'establecimiento@handicapp.com', password: 'handicapp2026', label: 'Establecimiento' },
  { email: 'propietario@handicapp.com',    password: 'handicapp2026', label: 'Propietario' },
  { email: 'propietario2@handicapp.com',   password: 'handicapp2026', label: 'Propietario 2' },
  { email: 'veterinario@handicapp.com',    password: 'handicapp2026', label: 'Veterinario' },
  { email: 'encargado@handicapp.com',      password: 'handicapp2026', label: 'Encargado' },
  { email: 'jinete@handicapp.com',         password: 'handicapp2026', label: 'Jinete' },
  { email: 'peon@handicapp.com',           password: 'handicapp2026', label: 'Peón' },
];

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/caballos';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOpen, setDevOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, returnTo);
    } catch {
      setError('Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  const fillUser = (user: (typeof testUsers)[number]) => {
    setEmail(user.email);
    setPassword(user.password);
    setError('');
  };

  return (
    <div className="space-y-5">
      <div className="mb-1">
        <h1 className={authTitleClass}>Iniciá sesión</h1>
        <p className="mt-1 text-[13px] text-gray-400">Ingresá a tu cuenta para continuar</p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label htmlFor="email" className="block text-[12.5px] font-medium text-gray-500 mb-1.5">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className={authInputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-[12.5px] font-medium text-gray-500 mb-1.5">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${authInputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link href="/olvide-contrasena" className="text-[12.5px] font-medium text-gray-400 hover:text-clay-500 transition">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-3.5 text-[15px] font-semibold text-white bg-clay-500 hover:bg-clay-600 active:scale-[0.985] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-[0_8px_24px_-10px_color-mix(in_srgb,var(--color-clay-500)_70%,transparent)]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Ingresando...
            </span>
          ) : 'Ingresar'}
        </button>
      </form>

      <p className="text-center text-[13.5px] text-gray-400">
        ¿No tenés cuenta?{' '}
        <Link href="/registro" className="font-semibold text-clay-500 hover:text-clay-600 transition">
          Registrate
        </Link>
      </p>

      {testUsers.length > 0 && (
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setDevOpen((v) => !v)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-[12.5px] font-semibold text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          Acceso rápido · pruebas
        </button>
        {devOpen && (
          <div className="mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            {testUsers.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => { fillUser(u); setDevOpen(false); }}
                className="flex w-full items-center justify-between border-t border-gray-100 px-4 py-2.5 text-left transition-colors first:border-t-0 hover:bg-[var(--surface-card)] cursor-pointer"
              >
                <span className="text-[13px] font-medium text-gray-700">{u.label}</span>
                <span className="text-[11px] text-gray-400">{u.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
