'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useUnreadCount } from '@/hooks/use-notifications';

const navLinks = [
  { href: '/caballos', label: 'Caballos' },
  { href: '/eventos', label: 'Eventos' },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { data: unread } = useUnreadCount();

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/caballos" className="text-lg font-bold">
            HandicApp
          </Link>
          <nav className="flex gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  pathname === link.href
                    ? 'bg-gray-100 text-black'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link
                href="/permisos"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  pathname === '/permisos'
                    ? 'bg-gray-100 text-black'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                }`}
              >
                Permisos
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/notificaciones"
            className="relative rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-black transition"
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
          <Link
            href="/perfil"
            className="hidden text-sm text-gray-600 hover:text-black transition sm:block"
          >
            {user?.name}
          </Link>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {user?.role}
          </span>
          <button
            onClick={logout}
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-black transition"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
