'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Camera, Activity, AlertTriangle, Bell, ChevronRight, ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useDashboard, type EncargadoDashboard, type EncargadoFeedItem } from '@/hooks/use-dashboard';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar } from '@/components/ui/avatar';
import { PageLoader, SkeletonStat } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { HorseHead } from '@/components/icons/equine';

/* ─── Config por tipo de item ─── */

const KIND_META: Record<
  EncargadoFeedItem['kind'],
  { label: string; icon: typeof ClipboardList; iconBg: string; iconFg: string }
> = {
  rutina: {
    label: 'Rutina',
    icon: ClipboardList,
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
    iconFg: 'text-emerald-600 dark:text-emerald-400',
  },
  foto: {
    label: 'Foto',
    icon: Camera,
    iconBg: 'bg-blue-50 dark:bg-blue-500/15',
    iconFg: 'text-blue-600 dark:text-blue-400',
  },
  entrenamiento: {
    label: 'Entrenamiento',
    icon: Activity,
    iconBg: 'bg-amber-50 dark:bg-amber-500/15',
    iconFg: 'text-amber-600 dark:text-amber-400',
  },
  aviso: {
    label: 'Aviso',
    icon: AlertTriangle,
    iconBg: 'bg-red-50 dark:bg-red-500/15',
    iconFg: 'text-red-600 dark:text-red-400',
  },
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return sameDay
    ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/* ─── Stat card ─── */

function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  icon: typeof ClipboardList;
  tone?: 'neutral' | 'alert';
}) {
  const alert = tone === 'alert' && value > 0;
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        alert
          ? 'border-red-100 bg-red-50 dark:border-red-500/25 dark:bg-red-500/10'
          : 'border-[var(--surface-card-border)] bg-[var(--surface-card)]'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-bold uppercase tracking-wide ${alert ? 'text-red-500' : 'text-gray-400'}`}>
          {label}
        </p>
        <Icon size={16} className={alert ? 'text-red-500' : 'text-gray-300'} strokeWidth={1.8} />
      </div>
      <p className={`mt-1 text-3xl font-bold leading-none ${alert ? 'text-red-700 dark:text-red-400' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

/* ─── Item de feed ─── */

function FeedRow({ item, alert = false }: { item: EncargadoFeedItem; alert?: boolean }) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;

  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.iconBg} ${meta.iconFg}`}>
        <Icon size={17} strokeWidth={1.9} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-snug">
              {alert && <AlertTriangle size={13} className="mr-1 inline text-red-500 align-[-1px]" />}
              {item.title}
            </p>
            {item.detail && <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{item.detail}</p>}
          </div>
          <span className="shrink-0 text-[10px] font-medium text-gray-400 pt-0.5">{formatTime(item.at)}</span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/caballos/${item.horse_id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
          >
            <HorseHead size={13} />
            {item.horse_name}
          </Link>
          {item.author_name && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Avatar name={item.author_name} size="xs" className="!h-4 !w-4 !text-[8px]" />
              {item.author_name}
            </span>
          )}
        </div>

        {item.kind === 'foto' && item.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photo_url}
            alt={item.title}
            className="mt-2 h-28 w-full max-w-[200px] rounded-xl object-cover border border-[var(--surface-card-border)]"
          />
        )}
      </div>
    </div>
  );
}

/* ─── Vista principal ─── */

function SupervisionView({ data }: { data: EncargadoDashboard }) {
  const alerts = data.feed.filter((f) => f.is_alert);

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Caballos" value={data.horses_total} icon={HorseHead as unknown as typeof ClipboardList} />
        <StatCard label="Actividad hoy" value={data.activity_today} icon={Activity} />
        <StatCard label="Alertas" value={data.alerts_count} icon={Bell} tone="alert" />
      </div>

      {/* Alertas destacadas */}
      {alerts.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-red-200 bg-red-50 shadow-sm dark:border-red-500/25 dark:bg-red-500/10">
          <div className="flex items-center gap-2 border-b border-red-100 px-4 py-3 dark:border-red-500/15">
            <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
            <h2 className="text-sm font-semibold text-red-800 dark:text-red-300">
              Alertas
              <span className="ml-2 rounded-full bg-red-200 px-2 py-0.5 text-[11px] font-bold text-red-800 dark:bg-red-500/25 dark:text-red-200">
                {alerts.length}
              </span>
            </h2>
          </div>
          <div className="divide-y divide-red-100 dark:divide-red-500/15">
            {alerts.map((item, i) => (
              <FeedRow key={`alert-${item.horse_id}-${item.at}-${i}`} item={item} alert />
            ))}
          </div>
        </div>
      )}

      {/* Feed de actividad */}
      <div className="overflow-hidden rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-card)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--surface-card-border)] px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ClipboardList size={16} className="text-gray-400" />
            Actividad de la caballeriza
          </h2>
          <Link href="/caballos" className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--color-primary)] hover:underline">
            Caballos <ChevronRight size={13} />
          </Link>
        </div>

        {data.feed.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Sin actividad todavía"
            message="Cuando los peones y jinetes registren rutinas, entrenamientos o fotos, vas a verlos acá."
            className="border-0"
          />
        ) : (
          <div className="divide-y divide-[var(--surface-card-border)]">
            {data.feed.map((item, i) => (
              <FeedRow key={`${item.horse_id}-${item.at}-${i}`} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function SupervisionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: dashboard, isLoading, isError, refetch } = useDashboard();

  const allowed = user?.role === 'encargado' || user?.role === 'admin';

  useEffect(() => {
    if (user && !allowed) router.replace('/caballos');
  }, [user, allowed, router]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  if (!user || !allowed) return null;

  const encargado = dashboard?.role === 'encargado' ? dashboard : undefined;

  return (
    <div className="space-y-4">
      <PageHeader title="Supervisión" subtitle={dateStr.charAt(0).toUpperCase() + dateStr.slice(1)} />

      {isLoading && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <SkeletonStat key={i} />)}
          </div>
          <PageLoader />
        </div>
      )}

      {!isLoading && isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && encargado && <SupervisionView data={encargado} />}

      {!isLoading && !isError && !encargado && (
        <EmptyState
          icon={ClipboardList}
          title="Panel no disponible"
          message="No se pudo cargar el feed de supervisión de tu caballeriza."
        />
      )}
    </div>
  );
}
