'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useUnreadCount } from '@/hooks/use-notifications';

const PRIMARY = '#9d6c35';

type NavIcon = React.FC<{ active: boolean }>;

const icons: Record<string, NavIcon> = {
  caballos: ({ active }) => (
    <svg className="h-5.5 w-5.5" style={{ width: 22, height: 22 }} fill={active ? PRIMARY : 'none'} viewBox="0 0 24 24" stroke={active ? PRIMARY : '#9ca3af'} strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  ),
  eventos: ({ active }) => (
    <svg style={{ width: 22, height: 22 }} fill="none" viewBox="0 0 24 24" stroke={active ? PRIMARY : '#9ca3af'} strokeWidth={active ? 2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  agenda: ({ active }) => (
    <svg style={{ width: 22, height: 22 }} fill="none" viewBox="0 0 24 24" stroke={active ? PRIMARY : '#9ca3af'} strokeWidth={active ? 2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  ),
  perfil: ({ active }) => (
    <svg style={{ width: 22, height: 22 }} fill="none" viewBox="0 0 24 24" stroke={active ? PRIMARY : '#9ca3af'} strokeWidth={active ? 2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
  panel: ({ active }) => (
    <svg style={{ width: 22, height: 22 }} fill="none" viewBox="0 0 24 24" stroke={active ? PRIMARY : '#9ca3af'} strokeWidth={active ? 2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  ),
};

export function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.count ?? 0;

  const links = [
    { href: '/caballos', label: 'Caballos', key: 'caballos' },
    { href: '/eventos', label: 'Eventos', key: 'eventos' },
    { href: '/agenda', label: 'Agenda', key: 'agenda' },
    ...(user?.role === 'admin' ? [{ href: '/panel', label: 'Panel', key: 'panel' }] : []),
    { href: '/perfil', label: 'Perfil', key: 'perfil', badge: unreadCount },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -1px 0 0 rgb(0 0 0 / 0.05), 0 -4px 12px 0 rgb(0 0 0 / 0.04)',
      }}
    >
      <div className="flex items-stretch">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          const Icon = icons[link.key];

          return (
            <Link
              key={link.href}
              href={link.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 pt-2.5 pb-1 transition-opacity active:opacity-70"
            >
              {/* Indicador activo — línea en top, igual que mobile */}
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full transition-all"
                  style={{ backgroundColor: PRIMARY }}
                />
              )}

              {/* Ícono con badge */}
              <span className="relative">
                {Icon && <Icon active={active} />}
                {link.badge != null && link.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {link.badge > 9 ? '9+' : link.badge}
                  </span>
                )}
              </span>

              <span
                className="text-[10px] font-semibold leading-none tracking-tight"
                style={{ color: active ? PRIMARY : '#9ca3af' }}
              >
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
