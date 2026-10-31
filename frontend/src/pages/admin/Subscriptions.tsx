import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Model';
import { useAuth } from '../../context/AuthContext';

type Subscription = {
  id: string;
  subscriptionNumber: string;
  customer?: { id: string; name: string; email: string; company?: string };
  plan?: { id: string; name: string; billingPeriod: string; price: number };
  status: string;
  isPaused: boolean;
  startDate: string;
  nextBillingDate?: string;
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
};

export default function Subscriptions() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Create Modal
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [newCustomerId, setNewCustomerId] = useState('');
  const [newPlanId, setNewPlanId] = useState('');
  const [newProductId, setNewProductId] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [creating, setCreating] = useState(false);

  // Detail Modal
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/subscriptions', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      setSubscriptions(res.data?.data || []);
      setTotal(res.data?.meta?.total || 0);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSubscriptions();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter, page]);

  const openCreateModal = async () => {
    try {
      const [cRes, pRes, prRes] = await Promise.all([
        api.get('/customers', { params: { limit: 50 } }),
        api.get('/plans', { params: { limit: 50 } }),
        api.get('/products', { params: { limit: 50 } }),
      ]);
      setCustomers(cRes.data?.data || []);
      setPlans(pRes.data?.data || pRes.data || []);
      setProducts(prRes.data?.data?.products || prRes.data?.products || []);

      if (cRes.data?.data?.[0]) setNewCustomerId(cRes.data.data[0].id);
      if (pRes.data?.data?.[0]) setNewPlanId(pRes.data.data[0].id);
      if (prRes.data?.data?.products?.[0]) setNewProductId(prRes.data.data.products[0].id);

      setShowCreate(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId || !newPlanId || !newProductId) {
      toast.error('Please select customer, plan and product');
      return;
    }

    setCreating(true);
    try {
      const chosenProduct = products.find(p => p.id === newProductId);
      const price = chosenProduct?.salesPrice || 1000;

      await api.post('/subscriptions', {
        customerId: newCustomerId,
        planId: newPlanId,
        startDate: new Date().toISOString(),
        paymentTerms: 'Immediate Payment',
        autoRenew: true,
        lines: [
          {
            productId: newProductId,
            quantity: Number(newQuantity),
            unitPrice: Number(price),
          },
        ],
      });

      toast.success('Subscription created successfully');
      setShowCreate(false);
      loadSubscriptions();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (id: string, action: 'pause' | 'resume' | 'renew' | 'close') => {
    try {
      if (action === 'close') {
        await api.post(`/subscriptions/${id}/close`, { reason: 'Customer requested cancellation' });
        toast.success('Subscription closed');
      } else {
        await api.post(`/subscriptions/${id}/${action}`);
        toast.success(`Subscription ${action}d successfully`);
      }
      loadSubscriptions();
      if (selectedSub?.id === id) {
        setSelectedSub(null);
      }
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const columns: Column<Subscription>[] = [
    {
      key: 'subscriptionNumber',
      header: 'Sub #',
      render: (r) => (
        <button
          onClick={() => setSelectedSub(r)}
          className="font-medium text-indigo-600 hover:underline"
        >
          {r.subscriptionNumber}
        </button>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900">{r.customer?.name || '-'}</div>
          <div className="text-xs text-slate-400">{r.customer?.email}</div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (r) => (
        <div>
          <span className="font-medium">{r.plan?.name || '-'}</span>
          <span className="ml-2 text-xs text-slate-400">({r.plan?.billingPeriod})</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.isPaused ? 'PAUSED' : r.status} />,
    },
    {
      key: 'nextBillingDate',
      header: 'Next Billing',
      render: (r) => (
        <span className="text-xs text-slate-600">
          {r.nextBillingDate ? new Date(r.nextBillingDate).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Amount',
      align: 'right',
      render: (r) => {
        const sum = r.lines?.reduce((acc, l) => acc + Number(l.total), 0) || 0;
        return <span className="font-semibold text-slate-800">₹{sum.toLocaleString('en-IN')}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-1.5 text-xs">
          {r.status === 'ACTIVE' && !r.isPaused && (
            <button
              onClick={() => handleAction(r.id, 'pause')}
              className="rounded bg-amber-50 px-2 py-1 text-amber-700 hover:bg-amber-100"
            >
              Pause
            </button>
          )}
          {r.isPaused && (
            <button
              onClick={() => handleAction(r.id, 'resume')}
              className="rounded bg-emerald-50 px-2 py-1 text-emerald-700 hover:bg-emerald-100"
            >
              Resume
            </button>
          )}
          {!isCustomer && r.status === 'ACTIVE' && (
            <button
              onClick={() => handleAction(r.id, 'renew')}
              className="rounded bg-indigo-50 px-2 py-1 text-indigo-700 hover:bg-indigo-100"
            >
              Renew
            </button>
          )}
          {!isCustomer && r.status !== 'CLOSED' && (
            <button
              onClick={() => handleAction(r.id, 'close')}
              className="rounded bg-red-50 px-2 py-1 text-red-700 hover:bg-red-100"
            >
              Close
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Subscriptions</h1>
          <p className="text-sm text-slate-500">Manage client subscriptions and renewal cycles</p>
        </div>

        {!isCustomer && (
          <button
            onClick={openCreateModal}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            + Create Subscription
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by sub # or customer..."
          className="w-72 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        rows={subscriptions}
        loading={loading}
        page={page}
        pageSize={10}
        total={total}
        onPage={setPage}
        empty="No subscriptions found"
      />

      {/* Create Modal */}
      <Modal open={showCreate} title="Create Subscription" onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Select Customer</label>
            <select
              className="w-full rounded-lg border p-2 text-sm"
              value={newCustomerId}
              onChange={(e) => setNewCustomerId(e.target.value)}
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
            <label className="mb-1 block text-xs font-semibold text-slate-600">Select Plan</label>
            <select
              className="w-full rounded-lg border p-2 text-sm"
              value={newPlanId}
              onChange={(e) => setNewPlanId(e.target.value)}
              required
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - ₹{Number(p.price).toLocaleString('en-IN')} / {p.billingPeriod}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Product Line</label>
              <select
                className="w-full rounded-lg border p-2 text-sm"
                value={newProductId}
                onChange={(e) => setNewProductId(e.target.value)}
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
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
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
              disabled={creating}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {creating ? 'Creating…' : 'Create Subscription'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal open={!!selectedSub} title={`Subscription ${selectedSub?.subscriptionNumber}`} onClose={() => setSelectedSub(null)}>
        {selectedSub && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-3 text-xs">
              <div>
                <span className="text-slate-400">Customer:</span>
                <p className="font-semibold text-slate-800">{selectedSub.customer?.name}</p>
                <p className="text-slate-500">{selectedSub.customer?.email}</p>
              </div>
              <div>
                <span className="text-slate-400">Plan:</span>
                <p className="font-semibold text-slate-800">{selectedSub.plan?.name}</p>
                <p className="text-slate-500">{selectedSub.plan?.billingPeriod}</p>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <div className="mt-0.5">
                  <StatusBadge status={selectedSub.isPaused ? 'PAUSED' : selectedSub.status} />
                </div>
              </div>
              <div>
                <span className="text-slate-400">Next Billing:</span>
                <p className="font-semibold text-slate-800">
                  {selectedSub.nextBillingDate ? new Date(selectedSub.nextBillingDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Line Items</h4>
              <div className="space-y-2">
                {selectedSub.lines?.map((line) => (
                  <div key={line.id} className="flex justify-between rounded border p-2 text-xs">
                    <div>
                      <p className="font-medium text-slate-800">{line.description}</p>
                      <p className="text-slate-400">Qty: {line.quantity} × ₹{Number(line.unitPrice).toLocaleString('en-IN')}</p>
                    </div>
                    <span className="font-semibold text-slate-900">
                      ₹{Number(line.total).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              {selectedSub.status === 'ACTIVE' && !selectedSub.isPaused && (
                <button
                  onClick={() => handleAction(selectedSub.id, 'pause')}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs text-white hover:bg-amber-600"
                >
                  Pause Subscription
                </button>
              )}
              {selectedSub.isPaused && (
                <button
                  onClick={() => handleAction(selectedSub.id, 'resume')}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700"
                >
                  Resume Subscription
                </button>
              )}
              <button
                onClick={() => setSelectedSub(null)}
                className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
