'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuctions, useMyAuctions, useCreateAuction } from '@/hooks/use-auctions';
import { useHorses } from '@/hooks/use-horses';
import { useAuth } from '@/lib/auth-context';
import { getErrorMessage } from '@/lib/errors';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Plus, Search, Filter, Gavel, Tag, Eye, Clock, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import type { Auction, AuctionType, AuctionCurrency } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  paused: 'Pausado',
  closed: 'Cerrado',
  sold: 'Vendido',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  closed: 'bg-blue-100 text-blue-700',
  sold: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-600',
};

function AuctionCard({ auction, onClick }: { auction: Auction; onClick: () => void }) {
  const isRemate = auction.type === 'remate';
  const price = isRemate ? auction.top_bid ?? auction.starting_bid : auction.asking_price;
  const endsAt = auction.auction_end ? new Date(auction.auction_end) : null;
  const timeLeft = endsAt ? Math.max(0, endsAt.getTime() - Date.now()) : null;
  const hoursLeft = timeLeft != null ? Math.floor(timeLeft / 3_600_000) : null;

  return (
    <div
      className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#0f1f3d]/30 hover:shadow-md"
      onClick={onClick}
    >
      {/* Caballo imagen + nombre */}
      <div className="flex items-start gap-4 mb-4">
        {auction.horse?.image_url ? (
          <img
            src={auction.horse.image_url}
            alt={auction.horse.name}
            className="h-14 w-14 rounded-xl object-cover border border-gray-100 shrink-0"
          />
        ) : (
          <div className="h-14 w-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <Gavel className="h-6 w-6 text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[auction.status]}`}
            >
              {STATUS_LABELS[auction.status]}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-[#0f1f3d]/8 text-[#0f1f3d]">
              {isRemate ? <Gavel className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
              {isRemate ? 'Remate' : 'Venta directa'}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{auction.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{auction.horse?.name}</p>
        </div>
      </div>

      {/* Precio */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
            {isRemate ? (auction.top_bid ? 'Puja actual' : 'Base') : 'Precio pedido'}
          </p>
          <p className="text-xl font-bold text-[#0f1f3d] tracking-tight">
            {price != null ? formatCurrency(price, auction.currency) : '–'}
          </p>
        </div>
        <div className="text-right">
          {auction.bid_count != null && auction.bid_count > 0 && (
            <p className="text-xs text-gray-500">{auction.bid_count} puja{auction.bid_count !== 1 ? 's' : ''}</p>
          )}
          {auction.watching && (
            <span className="text-[11px] text-amber-600 font-medium">★ Siguiendo</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 text-xs text-gray-400 border-t border-gray-50 pt-3">
        {auction.location && (
          <span className="flex items-center gap-1 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {auction.location}
          </span>
        )}
        {hoursLeft != null && auction.status === 'active' && (
          <span className={`flex items-center gap-1 shrink-0 ${hoursLeft < 24 ? 'text-red-500 font-medium' : ''}`}>
            <Clock className="h-3.5 w-3.5" />
            {hoursLeft < 1 ? '<1h' : hoursLeft < 24 ? `${hoursLeft}h` : `${Math.floor(hoursLeft / 24)}d`}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {auction.has_health_cert && (
            <span className="flex items-center gap-0.5 text-emerald-600" title="Certificado sanitario">
              <CheckCircle className="h-3.5 w-3.5" />
              SENASA
            </span>
          )}
          {auction.has_ownership_docs && (
            <span className="flex items-center gap-0.5 text-emerald-600" title="Documentación de propiedad">
              <CheckCircle className="h-3.5 w-3.5" />
              Docs
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 transition focus:border-[#0f1f3d] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f1f3d]/10';

const selectClass =
  'rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 transition focus:border-[#0f1f3d] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f1f3d]/10';

function CreateAuctionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { data: myHorses } = useHorses();
  const createAuction = useCreateAuction();

  const [form, setForm] = useState({
    horse_id: '',
    type: 'venta_directa' as AuctionType,
    title: '',
    description: '',
    currency: 'ARS' as AuctionCurrency,
    asking_price: '',
    starting_bid: '',
    bid_increment: '',
    reserve_price: '',
    auction_start: '',
    auction_end: '',
    location: '',
    payment_terms: '',
    delivery_terms: '',
    has_health_cert: false,
    has_ownership_docs: false,
  });

  const [error, setError] = useState('');

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload: Record<string, unknown> = {
        horse_id: form.horse_id,
        type: form.type,
        title: form.title,
        description: form.description || undefined,
        currency: form.currency,
        location: form.location || undefined,
        payment_terms: form.payment_terms || undefined,
        delivery_terms: form.delivery_terms || undefined,
        has_health_cert: form.has_health_cert,
        has_ownership_docs: form.has_ownership_docs,
      };

      if (form.type === 'venta_directa') {
        payload.asking_price = parseFloat(form.asking_price);
      } else {
        payload.starting_bid = parseFloat(form.starting_bid);
        if (form.bid_increment) payload.bid_increment = parseFloat(form.bid_increment);
        if (form.reserve_price) payload.reserve_price = parseFloat(form.reserve_price);
        payload.auction_start = form.auction_start;
        payload.auction_end = form.auction_end;
      }

      const auction = await createAuction.mutateAsync(payload as never);
      onCreated(auction.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-900">Nueva subasta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Caballo */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Caballo *</label>
            <select className={selectClass + ' w-full'} value={form.horse_id} onChange={(e) => set('horse_id', e.target.value)} required>
              <option value="">Seleccioná un caballo</option>
              {myHorses?.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Tipo de venta *</label>
            <div className="grid grid-cols-2 gap-2">
              {(['venta_directa', 'remate'] as AuctionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition ${
                    form.type === t
                      ? 'border-[#0f1f3d] bg-[#0f1f3d] text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t === 'remate' ? <Gavel className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
                  {t === 'remate' ? 'Remate' : 'Venta directa'}
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Título *</label>
            <input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="Ej: Yegua PSI 5 años, excelente pedigree" />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              className={inputClass + ' min-h-[80px] resize-none'}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Historial, condición física, logros..."
            />
          </div>

          {/* Moneda */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Moneda *</label>
            <select className={selectClass + ' w-full'} value={form.currency} onChange={(e) => set('currency', e.target.value)}>
              <option value="ARS">ARS — Pesos argentinos</option>
              <option value="USD">USD — Dólares</option>
            </select>
          </div>

          {form.type === 'venta_directa' ? (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Precio pedido *</label>
              <input type="number" className={inputClass} value={form.asking_price} onChange={(e) => set('asking_price', e.target.value)} required min="0" placeholder="0" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Puja inicial *</label>
                  <input type="number" className={inputClass} value={form.starting_bid} onChange={(e) => set('starting_bid', e.target.value)} required min="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Incremento mínimo</label>
                  <input type="number" className={inputClass} value={form.bid_increment} onChange={(e) => set('bid_increment', e.target.value)} min="0" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Precio de reserva <span className="text-gray-400">(secreto)</span></label>
                <input type="number" className={inputClass} value={form.reserve_price} onChange={(e) => set('reserve_price', e.target.value)} min="0" placeholder="Opcional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Inicio *</label>
                  <input type="datetime-local" className={inputClass} value={form.auction_start} onChange={(e) => set('auction_start', e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Cierre *</label>
                  <input type="datetime-local" className={inputClass} value={form.auction_end} onChange={(e) => set('auction_end', e.target.value)} required />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Ubicación del caballo</label>
            <input className={inputClass} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Ej: Luján, Buenos Aires" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Condiciones de pago</label>
            <input className={inputClass} value={form.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} placeholder="Ej: 50% al cierre, 50% al retiro" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Condiciones de entrega</label>
            <input className={inputClass} value={form.delivery_terms} onChange={(e) => set('delivery_terms', e.target.value)} placeholder="Ej: Traslado a cargo del comprador" />
          </div>

          {/* Documentación */}
          <div className="rounded-xl bg-gray-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Documentación disponible</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.has_health_cert} onChange={(e) => set('has_health_cert', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#0f1f3d]" />
              <span className="text-sm text-gray-700">Certificado sanitario SENASA vigente</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.has_ownership_docs} onChange={(e) => set('has_ownership_docs', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#0f1f3d]" />
              <span className="text-sm text-gray-700">Documentación de propiedad (Studbook / SRA)</span>
            </label>
          </div>

          {/* Aviso legal */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Al publicar esta subasta confirmás ser el propietario registrado del equino y que la información es veraz.
              Las pujas son vinculantes. HandicApp retiene un <strong>3%</strong> de comisión sobre el precio final.
            </p>
          </div>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={createAuction.isPending}>
              {createAuction.isPending ? 'Creando…' : 'Crear en borrador'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RematesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<'mercado' | 'mis_subastas'>('mercado');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const canSell = user?.role === 'propietario' || user?.role === 'admin';

  const { data: list, isLoading } = useAuctions({
    q: search || undefined,
    status: filterStatus || undefined,
    type: filterType || undefined,
  });

  const { data: myAuctions, isLoading: loadingMine } = useMyAuctions();

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Remates"
        subtitle="Comprá y vendé equinos en la plataforma"
        action={
          canSell ? (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Publicar subasta
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-auto px-6 pb-8">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit mb-6">
          {([['mercado', 'Mercado'], ['mis_subastas', 'Mis subastas']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'mercado' && (
          <>
            {/* Filtros */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:border-[#0f1f3d] focus:ring-2 focus:ring-[#0f1f3d]/10 focus:outline-none"
                  placeholder="Buscar por nombre o caballo…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className={selectClass}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="closed">Cerrados</option>
                <option value="sold">Vendidos</option>
              </select>
              <select
                className={selectClass}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                <option value="remate">Remate</option>
                <option value="venta_directa">Venta directa</option>
              </select>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : !list?.data?.length ? (
              <EmptyState
                icon={<Gavel className="h-10 w-10 text-gray-300" />}
                title="No hay subastas"
                message="Todavía no hay subastas activas. ¡Sé el primero en publicar!"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.data.map((a) => (
                  <AuctionCard
                    key={a.id}
                    auction={a}
                    onClick={() => router.push(`/remates/${a.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'mis_subastas' && (
          <>
            {loadingMine ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : !myAuctions?.length ? (
              <EmptyState
                icon={<Gavel className="h-10 w-10 text-gray-300" />}
                title="Todavía no publicaste subastas"
                message={canSell ? 'Publicá tu primer caballo en remate.' : 'Solo los propietarios pueden crear subastas.'}
                action={canSell ? { label: 'Publicar subasta', onClick: () => setShowCreate(true) } : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myAuctions.map((a) => (
                  <AuctionCard
                    key={a.id}
                    auction={a}
                    onClick={() => router.push(`/remates/${a.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateAuctionModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            router.push(`/remates/${id}`);
          }}
        />
      )}
    </div>
  );
}
