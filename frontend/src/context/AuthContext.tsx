import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import { AuthContext } from './auth-context';
import type { AuthContextValue, User } from './authTypes';

type AuthResponse = {
  data: {
    user: User;
    customer?: User['customer'];
    token: string;
  };
};

type ProfileResponse = { data: User };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(sessionStorage.getItem('token')));

  const logout = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('billora:unauthorized', handleUnauthorized);

    const token = sessionStorage.getItem('token');
    if (!token) {
      return () => window.removeEventListener('billora:unauthorized', handleUnauthorized);
    }

    api.get<ProfileResponse>('/auth/me')
      .then(({ data }) => {
        setUser(data.data);
        sessionStorage.setItem('user', JSON.stringify(data.data));
      })
      .catch(() => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));

    return () => window.removeEventListener('billora:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    sessionStorage.setItem('token', data.data.token);
    const authenticatedUser = { ...data.data.user, customer: data.data.customer ?? null };
    sessionStorage.setItem('user', JSON.stringify(authenticatedUser));
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

  const value: AuthContextValue = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
