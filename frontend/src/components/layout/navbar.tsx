'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const navLinks = [
  { href: '/caballos', label: 'Caballos' },
  { href: '/eventos', label: 'Eventos' },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

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
          <span className="hidden text-sm text-gray-600 sm:block">
            {user?.name}
          </span>
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
