'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const testUsers = [
  { email: 'admin@test.com', password: '123456', name: 'Admin', role: 'admin' },
  { email: 'propietario@test.com', password: '123456', name: 'Juan Propietario', role: 'propietario' },
  { email: 'establo@test.com', password: '123456', name: 'Establo Sur', role: 'establecimiento' },
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
    <div>
      <h1 className="text-2xl font-bold text-center mb-6">Iniciar Sesión</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        ¿No tenés cuenta?{' '}
        <Link href="/registro" className="font-medium text-black hover:underline">
          Registrate
        </Link>
      </p>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <div className="grid grid-cols-3 gap-2">
          {testUsers.map((u) => (
            <button
              key={u.email}
              type="button"
              onClick={() => fillUser(u)}
              className="rounded-md border border-gray-200 px-2 py-2 text-center text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              {u.role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
