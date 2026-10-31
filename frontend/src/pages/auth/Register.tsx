import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';

const passwordRules = [
  { test: (password: string) => password.length > 8, label: 'More than 8 characters' },
  { test: (password: string) => /[A-Z]/.test(password), label: 'An uppercase letter' },
  { test: (password: string) => /[a-z]/.test(password), label: 'A lowercase letter' },
  { test: (password: string) => /[^A-Za-z0-9]/.test(password), label: 'A special character' },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [busy, setBusy] = useState(false);
  const validPassword = passwordRules.every(({ test }) => test(form.password));

  const setField = (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (!validPassword) {
      toast.error('Password does not meet the requirements.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    const [firstName, ...lastNameParts] = form.name.trim().split(/\s+/);
    setBusy(true);
    try {
      await api.post('/auth/register', {
        firstName,
        lastName: lastNameParts.join(' ') || undefined,
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        company: form.company.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      toast.success('Account created. Please sign in.');
      navigate('/login');
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-indigo-600">Billora</h1>
        <p className="text-sm text-slate-500">Create your customer account</p>

        <input className="w-full rounded-lg border p-2" placeholder="Full name" autoComplete="name" value={form.name} onChange={setField('name')} required />
        <input className="w-full rounded-lg border p-2" placeholder="Company (optional)" autoComplete="organization" value={form.company} onChange={setField('company')} />
        <input className="w-full rounded-lg border p-2" placeholder="Phone (optional)" autoComplete="tel" value={form.phone} onChange={setField('phone')} />
        <input className="w-full rounded-lg border p-2" placeholder="Email" type="email" autoComplete="email" value={form.email} onChange={setField('email')} required />
        <input className="w-full rounded-lg border p-2" placeholder="Password" type="password" autoComplete="new-password" value={form.password} onChange={setField('password')} required />

        <ul className="grid grid-cols-2 gap-1 text-xs">
          {passwordRules.map(({ test, label }) => (
            <li key={label} className={test(form.password) ? 'text-emerald-600' : 'text-slate-400'}>
              {test(form.password) ? '✓' : '○'} {label}
            </li>
          ))}
        </ul>

        <input className="w-full rounded-lg border p-2" placeholder="Confirm password" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={setField('confirmPassword')} required />
        {form.confirmPassword && form.password !== form.confirmPassword && (
          <p className="text-sm text-red-600">Passwords do not match.</p>
        )}

        <button disabled={busy || !validPassword || form.password !== form.confirmPassword} className="w-full rounded-lg bg-indigo-600 p-2 font-medium text-white disabled:opacity-50">
          {busy ? 'Creating account…' : 'Register'}
        </button>
        <p className="text-center text-sm">
          Already registered? <Link className="text-indigo-600" to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
