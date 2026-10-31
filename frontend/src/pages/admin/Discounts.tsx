import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Model';

type Discount = {
  id: string;
  name: string;
  code?: string;
  type: string;
  value: number;
  isActive: boolean;
};

export default function Discounts() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    type: 'PERCENTAGE',
    value: 10,
  });
  const [saving, setSaving] = useState(false);

  const loadDiscounts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/discounts');
      const list = res.data?.data || res.data || [];
      setDiscounts(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiscounts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/discounts', {
        ...form,
        value: Number(form.value),
      });
      toast.success('Discount created');
      setShowCreate(false);
      setForm({ name: '', code: '', type: 'PERCENTAGE', value: 10 });
      loadDiscounts();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Discount>[] = [
    {
      key: 'name',
      header: 'Discount Name',
      render: (r) => (
        <div>
          <span className="font-semibold text-slate-800">{r.name}</span>
          {r.code && <div className="text-xs font-mono text-indigo-600">{r.code}</div>}
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Discount Value',
      render: (r) => (
        <span className="font-semibold text-emerald-600">
          {r.type === 'PERCENTAGE' ? `${Number(r.value)}%` : `₹${Number(r.value).toLocaleString('en-IN')}`}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => <span className="text-xs text-slate-600">{r.type}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.isActive ? 'ACTIVE' : 'CLOSED'} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Discounts & Coupons</h1>
          <p className="text-sm text-slate-500">Configure promotional discount codes and percentage rebates</p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          + Add Discount
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={discounts}
        loading={loading}
        pageSize={50}
        total={discounts.length}
        empty="No discounts configured"
      />

      <Modal open={showCreate} title="Create Discount" onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Discount Name</label>
            <input
              type="text"
              placeholder="e.g. Early Bird 15%"
              className="w-full rounded-lg border p-2 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Promo Code</label>
              <input
                type="text"
                placeholder="e.g. EARLYBIRD15"
                className="w-full rounded-lg border p-2 text-sm font-mono uppercase"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Type</label>
              <select
                className="w-full rounded-lg border p-2 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed Amount</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Value</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-lg border p-2 text-sm"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {saving ? 'Saving…' : 'Add Discount'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
