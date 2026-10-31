import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Model';

type Quotation = {
  id: string;
  quotationNumber: string;
  customer?: { name: string; email: string };
  plan?: { name: string };
  status: string;
  total: number;
  validUntil?: string;
  createdAt: string;
};

export default function Templates() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [form, setForm] = useState({
    customerId: '',
    planId: '',
    productId: '',
    quantity: 1,
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quotations');
      const list = res.data?.data || res.data || [];
      setQuotations(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = async () => {
    try {
      const [cRes, pRes, prRes] = await Promise.all([
        api.get('/customers', { params: { limit: 50 } }),
        api.get('/plans', { params: { limit: 50 } }),
        api.get('/products', { params: { limit: 50 } }),
      ]);
      const custs = cRes.data?.data || [];
      const plns = pRes.data?.data || pRes.data || [];
      const prods = prRes.data?.data?.products || prRes.data?.products || [];

      setCustomers(custs);
      setPlans(plns);
      setProducts(prods);

      setForm({
        customerId: custs[0]?.id || '',
        planId: plns[0]?.id || '',
        productId: prods[0]?.id || '',
        quantity: 1,
      });

      setShowCreate(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const prod = products.find((p) => p.id === form.productId);
      const unitPrice = prod?.salesPrice || 1000;

      await api.post('/quotations', {
        customerId: form.customerId,
        planId: form.planId || undefined,
        lines: [
          {
            productId: form.productId,
            quantity: Number(form.quantity),
            unitPrice: Number(unitPrice),
          },
        ],
      });

      toast.success('Quotation draft created successfully');
      setShowCreate(false);
      loadData();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Quotation>[] = [
    {
      key: 'quotationNumber',
      header: 'Quote #',
      render: (r) => <span className="font-semibold text-indigo-600">{r.quotationNumber}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (r) => (
        <div>
          <span className="font-semibold text-slate-800">{r.customer?.name || '-'}</span>
          <div className="text-xs text-slate-400">{r.customer?.email}</div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (r) => <span className="text-slate-600">{r.plan?.name || '-'}</span>,
    },
    {
      key: 'total',
      header: 'Quote Value',
      align: 'right',
      render: (r) => (
        <span className="font-semibold text-slate-900">
          ₹{Number(r.total).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'date',
      header: 'Created On',
      render: (r) => (
        <span className="text-xs text-slate-500">
          {new Date(r.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quotations & Proposals</h1>
          <p className="text-sm text-slate-500">Manage sales quotations and subscription order templates</p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          + Create Quotation
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={quotations}
        loading={loading}
        pageSize={50}
        total={quotations.length}
        empty="No quotations found"
      />

      <Modal open={showCreate} title="Draft New Quotation" onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Select Customer</label>
            <select
              className="w-full rounded-lg border p-2 text-sm"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              required
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Plan (Optional)</label>
            <select
              className="w-full rounded-lg border p-2 text-sm"
              value={form.planId}
              onChange={(e) => setForm({ ...form, planId: e.target.value })}
            >
              <option value="">No Plan Attached</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Product Line</label>
              <select
                className="w-full rounded-lg border p-2 text-sm"
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                required
              >
                {products.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name} (₹{Number(pr.salesPrice)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Quantity</label>
              <input
                type="number"
                min="1"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                required
              />
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
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {saving ? 'Creating…' : 'Create Quotation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
