import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from './secure-storage';
import api, { saveToken, clearToken, getToken, setAuthFailureCallback } from './api';
import { registerForPushNotifications, savePushToken } from './push-notifications';
import type { User } from '../../packages/shared/src';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  can: (resource: string, action: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string, invitationToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; avatar_color?: string | null; phone?: string | null; whatsapp_opt_in?: boolean }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const forceLogout = useCallback(() => {
    setUser(null);
    router.replace('/(auth)/login');
  }, [router]);

  useEffect(() => {
    setAuthFailureCallback(forceLogout);
  }, [forceLogout]);

  const fetchUser = useCallback(async () => {
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      // Registrar push token en background al cargar el usuario
      registerForPushNotifications()
        .then((pushToken) => { if (pushToken) savePushToken(pushToken); })
        .catch(() => {});
    } catch {
      await clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    // La pantalla de invitación es accesible sin sesión (para poder registrarse desde el link).
    const inInvite = segments[0] === 'invitacion';
    const inPeon = segments[0] === 'peon';
    const inJinete = segments[0] === 'jinete';
    if (!user && !inAuth && !inInvite) { router.replace('/(auth)/login'); return; }
    // Modo Peón: experiencia simplificada. El peón vive dentro de /peon y no
    // debe ver la app normal (tabs). Si aparece fuera de /peon, lo reenviamos.
    const isPeon = user?.role === 'peon';
    if (user && isPeon) {
      if (inAuth || !inPeon) router.replace('/peon');
      return;
    }
    // Modo Jinete: experiencia propia (registrar montas + progreso). El jinete
    // vive dentro de /jinete. Si aparece fuera, lo reenviamos.
    const isJinete = user?.role === 'jinete';
    if (user && isJinete) {
      if (inAuth || !inJinete) router.replace('/jinete');
      return;
    }
    // Otros roles: si un no-peón/no-jinete cae en /peon o /jinete, lo mandamos a la app normal.
    if (user && (inPeon || inJinete)) { router.replace('/(tabs)'); return; }
    if (user && inAuth) router.replace('/(tabs)');
  }, [user, loading, segments]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    await saveToken(data.accessToken, data.refreshToken);
    await fetchUser();
  };

  const register = async (email: string, password: string, name: string, role: string, invitationToken?: string) => {
    const { data } = await api.post('/auth/register', {
      email, password, name, role,
      ...(invitationToken ? { invitation_token: invitationToken } : {}),
    });
    await saveToken(data.accessToken, data.refreshToken);
    await fetchUser();
  };

  const can = useCallback((resource: string, action: string) => {
    if (!user?.permissions) return false;
    return user.permissions.includes(`${resource}:${action}`);
  }, [user]);

  const updateProfile = async (data: { name?: string; email?: string; avatar_color?: string | null; phone?: string | null; whatsapp_opt_in?: boolean }) => {
    const { data: updated } = await api.patch('/auth/profile', data);
    setUser(updated);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  };

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data);
  };

  const logout = async () => {
    const rt = await SecureStore.getItemAsync('refreshToken');
    if (rt) api.post('/auth/logout', { refreshToken: rt }).catch(() => {});
    await clearToken();
    setUser(null);
    router.replace('/(auth)/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, can, login, register, logout, updateProfile, changePassword, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
