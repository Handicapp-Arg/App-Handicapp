'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useAuction, useAuctionBids,
  usePlaceBid, useAcceptBid,
  usePublishAuction, usePauseAuction, useCancelAuction,
  useToggleWatch,
} from '@/hooks/use-auctions';
import { useAuth } from '@/lib/auth-context';
import { getErrorMessage } from '@/lib/errors';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Gavel, Tag, Clock, MapPin, CheckCircle,
  Eye, AlertCircle, User, Star, StarOff, Play, Pause, X,
} from 'lucide-react';
import type { AuctionBid } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  closed: 'bg-blue-100 text-blue-700',
  sold: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-600',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', active: 'Activo', paused: 'Pausado',
  closed: 'Cerrado', sold: 'Vendido', cancelled: 'Cancelado',
};

function Countdown({ end }: { end: string }) {
  const [left, setLeft] = useState(Math.max(0, new Date(end).getTime() - Date.now()));

  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, new Date(end).getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, [end]);

  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1_000);

  if (left === 0) return <span className="text-red-600 font-bold">Cerrado</span>;

  return (
    <div className="flex items-center gap-2">
      {[{ v: d, l: 'd' }, { v: h, l: 'h' }, { v: m, l: 'm' }, { v: s, l: 's' }].map(({ v, l }) => (
        <div key={l} className="text-center">
          <div className="rounded-lg bg-[#9d6c35] text-white font-bold text-lg leading-none px-2.5 py-1.5 min-w-[36px]">
            {String(v).padStart(2, '0')}
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 uppercase">{l}</p>
        </div>
      ))}
    </div>
  );
}

function BidRow({ bid, isSeller, onAccept }: { bid: AuctionBid; isSeller: boolean; onAccept?: () => void }) {
  const statusColor = bid.status === 'active' ? 'text-emerald-600' : bid.status === 'won' ? 'text-purple-600' : 'text-gray-400';
  const statusLabel = bid.status === 'active' ? 'Activa' : bid.status === 'won' ? 'Ganadora' : bid.status === 'outbid' ? 'Superada' : 'Cancelada';

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${bid.status === 'active' ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
          {bid.bidder?.name?.charAt(0) ?? '?'}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{bid.bidder?.name ?? 'Usuario'}</p>
          <p className="text-xs text-gray-400">{new Date(bid.created_at).toLocaleString('es-AR')}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-bold text-gray-900">{formatCurrency(bid.amount, bid.currency)}</p>
          <p className={`text-xs font-medium ${statusColor}`}>{statusLabel}</p>
        </div>
        {isSeller && bid.status === 'active' && onAccept && (
          <Button size="sm" onClick={onAccept} className="text-xs">Aceptar</Button>
        )}
      </div>
    </div>
  );
}

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: auction, isLoading } = useAuction(id);
  const { data: bids } = useAuctionBids(id);
  const placeBid = usePlaceBid();
  const acceptBid = useAcceptBid();
  const publish = usePublishAuction();
  const pause = usePauseAuction();
  const cancel = useCancelAuction();
  const toggleWatch = useToggleWatch();

  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');

  if (isLoading || !auction) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#9d6c35] border-t-transparent" />
      </div>
    );
  }

  const isSeller = auction.seller_id === user?.id;
  const isActive = auction.status === 'active';
  const isRemate = auction.type === 'remate';
  const topBidAmount = bids?.find((b) => b.status === 'active')?.amount ?? null;
  const minNextBid = topBidAmount
    ? Number(topBidAmount) + Number(auction.bid_increment ?? 1)
    : Number(auction.starting_bid ?? 0);

  const handlePlaceBid = async () => {
    setBidError('');
    const amount = parseFloat(bidAmount);
    if (isNaN(amount)) { setBidError('Ingresá un monto válido'); return; }
    try {
      await placeBid.mutateAsync({ auctionId: id, amount });
      setBidAmount('');
    } catch (err) {
      setBidError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <span className="text-gray-300">|</span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[auction.status]}`}
        >
          {STATUS_LABELS[auction.status]}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
          {isRemate ? <Gavel className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
          {isRemate ? 'Remate' : 'Venta directa'}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {!isSeller && (
            <button
              onClick={() => toggleWatch.mutateAsync(id)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-amber-600 transition"
            >
              {auction.watching ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff className="h-4 w-4" />}
              {auction.watching ? 'Siguiendo' : 'Seguir'}
            </button>
          )}
          {isSeller && (
            <div className="flex gap-2">
              {auction.status === 'draft' && (
                <Button size="sm" onClick={() => publish.mutateAsync(id)}>
                  <Play className="h-3.5 w-3.5 mr-1" /> Publicar
                </Button>
              )}
              {auction.status === 'active' && (
                <Button size="sm" variant="outline" onClick={() => pause.mutateAsync(id)}>
                  <Pause className="h-3.5 w-3.5 mr-1" /> Pausar
                </Button>
              )}
              {!['sold', 'cancelled'].includes(auction.status) && (
                <Button size="sm" variant="danger" onClick={() => cancel.mutateAsync(id)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">

          {/* Columna izquierda */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header caballo */}
            <div className="flex gap-4 items-start">
              {auction.horse?.image_url ? (
                <img src={auction.horse.image_url} alt={auction.horse.name} className="h-20 w-20 rounded-2xl object-cover border border-gray-100 shrink-0" />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
                  <Gavel className="h-8 w-8 text-gray-300" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">{auction.title}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{auction.horse?.name}</p>
                {auction.location && (
                  <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {auction.location}
                  </p>
                )}
              </div>
            </div>

            {/* Descripción */}
            {auction.description && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Descripción</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{auction.description}</p>
              </div>
            )}

            {/* Documentación */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Documentación</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { ok: auction.has_health_cert, label: 'Certificado SENASA vigente' },
                  { ok: auction.has_ownership_docs, label: 'Docs de propiedad (Studbook/SRA)' },
                ].map(({ ok, label }) => (
                  <div key={label} className={`flex items-center gap-2 rounded-xl p-3 border ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}>
                    {ok
                      ? <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      : <AlertCircle className="h-4 w-4 text-gray-300 shrink-0" />}
                    <span className={`text-xs font-medium ${ok ? 'text-emerald-700' : 'text-gray-400'}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Condiciones */}
            {(auction.payment_terms || auction.delivery_terms) && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Condiciones</h3>
                {auction.payment_terms && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Pago</p>
                    <p className="text-sm text-gray-700">{auction.payment_terms}</p>
                  </div>
                )}
                {auction.delivery_terms && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Entrega</p>
                    <p className="text-sm text-gray-700">{auction.delivery_terms}</p>
                  </div>
                )}
              </div>
            )}

            {/* Historial de pujas */}
            {isRemate && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Historial de pujas {bids?.length ? `(${bids.length})` : ''}
                </h3>
                {!bids?.length ? (
                  <p className="text-sm text-gray-400 text-center py-6">Todavía no hay pujas</p>
                ) : (
                  <div className="space-y-2">
                    {bids.map((b) => (
                      <BidRow
                        key={b.id}
                        bid={b}
                        isSeller={isSeller}
                        onAccept={
                          isSeller && auction.status === 'active'
                            ? () => acceptBid.mutateAsync({ auctionId: id, bidId: b.id })
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Columna derecha */}
          <div className="space-y-4">
            {/* Precio / Puja */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {isRemate ? (topBidAmount ? 'Puja actual' : 'Puja inicial') : 'Precio pedido'}
              </p>
              <p className="text-3xl font-extrabold text-[#9d6c35] tracking-tight">
                {formatCurrency(
                  Number(isRemate ? (topBidAmount ?? auction.starting_bid) : auction.asking_price),
                  auction.currency,
                )}
              </p>
              {isRemate && auction.bid_count != null && (
                <p className="text-xs text-gray-400 mt-1">{auction.bid_count} puja{auction.bid_count !== 1 ? 's' : ''}</p>
              )}

              {/* Countdown remate */}
              {isRemate && isActive && auction.auction_end && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tiempo restante</p>
                  <Countdown end={auction.auction_end} />
                </div>
              )}

              {/* Acción comprador — venta directa */}
              {!isSeller && isActive && !isRemate && (
                <div className="mt-4 space-y-2">
                  <Button className="w-full" onClick={() => {
                    setBidAmount(String(auction.asking_price));
                    handlePlaceBid();
                  }}>
                    Hacer oferta al precio pedido
                  </Button>
                </div>
              )}

              {/* Acción comprador — remate */}
              {!isSeller && isActive && isRemate && (
                <div className="mt-4 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#9d6c35] focus:ring-2 focus:ring-[#9d6c35]/10 focus:outline-none"
                      placeholder={`Mín. ${formatCurrency(minNextBid, auction.currency)}`}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      min={minNextBid}
                    />
                    <Button onClick={handlePlaceBid} disabled={placeBid.isPending}>
                      Pujar
                    </Button>
                  </div>
                  {bidError && <p className="text-xs text-red-600">{bidError}</p>}
                  <p className="text-xs text-gray-400">Puja mínima: {formatCurrency(minNextBid, auction.currency)}</p>
                </div>
              )}

              {auction.status === 'sold' && (
                <div className="mt-4 rounded-xl bg-purple-50 border border-purple-200 p-3 text-center">
                  <p className="text-sm font-semibold text-purple-700">Vendido</p>
                  {auction.winning_price && (
                    <p className="text-lg font-bold text-purple-900">{formatCurrency(auction.winning_price, auction.currency)}</p>
                  )}
                </div>
              )}
            </div>

            {/* Vendedor */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Vendedor</p>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-[#9d6c35]/10 flex items-center justify-center font-bold text-[#9d6c35] text-sm">
                  {auction.seller?.name?.charAt(0) ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{auction.seller?.name}</p>
                  <p className="text-xs text-gray-400">Propietario registrado</p>
                </div>
              </div>
            </div>

            {/* Aviso legal */}
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Las pujas son vinculantes. La transferencia legal del equino requiere documentación notarial.
                HandicApp aplica <strong>3% de comisión</strong> sobre el precio final.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
