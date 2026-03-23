'use client';

import { useState, useMemo } from 'react';
import type { Event } from '@/types';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/api$/, '');

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const typeConfig: Record<string, { label: string; color: string; dot: string }> = {
  salud: { label: 'Salud', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  entrenamiento: { label: 'Entrenamiento', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  gasto: { label: 'Gasto', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  nota: { label: 'Nota', color: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
};

interface EventCalendarProps {
  events: Event[];
}

export default function EventCalendar({ events }: EventCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Group events by date string (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of events) {
      const key = event.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday = 0
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    // Fill remaining cells to complete grid
    while (days.length % 7 !== 0) days.push(null);

    return days;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
    setSelectedDate(null);
    setSelectedEvent(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
    setSelectedDate(null);
    setSelectedEvent(null);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(null);
    setSelectedEvent(null);
  };

  const formatDateKey = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const isToday = (day: number) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) || []) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      {/* Calendar */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <button
            onClick={prevMonth}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {MONTHS[month]} {year}
            </h2>
            <button
              onClick={goToday}
              className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 transition"
            >
              Hoy
            </button>
          </div>
          <button
            onClick={nextMonth}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
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
            const dayEvents = eventsByDate.get(dateKey) || [];
            const hasEvents = dayEvents.length > 0;
            const isSelected = selectedDate === dateKey;
            const todayClass = isToday(day);

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => {
                  setSelectedDate(isSelected ? null : dateKey);
                  setSelectedEvent(null);
                }}
                className={`relative min-h-[72px] border-b border-r border-gray-50 p-1.5 text-left transition hover:bg-gray-50 ${
                  isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : ''
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    todayClass
                      ? 'bg-black text-white'
                      : 'text-gray-700'
                  }`}
                >
                  {day}
                </span>
                {hasEvents && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const cfg = typeConfig[ev.type] || typeConfig.nota;
                      return (
                        <span
                          key={ev.id}
                          className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                        />
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] leading-none text-gray-400">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 border-t border-gray-100 px-4 py-2.5">
          {Object.entries(typeConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              <span className="text-[11px] text-gray-500">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar: selected day events / event detail */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {selectedEvent ? (
          /* Event detail */
          <div>
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-sm font-semibold">Detalle del evento</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${(typeConfig[selectedEvent.type] || typeConfig.nota).color}`}>
                  {(typeConfig[selectedEvent.type] || typeConfig.nota).label}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString('es-AR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              </div>

              {selectedEvent.horse && (
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">{selectedEvent.horse.name}</span>
                </div>
              )}

              <p className="text-sm leading-relaxed text-gray-700">{selectedEvent.description}</p>

              {selectedEvent.photos && selectedEvent.photos.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-gray-500">Fotos</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.photos.map((photo) => (
                      <a
                        key={photo.id}
                        href={`${API_URL}/uploads/events/${photo.filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={`${API_URL}/uploads/events/${photo.filename}`}
                          alt="Foto del evento"
                          className="h-24 w-24 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : selectedDate ? (
          /* Day event list */
          <div>
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-semibold">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </h3>
              <p className="text-xs text-gray-400">
                {selectedEvents.length} evento{selectedEvents.length !== 1 ? 's' : ''}
              </p>
            </div>
            {selectedEvents.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-400">Sin eventos este día</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {selectedEvents.map((event) => {
                  const cfg = typeConfig[event.type] || typeConfig.nota;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition"
                    >
                      <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${cfg.dot}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-gray-500">{cfg.label}</span>
                          {event.horse && (
                            <span className="truncate text-[11px] text-gray-400">{event.horse.name}</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-gray-700 line-clamp-2">{event.description}</p>
                        {event.photos && event.photos.length > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6.75v10.5A2.25 2.25 0 003.75 21z" />
                            </svg>
                            {event.photos.length} foto{event.photos.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      <svg className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center px-4 text-center">
            <svg className="mb-3 h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <p className="text-sm text-gray-400">Seleccioná un día para ver sus eventos</p>
          </div>
        )}
      </div>
    </div>
  );
}
