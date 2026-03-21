'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/caballos');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-4xl font-bold mb-2">HandicApp</h1>
      <p className="text-gray-600 mb-8">Gestión de caballos y eventos</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 transition"
        >
          Iniciar Sesión
        </Link>
        <Link
          href="/registro"
          className="rounded-md border border-black px-6 py-3 text-sm font-medium hover:bg-gray-100 transition"
        >
          Registrarse
        </Link>
      </div>
    </div>
  );
}
