'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions, useUpdatePermissions } from '@/hooks/use-permissions';
import ConfirmDialog from '@/components/confirm-dialog';
import { useRoles, useCreateRole, useDeleteRole } from '@/hooks/use-roles';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
  useEventTypes,
  type EventTypeMeta,
} from '@/hooks/use-notification-settings';

const resources = ['horses', 'events'];
const actions = ['create', 'read', 'update', 'delete'];
const resourceLabels: Record<string, string> = { horses: 'Caballos', events: 'Eventos' };
const actionLabels: Record<string, string> = { create: 'Crear', read: 'Ver', update: 'Editar', delete: 'Eliminar' };
const roleLabels: Record<string, string> = { admin: 'Administrador', propietario: 'Propietario', establecimiento: 'Establecimiento' };

const BTN_NAVY = { backgroundColor: '#0f1f3d' } as const;
const BTN_NAVY_HOVER = '#1a2f5a';
const BTN_GREEN = { backgroundColor: '#22c55e' } as const;
const BTN_GREEN_HOVER = '#16a34a';

function RoleCard({
  role, permissions, onDelete, canDelete,
}: {
  role: string;
  permissions: { resource: string; action: string }[];
  onDelete?: () => void;
  canDelete: boolean;
}) {
  const updatePermissions = useUpdatePermissions();
  const [state, setState] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const map: Record<string, boolean> = {};
    for (const r of resources) for (const a of actions) map[`${r}:${a}`] = false;
    for (const p of permissions) map[`${p.resource}:${p.action}`] = true;
    setState(map);
    setDirty(false);
  }, [permissions]);

  const toggle = (key: string) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    const perms = resources.flatMap((r) =>
      actions.filter((a) => state[`${r}:${a}`]).map((a) => ({ resource: r, action: a }))
    );
    await updatePermissions.mutateAsync({ role, permissions: perms });
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
            <span className="text-xs text-emerald-600 font-medium">✓ Guardado</span>
          )}
          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-red-300 hover:text-red-500 transition cursor-pointer"
            >
              Eliminar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={updatePermissions.isPending || !dirty}
            style={BTN_NAVY}
            onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = BTN_NAVY_HOVER)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = BTN_NAVY.backgroundColor)}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 cursor-pointer transition"
          >
            {updatePermissions.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {resources.map((resource) => (
          <div key={resource} className="px-5 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {resourceLabels[resource]}
            </p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {actions.map((action) => {
                const key = `${resource}:${action}`;
                return (
                  <label key={action} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={state[key] || false}
                      onChange={() => toggle(key)}
                      className="h-4 w-4 cursor-pointer"
                      style={{ accentColor: '#0f1f3d' }}
                    />
                    <span className="text-sm text-gray-700">{actionLabels[action]}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
          {saved && <span className="text-xs text-emerald-600 font-medium">Guardado</span>}
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

      <div className="px-5 py-3">
        <div className="grid grid-cols-2 gap-1">
          {eventTypes.map((et) => (
            <label
              key={et.value}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
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

type Tab = 'permisos' | 'notificaciones';

export default function PermisosPage() {
  const { user } = useAuth();
  const { data: permissions, isLoading: loadingPerms } = usePermissions();
  const { data: roles, isLoading: loadingRoles } = useRoles();
  const { data: settings, isLoading: loadingSettings } = useNotificationSettings();
  const { data: eventTypes, isLoading: loadingTypes } = useEventTypes();
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();
  const [newRoleName, setNewRoleName] = useState('');
  const [tab, setTab] = useState<Tab>('permisos');
  const [confirmDeleteRole, setConfirmDeleteRole] = useState<{ id: string; name: string } | null>(null);

  if (user?.role !== 'admin') return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
      Solo el admin puede acceder a esta página
    </div>
  );

  if (loadingPerms || loadingRoles || loadingSettings || loadingTypes) return (
    <div className="flex justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: '#0f1f3d' }} />
    </div>
  );

  const roleNames = roles?.map((r) => r.name) || [];
  const types = eventTypes || [];

  const permsByRole: Record<string, { resource: string; action: string }[]> = {};
  for (const name of roleNames) permsByRole[name] = [];
  if (permissions) {
    for (const p of permissions) {
      if (permsByRole[p.role]) permsByRole[p.role].push({ resource: p.resource, action: p.action });
    }
  }

  const settingsByRole: Record<string, string[]> = {};
  for (const name of roleNames) settingsByRole[name] = [];
  if (settings) {
    for (const s of settings) {
      if (!settingsByRole[s.role]) settingsByRole[s.role] = [];
      settingsByRole[s.role].push(s.event_type);
    }
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    await createRole.mutateAsync(newRoleName.trim().toLowerCase());
    setNewRoleName('');
  };

  const handleDeleteRole = (roleId: string, roleName: string) => {
    setConfirmDeleteRole({ id: roleId, name: roleName });
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'permisos', label: 'Roles y Permisos' },
    { id: 'notificaciones', label: 'Notificaciones' },
  ];

  return (
    <div className="space-y-5">

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors cursor-pointer"
            style={tab === t.id
              ? { backgroundColor: '#0f1f3d', color: '#fff' }
              : { color: '#6b7280' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sección: Roles y Permisos */}
      {tab === 'permisos' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <form onSubmit={handleCreateRole} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Nuevo rol</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="ej: veterinario"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={createRole.isPending || !newRoleName.trim()}
                style={BTN_GREEN}
                onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = BTN_GREEN_HOVER)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = BTN_GREEN.backgroundColor)}
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer transition"
              >
                {createRole.isPending ? 'Creando...' : 'Crear rol'}
              </button>
            </form>
            {createRole.isError && <p className="mt-2 text-xs text-red-600">Error al crear el rol</p>}
          </div>

          {roleNames.map((roleName) => {
            const roleObj = roles!.find((r) => r.name === roleName)!;
            return (
              <RoleCard
                key={roleName}
                role={roleName}
                permissions={permsByRole[roleName]}
                canDelete={roleName !== 'admin'}
                onDelete={() => handleDeleteRole(roleObj.id, roleObj.name)}
              />
            );
          })}
        </div>
      )}

      {/* Sección: Notificaciones */}
      {tab === 'notificaciones' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Qué roles reciben notificaciones según el tipo de evento creado.
          </p>
          {roleNames.map((roleName) => (
            <RoleNotifCard
              key={roleName}
              role={roleName}
              enabledTypes={settingsByRole[roleName] || []}
              eventTypes={types}
            />
          ))}
        </div>
      )}

      {/* Confirmación eliminar rol */}
      {confirmDeleteRole && (
        <ConfirmDialog
          title={`¿Eliminar el rol "${confirmDeleteRole.name}"?`}
          message="Se eliminaran todos los permisos asociados a este rol."
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={async () => {
            await deleteRole.mutateAsync(confirmDeleteRole.id);
            setConfirmDeleteRole(null);
          }}
          onCancel={() => setConfirmDeleteRole(null)}
        />
      )}
    </div>
  );
}
