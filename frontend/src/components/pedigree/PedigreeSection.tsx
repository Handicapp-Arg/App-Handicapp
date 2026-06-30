'use client';

import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Check, X, AlertTriangle, Info, Lightbulb, ChevronDown, ChevronRight, FileText,
} from 'lucide-react';
import { HorseHead } from '@/components/icons/equine';
import { usePedigree, usePedigreeTree, usePedigreeValidations, useUpsertPedigree, useValidatePedigree, useSearchHorsesForPedigree } from '@/hooks/use-pedigree';
import PedigreeTree from './PedigreeTree';
import type { Horse as HorseType, PedigreeStatus } from '@/types';

const STATUS_CONFIG: Record<PedigreeStatus, { label: string; cls: string; dot: string }> = {
  unverified: { label: 'Sin verificar', cls: 'bg-gray-100 text-gray-600',  dot: 'bg-gray-400' },
  pending:    { label: 'Pendiente',     cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  partial:    { label: 'Parcial',       cls: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  verified:   { label: 'Verificado',    cls: 'bg-green-50 text-green-700',  dot: 'bg-green-500' },
  disputed:   { label: 'Disputado',     cls: 'bg-red-50 text-red-700',      dot: 'bg-red-500' },
};

const SOURCE_LABELS: Record<string, string> = {
  studbook_ar: 'Stud Book Argentino',
  sra: 'SRA',
  pedigreequery: 'PedigreeQuery',
  manual_admin: 'Revisión manual',
};

const STATUS_LABELS: Record<string, string> = {
  failed: 'sin coincidencia',
  validated: 'validado',
  partial: 'parcial',
  disputed: 'disputado',
  pending: 'pendiente',
};

const inputCls = 'w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:bg-[var(--surface-card)] focus:outline-none';

function HorseSearchInput({
  label, value, onChange, onSelect,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: results = [] } = useSearchHorsesForPedigree(value);

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">{label}</label>
      <input
        className={inputCls}
        value={value}
        placeholder="Buscar o escribir nombre..."
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && value.length >= 2 && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-[var(--surface-card)] shadow-lg">
          {results.map((h) => (
            <button
              key={h.id}
              type="button"
              className="flex items-center justify-between w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition cursor-pointer"
              onMouseDown={() => { onSelect(h.id, h.name); onChange(h.name); setOpen(false); }}
            >
              <span className="font-medium">{h.name}</span>
              <span className="text-xs text-green-600 ml-2">en HandicApp</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PedigreeFormModal({ horseId, onClose }: { horseId: string; onClose: () => void }) {
  const { data: existing } = usePedigree(horseId);
  const upsert = useUpsertPedigree(horseId);
  const validate = useValidatePedigree(horseId);
  const [showGrandparents, setShowGrandparents] = useState(false);
  const [validationResult, setValidationResult] = useState<{ status: string } | null>(null);

  const [form, setForm] = useState({
    sire_id: existing?.sire_id ?? '',
    sire_name: existing?.sire_name ?? existing?.sire?.name ?? '',
    sire_registration_number: existing?.sire_registration_number ?? '',
    dam_id: existing?.dam_id ?? '',
    dam_name: existing?.dam_name ?? existing?.dam?.name ?? '',
    dam_registration_number: existing?.dam_registration_number ?? '',
    paternal_grandsire_name: existing?.paternal_grandsire_name ?? '',
    paternal_granddam_name: existing?.paternal_granddam_name ?? '',
    maternal_grandsire_name: existing?.maternal_grandsire_name ?? '',
    maternal_granddam_name: existing?.maternal_granddam_name ?? '',
  });

  const handleSave = async (andValidate: boolean) => {
    const dto = {
      sire_id: form.sire_id || undefined,
      sire_name: form.sire_name || undefined,
      sire_registration_number: form.sire_registration_number || undefined,
      dam_id: form.dam_id || undefined,
      dam_name: form.dam_name || undefined,
      dam_registration_number: form.dam_registration_number || undefined,
      paternal_grandsire_name: form.paternal_grandsire_name || undefined,
      paternal_granddam_name: form.paternal_granddam_name || undefined,
      maternal_grandsire_name: form.maternal_grandsire_name || undefined,
      maternal_granddam_name: form.maternal_granddam_name || undefined,
    };
    await upsert.mutateAsync(dto);
    if (andValidate) {
      const result = await validate.mutateAsync();
      setValidationResult(result);
      return;
    }
    onClose();
  };

  const isPending = upsert.isPending || validate.isPending;

  const content = (
    <div className="space-y-5 p-5">
      {validationResult ? (
        <ValidationResultScreen result={validationResult} onClose={onClose} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
              <legend className="px-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Padre</legend>
              <HorseSearchInput
                label="Nombre del padre"
                value={form.sire_name}
                onChange={(v) => setForm((f) => ({ ...f, sire_name: v, sire_id: '' }))}
                onSelect={(id) => setForm((f) => ({ ...f, sire_id: id }))}
              />
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">N° de registro (opcional)</label>
                <input className={inputCls} value={form.sire_registration_number} placeholder="SBA #12345"
                  onChange={(e) => setForm((f) => ({ ...f, sire_registration_number: e.target.value }))} />
              </div>
            </fieldset>

            <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
              <legend className="px-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Madre</legend>
              <HorseSearchInput
                label="Nombre de la madre"
                value={form.dam_name}
                onChange={(v) => setForm((f) => ({ ...f, dam_name: v, dam_id: '' }))}
                onSelect={(id) => setForm((f) => ({ ...f, dam_id: id }))}
              />
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">N° de registro (opcional)</label>
                <input className={inputCls} value={form.dam_registration_number} placeholder="SBA #67890"
                  onChange={(e) => setForm((f) => ({ ...f, dam_registration_number: e.target.value }))} />
              </div>
            </fieldset>
          </div>

          <button type="button" onClick={() => setShowGrandparents((v) => !v)}
            className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline cursor-pointer">
            {showGrandparents ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {showGrandparents ? 'Ocultar abuelos' : 'Agregar abuelos (opcional)'}
          </button>

          {showGrandparents && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'paternal_grandsire_name', label: 'Abuelo paterno' },
                { key: 'paternal_granddam_name', label: 'Abuela paterna' },
                { key: 'maternal_grandsire_name', label: 'Abuelo materno' },
                { key: 'maternal_granddam_name', label: 'Abuela materna' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input className={inputCls} value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          )}

          {(upsert.isError || validate.isError) && (
            <p className="text-xs text-red-500">Error al guardar. Intentá de nuevo.</p>
          )}

          <p className="flex items-start gap-1.5 text-xs text-gray-400">
            <Lightbulb size={14} className="shrink-0 mt-0.5 text-[var(--color-primary)]" />
            <span>"Guardar y validar" consultará el Stud Book Argentino, SRA y PedigreeQuery para verificar los datos.</span>
          </p>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer">
              Cancelar
            </button>
            <button type="button" onClick={() => handleSave(false)} disabled={isPending}
              className="flex-1 rounded-lg border border-[var(--color-primary)] py-2.5 text-sm font-medium text-[var(--color-primary)] hover:bg-clay-500/5 transition cursor-pointer disabled:opacity-50">
              {upsert.isPending && !validate.isPending ? 'Guardando...' : 'Guardar borrador'}
            </button>
            <button type="button" onClick={() => handleSave(true)} disabled={isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-clay-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:bg-clay-500/90 transition">
              {validate.isPending ? 'Validando...' : <>Guardar y validar <Check size={16} /></>}
            </button>
          </div>
        </>
      )}
    </div>
  );

  return createPortal(
    <>
      <div className="fixed inset-0 z-[999] flex flex-col bg-[var(--surface-card)] sm:hidden">
        <div className="flex items-center justify-between bg-clay-500 px-5 py-4">
          <p className="font-bold text-white">Pedigrí</p>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1">{content}</div>
      </div>
      <div className="fixed inset-0 z-[999] hidden sm:flex items-center justify-center bg-black/40">
        <div className="w-full max-w-2xl rounded-2xl bg-[var(--surface-card)] shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between bg-clay-500 px-6 py-4">
            <p className="font-bold text-white">Pedigrí</p>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white cursor-pointer"><X size={18} /></button>
          </div>
          <div className="overflow-y-auto max-h-[80vh]">{content}</div>
        </div>
      </div>
    </>,
    document.body,
  );
}

function ValidationResultScreen({ result, onClose }: { result: { status: string }; onClose: () => void }) {
  const cfg: { icon: ReactNode; title: string; cls: string; bg: string } = {
    verified: { icon: <Check size={26} />, title: 'Pedigrí verificado', cls: 'text-green-700', bg: 'bg-green-50' },
    partial: { icon: <AlertTriangle size={26} />, title: 'Validación parcial', cls: 'text-orange-700', bg: 'bg-orange-50' },
    failed: { icon: <X size={26} />, title: 'No se encontraron coincidencias', cls: 'text-red-700', bg: 'bg-red-50' },
    disputed: { icon: <AlertTriangle size={26} />, title: 'Datos inconsistentes', cls: 'text-orange-700', bg: 'bg-orange-50' },
  }[result.status] ?? { icon: <Info size={26} />, title: result.status, cls: 'text-gray-700', bg: 'bg-gray-50' };

  return (
    <div className={`rounded-xl p-5 space-y-3 ${cfg.bg}`}>
      <div className="flex items-center gap-3">
        <span className={cfg.cls}>{cfg.icon}</span>
        <p className={`font-semibold text-lg ${cfg.cls}`}>{cfg.title}</p>
      </div>
      {result.status === 'failed' && (
        <p className="text-sm text-gray-600">
          Las fuentes consultadas no devolvieron datos. El caballo puede no estar registrado aún, o el nombre puede tener un error ortográfico.
        </p>
      )}
      <button onClick={onClose}
        className="mt-2 rounded-lg bg-clay-500 px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:bg-clay-500/90 transition">
        Cerrar
      </button>
    </div>
  );
}

export default function PedigreeSection({ horse, canEdit }: { horse: HorseType; canEdit: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [showValidations, setShowValidations] = useState(false);
  const [treeDepth, setTreeDepth] = useState<2 | 3>(2);
  const { data: pedigree, isLoading } = usePedigree(horse.id);
  const { data: tree } = usePedigreeTree(horse.id, treeDepth);
  const { data: validations = [] } = usePedigreeValidations(horse.id);

  const status = horse.pedigree_status ?? 'unverified';
  const cfg = STATUS_CONFIG[status];
  const lastValidation = validations[0];

  if (isLoading) {
    return (
      <div className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Genealogía</h2>
        <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-gray-900 mb-3">Genealogía</h2>

      {!pedigree ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <HorseHead size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-700">Sin pedigrí registrado</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Agregá los datos del padre y madre para construir el árbol genealógico y validarlo contra registros oficiales.
          </p>
          {canEdit && (
            <button onClick={() => setShowForm(true)}
              className="rounded-lg bg-clay-500 px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:bg-clay-500/90 transition">
              Agregar pedigrí
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-[var(--surface-card)] p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
              {lastValidation && (
                <span className="text-xs text-gray-400">
                  Validado {new Date(lastValidation.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {' · '}{SOURCE_LABELS[lastValidation.source] ?? lastValidation.source}
                </span>
              )}
            </div>
            {canEdit && (
              <button onClick={() => setShowForm(true)}
                className="text-xs text-[var(--color-primary)] hover:underline cursor-pointer font-medium">
                Editar pedigrí
              </button>
            )}
          </div>

          {tree && <PedigreeTree node={tree} depth={treeDepth} onDepthChange={setTreeDepth} showValidation />}

          {/* Documentos */}
          {(pedigree.documents?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Documentos</p>
              <div className="flex flex-wrap gap-2">
                {pedigree.documents!.map((doc) => (
                  <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition">
                    <FileText size={14} className="shrink-0 text-gray-400" /> {doc.file_name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Historial de validaciones colapsado */}
          {validations.length > 0 && (
            <div>
              <button onClick={() => setShowValidations((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition cursor-pointer">
                {showValidations ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Ver historial de validaciones ({validations.length})
              </button>
              {showValidations && (
                <div className="mt-2 space-y-1">
                  {validations.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_CONFIG[v.status as PedigreeStatus]?.dot ?? 'bg-gray-400'}`} />
                      <span>{SOURCE_LABELS[v.source] ?? v.source}</span>
                      <span className="text-gray-400">·</span>
                      <span>{STATUS_LABELS[v.status] ?? v.status}</span>
                      <span className="text-gray-400">·</span>
                      <span>{new Date(v.created_at).toLocaleDateString('es-AR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showForm && <PedigreeFormModal horseId={horse.id} onClose={() => setShowForm(false)} />}
    </section>
  );
}
