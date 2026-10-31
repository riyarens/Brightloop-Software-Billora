import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { customerApi } from '../../api/customerApi';
import type { Customer, CustomerUpdate } from '../../api/customerApi';
import { errMsg } from '../../api/client';
import { useAuth } from '../../context/useAuth';

const editableFields: Array<{ key: keyof CustomerUpdate; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'postalCode', label: 'Postal code' },
  { key: 'country', label: 'Country' },
  { key: 'taxId', label: 'Tax ID' },
];

export default function Customers() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerUpdate>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isCustomer) {
        if (!user?.customer?.id) {
          setCustomers([]);
          toast.error('Customer profile is not available for this account.');
          return;
        }
        const customer = await customerApi.getById(user.customer.id);
        setCustomers([customer]);
        setTotal(1);
      } else {
        const result = await customerApi.list({ search: search || undefined, page, limit: 10 });
        setCustomers(result.items);
        setTotal(result.pagination?.total ?? result.items.length);
      }
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setLoading(false);
    }
  }, [isCustomer, page, search, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openCustomer = (customer: Customer) => {
    setSelected(customer);
    setForm(Object.fromEntries(editableFields.map(({ key }) => [key, customer[key] ?? ''])) as CustomerUpdate);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || saving) return;
    setSaving(true);
    try {
      await customerApi.update(selected.id, form);
      toast.success('Customer profile updated');
      setSelected(null);
      await load();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSaving(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / 10));

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{isCustomer ? 'My Profile' : 'Customers'}</h1><p className="text-sm text-slate-500">{isCustomer ? 'View and update your customer details.' : 'Customer records from the BILLORA database.'}</p></div>
        {!isCustomer && <form onSubmit={(event) => { event.preventDefault(); setPage(1); void load(); }} className="flex gap-2"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search customers" className="rounded border px-3 py-2 text-sm" /><button className="rounded border px-3 py-2 text-sm">Search</button></form>}
      </header>

      <div className="overflow-x-auto rounded-xl border bg-white">
        {loading ? <p className="p-8 text-center text-slate-500">Loading customers…</p> : customers.length === 0 ? <p className="p-8 text-center text-slate-500">No customer records found.</p> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Company</th><th className="p-3">Phone</th><th className="p-3">Actions</th></tr></thead>
            <tbody className="divide-y">{customers.map((customer) => (
              <tr key={customer.id}>
                <td className="p-3 font-medium">{customer.name}</td><td className="p-3">{customer.email}</td><td className="p-3">{customer.company || '—'}</td><td className="p-3">{customer.phone || '—'}</td>
                <td className="p-3"><button onClick={() => openCustomer(customer)} className="text-indigo-600">{isCustomer ? 'Edit profile' : 'View / edit'}</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {!isCustomer && <div className="flex items-center justify-between border-t p-3 text-sm text-slate-500"><span>{total} customers</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button><span>{page} / {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button></div></div>}
      </div>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
        <form onSubmit={save} className="my-8 w-full max-w-2xl space-y-4 rounded-xl bg-white p-5 shadow-xl">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">{selected.name}</h2><p className="text-sm text-slate-500">{selected.email}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Close" className="text-xl text-slate-400">×</button></div>
          <div className="grid gap-3 sm:grid-cols-2">{editableFields.map(({ key, label }) => <label key={key} className="text-sm">{label}<input value={String(form[key] ?? '')} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 w-full rounded border px-3 py-2" /></label>)}</div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setSelected(null)} className="rounded border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      </div>}
    </section>
  );
}
