'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Newspaper, ScrollText, Network, CalendarClock, Gavel,
  CalendarDays, FileText, Receipt, MapPin, Building2, Inbox, Library, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { HorseHeadLine, HorseshoeH } from '@/components/icons/equine';
import { ThemeToggle } from '@/components/ui/theme-toggle';

type NavItem = { href: string; label: string; icon: React.ReactNode; badge?: number };
type NavSection = { label: string; items: NavItem[] };

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-fg)]'
          : 'text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-fg)]'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--color-primary)]" />
      )}
      <span className={`shrink-0 transition-colors ${active ? 'text-[var(--color-primary)]' : 'text-[var(--sidebar-fg-faint)] group-hover:text-[var(--sidebar-fg-muted)]'}`}>
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
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--sidebar-fg-faint)]">{label}</p>
        <div className="flex-1 h-px bg-[var(--sidebar-border)]" />
      </div>
    </div>
  );
}

const ic = 'h-5 w-5';

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  /* ─── Íconos (lucide + ecuestres de marca, mismo set que el móvil) ─── */
  const icons = {
    panel:          <LayoutDashboard className={ic} strokeWidth={1.8} />,
    caballos:       <HorseHeadLine size={20} strokeWidth={1.8} />,
    eventos:        <CalendarClock className={ic} strokeWidth={1.8} />,
    agenda:         <CalendarDays className={ic} strokeWidth={1.8} />,
    contratos:      <FileText className={ic} strokeWidth={1.8} />,
    facturacion:    <Receipt className={ic} strokeWidth={1.8} />,
    directorio:     <MapPin className={ic} strokeWidth={1.8} />,
    organizacion:   <Building2 className={ic} strokeWidth={1.8} />,
    solicitudes:    <Inbox className={ic} strokeWidth={1.8} />,
    catalogo:       <Library className={ic} strokeWidth={1.8} />,
    permisos:       <ShieldCheck className={ic} strokeWidth={1.8} />,
    superadmin:     <ShieldCheck className={ic} strokeWidth={1.8} />,
    remates:        <Gavel className={ic} strokeWidth={1.8} />,
    muro:           <Newspaper className={ic} strokeWidth={1.8} />,
    padron:         <ScrollText className={ic} strokeWidth={1.8} />,
    arbol:          <Network className={ic} strokeWidth={1.8} />,
  };

  /* ─── Secciones por rol ─── */
  const isAdmin = user?.role === 'admin';
  const isEst = user?.role === 'establecimiento';
  const isProp = user?.role === 'propietario';

  const sections: NavSection[] = isAdmin
    ? [
        {
          label: 'Panel',
          items: [
            { href: '/panel', label: 'Panel', icon: icons.panel },
            { href: '/muro', label: 'Muro', icon: icons.muro },
            { href: '/remates', label: 'Remates', icon: icons.remates },
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
            { href: '/padron', label: 'Padrón', icon: icons.padron },
            { href: '/arbol', label: 'Árbol', icon: icons.arbol },
            { href: '/eventos', label: 'Eventos', icon: icons.eventos },
            { href: '/remates', label: 'Remates', icon: icons.remates },
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
    <aside className="hidden md:flex sticky top-0 h-screen w-[220px] flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)]">

      {/* Brand — isotipo de marca (herradura + H) + wordmark monocromático */}
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="flex items-center gap-2.5">
          <HorseshoeH size={26} strokeWidth={2} className="text-[var(--color-primary)] shrink-0" />
          <span className="font-display text-[20px] font-semibold tracking-[-0.01em] text-[var(--sidebar-fg)]">
            HandicApp
          </span>
        </Link>
      </div>

      {/* Nav con secciones */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {sections.map((section) => (
          <div key={section.label}>
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

      {/* Footer — control de tema (manejo de fondos) */}
      <div className="border-t border-[var(--sidebar-border)] px-3 py-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-medium text-[var(--sidebar-fg-faint)]">Tema</span>
          <ThemeToggle />
        </div>
      </div>

    </aside>
  );
}
