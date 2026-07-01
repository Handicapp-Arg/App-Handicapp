'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useUnreadCount } from '@/hooks/use-notifications';
import { Avatar } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/role-badge';

// Título de página derivado del primer segmento de la ruta.
const PAGE_TITLES: Record<string, string> = {
  panel: 'Panel', muro: 'Muro', caballos: 'Caballos', padron: 'Padrón',
  arbol: 'Árbol genealógico', eventos: 'Eventos', remates: 'Remates',
  notificaciones: 'Notificaciones', agenda: 'Agenda', contratos: 'Contratos',
  facturacion: 'Facturación', directorio: 'Directorio', organizacion: 'Organización',
  solicitudes: 'Solicitudes', catalogo: 'Catálogo', perfil: 'Mi perfil',
  superadmin: 'Organizaciones', permisos: 'Permisos',
};

/** Barra superior (desktop) con notificaciones + menú de usuario. Estilo "MercadoPago web". */
export function Topbar() {
  const { user, logout } = useAuth();
  const { data: unread } = useUnreadCount();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const pageTitle = PAGE_TITLES[pathname.split('/')[1] ?? ''] ?? '';

  const unreadCount = unread?.count ?? 0;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="hidden md:flex sticky top-0 z-30 h-16 items-center justify-between gap-1 bg-[var(--surface-page)] px-6">

      {/* Título de la página */}
      <h1 className="font-display text-xl font-bold tracking-tight text-gray-900">{pageTitle}</h1>

      <div className="flex items-center gap-1 rounded-2xl bg-[var(--surface-card)] p-1 shadow-[var(--shadow-card)]">

      {/* Notificaciones */}
      <Link
        href="/notificaciones"
        aria-label="Notificaciones"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
      >
        <Bell className="h-5 w-5" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger-500)] px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>

      {/* Menú de usuario */}
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-3 transition hover:bg-gray-100 cursor-pointer"
        >
          <Avatar name={user?.name} avatarUrl={user?.avatar_url} avatarColor={user?.avatar_color} size="sm" />
          <span className="flex flex-col items-start gap-0.5 leading-tight">
            <span className="text-[13px] font-semibold text-gray-900">{user?.name}</span>
            {user?.role && <RoleBadge role={user.role} size="sm" />}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-card)] py-1 shadow-[var(--shadow-lg)]">
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <UserIcon className="h-4 w-4 text-gray-400" strokeWidth={1.8} />
              Mi perfil
            </Link>
            <div className="my-1 h-px bg-gray-100" />
            <button
              type="button"
              onClick={() => { setOpen(false); logout(); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 cursor-pointer dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      </div>
    </header>
  );
}
