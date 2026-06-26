'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PedigreeNode, PedigreeStatus } from '@/types';

interface Props {
  node: PedigreeNode;
  depth?: 2 | 3;
  onDepthChange?: (d: 2 | 3) => void;
  showValidation?: boolean;
  compact?: boolean;
}

const STATUS_CONFIG: Record<PedigreeStatus, { icon: string; cls: string; label: string }> = {
  unverified: { icon: '', cls: '', label: 'Sin verificar' },
  pending:    { icon: '⏳', cls: 'text-amber-500', label: 'Pendiente' },
  partial:    { icon: '⚠️', cls: 'text-orange-500', label: 'Parcial' },
  verified:   { icon: '✓', cls: 'text-green-600', label: 'Verificado' },
  disputed:   { icon: '✕', cls: 'text-red-500', label: 'Disputado' },
};

function NodeCard({ node, showValidation }: { node: PedigreeNode; showValidation?: boolean }) {
  const status = node.pedigree_status ?? 'unverified';
  const cfg = STATUS_CONFIG[status];
  const baseCard = 'rounded-lg border px-3 py-2 min-w-[120px] max-w-[160px] text-sm';

  if (!node.in_system) {
    return (
      <div className={`${baseCard} border-dashed border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600`}>
        <p className="font-medium text-gray-600 dark:text-gray-300 truncate">{node.name}</p>
        {node.registration_number && (
          <p className="text-[11px] text-gray-400 truncate">#{node.registration_number}</p>
        )}
      </div>
    );
  }

  const card = (
    <div className={`${baseCard} border-gray-200 bg-[var(--surface-card)] dark:bg-gray-900 dark:border-gray-700 shadow-sm`}>
      <div className="flex items-center justify-between gap-1">
        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{node.name}</p>
        {showValidation && cfg.icon && (
          <span className={`text-xs flex-shrink-0 ${cfg.cls}`} title={cfg.label}>{cfg.icon}</span>
        )}
      </div>
      {node.registration_number && (
        <p className="text-[11px] text-gray-400 truncate">#{node.registration_number}</p>
      )}
    </div>
  );

  if (node.id) {
    return <Link href={`/caballos/${node.id}`} className="hover:opacity-80 transition-opacity">{card}</Link>;
  }
  return card;
}

// Desktop: árbol horizontal (izquierda → derecha)
function HorizontalTree({ node, depth, showValidation, currentDepth = 0 }: {
  node: PedigreeNode; depth: number; showValidation?: boolean; currentDepth?: number;
}) {
  const hasChildren = (node.sire || node.dam) && currentDepth < depth - 1;

  return (
    <div className="flex items-center gap-0">
      <NodeCard node={node} showValidation={showValidation} />
      {hasChildren && (
        <div className="flex items-center">
          <div className="w-6 h-px bg-gray-300 dark:bg-gray-600" />
          <div className="flex flex-col gap-4">
            {[node.sire, node.dam].map((ancestor, i) => (
              ancestor ? (
                <div key={i} className="flex items-center gap-0">
                  <div className="w-px bg-gray-300 dark:bg-gray-600" style={{ height: i === 0 ? '50%' : '50%', alignSelf: i === 0 ? 'flex-end' : 'flex-start' }} />
                  <div className="w-4 h-px bg-gray-300 dark:bg-gray-600" />
                  <HorizontalTree
                    node={ancestor}
                    depth={depth}
                    showValidation={showValidation}
                    currentDepth={currentDepth + 1}
                  />
                </div>
              ) : (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-px bg-gray-200" />
                  <div className="rounded-lg border border-dashed border-gray-200 px-3 py-2 min-w-[120px] text-sm text-gray-400 italic">
                    {i === 0 ? 'Padre desconocido' : 'Madre desconocida'}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile: lista vertical con indentación
function VerticalTree({ node, level = 0, showValidation }: {
  node: PedigreeNode; level?: number; showValidation?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div style={{ paddingLeft: `${level * 16}px` }} className="flex items-center gap-2">
        {level > 0 && <span className="text-gray-300 text-xs">└─</span>}
        <NodeCard node={node} showValidation={showValidation} />
      </div>
      {node.sire && <VerticalTree node={node.sire} level={level + 1} showValidation={showValidation} />}
      {node.dam && <VerticalTree node={node.dam} level={level + 1} showValidation={showValidation} />}
    </div>
  );
}

export default function PedigreeTree({ node, depth = 2, onDepthChange, showValidation = true, compact = false }: Props) {
  const [selectedDepth, setSelectedDepth] = useState<2 | 3>(depth);

  const handleDepthChange = (d: 2 | 3) => {
    setSelectedDepth(d);
    onDepthChange?.(d);
  };

  if (compact) {
    return (
      <div className="space-y-1 text-sm">
        {node.sire && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wide w-12">Padre</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{node.sire.name}</span>
          </div>
        )}
        {node.dam && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wide w-12">Madre</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{node.dam.name}</span>
          </div>
        )}
        {!node.sire && !node.dam && (
          <p className="text-gray-400 text-sm italic">Sin datos de genealogía</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {([2, 3] as const).map((d) => (
          <button
            key={d}
            onClick={() => handleDepthChange(d)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
              selectedDepth === d
                ? 'bg-[#9d6c35] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {d} gen
          </button>
        ))}
      </div>

      {/* Desktop: árbol horizontal */}
      <div className="hidden md:block overflow-x-auto pb-2">
        <HorizontalTree node={node} depth={selectedDepth} showValidation={showValidation} />
      </div>

      {/* Mobile: lista vertical */}
      <div className="md:hidden">
        <VerticalTree node={node} showValidation={showValidation} />
      </div>
    </div>
  );
}
