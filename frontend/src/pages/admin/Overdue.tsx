import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';

type LeakageItem = {
  id?: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  subscriptionNumber?: string;
  dueDate: string;
  daysOverdue: number;
  total: number;
  amountPaid: number;
  outstanding: number;
  severity: string;
};

export default function Overdue() {
  const [items, setItems] = useState<LeakageItem[]>([]);
  const [totalLeakage, setTotalLeakage] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leakage');
      // Nipuna's leakage report returns { totalOutstanding, count, invoices: [...] }
      const data = res.data?.data || res.data || {};
      const list = (data.invoices || []).map((inv: any) => ({ ...inv, id: inv.invoiceId }));
      setItems(list);
      setTotalLeakage(Number(data.totalOutstanding) || 0);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: Column<LeakageItem>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (r) => <span className="font-semibold text-red-600">{r.invoiceNumber}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (r) => (
        <div>
          <span className="font-medium text-slate-800">{r.customerName}</span>
          <div className="text-xs text-slate-400">{r.customerEmail}</div>
        </div>
      ),
    },
    {
      key: 'daysOverdue',
      header: 'Overdue By',
      render: (r) => (
        <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
          {r.daysOverdue} days
        </span>
      ),
    },
    {
      key: 'severity',
      header: 'Risk Level',
      render: (r) => <StatusBadge status={r.severity} />,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (r) => (
        <span className="text-xs text-slate-600">
          {new Date(r.dueDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'outstanding',
      header: 'Unpaid Amount',
      align: 'right',
      render: (r) => (
        <span className="font-bold text-red-600">
          ₹{Number(r.outstanding).toLocaleString('en-IN')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Overdue Invoices & Revenue Risk</h1>
          <p className="text-sm text-slate-500">Detect revenue leakage and follow up on delayed client payments</p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-right">
          <span className="text-xs text-red-600">Total Revenue at Risk</span>
          <p className="text-xl font-bold text-red-700">₹{totalLeakage.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        pageSize={50}
        total={items.length}
        empty="No overdue invoices found. All collections are up to date!"
      />
    </div>
  );
}
