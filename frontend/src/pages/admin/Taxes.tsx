import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Model';

type Tax = {
  id: string;
  name: string;
  rate: number;
  type: string;
  isIncludedInPrice: boolean;
  isActive: boolean;
};

export default function Taxes() {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    rate: 18,
    type: 'PERCENTAGE',
    isIncludedInPrice: false,
  });
  const [saving, setSaving] = useState(false);

  const loadTaxes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/taxes');
      const list = res.data?.data || res.data || [];
      setTaxes(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxes();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/taxes', {
        ...form,
        rate: Number(form.rate),
      });
      toast.success('Tax configuration created');
      setShowCreate(false);
      setForm({ name: '', rate: 18, type: 'PERCENTAGE', isIncludedInPrice: false });
      loadTaxes();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Tax>[] = [
    {
      key: 'name',
      header: 'Tax Name',
      render: (r) => <span className="font-semibold text-slate-800">{r.name}</span>,
    },
    {
      key: 'rate',
      header: 'Rate',
      render: (r) => (
        <span className="font-semibold text-indigo-600">
          {Number(r.rate)}%
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => <span className="text-xs text-slate-600">{r.type}</span>,
    },
    {
      key: 'included',
      header: 'Included in Price',
      render: (r) => (
        <span className="text-xs text-slate-500">{r.isIncludedInPrice ? 'Yes' : 'No'}</span>
      ),
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
          <h1 className="text-xl font-bold text-slate-900">Tax Configurations</h1>
          <p className="text-sm text-slate-500">Manage GST, VAT, and fiscal billing rates</p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          + Add Tax
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={taxes}
        loading={loading}
        pageSize={50}
        total={taxes.length}
        empty="No taxes configured"
      />

      <Modal open={showCreate} title="Add Tax Rate" onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Tax Name</label>
            <input
              type="text"
              placeholder="e.g. GST 18%"
              className="w-full rounded-lg border p-2 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Tax Type</label>
              <select
                className="w-full rounded-lg border p-2 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={form.isIncludedInPrice}
                onChange={(e) => setForm({ ...form, isIncludedInPrice: e.target.checked })}
              />
              Tax is already included in sales price
            </label>
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
              {saving ? 'Saving…' : 'Add Tax'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
