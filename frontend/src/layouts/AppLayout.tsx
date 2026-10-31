import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../context/AuthContext';

export const NAV: Record<Role, { to: string; label: string }[]> = {
  ADMIN: [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/subscriptions', label: 'Subscriptions' },
    { to: '/admin/customers', label: 'Customers' },
    { to: '/admin/products', label: 'Products' },
    { to: '/admin/plans', label: 'Plans' },
    { to: '/admin/taxes', label: 'Taxes' },
    { to: '/admin/discounts', label: 'Discounts' },
    { to: '/admin/templates', label: 'Templates' },
    { to: '/admin/invoices', label: 'Invoices' },
    { to: '/admin/payments', label: 'Payments' },
    { to: '/admin/overdue', label: 'Overdue' },
    { to: '/admin/leakage', label: 'Leakage Alerts' },
    { to: '/admin/risk', label: 'Renewal Risk' },
    { to: '/admin/assistant', label: 'Revenue Assistant' },
    { to: '/admin/staff', label: 'Staff' },
  ],

  STAFF: [
    { to: '/staff', label: 'Dashboard' },
    { to: '/staff/customers', label: 'Customers' },
    { to: '/staff/subscriptions', label: 'Subscriptions' },
    { to: '/staff/invoices', label: 'Invoices' },
    { to: '/staff/payments', label: 'Payments' },
    { to: '/staff/overdue', label: 'Overdue' },
    { to: '/staff/risk', label: 'Renewals' },
    { to: '/staff/assistant', label: 'Assistant' },
  ],

  CUSTOMER: [
    { to: '/customer', label: 'My Subscriptions' },
    { to: '/customer/invoices', label: 'My Invoices' },
    { to: '/customer/payments', label: 'My Payments' },
    { to: '/customer/profile', label: 'Profile' },
  ],
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const items = user?.role && NAV[user.role] ? NAV[user.role] : [];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 p-4 md:flex">
        <div className="mb-6 text-xl font-bold text-white">
          Billora
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {items.map(i => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.to.split('/').length === 2}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              {i.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-white px-6 py-3">
          <span className="text-sm text-slate-500">
            {user?.email || 'User'} · {user?.role || ''}
          </span>

          <button
            onClick={logout}
            className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
          >
            Logout
          </button>
        </header>

        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
