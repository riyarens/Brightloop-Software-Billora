import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { customerApi } from '../../api/customerApi';
import { errMsg } from '../../api/client';
import { planApi } from '../../api/planApi';
import { productApi } from '../../api/productApi';
import { subscriptionApi } from '../../api/subscriptionApi';
import StatCard from '../../components/StatCard';

type Summary = {
  customers: number;
  plans: number;
  products: number;
  subscriptions: number;
};

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [customers, plans, products, subscriptions] = await Promise.all([
        customerApi.list({ page: 1, limit: 1 }),
        planApi.list({ page: 1, limit: 1 }),
        productApi.getAll({ page: 1, limit: 1 }),
        subscriptionApi.list({ page: 1, limit: 1 }),
      ]);
      setSummary({
        customers: customers.pagination?.total ?? customers.items.length,
        plans: plans.pagination?.total ?? plans.items.length,
        products: products.pagination?.total ?? products.products.length,
        subscriptions: subscriptions.pagination?.total ?? subscriptions.items.length,
      });
    } catch (error) {
      toast.error(errMsg(error));
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Overview</h1><p className="text-sm text-slate-500">Live counts from the BILLORA API.</p></div>
        <button onClick={() => void load()} disabled={loading} className="rounded border bg-white px-3 py-2 text-sm disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh'}</button>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={loading ? '…' : summary?.customers ?? '—'} tone="indigo" />
        <StatCard label="Active plans" value={loading ? '…' : summary?.plans ?? '—'} tone="green" />
        <StatCard label="Active products" value={loading ? '…' : summary?.products ?? '—'} tone="amber" />
        <StatCard label="Subscriptions" value={loading ? '…' : summary?.subscriptions ?? '—'} tone="slate" />
      </div>
      {!loading && !summary && <p role="status" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Dashboard data could not be loaded. Check the API connection and your account permissions, then retry.</p>}
      <p className="text-xs text-slate-400">Revenue and payment analytics will be available when their reporting endpoints are provided by the backend.</p>
    </section>
  );
}
