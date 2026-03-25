'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';

const roleLabels: Record<string, string> = {
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
  admin: 'Administrador',
};

interface RoleOption {
  id: string;
  name: string;
}

export default function RegistroPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('');
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/roles').then(({ data }) => {
      setRoles(data);
      if (data.length > 0) setRole(data[0].name);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name, role);
    } catch {
      setError('Error al registrar. El email puede estar en uso.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl px-4 py-3 text-sm font-medium text-gray-800 placeholder:text-gray-300 placeholder:font-normal outline-none transition-all";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Crear cuenta</h1>
        <p className="mt-1 text-sm text-gray-400">Completá tus datos para registrarte</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Nombre</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className={inputClass}
            style={{ border: '1px solid #d1d5db', backgroundColor: '#ffffff' }}
            onFocus={e => e.currentTarget.style.borderColor = '#6b7280'}
            onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Correo electrónico</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className={inputClass}
            style={{ border: '1px solid #d1d5db', backgroundColor: '#ffffff' }}
            onFocus={e => e.currentTarget.style.borderColor = '#6b7280'}
            onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className={inputClass + ' pr-11'}
              style={{ border: '1px solid #d1d5db', backgroundColor: '#ffffff' }}
              onFocus={e => e.currentTarget.style.borderColor = '#6b7280'}
              onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
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

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Tipo de cuenta</label>
          <div className="grid grid-cols-3 gap-2">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.name)}
                className="rounded-xl border py-2.5 text-sm font-medium transition cursor-pointer"
                style={{
                  backgroundColor: role === r.name ? '#0f1f3d' : '#ffffff',
                  color: role === r.name ? '#ffffff' : '#374151',
                  borderColor: role === r.name ? '#0f1f3d' : '#d1d5db',
                }}
              >
                {roleLabels[r.name] || r.name}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !role}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          style={{ backgroundColor: '#0f1f3d' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creando cuenta...
            </span>
          ) : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="font-semibold text-[#0f1f3d] hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
