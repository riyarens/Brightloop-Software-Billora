import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';

export default function StaffDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentSubs, setRecentSubs] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOperationalData = async () => {
    setLoading(true);
    try {
      const [repRes, subRes, invRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/subscriptions', { params: { limit: 5 } }),
        api.get('/invoices', { params: { limit: 5 } }),
      ]);

      setStats(repRes.data?.stats || null);
      setRecentSubs(subRes.data?.data || []);
      const invList = invRes.data?.invoices || invRes.data?.data || [];
      setRecentInvoices(invList);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperationalData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Staff Operations Hub</h1>
          <p className="text-sm text-slate-500">Daily subscription fulfillment, billing follow-ups and payments</p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/staff/subscriptions"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-700"
          >
            + New Subscription
          </Link>
          <Link
            to="/staff/payments"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Record Payment
          </Link>
        </div>
      </div>

      {/* Operational Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active Subscriptions"
          value={loading ? '…' : stats?.activeSubscriptions ?? 0}
          tone="indigo"
          hint="Across all clients"
        />
        <StatCard
          label="Total Collected"
          value={loading ? '…' : `₹${(stats?.totalPayments ?? 0).toLocaleString('en-IN')}`}
          tone="green"
        />
        <StatCard
          label="Outstanding Balance"
          value={loading ? '…' : `₹${(stats?.outstanding ?? 0).toLocaleString('en-IN')}`}
          tone="amber"
          hint="Unpaid invoices"
        />
        <StatCard
          label="Overdue Invoices"
          value={loading ? '…' : stats?.overdueInvoices ?? 0}
          tone="red"
          hint="Require immediate follow-up"
        />
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Link
          to="/staff/customers"
          className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Directory</span>
          <span className="mt-1 text-sm font-bold text-slate-800">Customer Accounts →</span>
          <span className="mt-2 text-xs text-slate-500">Lookup contact details, GST and active plans</span>
        </Link>

        <Link
          to="/staff/subscriptions"
          className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lifecycle</span>
          <span className="mt-1 text-sm font-bold text-slate-800">Manage Subscriptions →</span>
          <span className="mt-2 text-xs text-slate-500">Pause, resume, renew or configure add-ons</span>
        </Link>

        <Link
          to="/staff/invoices"
          className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Billing</span>
          <span className="mt-1 text-sm font-bold text-slate-800">Invoice Registry →</span>
          <span className="mt-2 text-xs text-slate-500">Check issue dates, dues and payment statuses</span>
        </Link>

        <Link
          to="/staff/overdue"
          className="flex flex-col rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm transition hover:border-red-300 hover:shadow"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-red-500">Revenue Risk</span>
          <span className="mt-1 text-sm font-bold text-red-700">Overdue Tracking →</span>
          <span className="mt-2 text-xs text-red-600">Review accounts with past-due balances</span>
        </Link>
      </div>

      {/* Operations Tables Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Subscriptions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Recent Subscriptions</h3>
            <Link to="/staff/subscriptions" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentSubs.length === 0 ? (
              <p className="text-xs text-slate-400">No subscriptions found</p>
            ) : (
              recentSubs.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between rounded-lg border p-3 text-xs">
                  <div>
                    <span className="font-semibold text-indigo-600">{sub.subscriptionNumber}</span>
                    <p className="font-medium text-slate-800">{sub.customer?.name}</p>
                    <p className="text-slate-400">{sub.plan?.name}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={sub.isPaused ? 'PAUSED' : sub.status} />
                    <p className="mt-1 text-slate-500">
                      {sub.nextBillingDate ? `Due ${new Date(sub.nextBillingDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Recent Invoices</h3>
            <Link to="/staff/invoices" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentInvoices.length === 0 ? (
              <p className="text-xs text-slate-400">No invoices found</p>
            ) : (
              recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{inv.invoiceNumber}</span>
                    <p className="text-slate-500">{inv.customer?.name}</p>
                    <p className="text-slate-400">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={inv.status} />
                    <p className="mt-1 font-semibold text-slate-900">₹{Number(inv.total).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

