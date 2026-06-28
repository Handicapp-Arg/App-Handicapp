'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Home, Bell, Calendar, Building2, Receipt, FileText, ShieldCheck, MapPin,
  Sun, Moon, LogOut, Search, Sparkles, type LucideIcon,
} from 'lucide-react';
import { useShortcut } from './use-shortcut';
import { useTheme } from './theme-context';
import { useAuth } from './auth-context';
import { cn } from './cn';

export interface CommandEntry {
  id: string;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  /** Lo que se ejecuta al elegir el comando. */
  perform: () => void;
  /** Términos extras para buscar (sin tildes, todo en minúsculas). */
  keywords?: string[];
  group?: string;
}

interface CommandPaletteContextValue {
  open: () => void;
  close: () => void;
  register: (entries: CommandEntry[]) => () => void;
}

const Ctx = createContext<CommandPaletteContextValue | null>(null);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function fuzzyScore(haystack: string, query: string): number {
  if (!query) return 1;
  const h = normalize(haystack);
  const q = normalize(query);
  if (h.includes(q)) return q.length / h.length + 1;
  // ranking básico — todos los chars en orden
  let i = 0;
  let score = 0;
  for (const c of q) {
    const idx = h.indexOf(c, i);
    if (idx === -1) return 0;
    score += 1 / (idx + 1);
    i = idx + 1;
  }
  return score / q.length;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { resolved, toggle } = useTheme();
  const { logout, user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [external, setExternal] = useState<CommandEntry[]>([]);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setActiveIndex(0);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const register = useCallback((entries: CommandEntry[]) => {
    setExternal((prev) => [...prev, ...entries]);
    return () => {
      setExternal((prev) => prev.filter((e) => !entries.some((x) => x.id === e.id)));
    };
  }, []);

  // Cmd+K / Ctrl+K
  useShortcut('mod+k', (e) => {
    e.preventDefault();
    isOpen ? close() : open();
  }, { allowInInputs: true });

  // Atajos de navegación
  useShortcut('g h', () => router.push('/panel'));
  useShortcut('g c', () => router.push('/caballos'));
  useShortcut('g e', () => router.push('/eventos'));
  useShortcut('g a', () => router.push('/agenda'));
  useShortcut('g o', () => router.push('/organizacion'));
  useShortcut('g f', () => router.push('/facturacion'));
  useShortcut('g n', () => router.push('/notificaciones'));

  const builtIns = useMemo<CommandEntry[]>(() => {
    const go = (path: string) => () => { router.push(path); close(); };
    const baseEntries: CommandEntry[] = [
      { id: 'go:home',          label: 'Ir al inicio',        icon: Home,        perform: go('/panel'),         keywords: ['panel', 'dashboard'], group: 'Navegación', hint: 'g h' },
      { id: 'go:caballos',      label: 'Ir a Caballos',       icon: Sparkles,    perform: go('/caballos'),      group: 'Navegación', hint: 'g c' },
      { id: 'go:eventos',       label: 'Ir a Eventos',        icon: Receipt,     perform: go('/eventos'),       group: 'Navegación', hint: 'g e' },
      { id: 'go:agenda',        label: 'Ir a Agenda',         icon: Calendar,    perform: go('/agenda'),        group: 'Navegación', hint: 'g a' },
      { id: 'go:organizacion',  label: 'Ir a Organización',   icon: Building2,   perform: go('/organizacion'),  group: 'Navegación', hint: 'g o' },
      { id: 'go:facturacion',   label: 'Ir a Facturación',    icon: Receipt,     perform: go('/facturacion'),   group: 'Navegación', hint: 'g f' },
      { id: 'go:contratos',     label: 'Ir a Contratos',      icon: FileText,    perform: go('/contratos'),     group: 'Navegación' },
      { id: 'go:directorio',    label: 'Ir a Directorio',     icon: MapPin,      perform: go('/directorio'),    group: 'Navegación' },
      { id: 'go:notificaciones',label: 'Ir a Notificaciones', icon: Bell,        perform: go('/notificaciones'),group: 'Navegación', hint: 'g n' },
    ];
    if (user?.role === 'admin') {
      baseEntries.push({
        id: 'go:superadmin', label: 'Ir a Superadmin', icon: ShieldCheck,
        perform: go('/superadmin'), group: 'Navegación',
      });
    }
    return [
      ...baseEntries,
      {
        id: 'theme:toggle',
        label: resolved === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro',
        icon: resolved === 'dark' ? Sun : Moon,
        perform: () => { toggle(); close(); },
        keywords: ['theme', 'tema', 'dark', 'claro', 'oscuro'],
        group: 'Apariencia',
      },
      {
        id: 'auth:logout',
        label: 'Cerrar sesión',
        icon: LogOut,
        perform: async () => { close(); await logout(); },
        keywords: ['logout', 'salir'],
        group: 'Cuenta',
      },
    ];
  }, [router, user, resolved, toggle, logout, close]);

  const allEntries = useMemo(() => [...builtIns, ...external], [builtIns, external]);

  const filtered = useMemo(() => {
    if (!query) return allEntries;
    return allEntries
      .map((e) => {
        const haystack = [e.label, e.hint ?? '', ...(e.keywords ?? [])].join(' ');
        return { e, score: fuzzyScore(haystack, query) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.e);
  }, [allEntries, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, CommandEntry[]>();
    for (const e of filtered) {
      const g = e.group ?? 'Otros';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(e);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  // Focus input al abrir
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => setActiveIndex(0), [query]);

  if (typeof document === 'undefined') {
    return <Ctx.Provider value={{ open, close, register }}>{children}</Ctx.Provider>;
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[activeIndex];
      if (target) target.perform();
    }
  };

  return (
    <Ctx.Provider value={{ open, close, register }}>
      {children}
      {isOpen &&
        createPortal(
          <div className="animate-fade-in fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh]">
            <div className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm" onClick={close} aria-hidden />
            <div className="animate-fade-in-up relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[var(--surface-card)] shadow-2xl">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4">
                <Search className="h-4 w-4 text-slate-400" aria-hidden />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Buscar comando, página o acción…"
                  className="h-12 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  aria-label="Buscar comando"
                />
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  ESC
                </kbd>
              </div>

              <div className="max-h-[60vh] overflow-y-auto py-1">
                {grouped.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    Sin resultados para “{query}”.
                  </div>
                ) : (
                  grouped.map(([group, entries]) => (
                    <div key={group} className="py-1">
                      <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {group}
                      </p>
                      {entries.map((entry) => {
                        const idx = filtered.indexOf(entry);
                        const active = idx === activeIndex;
                        const Icon = entry.icon ?? Sparkles;
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={entry.perform}
                            className={cn(
                              'flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition',
                              active ? 'bg-navy-50 text-gray-900' : 'text-slate-700 hover:bg-slate-50',
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                            <span className="flex-1 truncate">{entry.label}</span>
                            {entry.hint && (
                              <kbd className="ml-2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                {entry.hint}
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-[11px] text-slate-500">
                <span>↑↓ moverse · ↵ elegir · esc cerrar</span>
                <span>
                  <kbd className="rounded border border-slate-200 bg-[var(--surface-card)] px-1 py-0.5 text-[10px] font-semibold">⌘K</kbd> abrir
                </span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </Ctx.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCommandPalette debe usarse dentro de CommandPaletteProvider');
  return ctx;
}
