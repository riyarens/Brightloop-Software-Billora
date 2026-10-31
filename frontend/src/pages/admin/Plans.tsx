import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Model';
import { useAuth } from '../../context/AuthContext';

type Plan = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  billingPeriod: string;
  billingInterval: number;
  price: number;
  minQuantity: number;
  allowPause: boolean;
  allowRenew: boolean;
  allowEarlyClose: boolean;
  isActive: boolean;
  _count?: { subscriptions: number };
};

export default function Plans() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    billingPeriod: 'MONTHLY',
    billingInterval: 1,
    price: 0,
    minQuantity: 1,
    allowPause: true,
    allowRenew: true,
    allowEarlyClose: true,
  });

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/plans', { params: { limit: 50 } });
      const list = res.data?.data || res.data || [];
      setPlans(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/plans', {
        ...form,
        price: Number(form.price),
        billingInterval: Number(form.billingInterval),
        minQuantity: Number(form.minQuantity),
      });
      toast.success('Subscription plan created successfully');
      setShowCreate(false);
      setForm({
        name: '',
        code: '',
        description: '',
        billingPeriod: 'MONTHLY',
        billingInterval: 1,
        price: 0,
        minQuantity: 1,
        allowPause: true,
        allowRenew: true,
        allowEarlyClose: true,
      });
      loadPlans();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setCreating(false);
    }
  };

  const columns: Column<Plan>[] = [
    {
      key: 'name',
      header: 'Plan Name',
      render: (r) => (
        <div>
          <div className="font-semibold text-slate-900">{r.name}</div>
          <div className="text-xs text-slate-400">{r.code || '-'}</div>
        </div>
      ),
    },
    {
      key: 'billing',
      header: 'Cycle',
      render: (r) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          Every {r.billingInterval > 1 ? `${r.billingInterval} ` : ''}
          {r.billingPeriod.toLowerCase()}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      render: (r) => (
        <span className="font-semibold text-slate-900">
          ₹{Number(r.price).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'minQuantity',
      header: 'Min Qty',
      align: 'right',
      render: (r) => <span className="text-slate-600">{r.minQuantity}</span>,
    },
    {
      key: 'flags',
      header: 'Permissions',
      render: (r) => (
        <div className="flex gap-1 text-[10px]">
          {r.allowPause && <span className="rounded bg-amber-50 px-1 text-amber-700">Pause</span>}
          {r.allowRenew && <span className="rounded bg-emerald-50 px-1 text-emerald-700">Renew</span>}
          {r.allowEarlyClose && <span className="rounded bg-sky-50 px-1 text-sky-700">Early Close</span>}
        </div>
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
          <h1 className="text-xl font-bold text-slate-900">Subscription Plans</h1>
          <p className="text-sm text-slate-500">Configure recurring billing tiers and lifecycle parameters</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            + Create Plan
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={plans}
        loading={loading}
        pageSize={50}
        total={plans.length}
        empty="No plans configured"
      />

      <Modal open={showCreate} title="Create Subscription Plan" onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Plan Name</label>
              <input
                type="text"
                placeholder="e.g. Enterprise Monthly"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Plan Code</label>
              <input
                type="text"
                placeholder="e.g. PLAN-ENT-M"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
            <input
              type="text"
              className="w-full rounded-lg border p-2 text-sm"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Period</label>
              <select
                className="w-full rounded-lg border p-2 text-sm"
                value={form.billingPeriod}
                onChange={(e) => setForm({ ...form, billingPeriod: e.target.value })}
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Interval</label>
              <input
                type="number"
                min="1"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.billingInterval}
                onChange={(e) => setForm({ ...form, billingInterval: parseInt(e.target.value) || 1 })}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Base Price (₹)</label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="mb-2 block text-xs font-semibold text-slate-600">Plan Flags</label>
            <div className="flex gap-4 text-xs">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.allowPause}
                  onChange={(e) => setForm({ ...form, allowPause: e.target.checked })}
                />
                Allow Pause
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.allowRenew}
                  onChange={(e) => setForm({ ...form, allowRenew: e.target.checked })}
                />
                Allow Renew
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.allowEarlyClose}
                  onChange={(e) => setForm({ ...form, allowEarlyClose: e.target.checked })}
                />
                Allow Early Close
              </label>
            </div>
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
              disabled={creating}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {creating ? 'Saving…' : 'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
