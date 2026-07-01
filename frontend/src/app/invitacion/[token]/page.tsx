'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useInvitationByToken, useAcceptInvitation, ROLE_LABELS } from '@/hooks/use-organizations';
import { useAuth } from '@/lib/auth-context';

export default function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  // El endpoint es público: mostramos la info aunque no haya sesión iniciada.
  const { data: invitation, isLoading, error } = useInvitationByToken(token);
  const accept = useAcceptInvitation();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)]">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)] p-4">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-[var(--surface-card)] p-8 text-center shadow-md">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
          </div>
          <p className="text-lg font-bold text-gray-900">Invitación inválida</p>
          <p className="mt-2 text-sm text-gray-500">El link que abriste no es válido, ya fue usado o expiró.</p>
          <button onClick={() => router.replace('/')} className="mt-6 w-full rounded-xl bg-clay-500 py-2.5 text-sm font-semibold text-white cursor-pointer hover:bg-[var(--color-primary-hover)] transition">
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  const roleLabel = ROLE_LABELS[invitation.role_in_org];

  // ─── Sin sesión: ofrecer crear cuenta (o iniciar sesión) para unirse ───
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)] p-4">
        <div className="w-full max-w-md rounded-2xl bg-[var(--surface-card)] shadow-xl overflow-hidden">
          <div className="bg-clay-500 px-6 py-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://res.cloudinary.com/dh2m9ychv/image/upload/v1762370534/logo-full-white_suu2qt.png"
              alt="HandicApp"
              className="h-8 w-auto mx-auto mb-4"
            />
            <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Invitación a unirte</p>
            <p className="mt-2 text-2xl font-bold text-white tracking-[-0.02em]">{invitation.organization.name}</p>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              <span className="font-semibold text-gray-900">{invitation.inviter.name}</span> te invita a unirte a <span className="font-semibold text-gray-900">{invitation.organization.name}</span> como{' '}
              <span className="font-semibold text-[#c4922a]">{roleLabel}</span>.
            </p>
            <div className="rounded-xl bg-gray-50 p-3.5 text-xs text-gray-500 leading-relaxed">
              Creá tu cuenta con el email <span className="font-semibold text-gray-700">{invitation.email}</span> y vas a sumarte automáticamente a la organización con tu rol asignado.
            </div>
            <Link
              href={`/registro?invitation=${encodeURIComponent(token)}`}
              className="block w-full rounded-xl bg-clay-500 py-3 text-center text-sm font-semibold text-white cursor-pointer hover:bg-[var(--color-primary-hover)] transition"
            >
              Crear cuenta y unirme
            </Link>
            <Link
              href={`/login?returnTo=${encodeURIComponent(`/invitacion/${token}`)}`}
              className="block w-full rounded-xl border border-gray-200 py-3 text-center text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 transition"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Email no coincide
  const emailMatch = invitation.email.toLowerCase() === user.email.toLowerCase();

  if (!emailMatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)] p-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-100 bg-[var(--surface-card)] p-8 text-center shadow-md">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
          </div>
          <p className="text-lg font-bold text-gray-900">Email no coincide</p>
          <p className="mt-2 text-sm text-gray-500">
            Esta invitación es para <span className="font-semibold text-gray-700">{invitation.email}</span> pero estás logueado como <span className="font-semibold text-gray-700">{user.email}</span>.
          </p>
          <p className="mt-2 text-sm text-gray-500">Cerrá sesión y entrá con la cuenta correcta.</p>
        </div>
      </div>
    );
  }

  const handleAccept = async () => {
    await accept.mutateAsync(token);
    router.replace('/organizacion');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)] p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--surface-card)] shadow-xl overflow-hidden">
        <div className="bg-clay-500 px-6 py-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://res.cloudinary.com/dh2m9ychv/image/upload/v1762370534/logo-full-white_suu2qt.png"
            alt="HandicApp"
            className="h-8 w-auto mx-auto mb-4"
          />
          <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Invitación a unirte</p>
          <p className="mt-2 text-2xl font-bold text-white tracking-[-0.02em]">{invitation.organization.name}</p>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            <span className="font-semibold text-gray-900">{invitation.inviter.name}</span> te invita a unirte a <span className="font-semibold text-gray-900">{invitation.organization.name}</span> como{' '}
            <span className="font-semibold text-[#c4922a]">{roleLabel}</span>.
          </p>
          <div className="rounded-xl bg-gray-50 p-3.5 text-xs text-gray-500 leading-relaxed">
            Al aceptar, vas a poder colaborar con la organización dentro de HandicApp según tu rol asignado. Podés salir de la organización en cualquier momento.
          </div>
          <button
            onClick={handleAccept}
            disabled={accept.isPending}
            className="w-full rounded-xl bg-clay-500 py-3 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:bg-[var(--color-primary-hover)] transition"
          >
            {accept.isPending ? 'Aceptando...' : 'Aceptar invitación'}
          </button>
          <button
            onClick={() => router.replace('/')}
            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 transition"
          >
            No gracias
          </button>
        </div>
      </div>
    </div>
  );
}
