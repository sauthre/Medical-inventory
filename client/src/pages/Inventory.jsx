import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Package, X, AlertCircle } from 'lucide-react';
import { medicinesApi } from '../api';

const CATEGORIES = ['Analgesic', 'Antibiotic', 'Anti-allergy', 'Cardiac', 'Diabetic', 'Gastro', 'General', 'Respiratory', 'Supplements'];
const UNITS = ['strips', 'bottles', 'vials', 'tablets', 'capsules', 'sachets', 'tubes', 'units'];

const emptyForm = {
  name: '', manufacturer: '', batch_number: '', category: 'General',
  cost_price: '', mrp: '', discount_percent: '0',
  quantity: '', unit: 'strips', expiry_date: ''
};

function MedicineModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        ...initial,
        cost_price: String(initial.cost_price),
        mrp: String(initial.mrp),
        discount_percent: String(initial.discount_percent),
        quantity: String(initial.quantity),
      } : emptyForm);
      setError('');
    }
  }, [open, initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        cost_price: parseFloat(form.cost_price),
        mrp: parseFloat(form.mrp),
        discount_percent: parseFloat(form.discount_percent || 0),
        quantity: parseInt(form.quantity),
      };
      if (initial?.id) {
        await medicinesApi.update(initial.id, payload);
      } else {
        await medicinesApi.create(payload);
      }
      onSave();
      onClose();
    } catch (err) {
      const msg = err.message || err.response?.data?.error || 'Failed to save medicine';
      const hint = msg.includes('row-level security')
        ? 'RLS policy error — make sure you ran supabase/schema.sql in the Supabase SQL Editor.'
        : msg.includes('does not exist')
        ? 'Table not found — please run supabase/schema.sql in the Supabase SQL Editor.'
        : msg.includes('Invalid API key') || msg.includes('apikey')
        ? 'Invalid Supabase key — check VITE_SUPABASE_ANON_KEY in your environment variables.'
        : null;
      setError(hint || msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const salePrice = form.mrp ? (parseFloat(form.mrp) * (1 - parseFloat(form.discount_percent || 0) / 100)).toFixed(2) : '—';
  const margin = form.mrp && form.cost_price ? (((parseFloat(form.mrp) - parseFloat(form.cost_price)) / parseFloat(form.mrp)) * 100).toFixed(1) : '—';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {initial ? 'Edit Medicine' : 'Add New Medicine'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Medicine Name *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Paracetamol 500mg" required />
            </div>
            <div>
              <label className="label">Manufacturer</label>
              <input className="input" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. Cipla Ltd" />
            </div>
            <div>
              <label className="label">Batch Number</label>
              <input className="input" value={form.batch_number} onChange={e => set('batch_number', e.target.value)} placeholder="e.g. B2024001" />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Expiry Date *</label>
              <input type="date" className="input" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} required />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Pricing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Cost Price (₹) *</label>
                <input type="number" step="0.01" min="0" className="input" value={form.cost_price}
                  onChange={e => set('cost_price', e.target.value)} placeholder="0.00" required />
              </div>
              <div>
                <label className="label">MRP (₹) *</label>
                <input type="number" step="0.01" min="0" className="input" value={form.mrp}
                  onChange={e => set('mrp', e.target.value)} placeholder="0.00" required />
              </div>
              <div>
                <label className="label">Discount (%)</label>
                <input type="number" step="0.5" min="0" max="100" className="input" value={form.discount_percent}
                  onChange={e => set('discount_percent', e.target.value)} placeholder="0" />
              </div>
            </div>
            {form.mrp && form.cost_price && (
              <div className="mt-2 flex gap-4 text-sm">
                <span className="text-gray-500">Sale Price: <strong className="text-blue-600">₹{salePrice}</strong></span>
                <span className="text-gray-500">Gross Margin: <strong className="text-green-600">{margin}%</strong></span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Stock</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Quantity *</label>
                <input type="number" min="0" className="input" value={form.quantity}
                  onChange={e => set('quantity', e.target.value)} placeholder="0" required />
              </div>
              <div>
                <label className="label">Unit</label>
                <select className="input" value={form.unit} onChange={e => set('unit', e.target.value)}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : (initial ? 'Update Medicine' : 'Add Medicine')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await medicinesApi.getAll({ search, category });
      setMedicines(data);
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);

  const handleDelete = async (id) => {
    await medicinesApi.remove(id);
    setDeleteConfirm(null);
    fetchMedicines();
  };

  const expiryStatus = (dateStr) => {
    const days = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    if (days < 0) return { label: 'Expired', cls: 'badge-danger' };
    if (days <= 7) return { label: `${days}d left`, cls: 'badge-danger' };
    if (days <= 30) return { label: `${days}d left`, cls: 'badge-warning' };
    return { label: new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }), cls: 'badge-success' };
  };

  const stockStatus = (qty) => {
    if (qty === 0) return <span className="badge-danger">Out of stock</span>;
    if (qty <= 10) return <span className="badge-warning">{qty} (Low)</span>;
    return <span className="text-gray-700">{qty}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory</h2>
          <p className="text-gray-500 text-sm mt-1">{medicines.length} medicines found</p>
        </div>
        <button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Medicine</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card !p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, manufacturer, batch..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-48" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Mobile card list ─────────────────────────────────── */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : medicines.length === 0 ? (
          <div className="card text-center py-12">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No medicines found</p>
          </div>
        ) : medicines.map((m) => {
          const salePrice = (m.mrp * (1 - m.discount_percent / 100)).toFixed(2);
          const exp = expiryStatus(m.expiry_date);
          return (
            <div key={m.id} className="card !p-4 space-y-3">
              {/* Name + actions */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.manufacturer} · {m.batch_number || 'No batch'}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setEditTarget(m); setModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteConfirm(m)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Pricing row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-400">Cost</p>
                  <p className="text-sm font-semibold text-gray-700">₹{m.cost_price}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-400">MRP</p>
                  <p className="text-sm font-semibold text-gray-700">₹{m.mrp}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-blue-400">Sale Price</p>
                  <p className="text-sm font-semibold text-blue-600">₹{salePrice}</p>
                </div>
              </div>
              {/* Stock + badges */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="badge-info">{m.category}</span>
                  {m.discount_percent > 0 && <span className="badge-success">{m.discount_percent}% off</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{stockStatus(m.quantity)} <span className="text-xs text-gray-400">{m.unit}</span></span>
                  <span className={exp.cls}>{exp.label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table ─────────────────────────────────────── */}
      <div className="hidden lg:block card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Medicine', 'Batch', 'Category', 'Cost', 'MRP', 'Discount', 'Sale Price', 'Stock', 'Expiry', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400">No medicines found</p>
                  </td>
                </tr>
              ) : medicines.map((m) => {
                const salePrice = (m.mrp * (1 - m.discount_percent / 100)).toFixed(2);
                const exp = expiryStatus(m.expiry_date);
                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{m.name}</div>
                      <div className="text-xs text-gray-400">{m.manufacturer}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{m.batch_number || '—'}</td>
                    <td className="px-4 py-3"><span className="badge-info">{m.category}</span></td>
                    <td className="px-4 py-3 text-gray-700">₹{m.cost_price}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">₹{m.mrp}</td>
                    <td className="px-4 py-3 text-green-600">{m.discount_percent}%</td>
                    <td className="px-4 py-3 text-blue-600 font-medium">₹{salePrice}</td>
                    <td className="px-4 py-3">{stockStatus(m.quantity)} <span className="text-xs text-gray-400">{m.unit}</span></td>
                    <td className="px-4 py-3"><span className={exp.cls}>{exp.label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditTarget(m); setModalOpen(true); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(m)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <MedicineModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={fetchMedicines}
        initial={editTarget}
      />

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900">Delete Medicine?</h3>
            </div>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
