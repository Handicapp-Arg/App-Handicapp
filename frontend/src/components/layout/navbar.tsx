'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X, Menu, Command, Bell,
  LayoutDashboard, Newspaper, BookOpen, GitBranch, CalendarClock, Gavel,
  CalendarDays, FileText, Receipt, MapPin, Building2, Inbox, Library, ShieldCheck,
} from 'lucide-react';
import { HorseshoeH, HorseHead } from '@/components/icons/equine';
import { useAuth } from '@/lib/auth-context';
import { useUnreadCount } from '@/hooks/use-notifications';
import { useCommandPalette } from '@/lib/command-palette';
import { Avatar } from '@/components/ui/avatar';

const roleLabel: Record<string, string> = {
  admin: 'Administrador',
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
  veterinario: 'Veterinario',
};

type NavItem = { href: string; label: string; icon: React.ReactNode; badge?: number };
type NavSection = { label: string; items: NavItem[] };

function DrawerNavLink({
  item,
  active,
  onClose,
}: {
  item: NavItem;
  active: boolean;
  onClose: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-fg)]'
          : 'text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-fg)]'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--color-primary)]" />
      )}
      <span className={`shrink-0 transition-colors ${active ? 'text-[var(--sidebar-fg)]' : 'text-[var(--sidebar-fg-faint)] group-hover:text-[var(--sidebar-fg)]'}`}>
        {item.icon}
      </span>
      <span className="flex-1 truncate tracking-[-0.01em]">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
    </Link>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { data: unread } = useUnreadCount();
  const { open: openPalette } = useCommandPalette();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const unreadCount = unread?.count ?? 0;

  const isAdmin = user?.role === 'admin';
  const isEst = user?.role === 'establecimiento';
  const isProp = user?.role === 'propietario';

  /* ─── Íconos (lucide + ecuestres de marca, mismo set que el sidebar) ─── */
  const ic = 'h-5 w-5';
  const icons = {
    panel:          <LayoutDashboard className={ic} strokeWidth={1.8} />,
    caballos:       <HorseHead size={20} />,
    eventos:        <CalendarClock className={ic} strokeWidth={1.8} />,
    agenda:         <CalendarDays className={ic} strokeWidth={1.8} />,
    contratos:      <FileText className={ic} strokeWidth={1.8} />,
    facturacion:    <Receipt className={ic} strokeWidth={1.8} />,
    directorio:     <MapPin className={ic} strokeWidth={1.8} />,
    permisos:       <ShieldCheck className={ic} strokeWidth={1.8} />,
    notificaciones: <Bell className={ic} strokeWidth={1.8} />,
    organizacion:   <Building2 className={ic} strokeWidth={1.8} />,
    superadmin:     <ShieldCheck className={ic} strokeWidth={1.8} />,
    solicitudes:    <Inbox className={ic} strokeWidth={1.8} />,
    catalogo:       <Library className={ic} strokeWidth={1.8} />,
    remates:        <Gavel className={ic} strokeWidth={1.8} />,
    muro:           <Newspaper className={ic} strokeWidth={1.8} />,
    arbol:          <GitBranch className={ic} strokeWidth={1.8} />,
    padron:         <BookOpen className={ic} strokeWidth={1.8} />,
  };

  /* ─── Mismas secciones que el sidebar ─── */
  const sections: NavSection[] = [
    {
      label: 'Principal',
      items: [
        ...(isAdmin ? [{ href: '/panel', label: 'Panel', icon: icons.panel }] : []),
        { href: '/muro', label: 'Muro', icon: icons.muro },
        { href: '/caballos', label: 'Caballos', icon: icons.caballos },
        { href: '/padron', label: 'Padrón', icon: icons.padron },
        { href: '/arbol', label: 'Árbol', icon: icons.arbol },
        ...(!isAdmin ? [{ href: '/eventos', label: 'Eventos', icon: icons.eventos }] : []),
        { href: '/remates', label: 'Remates', icon: icons.remates },
        { href: '/notificaciones', label: 'Notificaciones', icon: icons.notificaciones, badge: unreadCount },
      ],
    },
    ...(!isAdmin ? [{
      label: 'Gestión',
      items: [
        { href: '/agenda', label: 'Agenda', icon: icons.agenda },
        ...(isEst ? [{ href: '/organizacion', label: 'Organización', icon: icons.organizacion }] : []),
        ...(isEst || isProp ? [{ href: '/contratos', label: 'Contratos', icon: icons.contratos }] : []),
        ...(isEst || isProp ? [{ href: '/facturacion', label: 'Facturación', icon: icons.facturacion }] : []),
        ...(isEst ? [{ href: '/solicitudes', label: 'Solicitudes', icon: icons.solicitudes }] : []),
        ...(isProp ? [{ href: '/directorio', label: 'Directorio', icon: icons.directorio }] : []),
      ],
    }] : []),
    ...(isAdmin ? [{
      label: 'Administración',
      items: [
        { href: '/superadmin', label: 'Superadmin', icon: icons.superadmin },
        { href: '/eventos', label: 'Eventos', icon: icons.eventos },
        { href: '/catalogo', label: 'Catálogo', icon: icons.catalogo },
        { href: '/permisos', label: 'Permisos', icon: icons.permisos },
      ],
    }] : []),
  ].filter((s) => s.items.length > 0);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      {/* ─── Top bar (solo en mobile / ventana angosta) ─── */}
      <header className="md:hidden sticky top-0 z-40 bg-[var(--sidebar-bg)] border-b border-[var(--sidebar-border)] shadow-lg">
        <div className="flex h-14 items-center justify-between px-4 gap-3">

          {/* Hamburguesa */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-fg)] transition"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo centrado */}
          <Link href="/caballos" className="flex-1 flex items-center justify-center gap-2">
            <HorseshoeH size={24} strokeWidth={2} className="text-[var(--color-primary)] shrink-0" />
            <span className="font-display text-[19px] font-semibold tracking-[-0.01em] text-[var(--sidebar-fg)]">HandicApp</span>
          </Link>

          {/* Notificaciones */}
          <Link
            href="/notificaciones"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-fg)] transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* ─── Drawer overlay ─── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={closeDrawer}
          />

          {/* Panel */}
          <aside className="relative flex h-full w-[280px] flex-col bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] text-[var(--sidebar-fg)] shadow-2xl overflow-y-auto">

            {/* Header del drawer */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <HorseshoeH size={24} strokeWidth={2} className="text-[var(--color-primary)] shrink-0" />
                <span className="font-display text-[19px] font-semibold tracking-[-0.01em] text-[var(--sidebar-fg)]">HandicApp</span>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-fg)] transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Command palette */}
            <div className="px-3 pb-3 shrink-0">
              <button
                type="button"
                onClick={() => { openPalette(); closeDrawer(); }}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-hover-bg)] px-3 py-2 text-[12px] text-[var(--sidebar-fg-muted)] transition hover:border-[var(--sidebar-border)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-fg)]"
              >
                <span className="flex items-center gap-2">
                  <Command className="h-3.5 w-3.5" />
                  Comandos
                </span>
                <kbd className="rounded border border-[var(--sidebar-border)] bg-[var(--sidebar-hover-bg)] px-1 py-0.5 text-[10px] font-semibold text-[var(--sidebar-fg-muted)]">
                  ⌘K
                </kbd>
              </button>
            </div>

            <div className="mx-4 h-px bg-[var(--sidebar-border)] shrink-0" />

            {/* Nav */}
            <nav className="flex-1 px-2 py-2">
              {sections.map((section, si) => (
                <div key={section.label}>
                  {si > 0 && <div className="my-1.5 mx-3 h-px bg-[var(--sidebar-border)]" />}
                  <div className="px-3 pt-4 pb-1.5">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-[var(--sidebar-fg-faint)]">
                      {section.label}
                    </p>
                  </div>
                  <div className="space-y-px">
                    {section.items.map((item) => (
                      <DrawerNavLink
                        key={item.href}
                        item={item}
                        active={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                        onClose={closeDrawer}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Footer del drawer */}
            <div className="border-t border-[var(--sidebar-border)] p-2 space-y-px shrink-0">
              <Link
                href="/perfil"
                onClick={closeDrawer}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-150 ${
                  pathname === '/perfil' ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-fg)]' : 'text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-fg)]'
                }`}
              >
                <Avatar name={user?.name} avatarUrl={user?.avatar_url} avatarColor={user?.avatar_color} size="xs" />
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-[13px] font-semibold text-[var(--sidebar-fg)] tracking-[-0.01em]">{user?.name}</span>
                  <span className="truncate text-[10px] font-medium text-[var(--sidebar-fg-muted)] tracking-[0.03em]">
                    {roleLabel[user?.role || ''] || user?.role}
                  </span>
                </span>
              </Link>
              <button
                onClick={() => { logout(); closeDrawer(); }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-[var(--sidebar-fg-muted)] transition-all duration-150 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
