'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions, useUpdatePermissions } from '@/hooks/use-permissions';
import { useRoles, useCreateRole, useDeleteRole } from '@/hooks/use-roles';

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
  onDelete,
  canDelete,
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
          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
            >
              Eliminar rol
            </button>
          )}
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
                  {resourceLabels[resource] || resource}
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
  const { data: permissions, isLoading: loadingPerms } = usePermissions();
  const { data: roles, isLoading: loadingRoles } = useRoles();
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();

  const [newRoleName, setNewRoleName] = useState('');

  if (user?.role !== 'admin') {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
        Solo el admin puede acceder a esta página
      </div>
    );
  }

  if (loadingPerms || loadingRoles) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  const roleNames = roles?.map((r) => r.name) || [];

  const permsByRole: Record<string, { resource: string; action: string }[]> = {};
  for (const name of roleNames) {
    permsByRole[name] = [];
  }
  if (permissions) {
    for (const p of permissions) {
      if (permsByRole[p.role]) {
        permsByRole[p.role].push({ resource: p.resource, action: p.action });
      }
    }
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    await createRole.mutateAsync(newRoleName.trim().toLowerCase());
    setNewRoleName('');
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`¿Eliminar el rol "${roleName}"? Se eliminarán todos sus permisos.`)) return;
    await deleteRole.mutateAsync(roleId);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Roles y Permisos</h1>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Crear nuevo rol</h2>
        <form onSubmit={handleCreateRole} className="flex gap-2">
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="nombre_del_rol"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
          <button
            type="submit"
            disabled={createRole.isPending || !newRoleName.trim()}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {createRole.isPending ? 'Creando...' : 'Crear'}
          </button>
        </form>
        {createRole.isError && (
          <p className="mt-2 text-xs text-red-600">Error al crear el rol</p>
        )}
      </div>

      <p className="mb-4 text-sm text-gray-500">
        Los cambios de permisos aplican cuando el usuario vuelve a iniciar sesión.
      </p>

      <div className="space-y-6">
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
    </div>
  );
}
