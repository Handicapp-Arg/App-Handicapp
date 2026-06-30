'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { APPOINTMENT_TYPES, type ServiceAppointment } from '@/hooks/use-agenda';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Solid dot color per appointment type (matches APPOINTMENT_TYPES palette).
const DOT: Record<string, string> = {
  veterinario: 'bg-red-500',
  herrador: 'bg-amber-500',
  competencia: 'bg-blue-500',
  desparasitacion: 'bg-green-500',
  vacuna: 'bg-purple-500',
  entrenamiento: 'bg-yellow-500',
  otro: 'bg-gray-400',
};

/** YYYY-MM-DD en horario local (consistente con la agrupación de la lista). */
export function appointmentDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface AgendaCalendarProps {
  appointments: ServiceAppointment[];
  selectedDate: string | null;
  onSelectDate: (key: string | null) => void;
}

/**
 * Calendario mensual de la agenda. Mismo lenguaje visual que event-calendar:
 * días con turnos marcados con puntitos por tipo, "hoy" en cuero, día
 * seleccionado resaltado. Al hacer click en un día, el padre muestra los turnos.
 */
export default function AgendaCalendar({ appointments, selectedDate, onSelectDate }: AgendaCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const byDate = useMemo(() => {
    const map = new Map<string, ServiceAppointment[]>();
    for (const a of appointments) {
      const key = appointmentDateKey(new Date(a.scheduled_at));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [appointments]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday = 0
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);

    return days;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
    onSelectDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
    onSelectDate(null);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    onSelectDate(null);
  };

  const formatDateKey = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="rounded-xl border border-gray-200 bg-[var(--surface-card)] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <button
          onClick={prevMonth}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition cursor-pointer"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={goToday}
            className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 transition cursor-pointer"
          >
            Hoy
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition cursor-pointer"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="min-h-[72px] border-b border-r border-gray-50" />;
          }

          const dateKey = formatDateKey(day);
          const dayAppts = byDate.get(dateKey) || [];
          const hasAppts = dayAppts.length > 0;
          const isSelected = selectedDate === dateKey;
          const todayClass = isToday(day);

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(isSelected ? null : dateKey)}
              className={`relative min-h-[72px] border-b border-r border-gray-50 p-1.5 text-left transition hover:bg-gray-50 cursor-pointer ${
                isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/15 dark:ring-blue-500/30' : ''
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  todayClass ? 'bg-black text-white dark:bg-clay-500' : 'text-gray-700'
                }`}
              >
                {day}
              </span>
              {hasAppts && (
                <div className="mt-0.5 flex flex-wrap gap-0.5">
                  {dayAppts.slice(0, 3).map((a) => (
                    <span key={a.id} className={`h-1.5 w-1.5 rounded-full ${DOT[a.type] || DOT.otro}`} />
                  ))}
                  {dayAppts.length > 3 && (
                    <span className="text-[9px] leading-none text-gray-400">+{dayAppts.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 border-t border-gray-100 px-4 py-2.5">
        {Object.entries(APPOINTMENT_TYPES).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${DOT[key] || DOT.otro}`} />
            <span className="text-[11px] text-gray-500">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
