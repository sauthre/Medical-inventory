import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Package, RefreshCw } from 'lucide-react';
import { medicinesApi } from '../api';

function ExpiryCard({ medicine }) {
  const days = medicine.days_remaining;

  const getConfig = () => {
    if (days < 0) return {
      border: 'border-red-500', bg: 'bg-red-50', badge: 'badge-danger',
      label: 'EXPIRED', dayText: `${Math.abs(days)} days ago`, icon: '🚫'
    };
    if (days <= 7) return {
      border: 'border-red-400', bg: 'bg-red-50', badge: 'badge-danger',
      label: 'CRITICAL', dayText: `${days} day${days === 1 ? '' : 's'} left`, icon: '🔴'
    };
    if (days <= 15) return {
      border: 'border-amber-400', bg: 'bg-amber-50', badge: 'badge-warning',
      label: 'WARNING', dayText: `${days} days left`, icon: '🟠'
    };
    return {
      border: 'border-yellow-300', bg: 'bg-yellow-50', badge: 'badge-warning',
      label: 'EXPIRING SOON', dayText: `${days} days left`, icon: '🟡'
    };
  };

  const cfg = getConfig();
  const salePrice = (medicine.mrp * (1 - medicine.discount_percent / 100)).toFixed(2);

  return (
    <div className={`bg-white rounded-xl border-l-4 ${cfg.border} shadow-sm p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{cfg.icon}</span>
            <h3 className="font-bold text-gray-900">{medicine.name}</h3>
            <span className={cfg.badge}>{cfg.label}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{medicine.manufacturer} · Batch: {medicine.batch_number || 'N/A'}</p>
        </div>
        <div className={`${cfg.bg} rounded-xl px-4 py-3 text-center flex-shrink-0`}>
          <p className="font-bold text-2xl text-gray-900">{Math.abs(days)}</p>
          <p className="text-xs text-gray-500">{days < 0 ? 'days ago' : 'days'}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-400 mb-0.5">Expiry Date</p>
          <p className="text-sm font-semibold text-gray-800">
            {new Date(medicine.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-400 mb-0.5">Stock Left</p>
          <p className="text-sm font-semibold text-gray-800">{medicine.quantity} {medicine.unit}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-400 mb-0.5">MRP</p>
          <p className="text-sm font-semibold text-gray-800">₹{medicine.mrp}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-400 mb-0.5">Sale Price</p>
          <p className="text-sm font-semibold text-blue-600">₹{salePrice}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <Clock className="w-3 h-3" />
        <span>Stock value at cost: ₹{(medicine.cost_price * medicine.quantity).toFixed(2)}</span>
        {medicine.discount_percent > 0 && (
          <span className="ml-auto badge-success">{medicine.discount_percent}% discount active</span>
        )}
      </div>
    </div>
  );
}

export default function ExpiryAlert() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [filter, setFilter] = useState('all');

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await medicinesApi.getExpiring(days);
      setMedicines(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [days]);

  const filtered = medicines.filter(m => {
    const d = m.days_remaining;
    if (filter === 'expired') return d < 0;
    if (filter === 'critical') return d >= 0 && d <= 7;
    if (filter === 'warning') return d > 7 && d <= 15;
    if (filter === 'soon') return d > 15;
    return true;
  });

  const counts = {
    all: medicines.length,
    expired: medicines.filter(m => m.days_remaining < 0).length,
    critical: medicines.filter(m => m.days_remaining >= 0 && m.days_remaining <= 7).length,
    warning: medicines.filter(m => m.days_remaining > 7 && m.days_remaining <= 15).length,
    soon: medicines.filter(m => m.days_remaining > 15).length,
  };

  const totalStockValue = medicines.reduce((sum, m) => sum + m.cost_price * m.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Expiry Alert</h2>
          <p className="text-gray-500 text-sm mt-1">Monitor medicines approaching their expiry dates.</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input w-40" value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={7}>Next 7 days</option>
            <option value={15}>Next 15 days</option>
            <option value={30}>Next 30 days</option>
            <option value={60}>Next 60 days</option>
            <option value={90}>Next 90 days</option>
          </select>
          <button onClick={fetch} className="btn-secondary" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: 'expired', label: 'Expired', color: 'bg-red-100 text-red-700 border-red-200' },
          { key: 'critical', label: 'Critical (≤7d)', color: 'bg-red-50 text-red-600 border-red-100' },
          { key: 'warning', label: 'Warning (8-15d)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { key: 'soon', label: 'Expiring Soon', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)}
            className={`card !p-4 text-center border-2 transition-all ${filter === key ? color : 'border-transparent hover:border-gray-200'}`}>
            <p className="text-3xl font-bold">{counts[key]}</p>
            <p className="text-sm mt-1">{label}</p>
          </button>
        ))}
      </div>

      {/* Attention Banner */}
      {counts.expired > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-600 text-white rounded-xl">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">{counts.expired} medicine{counts.expired > 1 ? 's are' : ' is'} already expired!</p>
            <p className="text-sm text-red-100">Total stock value at risk: ₹{totalStockValue.toFixed(2)} — Please remove these from shelves immediately.</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'All'], ['expired', 'Expired'], ['critical', 'Critical'], ['warning', 'Warning'], ['soon', 'Expiring Soon']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {label} {counts[key] > 0 && `(${counts[key]})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Package className="w-12 h-12 text-green-300 mx-auto mb-3" />
          <p className="text-xl font-semibold text-gray-700">All Clear!</p>
          <p className="text-gray-400 mt-1">No medicines in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(med => <ExpiryCard key={med.id} medicine={med} />)}
        </div>
      )}
    </div>
  );
}
