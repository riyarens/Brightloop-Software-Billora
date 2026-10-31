import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { errMsg } from '../../api/client';
import { staffApi } from '../../api/staffApi';
import type { StaffInput, StaffMember } from '../../api/staffApi';

const initialForm: StaffInput = { email: '', firstName: '', lastName: '', password: '' };
const passwordValid = (password: string) =>
  password.length > 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[^A-Za-z0-9]/.test(password);

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [form, setForm] = useState<StaffInput>({ ...initialForm });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await staffApi.list({ page, limit: 10 });
      setStaff(result.items);
      setTotal(result.pagination?.total ?? result.items.length);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (!passwordValid(form.password)) {
      toast.error('Use more than 8 characters with uppercase, lowercase, and a special character.');
      return;
    }
    setSaving(true);
    try {
      await staffApi.create({
        ...form,
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName?.trim() || undefined,
      });
      toast.success('Staff account created');
      setForm({ ...initialForm });
      await load();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <header><h1 className="text-2xl font-bold">Staff</h1><p className="text-sm text-slate-500">Create and view staff accounts.</p></header>
      <form onSubmit={submit} className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <h2 className="font-semibold sm:col-span-2 lg:col-span-4">Add staff member</h2>
        <input required type="email" autoComplete="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="rounded border px-3 py-2 text-sm" />
        <input required autoComplete="given-name" placeholder="First name" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className="rounded border px-3 py-2 text-sm" />
        <input autoComplete="family-name" placeholder="Last name" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className="rounded border px-3 py-2 text-sm" />
        <input required type="password" autoComplete="new-password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="rounded border px-3 py-2 text-sm" />
        <button disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Creating…' : 'Create staff account'}</button>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white">
        {loading ? <p className="p-8 text-center text-slate-500">Loading staff…</p> : staff.length === 0 ? <p className="p-8 text-center text-slate-500">No staff members found.</p> : (
          <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y">{staff.map((member) => <tr key={member.id}><td className="p-3">{member.firstName} {member.lastName}</td><td className="p-3">{member.email}</td><td className="p-3">{member.isActive ? 'Active' : 'Inactive'}</td></tr>)}</tbody></table>
        )}
        <div className="flex items-center justify-between border-t p-3 text-sm text-slate-500"><span>{total} staff members</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button><span>{page} / {Math.max(1, Math.ceil(total / 10))}</span><button disabled={page >= Math.ceil(total / 10)} onClick={() => setPage((value) => value + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button></div></div>
      </div>
    </section>
  );
}
