import { useState, useEffect } from 'react';
import { Search, ShoppingCart, CheckCircle, AlertCircle, X, Trash2 } from 'lucide-react';
import { medicinesApi, salesApi } from '../api';

const DISCOUNT_OPTIONS = [
  { key: 'default', label: (d) => `Default (${d}%)` },
  { key: '0',      label: () => '0%' },
  { key: '5',      label: () => '5%' },
  { key: '10',     label: () => '10%' },
  { key: '20',     label: () => '20%' },
  { key: 'custom', label: () => 'Custom' },
];

export default function Sales() {
  const [medicines, setMedicines] = useState([]);
  const [salesList, setSalesList] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [customer, setCustomer] = useState('');
  const [discountMode, setDiscountMode] = useState('default');
  const [customDiscount, setCustomDiscount] = useState('');
  const [loading, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [salesLoading, setSalesLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    medicinesApi.getAll().then(r => setMedicines(r.data));
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setSalesLoading(true);
    try {
      const { data } = await salesApi.getAll();
      setSalesList(data.slice(0, 50));
    } finally {
      setSalesLoading(false);
    }
  };

  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return; }
    const filtered = medicines
      .filter(m => m.quantity > 0 && (
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.batch_number?.toLowerCase().includes(search.toLowerCase())
      ))
      .slice(0, 8);
    setSearchResults(filtered);
    setShowDropdown(true);
  }, [search, medicines]);

  const effectiveDiscount = (() => {
    if (!selected) return 0;
    switch (discountMode) {
      case '0':  return 0;
      case '5':  return 5;
      case '10': return 10;
      case '20': return 20;
      case 'custom': return parseFloat(customDiscount) || 0;
      default:   return selected.discount_percent;
    }
  })();

  const selectMedicine = (med) => {
    setSelected(med);
    setSearch(med.name);
    setShowDropdown(false);
    setQty(1);
    setDiscountMode('default');
    setCustomDiscount('');
  };

  const clearSelection = () => {
    setSelected(null);
    setSearch('');
    setSearchResults([]);
    setQty(1);
    setCustomer('');
    setDiscountMode('default');
    setCustomDiscount('');
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSale = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await salesApi.create({
        medicine_id: selected.id,
        quantity_sold: qty,
        customer_name: customer,
        discount_percent: discountMode === 'default' ? null : effectiveDiscount,
      });
      showToast(`Sale recorded! ₹${res.data.sale.total_revenue.toFixed(2)} — Remaining stock: ${res.data.remaining_stock}`);
      clearSelection();
      medicinesApi.getAll().then(r => setMedicines(r.data));
      fetchSales();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to record sale', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await salesApi.remove(deleteConfirm.id, deleteConfirm.medicine_id, deleteConfirm.quantity_sold);
      showToast('Sale deleted and stock restored.');
      setDeleteConfirm(null);
      fetchSales();
      medicinesApi.getAll().then(r => setMedicines(r.data));
    } catch (err) {
      showToast('Failed to delete sale', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

  const salePrice = selected ? (selected.mrp * (1 - effectiveDiscount / 100)) : 0;
  const totalAmount = salePrice * qty;
  const profit = selected ? ((salePrice - selected.cost_price) * qty) : 0;
  const isOverStock = selected && qty > selected.quantity;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Record Sale</h2>
        <p className="text-gray-500 text-sm mt-1">Search for a medicine and record a sale to update inventory.</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium max-w-sm ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Sale Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-900">New Sale</h3>

            {/* Medicine Search */}
            <div>
              <label className="label">Search Medicine</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="input pl-9 pr-8"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelected(null); }}
                  placeholder="Type medicine name..."
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                />
                {search && (
                  <button onClick={clearSelection} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}

                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden max-h-64 overflow-y-auto">
                    {searchResults.map(m => (
                      <button key={m.id} onClick={() => selectMedicine(m)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                        <div className="font-medium text-gray-900 text-sm">{m.name}</div>
                        <div className="flex gap-3 mt-0.5">
                          <span className="text-xs text-gray-400">{m.manufacturer}</span>
                          <span className="text-xs text-blue-600">₹{m.mrp}</span>
                          {m.discount_percent > 0 && <span className="text-xs text-green-600">{m.discount_percent}% off</span>}
                          <span className="text-xs text-gray-400">Qty: {m.quantity}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Medicine Details */}
            {selected && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{selected.name}</p>
                    <p className="text-xs text-gray-500">{selected.manufacturer} · {selected.batch_number}</p>
                  </div>
                  {effectiveDiscount > 0 && (
                    <span className="badge-success">{effectiveDiscount}% OFF</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="text-center bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-400">MRP</p>
                    <p className="font-bold text-gray-900">₹{selected.mrp}</p>
                  </div>
                  <div className="text-center bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-400">Sale Price</p>
                    <p className="font-bold text-blue-600">₹{salePrice.toFixed(2)}</p>
                  </div>
                  <div className="text-center bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-400">In Stock</p>
                    <p className={`font-bold ${selected.quantity <= 10 ? 'text-amber-600' : 'text-green-600'}`}>{selected.quantity}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Discount Picker */}
            {selected && (
              <div>
                <label className="label">Discount</label>
                <div className="flex flex-wrap gap-2">
                  {DISCOUNT_OPTIONS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDiscountMode(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        discountMode === key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label(selected.discount_percent)}
                    </button>
                  ))}
                </div>
                {discountMode === 'custom' && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className="input w-28"
                      placeholder="e.g. 7.5"
                      value={customDiscount}
                      onChange={e => setCustomDiscount(e.target.value)}
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                )}
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="label">Quantity</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-lg font-medium">—</button>
                <input type="number" min="1" className="input text-center w-24" value={qty}
                  onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
                <button onClick={() => setQty(q => q + 1)}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-lg font-medium">+</button>
              </div>
              {isOverStock && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Exceeds available stock ({selected.quantity})
                </p>
              )}
            </div>

            {/* Customer */}
            <div>
              <label className="label">Customer Name (optional)</label>
              <input className="input" value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Walk-in customer" />
            </div>

            {/* Total */}
            {selected && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sale Price × {qty}</span>
                  <span className="text-gray-700">₹{salePrice.toFixed(2)} × {qty}</span>
                </div>
                {effectiveDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({effectiveDiscount}%)</span>
                    <span>-₹{((selected.mrp - salePrice) * qty).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-gray-200 pt-2 mt-2">
                  <span>Total Amount</span>
                  <span className="text-blue-600 text-lg">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Est. Profit</span>
                  <span>₹{profit.toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleSale}
              disabled={!selected || isOverStock || loading}
              className="btn-primary w-full justify-center py-3"
            >
              <ShoppingCart className="w-4 h-4" />
              {loading ? 'Recording...' : 'Record Sale'}
            </button>
          </div>
        </div>

        {/* Sales History */}
        <div className="lg:col-span-3">
          <div className="card !p-0 overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Sales</h3>
            </div>

            {/* Mobile card list */}
            <div className="lg:hidden divide-y divide-gray-50">
              {salesLoading ? (
                <p className="text-center py-8 text-gray-400 text-sm">Loading…</p>
              ) : salesList.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No sales yet</p>
              ) : salesList.map(s => (
                <div key={s.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900 text-sm leading-tight">{s.medicine_name}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-blue-600 font-bold text-sm">₹{s.total_revenue.toFixed(2)}</p>
                      <button onClick={() => setDeleteConfirm(s)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
                    <span>Qty: {s.quantity_sold}</span>
                    <span className="text-green-600">Profit: ₹{s.profit.toFixed(2)}</span>
                    {s.discount_percent > 0 && <span className="text-amber-600">{s.discount_percent}% off</span>}
                    {s.customer_name && <span>{s.customer_name}</span>}
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {new Date(s.sale_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Medicine', 'Qty', 'MRP', 'Disc%', 'Total', 'Profit', 'Customer', 'Time', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {salesLoading ? (
                    <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  ) : salesList.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-8 text-gray-400">No sales yet</td></tr>
                  ) : salesList.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{s.medicine_name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.quantity_sold}</td>
                      <td className="px-4 py-3 text-gray-500">₹{s.mrp}</td>
                      <td className="px-4 py-3">
                        {s.discount_percent > 0
                          ? <span className="badge-success">{s.discount_percent}%</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-blue-600 font-medium">₹{s.total_revenue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">₹{s.profit.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-400 max-w-[100px] truncate">{s.customer_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {new Date(s.sale_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDeleteConfirm(s)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete sale">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Sale Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Sale?</h3>
                <p className="text-xs text-gray-400">Stock will be restored automatically</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-5 text-sm space-y-1">
              <p className="font-medium text-gray-900">{deleteConfirm.medicine_name}</p>
              <p className="text-gray-500">Qty: {deleteConfirm.quantity_sold} · Revenue: ₹{deleteConfirm.total_revenue.toFixed(2)}</p>
              <p className="text-gray-400 text-xs">
                {new Date(deleteConfirm.sale_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1" disabled={deleting}>Cancel</button>
              <button onClick={handleDeleteSale} className="btn-danger flex-1" disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete & Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
