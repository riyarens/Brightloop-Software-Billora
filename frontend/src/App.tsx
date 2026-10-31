import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import ComingSoon from './components/ComingSoon';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/admin/Dashboard';
import Assistant from './pages/admin/Assistant';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Products from './pages/admin/Products';
import Plans from './pages/admin/Plans';
import Customers from './pages/admin/Customers';
import Subscriptions from './pages/admin/Subscriptions';
import Staff from './pages/admin/Staff';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Admin Routes */}
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="*" element={<ComingSoon />} />
              <Route path="customers" element={<Customers />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="products" element={<Products />} />
              <Route path="plans" element={<Plans />} />
              <Route path="staff" element={<Staff />} />
            </Route>
          </Route>

          {/* Staff Routes */}
          <Route element={<ProtectedRoute roles={['STAFF']} />}>
            <Route path="/staff" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="*" element={<ComingSoon />} />
              <Route path="customers" element={<Customers />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="products" element={<Products />} />
              <Route path="plans" element={<Plans />} />
            </Route>
          </Route>

          {/* Customer Routes */}
          <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
            <Route path="/customer" element={<AppLayout />}>
              <Route index element={<Subscriptions />} />
              <Route path="profile" element={<Customers />} />
              <Route path="*" element={<ComingSoon />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}