'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Command } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useUnreadCount } from '@/hooks/use-notifications';
import { GlobalSearch } from '@/components/global-search';
import { useCommandPalette } from '@/lib/command-palette';
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-white/[0.13] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
          : 'text-white/45 hover:bg-white/[0.06] hover:text-white/90'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#c4922a]" />
      )}
      <span className={`shrink-0 transition-colors ${active ? 'text-white' : 'text-white/40 group-hover:text-white/75'}`}>
        {item.icon}
      </span>
      <span className="flex-1 truncate tracking-[-0.01em] leading-none">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
    </Link>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="px-3 pt-5 pb-2">
      <div className="flex items-center gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/20">{label}</p>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>
    </div>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { data: unread } = useUnreadCount();
  const { open: openPalette } = useCommandPalette();

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
    organizacion: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" /></svg>,
    superadmin: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" /></svg>,
    solicitudes: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 0 1-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 0 0 1.183 1.981l6.478 3.488m8.839 2.51-4.66-2.51m0 0-1.023-.55a2.25 2.25 0 0 0-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V8.844a2.25 2.25 0 0 1 1.183-1.981l7.5-4.039a2.25 2.25 0 0 1 2.134 0l7.5 4.039a2.25 2.25 0 0 1 1.183 1.98V19.5Z" /></svg>,
    catalogo: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>,
    remates: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>,
    muro: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" /></svg>,
    registro: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>,
    arbol: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5M7.5 3v18m4.5-18v18M3 3h18M3 21h18" /></svg>,
  };

  /* ─── Secciones por rol ─── */
  const isAdmin = user?.role === 'admin';
  const isEst = user?.role === 'establecimiento';
  const isProp = user?.role === 'propietario';
  const isVet = user?.role === 'veterinario';

  const sections: NavSection[] = isAdmin
    ? [
        {
          label: 'Panel',
          items: [
            { href: '/panel', label: 'Panel', icon: icons.panel },
            { href: '/muro', label: 'Muro', icon: icons.muro },
            { href: '/remates', label: 'Remates', icon: icons.remates },
            { href: '/notificaciones', label: 'Notificaciones', icon: icons.notificaciones, badge: unreadCount },
          ],
        },
        {
          label: 'Plataforma',
          items: [
            { href: '/catalogo', label: 'Catálogo', icon: icons.catalogo },
          ],
        },
        {
          label: 'Configuración',
          items: [
            { href: '/superadmin', label: 'Organizaciones', icon: icons.organizacion },
            { href: '/permisos', label: 'Permisos', icon: icons.permisos },
          ],
        },
      ]
    : [
        {
          label: 'Principal',
          items: [
            { href: '/muro', label: 'Muro', icon: icons.muro },
            { href: '/caballos', label: 'Caballos', icon: icons.caballos },
            { href: '/padron', label: 'Padrón', icon: icons.registro },
            { href: '/arbol', label: 'Árbol', icon: icons.arbol },
            { href: '/eventos', label: 'Eventos', icon: icons.eventos },
            { href: '/remates', label: 'Remates', icon: icons.remates },
            { href: '/notificaciones', label: 'Notificaciones', icon: icons.notificaciones, badge: unreadCount },
          ],
        },
        {
          label: 'Gestión',
          items: [
            { href: '/agenda', label: 'Agenda', icon: icons.agenda },
            ...(isEst ? [{ href: '/organizacion', label: 'Organización', icon: icons.organizacion }] : []),
            ...(isEst || isProp ? [{ href: '/contratos', label: 'Contratos', icon: icons.contratos }] : []),
            ...(isEst || isProp ? [{ href: '/facturacion', label: 'Facturación', icon: icons.facturacion }] : []),
            ...(isEst ? [{ href: '/solicitudes', label: 'Solicitudes', icon: icons.solicitudes }] : []),
            ...(isProp ? [{ href: '/directorio', label: 'Directorio', icon: icons.directorio }] : []),
          ].filter(Boolean) as NavItem[],
        },
      ].filter((s) => s.items.length > 0);

  return (
    <aside className="hidden md:flex sticky top-0 h-screen w-[220px] flex-col bg-[#0f1f3d] text-white">

      {/* Brand */}
      <div className="px-5 pt-6 pb-4">
        <Link href="/" className="flex items-center">
          <Image
            src="https://res.cloudinary.com/dh2m9ychv/image/upload/v1762370534/logo-full-white_suu2qt.png"
            alt="HandicApp"
            width={130}
            height={32}
            className="h-7 w-auto object-contain"
            priority
            unoptimized
          />
        </Link>
      </div>

      {/* Búsqueda global */}
      <div className="px-3 pb-2">
        <GlobalSearch />
      </div>

      {/* Trigger del Command Palette */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={openPalette}
          className="group flex w-full items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[12px] text-white/55 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white/85"
        >
          <span className="flex items-center gap-2">
            <Command className="h-3.5 w-3.5" aria-hidden />
            Comandos
          </span>
          <kbd className="rounded border border-white/12 bg-white/5 px-1 py-0.5 text-[10px] font-semibold text-white/55 group-hover:text-white/85">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Separador */}
      <div className="mx-4 h-px bg-white/8" />

      {/* Nav con secciones */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {sections.map((section, si) => (
          <div key={section.label}>
            {si > 0 && <div className="my-1.5 mx-3 h-px bg-white/7" />}
            <SectionDivider label={section.label} />
            <div className="space-y-px">
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
      <div className="border-t border-white/8 p-3 space-y-1">
        <Link
          href="/perfil"
          className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
            pathname === '/perfil'
              ? 'bg-white/[0.13] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
              : 'hover:bg-white/[0.06]'
          }`}
        >
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#c4922a] to-[#a37320] text-[12px] font-bold text-white uppercase ring-1 ring-[#c4922a]/30">
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0,2) ?? '?'}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0f1f3d] bg-emerald-400" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[13px] font-semibold text-white/90 tracking-[-0.01em]">{user?.name}</span>
            <span className="truncate text-[10px] font-medium text-white/35">
              {roleLabel[user?.role || ''] || user?.role}
            </span>
          </span>
          <svg className="h-3.5 w-3.5 shrink-0 text-white/20 group-hover:text-white/50 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
        <div className="flex items-center gap-1 px-1">
          <button
            onClick={logout}
            className="flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-white/30 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
          >
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
            Salir
          </button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
