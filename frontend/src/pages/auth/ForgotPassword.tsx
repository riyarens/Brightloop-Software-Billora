import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      await api.post('/auth/forgot-password', { email });

      toast.success(
        'If that email is registered, a reset link has been sent.'
      );
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-lg"
      >
        <h1 className="text-2xl font-bold text-indigo-600">Billora</h1>

        <p className="text-sm text-slate-500">
          Enter your email to reset your password.
        </p>

        <input
          className="w-full rounded-lg border p-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <button
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 p-2 font-medium text-white disabled:opacity-60"
        >
          {busy ? 'Sending...' : 'Send Reset Link'}
        </button>

        <p className="text-center text-sm">
          Remember your password?{' '}
          <Link className="text-indigo-600" to="/login">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}