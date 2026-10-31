import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Model';

type StaffMember = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export default function Staff() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [saving, setSaving] = useState(false);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/staff');
      const list = res.data?.data || res.data || [];
      setStaffList(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/users/staff', form);
      toast.success('Staff account created successfully');
      setShowCreate(false);
      setForm({ email: '', password: '', firstName: '', lastName: '' });
      loadStaff();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<StaffMember>[] = [
    {
      key: 'name',
      header: 'Staff Name',
      render: (r) => (
        <div>
          <span className="font-semibold text-slate-800">
            {[r.firstName, r.lastName].filter(Boolean).join(' ') || 'Staff Member'}
          </span>
          <div className="text-xs text-slate-400">{r.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (r) => (
        <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
          {r.role}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined On',
      render: (r) => (
        <span className="text-xs text-slate-500">
          {new Date(r.createdAt).toLocaleDateString()}
        </span>
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
          <h1 className="text-xl font-bold text-slate-900">Staff Team</h1>
          <p className="text-sm text-slate-500">Manage internal operator accounts and permissions</p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          + Add Staff Account
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={staffList}
        loading={loading}
        pageSize={50}
        total={staffList.length}
        empty="No staff members registered"
      />

      <Modal open={showCreate} title="Create Staff Account" onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">First Name</label>
              <input
                type="text"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Last Name</label>
              <input
                type="text"
                className="w-full rounded-lg border p-2 text-sm"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Email Address</label>
            <input
              type="email"
              className="w-full rounded-lg border p-2 text-sm"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Password</label>
            <input
              type="password"
              placeholder="Min 8 chars, uppercase, number & symbol"
              className="w-full rounded-lg border p-2 text-sm"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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
              {saving ? 'Creating…' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
