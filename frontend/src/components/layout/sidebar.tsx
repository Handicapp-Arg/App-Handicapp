'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Newspaper, ScrollText, Network, CalendarClock, Gavel,
  CalendarDays, FileText, Receipt, MapPin, Building2, Inbox, Library, ShieldCheck,
  CreditCard, BarChart3, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePlanStatus } from '@/hooks/use-plan';
import { HorseshoeH, HorseHead } from '@/components/icons/equine';
import { ThemeToggle } from '@/components/ui/theme-toggle';

type NavItem = { href: string; label: string; icon: React.ReactNode; badge?: number };
type NavSection = { label: string; items: NavItem[] };

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
        collapsed ? 'justify-center px-0' : 'px-3'
      } ${
        active
          ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-fg)]'
          : 'text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-fg)]'
      }`}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--color-primary)]" />
      )}
      <span className={`shrink-0 transition-colors ${active ? 'text-[var(--color-primary)]' : 'text-[var(--sidebar-fg-faint)] group-hover:text-[var(--sidebar-fg-muted)]'}`}>
        {item.icon}
      </span>
      {!collapsed && <span className="flex-1 truncate tracking-[-0.01em] leading-none">{item.label}</span>}
      {!collapsed && item.badge != null && item.badge > 0 && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-danger-500)] px-1 text-[10px] font-bold text-white leading-none">
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
    </Link>
  );
}

function SectionDivider({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="mx-3 my-2 h-px bg-[var(--sidebar-border)]" />;
  }
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
  const { data: planStatus } = usePlanStatus();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('handicapp:sidebar') === '1') setCollapsed(true);
  }, []);

  const toggle = () => setCollapsed((prev) => {
    const next = !prev;
    localStorage.setItem('handicapp:sidebar', next ? '1' : '0');
    return next;
  });

  /* ─── Íconos (lucide + ecuestres de marca, mismo set que el móvil) ─── */
  const icons = {
    panel:          <LayoutDashboard className={ic} strokeWidth={1.8} />,
    caballos:       <HorseHead size={20} />,
    eventos:        <CalendarClock className={ic} strokeWidth={1.8} />,
    agenda:         <CalendarDays className={ic} strokeWidth={1.8} />,
    contratos:      <FileText className={ic} strokeWidth={1.8} />,
    facturacion:    <Receipt className={ic} strokeWidth={1.8} />,
    directorio:     <MapPin className={ic} strokeWidth={1.8} />,
    organizacion:   <Building2 className={ic} strokeWidth={1.8} />,
    solicitudes:    <Inbox className={ic} strokeWidth={1.8} />,
    catalogo:       <Library className={ic} strokeWidth={1.8} />,
    permisos:       <ShieldCheck className={ic} strokeWidth={1.8} />,
    planes:         <CreditCard className={ic} strokeWidth={1.8} />,
    reportes:       <BarChart3 className={ic} strokeWidth={1.8} />,
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
  const hasReportes = planStatus?.features?.includes('reportes') ?? false;

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
            { href: '/superadmin/planes', label: 'Planes', icon: icons.planes },
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
            ...(hasReportes ? [{ href: '/reportes', label: 'Reportes', icon: icons.reportes }] : []),
          ].filter(Boolean) as NavItem[],
        },
      ].filter((s) => s.items.length > 0);

  // Ítem activo = el href MÁS específico (más largo) que matchea el pathname, para
  // que una subruta (ej. /superadmin/planes) no marque también a su padre (/superadmin).
  const activeHref = sections
    .flatMap((s) => s.items.map((i) => i.href))
    .filter((h) => pathname === h || (h !== '/' && pathname.startsWith(h + '/')))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <aside
      className={`hidden md:flex sticky top-0 h-screen flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)] transition-[width] duration-300 ease-out ${
        collapsed ? 'w-[68px]' : 'w-[220px]'
      }`}
    >

      {/* Brand — isotipo + wordmark (oculto al contraer) */}
      <div className={`pt-6 pb-5 ${collapsed ? 'px-0' : 'px-5'}`}>
        <Link href="/" className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
          <HorseshoeH size={26} strokeWidth={2} className="text-[var(--color-primary)] shrink-0" />
          {!collapsed && (
            <span className="font-display text-[20px] font-semibold tracking-[-0.01em] text-[var(--sidebar-fg)] whitespace-nowrap">
              HandicApp
            </span>
          )}
        </Link>
      </div>

      {/* Nav con secciones */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
        {sections.map((section) => (
          <div key={section.label}>
            <SectionDivider label={section.label} collapsed={collapsed} />
            <div className="space-y-px">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={item.href === activeHref}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — tema + botón contraer */}
      <div className="border-t border-[var(--sidebar-border)] px-2.5 py-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center justify-between gap-2 px-1.5">
            <span className="text-[11px] font-medium text-[var(--sidebar-fg-faint)]">Tema</span>
            <ThemeToggle />
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? 'Expandir' : 'Contraer'}
          className={`flex w-full items-center gap-2.5 rounded-lg py-2 text-[12.5px] font-medium text-[var(--sidebar-fg-faint)] transition-colors hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-fg-muted)] cursor-pointer ${
            collapsed ? 'justify-center px-0' : 'px-2'
          }`}
        >
          {collapsed
            ? <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.8} />
            : <><PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.8} /><span>Contraer</span></>}
        </button>
      </div>

    </aside>
  );
}
