'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { HorseshoeH } from '@/components/icons/equine';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    // Splash de carga coherente con el login y el splash del móvil:
    // mismo fondo cálido + logo de marca, en vez de un spinner genérico.
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4"
        style={{ background: 'linear-gradient(180deg, var(--color-cream-100) 0%, var(--surface-page) 58%)' }}
      >
        <HorseshoeH size={56} className="animate-pulse text-[var(--color-primary)]" />
        <span className="font-display text-lg font-semibold tracking-tight text-gray-900">HandicApp</span>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
