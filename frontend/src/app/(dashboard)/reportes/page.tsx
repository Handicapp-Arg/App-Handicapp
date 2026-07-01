'use client';

import Link from 'next/link';
import type { AxiosError } from 'axios';
import { BarChart3, HeartPulse, Wallet, CalendarClock, Stethoscope } from 'lucide-react';
import { PageHeader, Card, Spinner } from '@/components/ui';
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

const fmtMoney = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

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
    <Card className="flex items-center gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-clay-500/15 text-clay-600 dark:text-clay-300">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-xl font-extrabold text-gray-900">{value}</p>
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
        <h2 className="text-lg font-extrabold text-gray-900">Tu plan no incluye reportes</h2>
        <p className="text-sm text-gray-500">
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

function HealthCard({ health }: { health: ReportSummary['health'] }) {
  const verde = Math.max(0, health.total - health.rojo - health.amarillo);
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <HeartPulse className="h-5 w-5 text-clay-600 dark:text-clay-300" strokeWidth={1.8} />
        <h3 className="font-display text-base font-semibold tracking-tight text-gray-900">Salud sanitaria</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-red-50 p-3 text-center dark:bg-red-500/10">
          <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">{health.rojo}</p>
          <p className="text-xs font-semibold text-red-500 dark:text-red-300">Vencidos</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3 text-center dark:bg-amber-500/10">
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{health.amarillo}</p>
          <p className="text-xs font-semibold text-amber-500 dark:text-amber-300">Por vencer</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-500/10">
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{verde}</p>
          <p className="text-xs font-semibold text-emerald-500 dark:text-emerald-300">Al día</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Caballos con al menos una enfermedad oficial (AIE, Encefalomielitis, Influenza) en cada estado.
      </p>
    </Card>
  );
}

function ExpensesCard({ expenses }: { expenses: ReportSummary['expenses'] }) {
  const max = Math.max(1, ...expenses.monthly.map((m) => m.total));
  const chrono = [...expenses.monthly].reverse();
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-clay-600 dark:text-clay-300" strokeWidth={1.8} />
        <h3 className="font-display text-base font-semibold tracking-tight text-gray-900">Gastos</h3>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Este mes</p>
          <p className="text-lg font-extrabold text-gray-900">{fmtMoney(expenses.month_total)}</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Últimos 12 meses</p>
          <p className="text-lg font-extrabold text-gray-900">{fmtMoney(expenses.year_total)}</p>
        </div>
      </div>

      {/* Gráfico simple de barras por mes */}
      {chrono.length > 0 ? (
        <div className="mb-5 flex items-end gap-1.5" style={{ height: 96 }}>
          {chrono.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-clay-500/70 transition-all hover:bg-clay-500"
                  style={{ height: `${Math.round((m.total / max) * 100)}%`, minHeight: m.total > 0 ? 3 : 0 }}
                  title={`${fmtMonth(m.month)}: ${fmtMoney(m.total)}`}
                />
              </div>
              <span className="text-[9px] text-gray-400">{fmtMonth(m.month).split(' ')[0]}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-5 text-sm text-gray-400">Sin gastos registrados en el período.</p>
      )}

      {/* Desglose por categoría */}
      {expenses.by_category.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Por categoría</p>
          {expenses.by_category.map((cat) => (
            <div key={cat.category} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                {CATEGORY_LABELS[cat.category] ?? cat.category}
              </span>
              <span className="font-semibold text-gray-900">{fmtMoney(cat.total)}</span>
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
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-clay-600 dark:text-clay-300" strokeWidth={1.8} />
        <h3 className="font-display text-base font-semibold tracking-tight text-gray-900">
          Próximos vencimientos
        </h3>
      </div>

      {!hasItems && <p className="text-sm text-gray-400">No hay turnos ni vencimientos próximos.</p>}

      {upcoming.appointments.length > 0 && (
        <div className="space-y-2">
          {upcoming.appointments.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-white/5">
              <CalendarClock className="h-4 w-4 shrink-0 text-clay-500" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{a.title}</p>
                <p className="truncate text-xs text-gray-400">
                  {a.horse_name} · {APPOINTMENT_LABELS[a.type] ?? a.type}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-gray-500">{fmtDateTime(a.scheduled_at)}</span>
            </div>
          ))}
        </div>
      )}

      {upcoming.medical.length > 0 && (
        <div className="mt-2 space-y-2">
          {upcoming.medical.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-white/5">
              <Stethoscope className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{m.name}</p>
                <p className="truncate text-xs text-gray-400">{m.horse_name}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-gray-500">{fmtDate(m.next_due)}</span>
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
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : status === 403 ? (
        <NoPlanState />
      ) : error ? (
        <Card className="text-center text-sm text-gray-500">No se pudo cargar el reporte.</Card>
      ) : data ? (
        <div className="space-y-5">
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
