import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';

type Payment = {
  id: string;
  paymentNumber: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  transactionReference?: string;
  status: string;
  invoice?: {
    invoiceNumber: string;
  };
};

export default function MyPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payments');
      const list = res.data?.payments || res.data?.data || [];
      setPayments(list);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const columns: Column<Payment>[] = [
    {
      key: 'paymentNumber',
      header: 'Receipt #',
      render: (r) => <span className="font-semibold text-indigo-600">{r.paymentNumber}</span>,
    },
    {
      key: 'invoice',
      header: 'Settled Invoice',
      render: (r) => <span className="font-medium text-slate-800">{r.invoice?.invoiceNumber || '-'}</span>,
    },
    {
      key: 'method',
      header: 'Payment Method',
      render: (r) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          {r.paymentMethod.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (r) => (
        <span className="text-xs text-slate-600">
          {new Date(r.paymentDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'ref',
      header: 'Transaction ID',
      render: (r) => (
        <span className="text-xs font-mono text-slate-500">
          {r.transactionReference || '-'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount Paid',
      align: 'right',
      render: (r) => (
        <span className="font-bold text-emerald-600">
          ₹{Number(r.amount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Payment History</h1>
        <p className="text-sm text-slate-500">Official receipt logs and payment confirmation references</p>
      </div>

      <DataTable
        columns={columns}
        rows={payments}
        loading={loading}
        pageSize={50}
        total={payments.length}
        empty="No payments on record yet"
      />
    </div>
  );
}
