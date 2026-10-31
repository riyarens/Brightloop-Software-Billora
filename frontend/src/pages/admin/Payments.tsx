import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Model';
import { useAuth } from '../../context/AuthContext';

type Payment = {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  transactionReference?: string;
  status: string;
  note?: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
    amountPaid: number;
    customer?: { name: string };
  };
};

export default function Payments() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Record Payment Modal
  const [showRecord, setShowRecord] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payments', {
        params: { page, limit: 10 },
      });
      const list = res.data?.payments || res.data?.data || [];
      const totalCount = res.data?.pagination?.total || res.data?.meta?.total || list.length;
      setPayments(list);
      setTotal(totalCount);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [page]);

  const openRecordModal = async () => {
    try {
      const res = await api.get('/invoices', { params: { limit: 50 } });
      const list = res.data?.invoices || res.data?.data || [];
      const unpaid = list.filter((inv: any) => Number(inv.amountPaid) < Number(inv.total));
      setInvoices(unpaid);
      if (unpaid[0]) {
        setSelectedInvoiceId(unpaid[0].id);
        setAmount(Number(unpaid[0].total) - Number(unpaid[0].amountPaid));
      }
      setShowRecord(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      setAmount(Number(inv.total) - Number(inv.amountPaid));
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || amount <= 0) {
      toast.error('Please select an invoice and enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/payments', {
        invoiceId: selectedInvoiceId,
        amount: Number(amount),
        paymentMethod,
        transactionReference: reference || undefined,
        note: note || undefined,
      });

      toast.success('Payment recorded successfully');
      setShowRecord(false);
      setReference('');
      setNote('');
      loadPayments();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Payment>[] = [
    {
      key: 'paymentNumber',
      header: 'Payment #',
      render: (r) => <span className="font-semibold text-indigo-600">{r.paymentNumber}</span>,
    },
    {
      key: 'invoice',
      header: 'Invoice #',
      render: (r) => (
        <div>
          <span className="font-medium text-slate-800">{r.invoice?.invoiceNumber || '-'}</span>
          {r.invoice?.customer?.name && (
            <div className="text-xs text-slate-400">{r.invoice.customer.name}</div>
          )}
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (r) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
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
      header: 'Reference',
      render: (r) => (
        <span className="text-xs text-slate-500 font-mono">
          {r.transactionReference || '-'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (r) => (
        <span className="font-semibold text-emerald-600">
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500">View payment transactions and record customer collections</p>
        </div>

        {!isCustomer && (
          <button
            onClick={openRecordModal}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            + Record Payment
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={payments}
        loading={loading}
        page={page}
        pageSize={10}
        total={total}
        onPage={setPage}
        empty="No payments recorded yet"
      />

      {/* Record Payment Modal */}
      <Modal open={showRecord} title="Record Payment" onClose={() => setShowRecord(false)}>
        <form onSubmit={handleRecordPayment} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Select Invoice</label>
            <select
              className="w-full rounded-lg border p-2 text-sm"
              value={selectedInvoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              required
            >
              {invoices.length === 0 ? (
                <option value="">No unpaid invoices found</option>
              ) : (
                invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} - {inv.customer?.name} (Unpaid: ₹
                    {(Number(inv.total) - Number(inv.amountPaid)).toLocaleString('en-IN')})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Amount (₹)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                className="w-full rounded-lg border p-2 text-sm"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Payment Method</label>
              <select
                className="w-full rounded-lg border p-2 text-sm"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="UPI">UPI / Net Banking</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="STRIPE">Stripe</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Transaction Reference</label>
            <input
              type="text"
              placeholder="e.g. TXN-123456789"
              className="w-full rounded-lg border p-2 text-sm font-mono"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Notes</label>
            <input
              type="text"
              placeholder="e.g. Cleared via HDFC Bank"
              className="w-full rounded-lg border p-2 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowRecord(false)}
              className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || invoices.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
