'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions, useUpdatePermissions } from '@/hooks/use-permissions';

const roles = ['admin', 'propietario', 'establecimiento'];
const resources = ['horses', 'events'];
const actions = ['create', 'read', 'update', 'delete'];

const resourceLabels: Record<string, string> = {
  horses: 'Caballos',
  events: 'Eventos',
};

const actionLabels: Record<string, string> = {
  create: 'Crear',
  read: 'Ver',
  update: 'Editar',
  delete: 'Eliminar',
};

export default function PermisosPage() {
  const { user } = useAuth();
  const { data: permissions, isLoading } = usePermissions();
  const updatePermissions = useUpdatePermissions();

  // Map: "role:resource:action" → boolean
  const [state, setState] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!permissions) return;
    const map: Record<string, boolean> = {};
    for (const role of roles) {
      for (const resource of resources) {
        for (const action of actions) {
          map[`${role}:${resource}:${action}`] = false;
        }
      }
    }
    for (const p of permissions) {
      map[`${p.role}:${p.resource}:${p.action}`] = true;
    }
    setState(map);
  }, [permissions]);

  if (user?.role !== 'admin') {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
        Solo el admin puede acceder a esta página
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  const toggle = (key: string) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async (role: string) => {
    const perms: { resource: string; action: string }[] = [];
    for (const resource of resources) {
      for (const action of actions) {
        if (state[`${role}:${resource}:${action}`]) {
          perms.push({ resource, action });
        }
      }
    }
    await updatePermissions.mutateAsync({ role, permissions: perms });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Permisos por Rol</h1>

      {saved && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          Permisos actualizados
        </div>
      )}

      <div className="space-y-6">
        {roles.map((role) => (
          <div
            key={role}
            className="rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold capitalize">{role}</h2>
              <button
                onClick={() => handleSave(role)}
                disabled={updatePermissions.isPending}
                className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {updatePermissions.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2 text-left font-medium text-gray-500">
                      Recurso
                    </th>
                    {actions.map((action) => (
                      <th
                        key={action}
                        className="px-3 py-2 text-center font-medium text-gray-500"
                      >
                        {actionLabels[action]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => (
                    <tr key={resource} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-2.5 font-medium">
                        {resourceLabels[resource]}
                      </td>
                      {actions.map((action) => {
                        const key = `${role}:${resource}:${action}`;
                        return (
                          <td key={action} className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={state[key] || false}
                              onChange={() => toggle(key)}
                              className="h-4 w-4 rounded border-gray-300 accent-black cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
