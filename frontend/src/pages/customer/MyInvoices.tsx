import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Model';

type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  status: string;
  lines?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
};

export default function MyInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices');
      const list = res.data?.invoices || res.data?.data || [];
      setInvoices(list);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const openDetails = async (inv: Invoice) => {
    setSelectedInv(inv);
    try {
      const res = await api.get(`/invoices/${inv.id}`);
      setSelectedInv(res.data?.data || res.data || inv);
    } catch (e) {
      // Keep existing data
    }
  };

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (r) => (
        <button
          onClick={() => openDetails(r)}
          className="font-medium text-indigo-600 hover:underline"
        >
          {r.invoiceNumber}
        </button>
      ),
    },
    {
      key: 'invoiceDate',
      header: 'Invoice Date',
      render: (r) => (
        <span className="text-xs text-slate-600">
          {new Date(r.invoiceDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (r) => {
        const isOverdue = new Date(r.dueDate) < new Date() && Number(r.amountPaid) < Number(r.total);
        return (
          <span className={`text-xs ${isOverdue ? 'font-semibold text-red-600' : 'text-slate-600'}`}>
            {new Date(r.dueDate).toLocaleDateString()}
            {isOverdue && ' (Overdue)'}
          </span>
        );
      },
    },
    {
      key: 'total',
      header: 'Amount',
      align: 'right',
      render: (r) => (
        <span className="font-semibold text-slate-900">
          ₹{Number(r.total).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'amountPaid',
      header: 'Paid',
      align: 'right',
      render: (r) => (
        <span className="text-xs font-semibold text-emerald-600">
          ₹{Number(r.amountPaid).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <button
          onClick={() => openDetails(r)}
          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          View Invoice
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Invoices</h1>
        <p className="text-sm text-slate-500">View billing statements, due dates and receipt status</p>
      </div>

      <DataTable
        columns={columns}
        rows={invoices}
        loading={loading}
        pageSize={50}
        total={invoices.length}
        empty="No invoices found on your account"
      />

      {/* Invoice Details Modal */}
      <Modal open={!!selectedInv} title={`Invoice ${selectedInv?.invoiceNumber}`} onClose={() => setSelectedInv(null)}>
        {selectedInv && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
              <div>
                <span className="text-slate-400">Invoice Date:</span>
                <p className="font-semibold text-slate-800">{new Date(selectedInv.invoiceDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-slate-400">Payment Due:</span>
                <p className="font-semibold text-slate-800">{new Date(selectedInv.dueDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <div className="mt-0.5">
                  <StatusBadge status={selectedInv.status} />
                </div>
              </div>
              <div>
                <span className="text-slate-400">Total Billed:</span>
                <p className="font-bold text-indigo-600">₹{Number(selectedInv.total).toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Charges</h4>
              <div className="space-y-2">
                {selectedInv.lines?.map((line) => (
                  <div key={line.id} className="flex justify-between rounded border p-2 text-xs">
                    <div>
                      <p className="font-medium text-slate-800">{line.description}</p>
                      <p className="text-slate-400">Qty: {line.quantity} × ₹{Number(line.unitPrice).toLocaleString('en-IN')}</p>
                    </div>
                    <span className="font-semibold text-slate-900">₹{Number(line.total).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-right text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>₹{Number(selectedInv.subtotal).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax:</span>
                <span>₹{Number(selectedInv.taxAmount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold text-slate-900">
                <span>Total:</span>
                <span>₹{Number(selectedInv.total).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-600">
                <span>Amount Paid:</span>
                <span>₹{Number(selectedInv.amountPaid).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-red-600">
                <span>Outstanding:</span>
                <span>₹{(Number(selectedInv.total) - Number(selectedInv.amountPaid)).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedInv(null)}
                className="rounded-lg border px-4 py-2 text-xs text-slate-600 hover:bg-slate-100"
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
