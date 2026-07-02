'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // Sin pantalla intermedia: directo al login o al dashboard según sesión.
    if (!user) {
      router.replace('/login');
    } else {
      router.replace(user.role === 'encargado' ? '/supervision' : '/caballos');
    }
  }, [user, loading, router]);

  // Splash mínimo mientras resuelve la sesión y redirige.
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1b130c]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#d2aa78]" />
    </div>
  );
}
