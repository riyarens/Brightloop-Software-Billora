import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';

const rules = (p: string) => [
  { ok: p.length > 8, text: 'More than 8 characters' },
  { ok: /[A-Z]/.test(p), text: 'An uppercase letter' },
  { ok: /[a-z]/.test(p), text: 'A lowercase letter' },
  { ok: /[^A-Za-z0-9]/.test(p), text: 'A special character' },
];

export default function Register() {
  const nav = useNavigate();

  const [f, setF] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    password: '',
  });

  const set = (k: string) => (e: any) =>
    setF({ ...f, [k]: e.target.value });

  const valid = rules(f.password).every(r => r.ok);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post('/auth/register', f);
      toast.success('Account created. Please sign in.');
      nav('/login');
    } catch (err) {
      toast.error(errMsg(err));
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
          Create your account
        </p>

        {(['name', 'company', 'phone', 'email'] as const).map(k => (
          <input
            key={k}
            className="w-full rounded-lg border p-2"
            placeholder={k[0].toUpperCase() + k.slice(1)}
            type={k === 'email' ? 'email' : 'text'}
            value={f[k]}
            onChange={set(k)}
            required={k === 'name' || k === 'email'}
          />
        ))}

        <input
          className="w-full rounded-lg border p-2"
          placeholder="Password"
          type="password"
          value={f.password}
          onChange={set('password')}
          required
        />

        <ul className="grid grid-cols-2 gap-1 text-xs">
          {rules(f.password).map(r => (
            <li
              key={r.text}
              className={r.ok ? 'text-emerald-600' : 'text-slate-400'}
            >
              {r.ok ? '✓' : '○'} {r.text}
            </li>
          ))}
        </ul>

        <button
          disabled={!valid}
          className="w-full rounded-lg bg-indigo-600 p-2 font-medium text-white disabled:opacity-50"
        >
          Register
        </button>

        <p className="text-center text-sm">
          Already registered?{' '}
          <Link className="text-indigo-600" to="/login">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}