import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth, homeFor } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Assistant from './pages/admin/Assistant';
import Products from './pages/admin/Products';
import Subscriptions from './pages/admin/Subscriptions';
import Customers from './pages/admin/Customers';
import Plans from './pages/admin/Plans';
import Invoices from './pages/admin/Invoices';
import Payments from './pages/admin/Payments';
import Taxes from './pages/admin/Taxes';
import Discounts from './pages/admin/Discounts';
import Templates from './pages/admin/Templates';
import Staff from './pages/admin/Staff';
import Overdue from './pages/admin/Overdue';
import Leakage from './pages/admin/Leakage';

// Staff Pages
import StaffDashboard from './pages/staff/StaffDashboard';

// Customer Pages
import MySubscriptions from './pages/customer/MySubscriptions';
import MyInvoices from './pages/customer/MyInvoices';
import MyPayments from './pages/customer/MyPayments';
import Profile from './pages/customer/Profile';

function RootRedirect() {
  const { user } = useAuth();
  if (!user || !user.role) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={homeFor(user.role) || '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />

        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Admin Routes */}
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="customers" element={<Customers />} />
              <Route path="products" element={<Products />} />
              <Route path="plans" element={<Plans />} />
              <Route path="taxes" element={<Taxes />} />
              <Route path="discounts" element={<Discounts />} />
              <Route path="templates" element={<Templates />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="payments" element={<Payments />} />
              <Route path="overdue" element={<Overdue />} />
              <Route path="leakage" element={<Leakage />} />
              <Route path="risk" element={<Overdue />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="staff" element={<Staff />} />
            </Route>
          </Route>

          {/* Staff Routes */}
          <Route element={<ProtectedRoute roles={['STAFF']} />}>
            <Route path="/staff" element={<AppLayout />}>
              <Route index element={<StaffDashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="payments" element={<Payments />} />
              <Route path="overdue" element={<Overdue />} />
              <Route path="risk" element={<Overdue />} />
              <Route path="assistant" element={<Assistant />} />
            </Route>
          </Route>

          {/* Customer Routes */}
          <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
            <Route path="/customer" element={<AppLayout />}>
              <Route index element={<MySubscriptions />} />
              <Route path="invoices" element={<MyInvoices />} />
              <Route path="payments" element={<MyPayments />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
