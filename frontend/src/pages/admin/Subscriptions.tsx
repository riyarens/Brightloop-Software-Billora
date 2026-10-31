import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { customerApi } from '../../api/customerApi';
import type { Customer } from '../../api/customerApi';
import { errMsg } from '../../api/client';
import { planApi } from '../../api/planApi';
import type { Plan } from '../../api/planApi';
import { productApi } from '../../api/productApi';
import type { Product } from '../../api/productApi';
import { subscriptionApi } from '../../api/subscriptionApi';
import type { Subscription, SubscriptionStatus } from '../../api/subscriptionApi';
import { useAuth } from '../../context/useAuth';

const transitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  DRAFT: ['QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'],
  QUOTATION: ['CONFIRMED', 'CLOSED'],
  CONFIRMED: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['CLOSED'],
  CLOSED: [],
};

export default function Subscriptions() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ customerId: '', planId: '', productId: '', quantity: 1 });
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [editForm, setEditForm] = useState({ paymentTerms: '', autoRenew: true, notes: '' });
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subscriptionResult, customerResult, planResult, productResult] = await Promise.all([
        subscriptionApi.list({ page, limit: 10, search: search || undefined, status: statusFilter || undefined }),
        canManage ? customerApi.list({ page: 1, limit: 100 }) : Promise.resolve({ items: [], pagination: undefined }),
        canManage ? planApi.list({ page: 1, limit: 100 }) : Promise.resolve({ items: [], pagination: undefined }),
        canManage ? productApi.getAll({ page: 1, limit: 100 }) : Promise.resolve({ products: [], pagination: undefined }),
      ]);
      setSubscriptions(subscriptionResult.items);
      setTotal(subscriptionResult.pagination?.total ?? subscriptionResult.items.length);
      setCustomers(customerResult.items);
      setPlans(planResult.items);
      setProducts(productResult.products);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setLoading(false);
    }
  }, [canManage, page, search, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !createForm.customerId || !createForm.planId || !createForm.productId) return;
    setSaving(true);
    try {
      await subscriptionApi.create({
        customerId: createForm.customerId,
        planId: createForm.planId,
        lines: [{ productId: createForm.productId, quantity: createForm.quantity }],
      });
      toast.success('Subscription created');
      setShowCreate(false);
      setCreateForm({ customerId: '', planId: '', productId: '', quantity: 1 });
      await load();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (subscription: Subscription) => {
    setEditing(subscription);
    setEditForm({
      paymentTerms: subscription.paymentTerms ?? '',
      autoRenew: subscription.autoRenew ?? true,
      notes: subscription.notes ?? '',
    });
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || updating) return;
    setUpdating(true);
    try {
      await subscriptionApi.update(editing.id, editForm);
      toast.success('Subscription updated');
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setUpdating(false);
    }
  };

  const runAction = async (subscription: Subscription, action: string) => {
    try {
      if (action === 'pause') await subscriptionApi.pause(subscription.id);
      else if (action === 'resume') await subscriptionApi.resume(subscription.id);
      else if (action === 'renew') await subscriptionApi.renew(subscription.id);
      else if (action === 'close') {
        if (!window.confirm(`Close subscription ${subscription.subscriptionNumber}?`)) return;
        await subscriptionApi.close(subscription.id);
      } else {
        await subscriptionApi.updateStatus(subscription.id, action as SubscriptionStatus);
      }
      toast.success('Subscription updated');
      await load();
    } catch (error) {
      toast.error(errMsg(error));
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Subscriptions</h1><p className="text-sm text-slate-500">{canManage ? 'Manage subscriptions and their lifecycle.' : 'Your subscriptions and current status.'}</p></div>
        <div className="flex flex-wrap gap-2">
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search number or customer" className="rounded border px-3 py-2 text-sm" />
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as SubscriptionStatus | ''); setPage(1); }} className="rounded border px-3 py-2 text-sm"><option value="">All statuses</option>{Object.keys(transitions).map((status) => <option key={status}>{status}</option>)}</select>
          {canManage && <button onClick={() => setShowCreate((value) => !value)} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white">{showCreate ? 'Cancel' : 'New subscription'}</button>}
        </div>
      </header>

      {showCreate && canManage && <form onSubmit={create} className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <h2 className="font-semibold sm:col-span-2 lg:col-span-4">Create subscription</h2>
        <select required value={createForm.customerId} onChange={(event) => setCreateForm({ ...createForm, customerId: event.target.value })} className="rounded border px-3 py-2 text-sm"><option value="">Choose customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} ({customer.email})</option>)}</select>
        <select required value={createForm.planId} onChange={(event) => setCreateForm({ ...createForm, planId: event.target.value })} className="rounded border px-3 py-2 text-sm"><option value="">Choose plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select>
        <select required value={createForm.productId} onChange={(event) => setCreateForm({ ...createForm, productId: event.target.value })} className="rounded border px-3 py-2 text-sm"><option value="">Choose product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
        <input required type="number" min="1" value={createForm.quantity} onChange={(event) => setCreateForm({ ...createForm, quantity: Number(event.target.value) })} className="rounded border px-3 py-2 text-sm" aria-label="Quantity" />
        <button disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Creating…' : 'Create subscription'}</button>
      </form>}

      <div className="overflow-x-auto rounded-xl border bg-white">
        {loading ? <p className="p-8 text-center text-slate-500">Loading subscriptions…</p> : subscriptions.length === 0 ? <p className="p-8 text-center text-slate-500">No subscriptions found.</p> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Subscription</th>{canManage && <th className="p-3">Customer</th>}<th className="p-3">Plan</th><th className="p-3">Status</th><th className="p-3">Products</th><th className="p-3">Lifecycle</th></tr></thead>
            <tbody className="divide-y">{subscriptions.map((subscription) => {
              const nextStatuses = transitions[subscription.status] ?? [];
              const isPaused = subscription.isPaused;
              return <tr key={subscription.id} className="align-top">
                <td className="p-3 font-medium">{subscription.subscriptionNumber}</td>
                {canManage && <td className="p-3">{subscription.customer?.name ?? '—'}</td>}
                <td className="p-3">{subscription.plan?.name ?? '—'}</td>
                <td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{subscription.status}{isPaused ? ' · paused' : ''}</span></td>
                <td className="p-3">{subscription.lines?.map((line) => `${line.product.name} × ${line.quantity}`).join(', ') || '—'}</td>
                <td className="p-3"><div className="flex flex-wrap gap-2">
                  {canManage && <button onClick={() => startEdit(subscription)} className="text-xs text-indigo-600">Edit</button>}
                  {canManage && nextStatuses.map((status) => <button key={status} onClick={() => void runAction(subscription, status)} className="text-xs text-indigo-600">{status}</button>)}
                  {subscription.status === 'ACTIVE' && (isPaused ? <button onClick={() => void runAction(subscription, 'resume')} className="text-xs text-indigo-600">Resume</button> : <button onClick={() => void runAction(subscription, 'pause')} className="text-xs text-indigo-600">Pause</button>)}
                  {canManage && (subscription.status === 'ACTIVE' || subscription.status === 'CONFIRMED') && <button onClick={() => void runAction(subscription, 'renew')} className="text-xs text-indigo-600">Renew</button>}
                  {!canManage && subscription.status === 'ACTIVE' && !isPaused && <button onClick={() => void runAction(subscription, 'pause')} className="text-xs text-indigo-600">Pause</button>}
                  {!canManage && isPaused && <button onClick={() => void runAction(subscription, 'resume')} className="text-xs text-indigo-600">Resume</button>}
                </div></td>
              </tr>;
            })}</tbody>
          </table>
        )}
        <div className="flex items-center justify-between border-t p-3 text-sm text-slate-500"><span>{total} subscriptions</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button><span>{page} / {Math.max(1, Math.ceil(total / 10))}</span><button disabled={page >= Math.ceil(total / 10)} onClick={() => setPage((value) => value + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button></div></div>
      </div>

      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <form onSubmit={saveEdit} className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-xl">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Edit {editing.subscriptionNumber}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Close" className="text-xl text-slate-400">×</button></div>
          <label className="block text-sm">Payment terms<input value={editForm.paymentTerms} onChange={(event) => setEditForm({ ...editForm, paymentTerms: event.target.value })} className="mt-1 w-full rounded border px-3 py-2" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editForm.autoRenew} onChange={(event) => setEditForm({ ...editForm, autoRenew: event.target.checked })} /> Automatically renew</label>
          <label className="block text-sm">Notes<textarea value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} className="mt-1 w-full rounded border px-3 py-2" rows={3} /></label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded border px-4 py-2 text-sm">Cancel</button><button disabled={updating} className="rounded bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">{updating ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      </div>}
    </section>
  );
}
