'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useUnreadCount } from '@/hooks/use-notifications';

const navLinks = [
  { href: '/caballos', label: 'Caballos' },
  { href: '/eventos', label: 'Eventos' },
];

const roleLabel: Record<string, string> = {
  admin: 'Administrador',
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
};

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { data: unread } = useUnreadCount();

  const links = [
    ...navLinks,
    ...(user?.role === 'admin' ? [
      { href: '/panel', label: 'Panel' },
      { href: '/permisos', label: 'Permisos' },
    ] : []),
  ];

  return (
    <header className="md:hidden sticky top-0 z-20 bg-[#0f1f3d] shadow-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">

        {/* Izquierda: logo + sección activa */}
        <div className="flex items-center gap-4">
          <Link href="/caballos" className="text-lg font-bold text-white tracking-tight">
            HandicApp
          </Link>
        </div>

        {/* Centro: navegación */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/55 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Derecha: notificaciones + usuario + salir */}
        <div className="flex items-center gap-3">

          {/* Notificaciones */}
          <Link
            href="/notificaciones"
            className="relative rounded-lg p-2 text-white/55 transition hover:bg-white/10 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {(unread?.count ?? 0) > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unread!.count > 9 ? '9+' : unread!.count}
              </span>
            )}
          </Link>

          {/* Usuario */}
          <Link href="/perfil" className="hidden sm:flex flex-col items-end rounded-lg px-3 py-1.5 transition hover:bg-white/10">
            <span className="text-sm font-semibold text-white leading-tight">{user?.name}</span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/45 leading-tight">
              {roleLabel[user?.role || ''] || user?.role}
            </span>
          </Link>

          {/* Salir */}
          <button
            onClick={logout}
            className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-[#0f1f3d] transition hover:bg-white/90 cursor-pointer"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
