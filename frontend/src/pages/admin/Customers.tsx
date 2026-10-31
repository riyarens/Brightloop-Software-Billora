import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Model';

type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  taxId?: string;
  address?: string;
  isActive: boolean;
  _count?: {
    subscriptions: number;
    invoices: number;
  };
  subscriptions?: any[];
  invoices?: any[];
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // View Modal
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit Modal
  const [editCust, setEditCust] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    taxId: '',
  });
  const [saving, setSaving] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
        },
      });
      setCustomers(res.data?.data || []);
      setTotal(res.data?.meta?.total || 0);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, page]);

  const openView = async (c: Customer) => {
    setSelectedCust(c);
    setDetailLoading(true);
    try {
      const res = await api.get(`/customers/${c.id}`);
      setSelectedCust(res.data?.data || c);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = (c: Customer) => {
    setEditCust(c);
    setForm({
      name: c.name || '',
      phone: c.phone || '',
      company: c.company || '',
      address: c.address || '',
      city: c.city || '',
      taxId: c.taxId || '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCust) return;

    setSaving(true);
    try {
      await api.put(`/customers/${editCust.id}`, form);
      toast.success('Customer updated successfully');
      setEditCust(null);
      loadCustomers();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer Name',
      render: (r) => (
        <div>
          <button
            onClick={() => openView(r)}
            className="font-medium text-indigo-600 hover:underline"
          >
            {r.name}
          </button>
          <div className="text-xs text-slate-400">{r.email}</div>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (r) => <span className="text-slate-700">{r.company || '-'}</span>,
    },
    {
      key: 'location',
      header: 'City / Country',
      render: (r) => (
        <span className="text-xs text-slate-500">
          {[r.city, r.country].filter(Boolean).join(', ') || '-'}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (r) => <span className="text-xs text-slate-500">{r.phone || '-'}</span>,
    },
    {
      key: 'subs',
      header: 'Active Subs',
      align: 'right',
      render: (r) => (
        <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
          {r._count?.subscriptions || 0}
        </span>
      ),
    },
    {
      key: 'invoices',
      header: 'Invoices',
      align: 'right',
      render: (r) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {r._count?.invoices || 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.isActive ? 'ACTIVE' : 'CLOSED'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <button
          onClick={() => openEdit(r)}
          className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">Manage client accounts, contacts and billing entities</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by customer name, company, or email..."
          className="w-80 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        rows={customers}
        loading={loading}
        page={page}
        pageSize={10}
        total={total}
        onPage={setPage}
        empty="No customers found"
      />

      {/* View Details Modal */}
      <Modal open={!!selectedCust} title={selectedCust?.name || 'Customer'} onClose={() => setSelectedCust(null)}>
        {selectedCust && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
              <div>
                <span className="text-slate-400">Company:</span>
                <p className="font-semibold text-slate-800">{selectedCust.company || '-'}</p>
              </div>
              <div>
                <span className="text-slate-400">Email:</span>
                <p className="font-semibold text-slate-800">{selectedCust.email}</p>
              </div>
              <div>
                <span className="text-slate-400">Phone:</span>
                <p className="font-semibold text-slate-800">{selectedCust.phone || '-'}</p>
              </div>
              <div>
                <span className="text-slate-400">Tax ID / GST:</span>
                <p className="font-semibold text-slate-800">{selectedCust.taxId || '-'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Billing Address:</span>
                <p className="text-slate-700">
                  {[selectedCust.address, selectedCust.city, selectedCust.state, selectedCust.country]
                    .filter(Boolean)
                    .join(', ') || '-'}
                </p>
              </div>
            </div>

            {detailLoading ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading details…</div>
            ) : (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Recent Subscriptions</h4>
                {selectedCust.subscriptions?.length ? (
                  <div className="space-y-1.5">
                    {selectedCust.subscriptions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded border p-2 text-xs">
                        <span className="font-semibold text-indigo-600">{s.subscriptionNumber}</span>
                        <StatusBadge status={s.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No subscriptions on record</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editCust} title={`Edit ${editCust?.name}`} onClose={() => setEditCust(null)}>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Full Name</label>
            <input
              type="text"
              className="w-full rounded-lg border p-2 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Company</label>
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
            <label className="mb-1 block text-xs font-semibold text-slate-600">Tax ID / GST</label>
            <input
              type="text"
              className="w-full rounded-lg border p-2 text-sm"
              value={form.taxId}
              onChange={(e) => setForm({ ...form, taxId: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <label className="mb-1 block text-xs font-semibold text-slate-600">Address</label>
              <input
                type="text"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setEditCust(null)}
              className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
