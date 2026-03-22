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

function RoleCard({
  role,
  permissions,
}: {
  role: string;
  permissions: { resource: string; action: string }[];
}) {
  const updatePermissions = useUpdatePermissions();

  // Estado local de checkboxes para este rol
  const [state, setState] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sincronizar estado local cuando llegan datos del servidor
  useEffect(() => {
    const map: Record<string, boolean> = {};
    for (const resource of resources) {
      for (const action of actions) {
        map[`${resource}:${action}`] = false;
      }
    }
    for (const p of permissions) {
      map[`${p.resource}:${p.action}`] = true;
    }
    setState(map);
    setDirty(false);
  }, [permissions]);

  const toggle = (key: string) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    const perms: { resource: string; action: string }[] = [];
    for (const resource of resources) {
      for (const action of actions) {
        if (state[`${resource}:${action}`]) {
          perms.push({ resource, action });
        }
      }
    }
    await updatePermissions.mutateAsync({ role, permissions: perms });
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold capitalize">{role}</h2>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-green-600">Guardado</span>
          )}
          <button
            onClick={handleSave}
            disabled={updatePermissions.isPending || !dirty}
            className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {updatePermissions.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
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
                  const key = `${resource}:${action}`;
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
  );
}

export default function PermisosPage() {
  const { user } = useAuth();
  const { data: permissions, isLoading } = usePermissions();

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

  // Agrupar permisos por rol
  const permsByRole: Record<string, { resource: string; action: string }[]> = {};
  for (const role of roles) {
    permsByRole[role] = [];
  }
  if (permissions) {
    for (const p of permissions) {
      if (permsByRole[p.role]) {
        permsByRole[p.role].push({ resource: p.resource, action: p.action });
      }
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Permisos por Rol</h1>
      <p className="mb-4 text-sm text-gray-500">
        Los cambios aplican cuando el usuario vuelve a iniciar sesión.
      </p>
      <div className="space-y-6">
        {roles.map((role) => (
          <RoleCard
            key={role}
            role={role}
            permissions={permsByRole[role]}
          />
        ))}
      </div>
    </div>
  );
}
