import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';

const rules = (p: string) => [
  { ok: p.length > 8, text: 'More than 8 characters' },
  { ok: /[A-Z]/.test(p), text: 'An uppercase letter' },
  { ok: /[a-z]/.test(p), text: 'A lowercase letter' },
  { ok: /[^A-Za-z0-9]/.test(p), text: 'A special character' },
];

export default function ResetPassword() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const valid = rules(password).every(r => r.ok);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password reset successfully.');
      nav('/login');
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
          Enter your new password.
        </p>

        <input
          className="w-full rounded-lg border p-2"
          type="password"
          placeholder="New password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <ul className="grid grid-cols-2 gap-1 text-xs">
          {rules(password).map(r => (
            <li
              key={r.text}
              className={r.ok ? 'text-emerald-600' : 'text-slate-400'}
            >
              {r.ok ? '✓' : '○'} {r.text}
            </li>
          ))}
        </ul>

        <button
          disabled={!valid || busy || !token}
          className="w-full rounded-lg bg-indigo-600 p-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Resetting...' : 'Reset Password'}
        </button>

        <p className="text-center text-sm">
          <Link className="text-indigo-600" to="/login">
            Back to Login
          </Link>
        </p>
      </form>
    </div>
  );
}