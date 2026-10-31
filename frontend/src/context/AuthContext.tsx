import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';

export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';

type User = {
  id: string;
  email: string;
  role: Role;
};

type Ctx = {
  user: User | null;
  login: (e: string, p: string) => Promise<User>;
  logout: () => void;
};

const AuthCtx = createContext<Ctx>(null!);

export const homeFor = (r: Role) =>
  ({
    ADMIN: '/admin',
    STAFF: '/staff',
    CUSTOMER: '/customer',
  }[r]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(
    () => JSON.parse(localStorage.getItem('user') || 'null')
  );

  const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });

  const { user, token } = response.data.data;

  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));

  setUser(user);

  return user as User;
};

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);