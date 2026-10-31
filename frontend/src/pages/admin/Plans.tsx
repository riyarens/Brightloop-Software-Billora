import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { errMsg } from '../../api/client';
import { planApi } from '../../api/planApi';
import type { BillingPeriod, Plan, PlanInput, PlanProduct } from '../../api/planApi';
import { productApi } from '../../api/productApi';
import type { Product } from '../../api/productApi';
import { useAuth } from '../../context/useAuth';

const periods: BillingPeriod[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const initialForm: PlanInput = {
  name: '',
  code: '',
  description: '',
  billingPeriod: 'MONTHLY',
  billingInterval: 1,
  price: 0,
  minQuantity: 1,
};

export default function Plans() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<PlanInput>({ ...initialForm });
  const [editing, setEditing] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [updatingProduct, setUpdatingProduct] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [planResult, productResult] = await Promise.all([
        planApi.list({ search: search || undefined, page: 1, limit: 100 }),
        productApi.getAll({ page: 1, limit: 100 }),
      ]);
      setPlans(planResult.items);
      setProducts(productResult.products);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const resetForm = () => {
    setForm({ ...initialForm });
    setEditing(null);
  };

  const savePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        code: form.code?.trim() || undefined,
        description: form.description?.trim() || undefined,
      };
      if (editing) {
        await planApi.update(editing.id, payload);
        toast.success('Plan updated');
      } else {
        await planApi.create(payload);
        toast.success('Plan created');
      }
      resetForm();
      await load();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      code: plan.code ?? '',
      description: plan.description ?? '',
      billingPeriod: plan.billingPeriod,
      billingInterval: plan.billingInterval,
      price: Number(plan.price),
      minQuantity: plan.minQuantity,
    });
  };

  const deactivate = async (plan: Plan) => {
    if (!window.confirm(`Deactivate plan "${plan.name}"?`)) return;
    try {
      await planApi.deactivate(plan.id);
      toast.success('Plan deactivated');
      await load();
    } catch (error) {
      toast.error(errMsg(error));
    }
  };

  const addProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPlan || !productId) return;
    const formData = new FormData(event.currentTarget);
    try {
      await planApi.addProduct(selectedPlan, {
        productId,
        defaultQuantity: quantity,
        isMandatory: formData.get('isMandatory') === 'on',
      });
      toast.success('Product added to plan');
      setProductId('');
      setQuantity(1);
      await load();
    } catch (error) {
      toast.error(errMsg(error));
    }
  };

  const updatePlanProduct = async (
    event: FormEvent<HTMLFormElement>,
    planId: string,
    link: PlanProduct,
  ) => {
    event.preventDefault();
    if (updatingProduct === link.id) return;
    const formData = new FormData(event.currentTarget);
    const defaultQuantity = Number(formData.get('defaultQuantity'));
    if (!Number.isInteger(defaultQuantity) || defaultQuantity < 1) {
      toast.error('Quantity must be a positive whole number.');
      return;
    }

    setUpdatingProduct(link.id);
    try {
      await planApi.updateProduct(planId, link.productId, {
        defaultQuantity,
        isMandatory: formData.get('isMandatory') === 'on',
      });
      toast.success('Plan product updated');
      await load();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setUpdatingProduct(null);
    }
  };

  const removeProduct = async (planId: string, attachedProductId: string) => {
    if (!window.confirm('Remove this product from the plan?')) return;
    try {
      await planApi.removeProduct(planId, attachedProductId);
      toast.success('Product removed from plan');
      await load();
    } catch (error) {
      toast.error(errMsg(error));
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Plans</h1><p className="text-sm text-slate-500">Manage billing plans and included products.</p></div>
        <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="flex gap-2">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plans" className="rounded border px-3 py-2 text-sm" />
          <button className="rounded border px-3 py-2 text-sm">Search</button>
        </form>
      </header>

      {isAdmin && (
        <form onSubmit={savePlan} className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <h2 className="font-semibold sm:col-span-2 lg:col-span-4">{editing ? 'Edit plan' : 'Create plan'}</h2>
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Plan name" className="rounded border px-3 py-2 text-sm" />
          <input value={form.code ?? ''} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="Plan code (optional)" className="rounded border px-3 py-2 text-sm" />
          <select value={form.billingPeriod} onChange={(event) => setForm({ ...form, billingPeriod: event.target.value as BillingPeriod })} className="rounded border px-3 py-2 text-sm">{periods.map((period) => <option key={period}>{period}</option>)}</select>
          <input required type="number" min="1" value={form.billingInterval} onChange={(event) => setForm({ ...form, billingInterval: Number(event.target.value) })} placeholder="Billing interval" className="rounded border px-3 py-2 text-sm" />
          <input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} placeholder="Price" className="rounded border px-3 py-2 text-sm" />
          <input required type="number" min="1" value={form.minQuantity} onChange={(event) => setForm({ ...form, minQuantity: Number(event.target.value) })} placeholder="Minimum quantity" className="rounded border px-3 py-2 text-sm" />
          <input value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description (optional)" className="rounded border px-3 py-2 text-sm sm:col-span-2" />
          <div className="flex gap-2">
            <button disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save changes' : 'Create plan'}</button>
            {editing && <button type="button" onClick={resetForm} className="rounded border px-4 py-2 text-sm">Cancel</button>}
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white">
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading plans…</p> : plans.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No active plans found.</p> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Plan</th><th className="p-3">Billing</th><th className="p-3 text-right">Price</th><th className="p-3">Products</th>{isAdmin && <th className="p-3">Actions</th>}</tr></thead>
            <tbody className="divide-y">
              {plans.map((plan) => (
                <tr key={plan.id} className="align-top">
                  <td className="p-3"><strong>{plan.name}</strong><div className="text-xs text-slate-500">{plan.code || 'No code'} · min qty {plan.minQuantity}</div></td>
                  <td className="p-3">{plan.billingInterval} × {plan.billingPeriod.toLowerCase()}</td>
                  <td className="p-3 text-right">₹{Number(plan.price).toLocaleString('en-IN')}</td>
                  <td className="p-3">
                    <button className="text-indigo-600" onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}>{plan.planProducts?.length ?? 0} attached · {selectedPlan === plan.id ? 'Hide' : 'Manage'}</button>
                    {selectedPlan === plan.id && (
                      <div className="mt-2 min-w-64 space-y-2">
                        {plan.planProducts?.map((link) => <form key={link.productId} onSubmit={(event) => void updatePlanProduct(event, plan.id, link)} className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="min-w-24 flex-1">{link.product?.name ?? link.productId}</span>
                          {isAdmin && <>
                            <input name="defaultQuantity" aria-label={`${link.product?.name ?? 'Product'} quantity`} type="number" min="1" defaultValue={link.defaultQuantity} className="w-16 rounded border p-1" />
                            <label className="flex items-center gap-1"><input name="isMandatory" type="checkbox" defaultChecked={link.isMandatory} /> Required</label>
                            <button disabled={updatingProduct === link.id} className="text-indigo-600 disabled:opacity-50">{updatingProduct === link.id ? 'Saving…' : 'Save'}</button>
                            <button type="button" onClick={() => void removeProduct(plan.id, link.productId)} className="text-red-600">Remove</button>
                          </>}
                        </form>)}
                        {isAdmin && <form onSubmit={addProduct} className="flex gap-1">
                          <select required value={productId} onChange={(event) => setProductId(event.target.value)} className="min-w-0 flex-1 rounded border p-1 text-xs">
                            <option value="">Choose product</option>
                            {products.filter((product) => !plan.planProducts?.some((link) => link.productId === product.id)).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                          </select>
                          <input aria-label="Default quantity" type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="w-14 rounded border p-1 text-xs" />
                          <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="isMandatory" /> Required</label>
                          <button disabled={!productId} className="rounded bg-indigo-600 px-2 text-xs text-white">Add</button>
                        </form>}
                      </div>
                    )}
                  </td>
                  {isAdmin && <td className="whitespace-nowrap p-3"><button onClick={() => startEdit(plan)} className="mr-3 text-indigo-600">Edit</button><button onClick={() => void deactivate(plan)} className="text-red-600">Deactivate</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
