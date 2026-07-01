'use client';

import Link from 'next/link';
import type { AxiosError } from 'axios';
import {
  BarChart3, HeartPulse, Wallet, CalendarClock, Stethoscope,
  AlertTriangle, Clock, CheckCircle2,
} from 'lucide-react';
import { PageHeader, Card } from '@/components/ui';
import { useReportSummary, type ReportSummary } from '@/hooks/use-reports';

const CATEGORY_LABELS: Record<string, string> = {
  alimentacion: 'Alimentación',
  veterinario: 'Veterinario',
  herradero: 'Herradero',
  entrenamiento: 'Entrenamiento',
  mantenimiento: 'Mantenimiento',
  transporte: 'Transporte',
  otros: 'Otros',
};

const APPOINTMENT_LABELS: Record<string, string> = {
  veterinario: 'Veterinario',
  herrador: 'Herrador',
  competencia: 'Competencia',
  desparasitacion: 'Desparasitación',
  vacuna: 'Vacuna',
  entrenamiento: 'Entrenamiento',
  otro: 'Otro',
};

const fmtMoney = (n: number) => `$ ${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
};

const fmtDate = (iso: string) =>
  new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-clay-200 hover:shadow-md dark:hover:border-clay-500/30">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-clay-500/15 text-clay-600 dark:text-clay-300">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-2xl font-extrabold leading-tight text-gray-900 tabular-nums">{value}</p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    </Card>
  );
}

/** Estado 403: el plan no incluye la feature de reportes. */
function NoPlanState() {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <div className="flex flex-col items-center gap-3 py-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-500/15 text-clay-600 dark:text-clay-300">
          <BarChart3 className="h-7 w-7" strokeWidth={1.8} />
        </span>
        <h2 className="font-display text-lg font-bold tracking-tight text-gray-900">
          Tu plan no incluye reportes
        </h2>
        <p className="max-w-sm text-sm text-gray-500">
          Actualizá tu plan para acceder al resumen de tus caballos, salud, gastos y próximos
          vencimientos.
        </p>
        <Link
          href="/perfil"
          className="mt-1 inline-flex items-center gap-2 rounded-xl bg-clay-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-clay-600 active:scale-95"
        >
          Ver Mi Plan
        </Link>
      </div>
    </Card>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-300 dark:bg-white/5">
        {icon}
      </span>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

function HealthCard({ health }: { health: ReportSummary['health'] }) {
  const verde = Math.max(0, health.total - health.rojo - health.amarillo);
  const attention = health.rojo + health.amarillo;
  const total = Math.max(1, health.rojo + health.amarillo + verde);

  const segments = [
    { key: 'rojo', value: health.rojo, cls: 'bg-red-500' },
    { key: 'amarillo', value: health.amarillo, cls: 'bg-amber-500' },
    { key: 'verde', value: verde, cls: 'bg-emerald-500' },
  ].filter((s) => s.value > 0);

  const cells = [
    {
      value: health.rojo,
      label: 'Vencidos',
      icon: <AlertTriangle className="h-4 w-4" strokeWidth={2} />,
      box: 'bg-red-50 dark:bg-red-500/10',
      num: 'text-red-600 dark:text-red-400',
      lbl: 'text-red-500 dark:text-red-300',
    },
    {
      value: health.amarillo,
      label: 'Por vencer',
      icon: <Clock className="h-4 w-4" strokeWidth={2} />,
      box: 'bg-amber-50 dark:bg-amber-500/10',
      num: 'text-amber-600 dark:text-amber-400',
      lbl: 'text-amber-500 dark:text-amber-300',
    },
    {
      value: verde,
      label: 'Al día',
      icon: <CheckCircle2 className="h-4 w-4" strokeWidth={2} />,
      box: 'bg-emerald-50 dark:bg-emerald-500/10',
      num: 'text-emerald-600 dark:text-emerald-400',
      lbl: 'text-emerald-500 dark:text-emerald-300',
    },
  ];

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <HeartPulse className="h-5 w-5 text-clay-600 dark:text-clay-300" strokeWidth={1.8} />
        <h3 className="font-display text-base font-semibold tracking-tight text-gray-900">
          Salud sanitaria
        </h3>
      </div>

      {/* Barra semáforo agregada */}
      <div className="mb-4 flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
        {segments.map((s) => (
          <div key={s.key} className={s.cls} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {cells.map((cell) => (
          <div key={cell.label} className={`rounded-xl p-3 text-center ${cell.box}`}>
            <span className={`mb-1 flex justify-center ${cell.num}`}>{cell.icon}</span>
            <p className={`text-2xl font-extrabold tabular-nums ${cell.num}`}>{cell.value}</p>
            <p className={`text-xs font-semibold ${cell.lbl}`}>{cell.label}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        {attention > 0 ? (
          <>
            <span className="font-semibold text-gray-500 dark:text-gray-300">
              {attention} caballo{attention === 1 ? '' : 's'}
            </span>{' '}
            necesitan atención sanitaria (AIE, Encefalomielitis, Influenza).
          </>
        ) : (
          'Todos los caballos están al día con las enfermedades oficiales.'
        )}
      </p>
    </Card>
  );
}

function ExpensesCard({ expenses }: { expenses: ReportSummary['expenses'] }) {
  const max = Math.max(1, ...expenses.monthly.map((m) => m.total));
  const chrono = [...expenses.monthly].reverse();
  const catMax = Math.max(1, ...expenses.by_category.map((c) => c.total));

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-clay-600 dark:text-clay-300" strokeWidth={1.8} />
        <h3 className="font-display text-base font-semibold tracking-tight text-gray-900">Gastos</h3>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Este mes</p>
          <p className="text-lg font-extrabold text-gray-900 tabular-nums">{fmtMoney(expenses.month_total)}</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Últimos 12 meses</p>
          <p className="text-lg font-extrabold text-gray-900 tabular-nums">{fmtMoney(expenses.year_total)}</p>
        </div>
      </div>

      {/* Gráfico simple de barras por mes */}
      {chrono.length > 0 ? (
        <div className="mb-5">
          <div className="flex items-end gap-1.5" style={{ height: 104 }}>
            {chrono.map((m, i) => {
              const isCurrent = i === chrono.length - 1;
              return (
                <div key={m.month} className="group flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        isCurrent ? 'bg-clay-500' : 'bg-clay-500/50 group-hover:bg-clay-500/80'
                      }`}
                      style={{
                        height: `${Math.round((m.total / max) * 100)}%`,
                        minHeight: m.total > 0 ? 3 : 0,
                      }}
                      title={`${fmtMonth(m.month)}: ${fmtMoney(m.total)}`}
                    />
                  </div>
                  <span
                    className={`text-[9px] capitalize ${
                      isCurrent ? 'font-semibold text-clay-600 dark:text-clay-300' : 'text-gray-400'
                    }`}
                  >
                    {fmtMonth(m.month).split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState icon={<Wallet className="h-5 w-5" strokeWidth={1.8} />} text="Sin gastos registrados en el período." />
      )}

      {/* Desglose por categoría */}
      {expenses.by_category.length > 0 && (
        <div className="space-y-2.5 border-t border-gray-100 pt-4 dark:border-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Por categoría</p>
          {expenses.by_category.map((cat) => (
            <div key={cat.category} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">
                  {CATEGORY_LABELS[cat.category] ?? cat.category}
                </span>
                <span className="font-semibold text-gray-900 tabular-nums">{fmtMoney(cat.total)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                <div
                  className="h-full rounded-full bg-clay-500/60"
                  style={{ width: `${Math.round((cat.total / catMax) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function UpcomingCard({ upcoming }: { upcoming: ReportSummary['upcoming'] }) {
  const hasItems = upcoming.appointments.length > 0 || upcoming.medical.length > 0;
  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-clay-600 dark:text-clay-300" strokeWidth={1.8} />
        <h3 className="font-display text-base font-semibold tracking-tight text-gray-900">
          Próximos vencimientos
        </h3>
      </div>

      {!hasItems && (
        <EmptyState
          icon={<CalendarClock className="h-5 w-5" strokeWidth={1.8} />}
          text="No hay turnos ni vencimientos próximos."
        />
      )}

      {upcoming.appointments.length > 0 && (
        <div className="space-y-2">
          {upcoming.appointments.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100/70 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-clay-500/15 text-clay-600 dark:text-clay-300">
                <CalendarClock className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{a.title}</p>
                <p className="truncate text-xs text-gray-400">
                  {a.horse_name} · {APPOINTMENT_LABELS[a.type] ?? a.type}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-gray-500">{fmtDateTime(a.scheduled_at)}</span>
            </div>
          ))}
        </div>
      )}

      {upcoming.medical.length > 0 && (
        <div className="mt-2 space-y-2">
          {upcoming.medical.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100/70 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Stethoscope className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{m.name}</p>
                <p className="truncate text-xs text-gray-400">{m.horse_name}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-gray-500">{fmtDate(m.next_due)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function ReportesPage() {
  const { data, isLoading, error } = useReportSummary();
  const status = (error as AxiosError | null)?.response?.status;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Reportes" subtitle="Resumen de tus caballos, salud, gastos y agenda" />

      {isLoading ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="flex items-center gap-4">
                <div className="skeleton-shimmer h-11 w-11 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="skeleton-shimmer h-3 w-20 rounded-md" />
                  <div className="skeleton-shimmer h-6 w-16 rounded-md" />
                </div>
              </Card>
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <Card key={i} className="space-y-4">
                <div className="skeleton-shimmer h-4 w-32 rounded-md" />
                <div className="skeleton-shimmer h-40 w-full rounded-xl" />
              </Card>
            ))}
          </div>
          <Card className="space-y-4">
            <div className="skeleton-shimmer h-4 w-40 rounded-md" />
            <div className="skeleton-shimmer h-32 w-full rounded-xl" />
          </Card>
        </div>
      ) : status === 403 ? (
        <NoPlanState />
      ) : error ? (
        <Card>
          <EmptyState
            icon={<BarChart3 className="h-5 w-5" strokeWidth={1.8} />}
            text="No se pudo cargar el reporte."
          />
        </Card>
      ) : data ? (
        <div className="stagger-children space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<BarChart3 className="h-5 w-5" strokeWidth={1.9} />}
              label="Caballos"
              value={String(data.horses.total)}
              hint="Gestionados"
            />
            <StatCard
              icon={<HeartPulse className="h-5 w-5" strokeWidth={1.9} />}
              label="Sanidad vencida"
              value={String(data.health.rojo)}
              hint={`${data.health.amarillo} por vencer`}
            />
            <StatCard
              icon={<Wallet className="h-5 w-5" strokeWidth={1.9} />}
              label="Gasto del mes"
              value={fmtMoney(data.expenses.month_total)}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <HealthCard health={data.health} />
            <UpcomingCard upcoming={data.upcoming} />
          </div>

          <ExpensesCard expenses={data.expenses} />
        </div>
      ) : null}
    </div>
  );
}
