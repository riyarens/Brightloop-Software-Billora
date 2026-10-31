export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export type User = {
  id: string;
  email: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
  customer?: { id: string; name: string; email: string } | null;
};

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
};

export const homeFor = (role: Role) =>
  ({
    ADMIN: '/admin',
    STAFF: '/staff',
    CUSTOMER: '/customer',
  })[role];
