'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
  useEventTypes,
  type EventTypeMeta,
} from '@/hooks/use-notification-settings';
import { useRoles } from '@/hooks/use-roles';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
};

const BTN_NAVY = { backgroundColor: '#0f1f3d' } as const;
const BTN_NAVY_HOVER = '#1a2f5a';

function RoleNotifCard({
  role,
  enabledTypes,
  eventTypes,
}: {
  role: string;
  enabledTypes: string[];
  eventTypes: EventTypeMeta[];
}) {
  const updateSettings = useUpdateNotificationSettings();
  const [state, setState] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const map: Record<string, boolean> = {};
    for (const et of eventTypes) map[et.value] = false;
    for (const et of enabledTypes) map[et] = true;
    setState(map);
    setDirty(false);
  }, [enabledTypes, eventTypes]);

  const toggle = (key: string) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    const types = eventTypes.map((et) => et.value).filter((v) => state[v]);
    await updateSettings.mutateAsync({ role, eventTypes: types });
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <p className="font-semibold text-gray-900">{roleLabels[role] || role}</p>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-emerald-600 font-medium">Guardado</span>
          )}
          <button
            onClick={handleSave}
            disabled={updateSettings.isPending || !dirty}
            style={BTN_NAVY}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = BTN_NAVY_HOVER)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BTN_NAVY.backgroundColor)}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 cursor-pointer transition"
          >
            {updateSettings.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
        <p className="text-xs text-gray-500">
          Cuando se cree un evento de este tipo, se notificará a los usuarios con rol{' '}
          <strong>{roleLabels[role] || role}</strong> vinculados al caballo.
        </p>
      </div>

      <div className="px-5 py-3">
        <div className="grid grid-cols-2 gap-2">
          {eventTypes.map((et) => (
            <label
              key={et.value}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={state[et.value] || false}
                onChange={() => toggle(et.value)}
                className="h-4 w-4 cursor-pointer"
                style={{ accentColor: '#0f1f3d' }}
              />
              <span className="text-sm text-gray-700">{et.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NotificacionesConfigPage() {
  const { user } = useAuth();
  const { data: settings, isLoading: loadingSettings } = useNotificationSettings();
  const { data: roles, isLoading: loadingRoles } = useRoles();
  const { data: eventTypes, isLoading: loadingTypes } = useEventTypes();

  if (user?.role !== 'admin') return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
      Solo el admin puede acceder a esta página
    </div>
  );

  if (loadingSettings || loadingRoles || loadingTypes) return (
    <div className="flex justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: '#0f1f3d' }} />
    </div>
  );

  const roleNames = roles?.map((r) => r.name) || [];
  const types = eventTypes || [];

  const settingsByRole: Record<string, string[]> = {};
  for (const name of roleNames) settingsByRole[name] = [];
  if (settings) {
    for (const s of settings) {
      if (!settingsByRole[s.role]) settingsByRole[s.role] = [];
      settingsByRole[s.role].push(s.event_type);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configuración de Notificaciones</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configurá qué roles reciben notificaciones según el tipo de evento creado.
        </p>
      </div>

      <div className="space-y-4">
        {roleNames.map((roleName) => (
          <RoleNotifCard
            key={roleName}
            role={roleName}
            enabledTypes={settingsByRole[roleName] || []}
            eventTypes={types}
          />
        ))}
      </div>
    </div>
  );
}
