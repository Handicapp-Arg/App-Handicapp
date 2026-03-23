'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const testUsers = [
  { email: 'admin@test.com', password: '123456', label: 'Admin', role: 'admin' },
  { email: 'propietario@test.com', password: '123456', label: 'Propietario', role: 'propietario' },
  { email: 'establo@test.com', password: '123456', label: 'Establecimiento', role: 'establecimiento' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
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
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido de vuelta</h1>
        <p className="mt-1 text-sm text-gray-500">Ingresá a tu cuenta para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-[#1a1a2e] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10"
            placeholder="tu@email.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-[#1a1a2e] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#1a1a2e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d2d4e] disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        ¿No tenés cuenta?{' '}
        <Link href="/registro" className="font-semibold text-[#1a1a2e] hover:underline">
          Registrate
        </Link>
      </p>

      {/* Acceso rápido para testing */}
      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-gray-400">Acceso rápido (dev)</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {testUsers.map((u) => (
            <button
              key={u.email}
              type="button"
              onClick={() => fillUser(u)}
              className="rounded-lg border border-gray-200 px-2 py-2 text-center text-xs font-medium text-gray-600 transition hover:border-[#1a1a2e] hover:text-[#1a1a2e] cursor-pointer"
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
