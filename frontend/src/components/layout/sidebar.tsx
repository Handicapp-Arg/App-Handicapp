'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useUnreadCount } from '@/hooks/use-notifications';
import { GlobalSearch } from '@/components/global-search';

const roleLabel: Record<string, string> = {
  admin: 'Administrador',
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
  veterinario: 'Veterinario',
};

type NavItem = { href: string; label: string; icon: React.ReactNode; badge?: number };
type NavSection = { label: string; items: NavItem[] };

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-white/15 text-white shadow-sm'
          : 'text-white/55 hover:bg-white/8 hover:text-white/90'
      }`}
    >
      {/* Indicador activo */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-white/60" />
      )}
      <span className={`shrink-0 transition-colors ${active ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`}>
        {item.icon}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
    </Link>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="px-3 pt-5 pb-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">{label}</p>
    </div>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { data: unread } = useUnreadCount();

  const unreadCount = unread?.count ?? 0;

  /* ─── Íconos ─── */
  const icons = {
    panel: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>,
    caballos: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>,
    eventos: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>,
    agenda: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>,
    contratos: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>,
    facturacion: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>,
    directorio: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>,
    permisos: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>,
    notificaciones: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>,
  };

  /* ─── Secciones por rol ─── */
  const isAdmin = user?.role === 'admin';
  const isEst = user?.role === 'establecimiento';
  const isProp = user?.role === 'propietario';
  const isVet = user?.role === 'veterinario';

  const sections: NavSection[] = [
    {
      label: 'Principal',
      items: [
        ...(isAdmin ? [{ href: '/panel', label: 'Panel', icon: icons.panel }] : []),
        { href: '/caballos', label: 'Caballos', icon: icons.caballos },
        ...(!isAdmin ? [{ href: '/eventos', label: 'Eventos', icon: icons.eventos }] : []),
        { href: '/notificaciones', label: 'Notificaciones', icon: icons.notificaciones, badge: unreadCount },
      ],
    },
    ...(!isAdmin ? [{
      label: 'Gestión',
      items: [
        { href: '/agenda', label: 'Agenda', icon: icons.agenda },
        ...(isEst || isProp ? [{ href: '/contratos', label: 'Contratos', icon: icons.contratos }] : []),
        ...(isEst || isProp ? [{ href: '/facturacion', label: 'Facturación', icon: icons.facturacion }] : []),
        ...(isProp ? [{ href: '/directorio', label: 'Directorio', icon: icons.directorio }] : []),
      ].filter((i) => i !== null),
    }] : []),
    ...(isAdmin ? [{
      label: 'Administración',
      items: [
        { href: '/eventos', label: 'Eventos', icon: icons.eventos },
        { href: '/permisos', label: 'Permisos', icon: icons.permisos },
      ],
    }] : []),
  ].filter((s) => s.items.length > 0);

  return (
    <aside className="hidden md:flex sticky top-0 h-screen w-60 flex-col border-r border-white/5 bg-[#0f1f3d] text-white">

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <span className="text-sm font-bold text-white">H</span>
        </div>
        <span className="text-base font-bold tracking-tight text-white">HandicApp</span>
      </div>

      {/* Búsqueda global */}
      <div className="px-3 pb-3">
        <GlobalSearch />
      </div>

      {/* Nav con secciones */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {sections.map((section, si) => (
          <div key={section.label}>
            {si > 0 && <div className="my-2 mx-3 h-px bg-white/8" />}
            <SectionDivider label={section.label} />
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: usuario + salir */}
      <div className="border-t border-white/8 p-2 space-y-0.5">
        <Link
          href="/perfil"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
            pathname === '/perfil' ? 'bg-white/15 text-white' : 'text-white/55 hover:bg-white/8 hover:text-white/90'
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white uppercase">
            {user?.name?.charAt(0) ?? '?'}
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-white">{user?.name}</span>
            <span className="truncate text-[10px] uppercase tracking-wide text-white/40">
              {roleLabel[user?.role || ''] || user?.role}
            </span>
          </span>
        </Link>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/40 transition-colors hover:bg-red-500/12 hover:text-red-300 cursor-pointer"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
