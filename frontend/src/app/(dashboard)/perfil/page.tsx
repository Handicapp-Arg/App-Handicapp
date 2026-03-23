'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';

export default function PerfilPage() {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    setSavingProfile(true);

    try {
      await api.patch('/auth/profile', { name, email });
      await refreshUser();
      setProfileMsg('Datos actualizados');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { message: string } } }).response?.data?.message
          : 'Error al actualizar';
      setProfileError(msg || 'Error al actualizar');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden');
      return;
    }

    setSavingPassword(true);

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordMsg('Contraseña actualizada');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { message: string } } }).response?.data?.message
          : 'Error al cambiar contraseña';
      setPasswordError(msg || 'Error al cambiar contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mi perfil</h1>

      {/* Datos personales */}
      <form
        onSubmit={handleProfileSubmit}
        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-semibold">Datos personales</h2>

        <div className="space-y-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:max-w-md"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:max-w-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Rol</label>
            <p className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-600 sm:max-w-md">
              {user?.role}
            </p>
          </div>

          {profileMsg && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
              {profileMsg}
            </div>
          )}
          {profileError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {profileError}
            </div>
          )}

          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {savingProfile ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {/* Cambiar contraseña */}
      <form
        onSubmit={handlePasswordSubmit}
        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-semibold">Cambiar contraseña</h2>

        <div className="space-y-3">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium mb-1">
              Contraseña actual
            </label>
            <input
              id="current-password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:max-w-md"
            />
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium mb-1">
              Nueva contraseña
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:max-w-md"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">
              Confirmar nueva contraseña
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:max-w-md"
            />
          </div>

          {passwordMsg && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
              {passwordMsg}
            </div>
          )}
          {passwordError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {passwordError}
            </div>
          )}

          <button
            type="submit"
            disabled={savingPassword}
            className="rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {savingPassword ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </div>
  );
}
