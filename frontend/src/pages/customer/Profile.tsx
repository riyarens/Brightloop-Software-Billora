import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    taxId: '',
  });

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/me');
      const u = res.data?.data || res.data;
      const c = u.customer;

      if (c) {
        setCustomerId(c.id);
        setForm({
          name: c.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || '',
          email: u.email || '',
          company: c.company || '',
          phone: c.phone || '',
          address: c.address || '',
          city: c.city || '',
          state: c.state || '',
          postalCode: c.postalCode || '',
          country: c.country || 'India',
          taxId: c.taxId || '',
        });
      } else {
        setForm((prev) => ({
          ...prev,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || '',
          email: u.email || '',
        }));
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast.error('No linked customer profile found to update');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/customers/${customerId}`, {
        name: form.name,
        company: form.company,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        taxId: form.taxId,
      });
      toast.success('Profile updated successfully');
      loadProfile();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-400">Loading your profile…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Account & Billing Profile</h1>
        <p className="text-sm text-slate-500">Manage your business details, contacts and tax registration</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Entity Details</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Contact Name</label>
              <input
                type="text"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Email (Account)</label>
              <input
                type="email"
                disabled
                className="w-full rounded-lg border bg-slate-50 p-2 text-sm text-slate-500 cursor-not-allowed"
                value={form.email}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Company Name</label>
              <input
                type="text"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
              <input
                type="text"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Tax ID / GSTIN</label>
            <input
              type="text"
              placeholder="e.g. 27AAAAA0000A1Z5"
              className="w-full rounded-lg border p-2 text-sm font-mono uppercase"
              value={form.taxId}
              onChange={(e) => setForm({ ...form, taxId: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Billing Address</h3>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Street Address</label>
            <input
              type="text"
              className="w-full rounded-lg border p-2 text-sm"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">City</label>
              <input
                type="text"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">State</label>
              <input
                type="text"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Postal Code</label>
              <input
                type="text"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving changes…' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

