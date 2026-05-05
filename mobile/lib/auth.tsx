import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import api, { saveToken, clearToken, getToken } from './api';
import type { User } from '../../packages/shared/src';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  can: (resource: string, action: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const fetchUser = useCallback(async () => {
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
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
    await saveToken(data.accessToken);
    await fetchUser();
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    const { data } = await api.post('/auth/register', { email, password, name, role });
    await saveToken(data.accessToken);
    await fetchUser();
  };

  const can = useCallback((resource: string, action: string) => {
    if (!user?.permissions) return false;
    return user.permissions.includes(`${resource}:${action}`);
  }, [user]);

  const logout = async () => {
    await clearToken();
    setUser(null);
    router.replace('/(auth)/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, can, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
