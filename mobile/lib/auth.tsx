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
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; avatar_color?: string | null }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
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
    if (!user && !inAuth) router.replace('/(auth)/login');
    if (user && inAuth) router.replace('/(tabs)');
  }, [user, loading, segments]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    await saveToken(data.accessToken, data.refreshToken);
    await fetchUser();
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    const { data } = await api.post('/auth/register', { email, password, name, role });
    await saveToken(data.accessToken, data.refreshToken);
    await fetchUser();
  };

  const can = useCallback((resource: string, action: string) => {
    if (!user?.permissions) return false;
    return user.permissions.includes(`${resource}:${action}`);
  }, [user]);

  const updateProfile = async (data: { name?: string; email?: string; avatar_color?: string | null }) => {
    const { data: updated } = await api.patch('/auth/profile', data);
    setUser(updated);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  };

  const logout = async () => {
    const rt = await SecureStore.getItemAsync('refreshToken');
    if (rt) api.post('/auth/logout', { refreshToken: rt }).catch(() => {});
    await clearToken();
    setUser(null);
    router.replace('/(auth)/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, can, login, register, logout, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
