'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { authInputClass, authTitleClass } from '@/lib/auth-ui';

export default function OlvideContrasenaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('No se pudo procesar la solicitud. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Revisá tu email</h2>
          <p className="mt-2 text-sm text-gray-500">
            Si existe una cuenta con <strong>{email}</strong>, vas a recibir un enlace para restablecer tu contraseña en los próximos minutos.
          </p>
        </div>
        <Link href="/login" className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-clay-500 hover:text-clay-600 transition">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className={authTitleClass}>Recuperar contraseña</h1>
        <p className="mt-1 text-sm text-gray-400">
          Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1.5">Correo electrónico</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className={authInputClass}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white bg-clay-500 hover:bg-clay-600 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400">
        <Link href="/login" className="inline-flex items-center justify-center gap-1.5 font-semibold text-clay-500 hover:text-clay-600 transition">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
