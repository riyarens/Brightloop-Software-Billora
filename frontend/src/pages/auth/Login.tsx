import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/useAuth';
import { homeFor } from '../../context/authTypes';
import { errMsg } from '../../api/client';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);

    try {
      const u = await login(email, password);
      nav(homeFor(u.role));
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
          Sign in to manage subscriptions
        </p>

        <input
          className="w-full rounded-lg border p-2"
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <input
          className="w-full rounded-lg border p-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <button
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 p-2 font-medium text-white disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="flex justify-between text-sm">
          <Link className="text-indigo-600" to="/forgot-password">
            Forgot password?
          </Link>

          <Link className="text-indigo-600" to="/register">
            Create account
          </Link>
        </div>
      </form>
    </div>
  );
}