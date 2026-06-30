'use client';

import { useState, useCallback, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import {
  Search, ShieldCheck, Clock, Shield, ChevronLeft,
  ZoomIn, ZoomOut, RotateCcw, TreePine, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HorseHead } from '@/components/icons/equine';
import { useHorseRecordsSearch, useHorseRecordTree } from '@/hooks/use-horse-records';
import type { HorseRecordNode, HorseRecord } from '@/types';

// ─── Layout constants ────────────────────────────────────────────────────────
const NODE_W   = 168;
const NODE_H   = 78;
const COL_GAP  = 52;
const ROW_SLOT = NODE_H + 14; // vertical slot per leaf

// ─── Types ───────────────────────────────────────────────────────────────────
interface PlacedNode {
  node: HorseRecordNode | null;
  gen: number;
  index: number; // 0-based position within generation
  x: number;
  y: number; // top of node
}

interface Edge {
  x1: number; y1: number; // right-center of parent
  x2: number; y2: number; // left-center of child
  isSire: boolean;
  dashed?: boolean;
}

// ─── Layout builder ──────────────────────────────────────────────────────────
function buildPedigreeLayout(root: HorseRecordNode, maxGen: number) {
  const leafCount = Math.pow(2, maxGen);
  const totalH    = leafCount * ROW_SLOT;
  const totalW    = (maxGen + 1) * (NODE_W + COL_GAP);

  const nodes: PlacedNode[] = [];
  const edges: Edge[]       = [];

  function slotY(gen: number, index: number): number {
    const slots   = Math.pow(2, gen);
    const slotH   = totalH / slots;
    return slotH * index + (slotH - NODE_H) / 2;
  }

  function visit(
    node: HorseRecordNode | null,
    gen: number,
    index: number,
    parentX: number | null,
    parentY: number | null,
    isSire: boolean,
  ) {
    if (gen > maxGen) return;

    const x = gen * (NODE_W + COL_GAP);
    const y = slotY(gen, index);

    // Siempre empujamos el nodo (null = placeholder "Sin datos")
    nodes.push({ node, gen, index, x, y });

    if (parentX !== null && parentY !== null) {
      edges.push({
        x1: parentX + NODE_W, y1: parentY + NODE_H / 2,
        x2: x,               y2: y + NODE_H / 2,
        isSire,
        dashed: !node,
      });
    }

    // Solo recursamos si el nodo existe
    if (node && gen < maxGen) {
      visit(node.sire, gen + 1, index * 2,     x, y, true);
      visit(node.dam,  gen + 1, index * 2 + 1, x, y, false);
    }
  }

  visit(root, 0, 0, null, null, true);
  return { nodes, edges, totalW, totalH };
}

// ─── Generation label ────────────────────────────────────────────────────────
const GEN_LABELS = ['Caballo', 'Padres', 'Abuelos', 'Bisabuelos', 'Tatarabuelos', 'Anteabuelos'];

// ─── Ownership config ─────────────────────────────────────────────────────────
const OWN: Record<string, { border: string; bg: string; badge: React.ReactNode; ring: string }> = {
  verified: {
    border: 'border-emerald-400',
    bg: 'bg-emerald-50',
    ring: 'ring-2 ring-emerald-300/60',
    badge: (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
        <ShieldCheck className="h-2.5 w-2.5" /> Verificado
      </span>
    ),
  },
  pending_claim: {
    border: 'border-amber-400',
    bg: 'bg-amber-50',
    ring: 'ring-2 ring-amber-300/50',
    badge: (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
        <Clock className="h-2.5 w-2.5" /> Pendiente
      </span>
    ),
  },
  unverified: {
    border: 'border-gray-200',
    bg: 'bg-[var(--surface-card)]',
    ring: '',
    badge: null,
  },
  disputed: {
    border: 'border-red-300',
    bg: 'bg-red-50',
    ring: 'ring-1 ring-red-200',
    badge: (
      <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">Disputado</span>
    ),
  },
};

// ─── Single node card ────────────────────────────────────────────────────────
function PedigreeCard({
  placed,
  isSubject,
  onClick,
}: {
  placed: PlacedNode;
  isSubject: boolean;
  onClick: (id: string) => void;
}) {
  const { node } = placed;

  // Placeholder para padres sin datos en el registro
  if (!node) {
    return (
      <div
        style={{ left: placed.x, top: placed.y, width: NODE_W, height: NODE_H }}
        className="absolute flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60"
      >
        <Info className="h-4 w-4 text-gray-300 mb-1" />
        <span className="text-[10px] text-gray-300 font-medium">Sin datos</span>
      </div>
    );
  }

  const own = OWN[node.ownership_status] ?? OWN.unverified;

  if (isSubject) {
    return (
      <div
        style={{ left: placed.x, top: placed.y, width: NODE_W, height: NODE_H }}
        className="absolute flex flex-col justify-center px-4 rounded-xl bg-clay-500 text-white shadow-xl border border-clay-600"
      >
        <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-blue-300 mb-0.5">
          <HorseHead size={11} /> Sujeto
        </div>
        <div className="text-sm font-bold leading-tight truncate">{node.name}</div>
        <div className="text-xs text-blue-200 mt-1">
          {[node.birth_year, node.country_code, node.sex ? { macho: '♂', hembra: '♀', castrado: '⚥' }[node.sex] : null]
            .filter(Boolean).join(' · ')}
        </div>
        {node.ownership_status === 'verified' && (
          <span className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-400">
            <ShieldCheck className="h-2.5 w-2.5" /> Dueño verificado
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => node.id && onClick(node.id)}
      disabled={!node.id}
      style={{ left: placed.x, top: placed.y, width: NODE_W, height: NODE_H }}
      className={cn(
        'absolute flex flex-col justify-center px-3 rounded-xl border transition-all duration-150 text-left group',
        own.bg, own.border, own.ring,
        node.id
          ? 'hover:shadow-md hover:-translate-y-px cursor-pointer'
          : 'opacity-50 cursor-default border-dashed',
      )}
    >
      <div className="text-xs font-semibold leading-tight truncate text-gray-900">
        {node.name || <span className="text-gray-400 italic text-[11px]">Sin datos</span>}
      </div>
      <div className="text-[10px] text-gray-400 mt-0.5">
        {[node.birth_year, node.country_code, node.sex ? { macho: '♂', hembra: '♀', castrado: '⚥' }[node.sex] : null]
          .filter(Boolean).join(' · ') || '—'}
      </div>
      {own.badge && <div className="mt-1">{own.badge}</div>}
      {!own.badge && node.id && (
        <div className="mt-1 text-[9px] text-gray-300">
          <Shield className="h-2 w-2 inline mr-0.5" />Sin dueño registrado
        </div>
      )}
    </button>
  );
}

// ─── SVG edges ───────────────────────────────────────────────────────────────
function EdgeLayer({ edges, totalW, totalH }: { edges: Edge[]; totalW: number; totalH: number }) {
  return (
    <svg
      style={{ position: 'absolute', left: 0, top: 0, width: totalW, height: totalH, pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="sire-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="dam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {edges.map((e, i) => {
        const mx = (e.x1 + e.x2) / 2;
        const path = `M ${e.x1},${e.y1} C ${mx},${e.y1} ${mx},${e.y2} ${e.x2},${e.y2}`;
        return (
          <path
            key={i}
            d={path}
            fill="none"
            stroke={e.dashed ? '#d1d5db' : (e.isSire ? 'url(#sire-grad)' : 'url(#dam-grad)')}
            strokeWidth={e.dashed ? '1' : '1.5'}
            strokeLinecap="round"
            strokeDasharray={e.dashed ? '4 3' : undefined}
          />
        );
      })}
    </svg>
  );
}

// ─── Generation header row ───────────────────────────────────────────────────
function GenHeaders({ maxGen }: { maxGen: number }) {
  return (
    <div className="flex mb-3" style={{ gap: COL_GAP }}>
      {Array.from({ length: maxGen + 1 }).map((_, g) => (
        <div
          key={g}
          style={{ width: NODE_W, flexShrink: 0 }}
          className={cn(
            'text-center text-[10px] font-bold uppercase tracking-widest py-1 rounded-lg',
            g === 0
              ? 'text-blue-700 bg-blue-50'
              : g % 2 === 1
              ? 'text-gray-500 bg-gray-50'
              : 'text-gray-400 bg-gray-50/60',
          )}
        >
          {GEN_LABELS[g] ?? `Gen ${g}`}
        </div>
      ))}
    </div>
  );
}

// ─── Tree canvas ─────────────────────────────────────────────────────────────
function PedigreeCanvas({
  root,
  maxGen,
  zoom,
  onNodeClick,
}: {
  root: HorseRecordNode;
  maxGen: number;
  zoom: number;
  onNodeClick: (id: string) => void;
}) {
  const { nodes, edges, totalW, totalH } = buildPedigreeLayout(root, maxGen);

  return (
    <div
      className="origin-top-left transition-transform duration-200"
      style={{ transform: `scale(${zoom})`, width: totalW, height: totalH + 40, position: 'relative' }}
    >
      <GenHeaders maxGen={maxGen} />
      <div style={{ position: 'relative', width: totalW, height: totalH }}>
        <EdgeLayer edges={edges} totalW={totalW} totalH={totalH} />
        {nodes.map((placed, i) => (
          <PedigreeCard
            key={`${placed.gen}-${placed.index}`}
            placed={placed}
            isSubject={placed.gen === 0}
            onClick={onNodeClick}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Horse search selector ────────────────────────────────────────────────────
function HorseSearchSelector({ onSelect }: { onSelect: (r: HorseRecord) => void }) {
  const [q, setQ] = useState('');
  const [dq] = useDebounce(q, 300);
  const [open, setOpen] = useState(false);

  const { data } = useHorseRecordsSearch(
    { name: dq || undefined, limit: 10 },
    !!dq,
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-[var(--surface-card)] border border-gray-200 rounded-xl shadow-sm px-3 py-2">
        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar caballo por nombre…"
          className="flex-1 text-sm outline-none bg-transparent min-w-[220px]"
        />
      </div>

      {open && data?.items && data.items.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 bg-[var(--surface-card)] rounded-xl border border-gray-200 shadow-xl py-1 min-w-full max-h-64 overflow-y-auto">
            {data.items.map(r => (
              <button
                key={r.id}
                onClick={() => { onSelect(r); setQ(r.name); setOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition text-left"
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900">{r.name}</div>
                  <div className="text-xs text-gray-400">
                    {[r.birth_year, r.breed, r.country_code].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {r.ownership_status === 'verified' && (
                  <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── History breadcrumb ───────────────────────────────────────────────────────
function NavBreadcrumb({
  history,
  onBack,
}: {
  history: { id: string; name: string }[];
  onBack: () => void;
}) {
  if (history.length <= 1) return null;
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      <span>Volver a <strong>{history[history.length - 2]?.name}</strong></span>
    </button>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="flex items-center gap-4 text-[10px] text-gray-500">
      <span className="font-bold text-gray-400 uppercase tracking-wider">Referencias</span>
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-6 rounded bg-blue-400 opacity-50" />
        <span>Línea paterna</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-6 rounded bg-rose-400 opacity-50" />
        <span>Línea materna</span>
      </div>
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="h-3 w-3 text-emerald-500" />
        <span>Dueño verificado</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="h-3 w-3 text-amber-500" />
        <span>Claim pendiente</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Shield className="h-3 w-3 text-gray-300" />
        <span>Sin dueño</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ArbolPage() {
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [maxGen, setMaxGen]           = useState(4);
  const [zoom, setZoom]               = useState(1);
  const [history, setHistory]         = useState<{ id: string; name: string }[]>([]);
  const scrollRef                     = useRef<HTMLDivElement>(null);

  const { data: tree, isLoading } = useHorseRecordTree(selectedId, maxGen);

  const handleSelect = useCallback((r: HorseRecord) => {
    setSelectedId(r.id);
    setHistory([{ id: r.id, name: r.name }]);
    setZoom(1);
  }, []);

  const handleNodeClick = useCallback((id: string) => {
    if (!tree) return;
    // Find node name in the current tree for breadcrumb
    function findName(n: HorseRecordNode | null): string | null {
      if (!n) return null;
      if (n.id === id) return n.name;
      return findName(n.sire) ?? findName(n.dam);
    }
    const name = findName(tree) ?? id;
    setSelectedId(id);
    setHistory(h => [...h, { id, name }]);
    scrollRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  }, [tree]);

  const handleBack = useCallback(() => {
    setHistory(h => {
      const next = h.slice(0, -1);
      setSelectedId(next[next.length - 1]?.id ?? null);
      return next;
    });
  }, []);

  const adjustZoom = (delta: number) =>
    setZoom(z => Math.max(0.4, Math.min(1.5, +(z + delta).toFixed(1))));

  return (
    <div className="flex flex-col h-screen bg-[var(--surface-page)] overflow-hidden">

      {/* ── Top toolbar ── */}
      <div className="flex items-center gap-4 px-6 py-3 bg-[var(--surface-card)] border-b border-gray-100 shadow-sm flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2 text-gray-800">
          <TreePine className="h-5 w-5 text-emerald-600" />
          <span className="font-bold text-base">Árbol Genealógico</span>
        </div>

        <div className="flex-1 min-w-[240px]">
          <HorseSearchSelector onSelect={handleSelect} />
        </div>

        <NavBreadcrumb history={history} onBack={handleBack} />

        {/* Depth selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {[3, 4, 5].map(d => (
            <button
              key={d}
              onClick={() => setMaxGen(d)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-semibold transition',
                maxGen === d ? 'bg-[var(--surface-card)] text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {d} gen
            </button>
          ))}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => adjustZoom(-0.1)} className="p-1.5 text-gray-500 hover:text-gray-800 transition rounded-md hover:bg-[var(--surface-card)]">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-mono w-10 text-center text-gray-600">{Math.round(zoom * 100)}%</span>
          <button onClick={() => adjustZoom(0.1)} className="p-1.5 text-gray-500 hover:text-gray-800 transition rounded-md hover:bg-[var(--surface-card)]">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setZoom(1)} className="p-1.5 text-gray-500 hover:text-gray-800 transition rounded-md hover:bg-[var(--surface-card)]">
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── Canvas area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        style={{ padding: 32 }}
      >
        {!selectedId && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <TreePine className="h-16 w-16 text-gray-200 mb-4" />
            <h2 className="text-xl font-bold text-gray-400 mb-2">Seleccioná un caballo</h2>
            <p className="text-sm text-gray-400 max-w-xs">
              Buscá cualquier caballo en la base de datos y su árbol genealógico aparecerá acá.
              Podés navegar haciendo clic en cualquier nodo del árbol.
            </p>
          </div>
        )}

        {selectedId && isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-gray-400 animate-pulse">Cargando árbol…</div>
          </div>
        )}

        {selectedId && !isLoading && tree && (
          <>
            {!tree.sire && !tree.dam && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                <Info className="h-4 w-4 shrink-0" />
                <span>
                  No se encontraron padres para este caballo en el padrón. Los datos se completan
                  automáticamente vía scraping — puede demorar unos minutos.
                </span>
              </div>
            )}
            <PedigreeCanvas
              root={tree}
              maxGen={maxGen}
              zoom={zoom}
              onNodeClick={handleNodeClick}
            />
          </>
        )}

        {selectedId && !isLoading && !tree && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Info className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No se encontraron datos de pedigree para este caballo.</p>
          </div>
        )}
      </div>

      {/* ── Bottom legend ── */}
      <div className="px-6 py-2.5 bg-[var(--surface-card)] border-t border-gray-100 flex-shrink-0">
        <Legend />
      </div>
    </div>
  );
}
