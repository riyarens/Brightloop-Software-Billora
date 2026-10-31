import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';

import {
  productApi,
  type Product,
  type ProductType,
  type ProductInput,
  type ProductVariant,
  type VariantInput,
} from '../../api/productApi';

import { errMsg } from '../../api/client';
import { useAuth } from '../../context/useAuth';

const PRODUCT_TYPES: ProductType[] = [
  'SERVICE',
  'GOODS',
  'DIGITAL',
];

const emptyForm: ProductInput = {
  name: '',
  code: '',
  description: '',
  type: 'SERVICE',
  salesPrice: 0,
  costPrice: 0,
  notes: '',
};

const emptyVariantForm: VariantInput = {
  brand: '',
  name: '',
  extraPrice: 0,
  sku: '',
};

export default function Products() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [form, setForm] = useState<ProductInput>({
    ...emptyForm,
  });

  const [saving, setSaving] = useState(false);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantForm, setVariantForm] = useState<VariantInput>({ ...emptyVariantForm });
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantSaving, setVariantSaving] = useState(false);

  // Load products
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);

      const result = await productApi.getAll({
        search: search || undefined,
        type: type
          ? (type as ProductType)
          : undefined,
        page,
        limit: 10,
      });

      setProducts(result.products ?? []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setLoading(false);
    }
  }, [page, search, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  // Open create form
  const openCreateForm = () => {
    setEditingProduct(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  // Open edit form
  const openEditForm = (product: Product) => {
    setEditingProduct(product);

    setForm({
      name: product.name,
      code: product.code ?? '',
      description: product.description ?? '',
      type: product.type,
      salesPrice: Number(product.salesPrice),
      costPrice: Number(product.costPrice),
      notes: product.notes ?? '',
    });

    setShowForm(true);
  };

  // Create or update product
  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (
      form.salesPrice < 0 ||
      (form.costPrice ?? 0) < 0
    ) {
      toast.error('Prices cannot be negative');
      return;
    }

    try {
      setSaving(true);

      const payload: ProductInput = {
        ...form,
        name: form.name.trim(),
        code: form.code?.trim() || undefined,
        description: form.description?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };

      if (editingProduct) {
        await productApi.update(
          editingProduct.id,
          payload
        );

        toast.success('Product updated successfully');
      } else {
        await productApi.create(payload);

        toast.success('Product created successfully');
      }

      setShowForm(false);
      setEditingProduct(null);
      setForm({ ...emptyForm });

      await loadProducts();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSaving(false);
    }
  };

  // Deactivate product
  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${product.name}"?`
    );

    if (!confirmed) return;

    try {
      await productApi.delete(product.id);

      toast.success('Product deactivated successfully');

      await loadProducts();
    } catch (error) {
      toast.error(errMsg(error));
    }
  };

  const loadVariants = async (product: Product) => {
    setVariantProduct(product);
    setVariantsLoading(true);
    try {
      setVariants(await productApi.getVariants(product.id));
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setVariantsLoading(false);
    }
  };

  const openVariantForm = (variant?: ProductVariant) => {
    setEditingVariant(variant ?? null);
    setVariantForm(variant
      ? {
          brand: variant.brand,
          name: variant.name ?? '',
          extraPrice: Number(variant.extraPrice),
          sku: variant.sku ?? '',
        }
      : { ...emptyVariantForm });
  };

  const saveVariant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!variantProduct || variantSaving) return;
    setVariantSaving(true);
    try {
      const payload = {
        ...variantForm,
        brand: variantForm.brand.trim(),
        name: variantForm.name?.trim() || undefined,
        sku: variantForm.sku?.trim() || undefined,
      };
      if (editingVariant) {
        await productApi.updateVariant(editingVariant.id, payload);
        toast.success('Variant updated');
      } else {
        await productApi.createVariant(variantProduct.id, payload);
        toast.success('Variant created');
      }
      openVariantForm();
      await loadVariants(variantProduct);
      await loadProducts();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setVariantSaving(false);
    }
  };

  const deactivateVariant = async (variant: ProductVariant) => {
    if (!window.confirm(`Deactivate ${variant.brand}${variant.name ? ` - ${variant.name}` : ''}?`)) return;
    try {
      await productApi.deleteVariant(variant.id);
      toast.success('Variant deactivated');
      if (variantProduct) await loadVariants(variantProduct);
      await loadProducts();
    } catch (error) {
      toast.error(errMsg(error));
    }
  };

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Products
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your products and services.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateForm}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Add Product
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">

        <input
          type="text"
          placeholder="Search by product name or code..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="min-w-60 flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-500"
        />

        <select
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">All Types</option>

          {PRODUCT_TYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">
            Product List
          </h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-slate-700">
              No products found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or add a new product.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Sales Price</th>
                  <th className="px-5 py-3">Cost Price</th>
                  <th className="px-5 py-3">Variants</th>
                  <th className="px-5 py-3">Variant details</th>

                  {isAdmin && (
                    <th className="px-5 py-3">Actions</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">
                        {product.name}
                      </div>

                      <div className="mt-1 max-w-xs truncate text-xs text-slate-400">
                        {product.description || 'No description'}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {product.code || '—'}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                        {product.type}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-700">
                      ₹{Number(product.salesPrice).toLocaleString('en-IN')}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      ₹{Number(product.costPrice).toLocaleString('en-IN')}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {product.variants?.length ?? 0}
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() => void loadVariants(product)}
                        className="font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Manage variants
                      </button>
                    </td>

                    {isAdmin && (
                      <td className="px-5 py-4">
                        <div className="flex gap-3">

                          <button
                            onClick={() => openEditForm(product)}
                            className="font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(product)}
                            className="font-medium text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>

                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">

          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>

          <div className="flex gap-2">

            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Previous
            </button>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next
            </button>

          </div>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">

          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>

              <button
                onClick={() => setShowForm(false)}
                className="text-xl text-slate-400 hover:text-slate-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="grid gap-4 sm:grid-cols-2">

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Product Name *
                  </label>

                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Product Code
                  </label>

                  <input
                    value={form.code ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, code: e.target.value })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Product Type
                  </label>

                  <select
                    value={form.type ?? 'SERVICE'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value as ProductType,
                      })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    {PRODUCT_TYPES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Sales Price (₹) *
                  </label>

                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.salesPrice}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        salesPrice: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Cost Price (₹)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.costPrice ?? 0}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        costPrice: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">
                    Description
                  </label>

                  <textarea
                    rows={2}
                    value={form.description ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        description: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">
                    Notes
                  </label>

                  <textarea
                    rows={2}
                    value={form.notes ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        notes: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-3 border-t pt-4">

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editingProduct
                      ? 'Update Product'
                      : 'Create Product'}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {variantProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Product variants</h2>
                <p className="text-sm text-slate-500">{variantProduct.name}</p>
              </div>
              <button onClick={() => setVariantProduct(null)} className="text-xl text-slate-400" aria-label="Close">×</button>
            </div>

            {isAdmin && (
              <form onSubmit={saveVariant} className="mb-5 grid gap-2 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                <input required placeholder="Brand" value={variantForm.brand} onChange={(event) => setVariantForm({ ...variantForm, brand: event.target.value })} className="rounded border px-3 py-2 text-sm" />
                <input placeholder="Variant name" value={variantForm.name ?? ''} onChange={(event) => setVariantForm({ ...variantForm, name: event.target.value })} className="rounded border px-3 py-2 text-sm" />
                <input required type="number" min="0" step="0.01" placeholder="Extra price" value={variantForm.extraPrice ?? 0} onChange={(event) => setVariantForm({ ...variantForm, extraPrice: Number(event.target.value) })} className="rounded border px-3 py-2 text-sm" />
                <input placeholder="SKU" value={variantForm.sku ?? ''} onChange={(event) => setVariantForm({ ...variantForm, sku: event.target.value })} className="rounded border px-3 py-2 text-sm" />
                <div className="flex gap-2 sm:col-span-2">
                  <button disabled={variantSaving} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                    {variantSaving ? 'Saving…' : editingVariant ? 'Update variant' : 'Add variant'}
                  </button>
                  {editingVariant && <button type="button" onClick={() => openVariantForm()} className="rounded border px-4 py-2 text-sm">Cancel edit</button>}
                </div>
              </form>
            )}

            {variantsLoading ? <p className="py-5 text-center text-sm text-slate-500">Loading variants…</p> : variants.length === 0 ? (
              <p className="py-5 text-center text-sm text-slate-500">No active variants for this product.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Brand / Name</th><th className="py-2">SKU</th><th className="py-2 text-right">Extra price</th>{isAdmin && <th className="py-2">Actions</th>}</tr></thead>
                  <tbody>{variants.map((variant) => (
                    <tr key={variant.id} className="border-b last:border-0">
                      <td className="py-3">{variant.brand}{variant.name ? ` / ${variant.name}` : ''}</td>
                      <td className="py-3">{variant.sku || '—'}</td>
                      <td className="py-3 text-right">₹{Number(variant.extraPrice).toLocaleString('en-IN')}</td>
                      {isAdmin && <td className="py-3"><div className="flex gap-3"><button onClick={() => openVariantForm(variant)} className="text-indigo-600">Edit</button><button onClick={() => void deactivateVariant(variant)} className="text-red-600">Deactivate</button></div></td>}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}