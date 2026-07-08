'use client';

import { useState, useRef, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search, ChevronRight, CheckCircle2, Clock, AlertCircle,
  Shield, ShieldCheck, ShieldAlert, Upload, X, ChevronDown, ChevronUp,
  Database, RefreshCw, Download, TreePine, FileText, User,
  Globe, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container } from '@/components/ui/container';
import { HorseHead } from '@/components/icons/equine';
import { useAuth } from '@/lib/auth-context';
import {
  useHorseRecordsSearch, useHorseRecord, useHorseRecordTree,
  useHorseRecordProgeny, useMyHorseRecordClaims, useSubmitClaim,
  useUploadClaimDocument, useHorseRecordStats, useAdminImportWikidata,
  useAdminRetryFailed, useAdminImportStudbookAR, useImportJobs,
  useSearchLiveStudbook,
  type ImportJob,
} from '@/hooks/use-horse-records';
import type { HorseRecord, HorseRecordNode, HorseOwnershipClaim } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  unverified:     { label: 'Sin dueño',      color: 'bg-gray-100 text-gray-500',  icon: <Shield className="h-3 w-3" /> },
  pending_claim:  { label: 'Solicitud pendiente', color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-3 w-3" /> },
  verified:       { label: 'Dueño verificado', color: 'bg-green-100 text-green-700', icon: <ShieldCheck className="h-3 w-3" /> },
  disputed:       { label: 'Disputado',        color: 'bg-red-100 text-red-600',    icon: <ShieldAlert className="h-3 w-3" /> },
};

// Etiquetas de cara al usuario (no exponer valores crudos del backend)
const SOURCE_LABEL: Record<string, string> = {
  studbook_ar: 'Studbook Argentino',
  wikidata: 'Wikidata',
  sra: 'SRA',
  accc: 'ACCC',
  aqha: 'AQHA',
  pedigreequery: 'PedigreeQuery',
  manual_admin: 'Carga manual',
  other: 'Otra fuente',
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'Alta', medium: 'Media', low: 'Baja',
};

const CLAIM_STATUS_LABEL: Record<string, string> = {
  pending: 'pendiente', auto_approved: 'aprobada', approved: 'aprobada', rejected: 'rechazada',
};

const SCRAPE_DOT: Record<string, string> = {
  pending:  'bg-amber-400',
  scraping: 'bg-blue-400 animate-pulse',
  done:     'bg-green-500',
  failed:   'bg-red-400',
  skipped:  'bg-gray-300',
};

const SEX_LABEL: Record<string, string> = {
  macho: 'Macho', hembra: 'Hembra', castrado: 'Castrado',
};

function OwnerBadge({ status, ownerName }: { status: string; ownerName?: string | null }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.unverified;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', cfg.color)}>
      {cfg.icon}
      {status === 'verified' && ownerName ? ownerName : cfg.label}
    </span>
  );
}

// ─── Pedigree Tree ────────────────────────────────────────────────────────────

function PedigreeNode({
  node, depth, onClick,
}: {
  node: HorseRecordNode | null;
  depth: number;
  onClick?: (id: string) => void;
}) {
  if (!node) return <div className="text-xs text-gray-300 italic px-2 py-1">—</div>;

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => node.id && onClick?.(node.id)}
        disabled={!node.id}
        className={cn(
          'text-left px-3 py-2 rounded-lg border text-xs font-medium transition',
          depth === 0
            ? 'bg-clay-500 text-white border-clay-600 text-sm cursor-default'
            : node.id
            ? 'bg-[var(--surface-card)] border-gray-200 hover:border-gray-400 hover:shadow-sm cursor-pointer'
            : 'bg-gray-50 border-gray-100 text-gray-400 cursor-default',
        )}
      >
        <div className="flex items-center gap-1 font-semibold max-w-[140px]">
          {depth === 0 && <HorseHead size={12} className="shrink-0" />}
          <span className="truncate">{node.name}</span>
        </div>
        {node.birth_year && (
          <div className="text-xs opacity-60 mt-0.5">{node.birth_year} · {node.country_code ?? '?'}</div>
        )}
        {node.ownership_status === 'verified' && node.verified_owner && (
          <div className="mt-0.5 flex items-center gap-0.5 text-green-600">
            <ShieldCheck className="h-2.5 w-2.5" />
            <span className="text-[10px]">{node.verified_owner.name}</span>
          </div>
        )}
      </button>
    </div>
  );
}

function PedigreeTree({ id, onNavigate }: { id: string; onNavigate: (id: string) => void }) {
  const { data: tree, isLoading } = useHorseRecordTree(id, 3);

  if (isLoading) return (
    <div className="flex gap-4">
      {[1,2,3].map(i => (
        <div key={i} className="flex flex-col gap-2">
          {Array(Math.pow(2, i-1)).fill(0).map((_, j) => (
            <div key={j} className="h-14 w-36 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );

  if (!tree) return null;

  function renderLevel(node: HorseRecordNode | null, depth: number): React.ReactNode {
    if (depth > 3 || !node) return null;
    return (
      <div className="flex gap-3">
        <div className="flex flex-col justify-center">
          <PedigreeNode node={node} depth={depth === 0 ? 0 : 1} onClick={onNavigate} />
        </div>
        {depth < 3 && (node?.sire || node?.dam) && (
          <div className="flex flex-col gap-2">
            <div>{renderLevel(node?.sire ?? null, depth + 1)}</div>
            <div>{renderLevel(node?.dam ?? null, depth + 1)}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="inline-flex gap-4 min-w-max">
        {renderLevel(tree, 0)}
      </div>
    </div>
  );
}

// ─── Horse Record Detail Panel ────────────────────────────────────────────────

function RecordDetail({
  id,
  onClose,
  onNavigate,
}: {
  id: string;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const { data: record, isLoading } = useHorseRecord(id);
  const { data: progeny } = useHorseRecordProgeny(id);
  const [tab, setTab] = useState<'info' | 'tree' | 'progeny'>('info');
  const [showClaim, setShowClaim] = useState(false);
  const { user } = useAuth();

  if (isLoading) return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 bg-gray-100 rounded w-48" />
      <div className="h-4 bg-gray-100 rounded w-32" />
    </div>
  );
  if (!record) return null;

  const statusCfg = STATUS_BADGE[record.ownership_status] ?? STATUS_BADGE.unverified;
  const canClaim = user && record.ownership_status !== 'verified';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{record.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', statusCfg.color)}>
              {statusCfg.icon} {statusCfg.label}
            </span>
            {record.birth_year && <span className="text-xs text-gray-400">Nacido {record.birth_year}</span>}
            {record.breed && <span className="text-xs text-gray-400">· {record.breed}</span>}
            {record.country_code && <span className="text-xs text-gray-400">· {record.country_code}</span>}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-6">
        {[
          { key: 'info', label: 'Info', icon: <FileText className="h-3.5 w-3.5" /> },
          { key: 'tree', label: 'Pedigrí', icon: <TreePine className="h-3.5 w-3.5" /> },
          { key: 'progeny', label: `Progenie${progeny?.length ? ` (${progeny.length})` : ''}`, icon: <User className="h-3.5 w-3.5" /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition',
              tab === t.key
                ? 'border-black text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700',
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {tab === 'info' && (
          <div className="space-y-4">
            {/* Fields grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Nombre', value: record.name },
                { label: 'Año', value: record.birth_year },
                { label: 'Sexo', value: record.sex ? SEX_LABEL[record.sex] : null },
                { label: 'Color', value: record.color },
                { label: 'Raza', value: record.breed },
                { label: 'País', value: record.country_code },
                { label: 'Padre', value: record.sire_name ?? record.sire?.name },
                { label: 'Madre', value: record.dam_name ?? record.dam?.name },
                { label: 'N° Registro', value: record.registration_number },
                { label: 'Fuente', value: record.registration_source ? (SOURCE_LABEL[record.registration_source] ?? record.registration_source) : null },
              ].filter(f => f.value).map(f => (
                <div key={f.label} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-0.5">{f.label}</div>
                  <div className="text-sm font-medium text-gray-800">{String(f.value)}</div>
                </div>
              ))}
            </div>

            {/* Owner section */}
            {record.ownership_status === 'verified' && record.verified_owner && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800 dark:text-green-300">Propietario verificado</span>
                </div>
                <div className="text-sm text-green-700">{record.verified_owner.name}</div>
                {record.verified_at && (
                  <div className="text-xs text-green-600 mt-1">
                    Verificado {formatDistanceToNow(new Date(record.verified_at), { addSuffix: true, locale: es })}
                  </div>
                )}
              </div>
            )}

            {/* Data confidence */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className={cn('h-2 w-2 rounded-full', SCRAPE_DOT[record.scrape_status])} />
              <span>Datos: {record.data_confidence ? (CONFIDENCE_LABEL[record.data_confidence] ?? record.data_confidence) : 'sin clasificar'}</span>
              {record.source_url && (
                <a href={record.source_url} target="_blank" rel="noreferrer" className="underline hover:text-gray-600">
                  fuente
                </a>
              )}
            </div>
          </div>
        )}

        {tab === 'tree' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Árbol genealógico (hasta 3 generaciones). Clic en un nodo para navegar.</p>
            <PedigreeTree id={id} onNavigate={onNavigate} />
          </div>
        )}

        {tab === 'progeny' && (
          <div className="space-y-2">
            {!progeny?.length ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin progenie registrada</p>
            ) : (
              progeny.map(p => (
                <button
                  key={p.id}
                  onClick={() => onNavigate(p.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition group cursor-pointer"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.birth_year ?? '?'} · {p.country_code ?? '?'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <OwnerBadge status={p.ownership_status} ownerName={p.verified_owner?.name} />
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Claim section */}
      {canClaim && (
        <div className="border-t border-gray-100 p-4">
          {!showClaim ? (
            <button
              onClick={() => setShowClaim(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition"
            >
              <Shield className="h-4 w-4" />
              Reclamar propiedad
            </button>
          ) : (
            <ClaimForm record={record} onClose={() => setShowClaim(false)} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Claim Form ───────────────────────────────────────────────────────────────

function ClaimForm({ record, onClose }: { record: HorseRecord; onClose: () => void }) {
  const submitClaim = useSubmitClaim();
  const uploadDoc = useUploadClaimDocument();
  const { data: myClaims } = useMyHorseRecordClaims();
  const fileRef = useRef<HTMLInputElement>(null);

  const [regNum, setRegNum] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<{ url: string; public_id: string } | null>(null);
  const [done, setDone] = useState(false);

  const existingClaim = myClaims?.find(c => c.horse_record_id === record.id);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setDocFile(f);
    if (f.type.startsWith('image/')) setDocPreview(URL.createObjectURL(f));
    else setDocPreview(null);
  };

  const handleUpload = async () => {
    if (!docFile) return;
    const result = await uploadDoc.mutateAsync(docFile);
    setUploadedDoc(result);
  };

  const handleSubmit = async () => {
    await submitClaim.mutateAsync({
      horse_record_id: record.id,
      registration_number: regNum.trim() || undefined,
      microchip: microchip.trim() || undefined,
      claimed_birth_date: birthDate || undefined,
      document_url: uploadedDoc?.url,
      document_public_id: uploadedDoc?.public_id,
    });
    setDone(true);
  };

  if (existingClaim) return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
      <p className="font-medium text-amber-800 dark:text-amber-300">Ya tenés una solicitud {CLAIM_STATUS_LABEL[existingClaim.status] ?? 'pendiente'}</p>
      <p className="text-amber-600 mt-0.5 text-xs">Puntaje: {existingClaim.match_score ?? 0}/100</p>
    </div>
  );

  if (done) return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-center">
      <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
      <p className="font-semibold text-green-800 dark:text-green-300">Solicitud enviada</p>
      <p className="text-green-600 text-xs mt-0.5">El equipo de HandicApp verificará tu documentación.</p>
      <button onClick={onClose} className="mt-3 text-xs underline text-green-700">Cerrar</button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Reclamar: <span className="font-bold">{record.name}</span></p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Completá los datos que tenés. Cuanto más coincidan con el registro oficial, más rápida será la aprobación.
      </p>

      <div className="space-y-2">
        <input
          value={regNum} onChange={e => setRegNum(e.target.value)}
          placeholder="Número de registro / HB"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 transition"
        />
        <input
          value={microchip} onChange={e => setMicrochip(e.target.value)}
          placeholder="Microchip / chip (10 pts)"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 transition"
        />
        <input
          type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
          placeholder="Fecha de nacimiento (30 pts)"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 transition"
        />
      </div>

      {/* Document upload */}
      <div className="border border-dashed border-gray-200 rounded-xl p-3">
        <p className="text-xs text-gray-500 mb-2 font-medium">Documentación oficial (20 pts)</p>
        {!uploadedDoc ? (
          <>
            <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />
            {docFile ? (
              <div className="flex items-center gap-2">
                {docPreview && <img src={docPreview} alt="" className="h-12 w-12 object-cover rounded" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{docFile.name}</p>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploadDoc.isPending}
                  className="px-3 py-1 bg-black text-white text-xs rounded-lg hover:bg-zinc-800 transition disabled:opacity-40"
                >
                  {uploadDoc.isPending ? 'Subiendo…' : 'Subir'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition"
              >
                <Upload className="h-4 w-4" />
                Adjuntar certificado, escritura o contrato
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Documento subido correctamente
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitClaim.isPending || (!regNum && !microchip && !birthDate && !uploadedDoc)}
        className="w-full py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition disabled:opacity-40"
      >
        {submitClaim.isPending ? 'Enviando…' : 'Enviar solicitud'}
      </button>

      {submitClaim.isError && (
        <p className="text-xs text-red-500 text-center">{(submitClaim.error as any)?.message ?? 'Error al enviar'}</p>
      )}
    </div>
  );
}

// ─── Record Card (list item) ──────────────────────────────────────────────────

function RecordCard({ record, selected, onClick }: {
  record: HorseRecord;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition group cursor-pointer',
        selected && 'bg-clay-500/10',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', SCRAPE_DOT[record.scrape_status])} />
            <span className="text-sm font-semibold text-gray-900 truncate">{record.name}</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5 pl-3.5">
            {[record.birth_year, record.breed, record.country_code].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <OwnerBadge status={record.ownership_status} ownerName={record.verified_owner?.name} />
          <ChevronRight className={cn('h-4 w-4 text-gray-300 transition', selected && 'text-gray-500')} />
        </div>
      </div>
    </button>
  );
}

// ─── Admin Stats Bar ──────────────────────────────────────────────────────────

function JobProgressBar({ job }: { job: ImportJob }) {
  const isRunning = job.status === 'running';
  const pct = job.processed > 0 && job.imported + job.updated > 0
    ? Math.min(100, Math.round(((job.imported + job.updated) / job.processed) * 100))
    : null;

  return (
    <div className="rounded-lg bg-zinc-800 px-3 py-2 text-xs space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isRunning
            ? <RefreshCw className="h-3 w-3 text-blue-400 animate-spin" />
            : job.status === 'done'
            ? <CheckCircle2 className="h-3 w-3 text-green-400" />
            : <AlertCircle className="h-3 w-3 text-red-400" />
          }
          <span className="font-medium text-gray-200 capitalize">{job.source.replace('_', ' ')}</span>
        </div>
        <span className="text-gray-400 tabular-nums">
          {job.imported} new · {job.updated} upd · {job.errors} err
        </span>
      </div>
      {job.message && <p className="text-gray-400 truncate">{job.message}</p>}
      {isRunning && (
        <div className="h-1 w-full rounded-full bg-gray-700 overflow-hidden">
          {pct != null
            ? <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            : <div className="h-full w-1/3 bg-blue-500 animate-pulse" />
          }
        </div>
      )}
    </div>
  );
}

function AdminBar() {
  const { user } = useAuth();
  const { data: stats } = useHorseRecordStats(user?.role === 'admin');
  const { data: jobs = [] } = useImportJobs(user?.role === 'admin');
  const importStudbook = useAdminImportStudbookAR();
  const importWikidata = useAdminImportWikidata();
  const retryFailed = useAdminRetryFailed();
  const [open, setOpen] = useState(false);

  if (user?.role !== 'admin') return null;

  const hasRunning = jobs.some(j => j.status === 'running');

  return (
    <div className="bg-zinc-900 text-white rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold">Admin · Padrón</span>
          {hasRunning && (
            <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full animate-pulse">
              Importando…
            </span>
          )}
        </div>
        <button onClick={() => setOpen(v => !v)} className="text-gray-400 hover:text-white transition">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Stats de la BD */}
      {stats && (
        <div className="grid grid-cols-5 gap-2 mt-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'Con datos', value: stats.done, color: 'text-green-400' },
            { label: 'Pendiente', value: stats.pending, color: 'text-amber-400' },
            { label: 'Fallidos', value: stats.failed, color: 'text-red-400' },
            { label: 'Saltados', value: stats.skipped, color: 'text-gray-400' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={cn('text-lg font-bold tabular-nums', s.color)}>{(s.value ?? 0).toLocaleString('es-AR')}</div>
              <div className="text-[10px] text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
          {/* Botones de acción */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => importStudbook.mutate()}
              disabled={importStudbook.isPending || hasRunning}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-xs font-semibold transition disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Importar Studbook AR
            </button>
            <button
              onClick={() => importWikidata.mutate({ minYear: 1990, maxYear: 2020 })}
              disabled={importWikidata.isPending || hasRunning}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs transition disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Importar Wikidata
            </button>
            <button
              onClick={() => retryFailed.mutate()}
              disabled={retryFailed.isPending}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs transition disabled:opacity-40"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {retryFailed.data ? `${retryFailed.data.reset} reiniciados` : 'Reintentar fallidos'}
            </button>
          </div>

          {/* Jobs recientes */}
          {jobs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Jobs recientes</p>
              {jobs.slice(0, 5).map(job => (
                <JobProgressBar key={job.jobId} job={job} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RegistroPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const limit = 30;

  const { data: results, isLoading } = useHorseRecordsSearch(
    { name: debouncedQuery || undefined, limit, offset: page * limit },
    true,
  );

  // Búsqueda en vivo en el Stud Book Argentino (complemento explícito)
  const liveSearch = useSearchLiveStudbook();
  const term = debouncedQuery.trim();
  // Los resultados en vivo sólo valen para el término buscado
  const liveActive = !!term && liveSearch.variables === term;
  const liveItems = liveActive && liveSearch.data ? liveSearch.data.items : [];
  const liveSearched = liveActive && liveSearch.isSuccess;
  const localCount = results?.total ?? 0;
  // Ofrecemos la búsqueda oficial cuando lo local trae 0 o muy pocos resultados
  const offerLiveSearch =
    !!term && !isLoading && localCount <= 2 && !liveSearched;

  const handleSelect = (id: string) => {
    setSelectedId(prev => (prev === id ? null : id));
  };

  const handleNavigate = (id: string) => {
    setSelectedId(id);
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Lista de filas (constrain a `content`) hasta abrir el detalle, donde el
          split maestro-detalle aprovecha el ancho (`wide`) sin estirar las filas */}
      <Container width={selectedId ? 'wide' : 'content'} className="px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Registro de Caballos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Base de datos global con pedigree de 1990 en adelante. Buscá tu caballo y reclamá la propiedad.
          </p>
        </div>

        <AdminBar />

        <div className="flex gap-4">
          {/* Left panel: search + list */}
          <div className={cn(
            'bg-[var(--surface-card)] rounded-xl border border-gray-200 shadow-sm flex flex-col transition-all',
            selectedId ? 'w-full max-w-sm flex-shrink-0' : 'w-full',
          )}>
            {/* Search bar */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={query}
                  onChange={e => { setQuery(e.target.value); setPage(0); }}
                  placeholder="Buscar por nombre, raza, país…"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition bg-gray-50"
                />
              </div>
              {results && (
                <p className="text-xs text-gray-400 mt-2">{results.total} resultados</p>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-0">
                  {Array(8).fill(0).map((_, i) => (
                    <div key={i} className="px-4 py-3 border-b border-gray-50 animate-pulse">
                      <div className="h-4 bg-gray-100 rounded w-40 mb-1" />
                      <div className="h-3 bg-gray-100 rounded w-24" />
                    </div>
                  ))}
                </div>
              ) : !results?.items?.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Search className="h-8 w-8 text-gray-200 mb-3" />
                  <p className="text-sm font-medium text-gray-500">
                    {term ? `Sin resultados para "${term}"` : 'Buscá un caballo'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {term ? 'No está en el padrón local. Probá el Stud Book Argentino.' : 'Escribí el nombre para comenzar'}
                  </p>
                </div>
              ) : (
                results.items.map(record => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    selected={selectedId === record.id}
                    onClick={() => handleSelect(record.id)}
                  />
                ))
              )}

              {/* Búsqueda en vivo en el Stud Book Argentino */}
              {!isLoading && term && (offerLiveSearch || liveSearch.isPending || liveSearched) && (
                <div className="p-4 border-t border-gray-100 space-y-3">
                  {(offerLiveSearch || liveSearch.isPending) && (
                    <button
                      onClick={() => liveSearch.mutate(term)}
                      disabled={liveSearch.isPending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-clay-500 text-white text-sm font-semibold rounded-xl hover:bg-clay-600 transition disabled:opacity-70"
                    >
                      {liveSearch.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Buscando en el registro oficial…
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4" />
                          Buscar en el Stud Book Argentino
                        </>
                      )}
                    </button>
                  )}

                  {liveSearch.isPending && (
                    <p className="text-xs text-gray-400 text-center">
                      Consultando el registro oficial, puede tardar unos segundos…
                    </p>
                  )}

                  {liveSearch.isError && (
                    <p className="text-xs text-red-500 text-center">
                      No pudimos consultar el Stud Book Argentino. Reintentá en un momento.
                    </p>
                  )}

                  {liveSearched && (
                    <>
                      {liveItems.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 px-1">
                            {liveItems.length} en el Stud Book Argentino
                          </p>
                          <div className="rounded-lg border border-gray-100 overflow-hidden">
                            {liveItems.map(record => (
                              <RecordCard
                                key={record.id}
                                record={record}
                                selected={selectedId === record.id}
                                onClick={() => handleSelect(record.id)}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 text-center py-2">
                          No se encontró en el Stud Book Argentino.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {results && results.total > limit && (
              <div className="flex items-center justify-between p-3 border-t border-gray-100 text-xs text-gray-500">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition"
                >
                  ← Anterior
                </button>
                <span>Pág {page + 1} / {Math.ceil(results.total / limit)}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * limit >= results.total}
                  className="px-3 py-1 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>

          {/* Right panel: detail */}
          {selectedId && (
            <div className="flex-1 bg-[var(--surface-card)] rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
              <RecordDetail
                id={selectedId}
                onClose={() => setSelectedId(null)}
                onNavigate={handleNavigate}
              />
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className={cn('h-2 w-2 rounded-full', SCRAPE_DOT.done)} />
            <span>Datos completos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn('h-2 w-2 rounded-full', SCRAPE_DOT.pending)} />
            <span>En cola</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn('h-2 w-2 rounded-full', SCRAPE_DOT.failed)} />
            <span>Fuente no disponible</span>
          </div>
        </div>
      </Container>
    </div>
  );
}
