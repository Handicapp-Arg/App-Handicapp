'use client';

import { useState } from 'react';
import { Modal } from './modal';
import { useShortcut } from '@/lib/use-shortcut';

const ROWS: { combo: string; description: string; group: string }[] = [
  { group: 'General',     combo: '⌘ K',  description: 'Abrir el buscador de comandos' },
  { group: 'General',     combo: '?',    description: 'Mostrar este panel de atajos' },
  { group: 'General',     combo: 'esc',  description: 'Cerrar modal o salir del buscador' },
  { group: 'Navegación',  combo: 'g h',  description: 'Ir al inicio' },
  { group: 'Navegación',  combo: 'g c',  description: 'Ir a Caballos' },
  { group: 'Navegación',  combo: 'g e',  description: 'Ir a Eventos' },
  { group: 'Navegación',  combo: 'g a',  description: 'Ir a Agenda' },
  { group: 'Navegación',  combo: 'g o',  description: 'Ir a Organización' },
  { group: 'Navegación',  combo: 'g f',  description: 'Ir a Facturación' },
  { group: 'Navegación',  combo: 'g n',  description: 'Ir a Notificaciones' },
];

export function ShortcutsCheatsheet() {
  const [open, setOpen] = useState(false);
  useShortcut('shift+/', () => setOpen(true));

  const groups = Array.from(
    ROWS.reduce<Map<string, typeof ROWS>>((acc, r) => {
      const list = acc.get(r.group) ?? [];
      list.push(r);
      acc.set(r.group, list);
      return acc;
    }, new Map()),
  );

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Atajos de teclado"
      description="Para moverte por HandicApp sin tocar el mouse."
      size="md"
    >
      <div className="space-y-5">
        {groups.map(([group, rows]) => (
          <div key={group}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{group}</p>
            <div className="space-y-1.5">
              {rows.map((r) => (
                <div key={r.combo} className="flex items-center justify-between rounded-lg px-1 py-1.5">
                  <span className="text-sm text-slate-700">{r.description}</span>
                  <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    {r.combo}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
