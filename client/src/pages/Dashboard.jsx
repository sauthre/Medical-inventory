import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, ShoppingCart, TrendingUp, AlertTriangle,
  IndianRupee, ArrowRight, BarChart3, Box
} from 'lucide-react';
import { revenueApi, salesApi } from '../api';

function StatCard({ title, value, subtitle, icon: Icon, color, link }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="card flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        {link && (
          <Link to={link} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2 font-medium">
            View details <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      revenueApi.getSummary(),
      salesApi.getAll()
    ]).then(([summRes, salesRes]) => {
      setSummary(summRes.data);
      setRecentSales(salesRes.data.slice(0, 8));
    }).finally(() => setLoading(false));
  }, []);

  const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const s = summary || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Welcome back! Here's your shop overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={fmt(s.today?.revenue)}
          subtitle={`${s.today?.sales || 0} sales today`}
          icon={IndianRupee}
          color="blue"
          link="/revenue"
        />
        <StatCard
          title="This Month Revenue"
          value={fmt(s.thisMonth?.revenue)}
          subtitle={`${s.thisMonth?.sales || 0} total sales`}
          icon={TrendingUp}
          color="green"
          link="/revenue"
        />
        <StatCard
          title="Total Medicines"
          value={s.inventoryValue?.total_medicines || 0}
          subtitle={`${s.inventoryValue?.total_stock || 0} units in stock`}
          icon={Package}
          color="purple"
          link="/inventory"
        />
        <StatCard
          title="Stock Value (MRP)"
          value={fmt(s.inventoryValue?.stock_value_at_mrp)}
          subtitle={`Cost: ${fmt(s.inventoryValue?.stock_value_at_cost)}`}
          icon={Box}
          color="amber"
        />
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/expiry" className="card flex items-center gap-4 border-l-4 border-amber-400 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{s.expiringCount || 0} Medicines Expiring Soon</p>
            <p className="text-sm text-gray-500">Within next 30 days — requires attention</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </Link>

        <Link to="/inventory" className="card flex items-center gap-4 border-l-4 border-red-400 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{s.lowStock || 0} Low Stock Items</p>
            <p className="text-sm text-gray-500">Qty ≤ 10 — consider restocking</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </Link>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Revenue (All Time)</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{fmt(s.overall?.total_revenue)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Profit (All Time)</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmt(s.overall?.total_profit)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Items Sold</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{s.overall?.total_items_sold || 0}</p>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Recent Sales
          </h3>
          <Link to="/sales" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentSales.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No sales recorded yet</p>
        ) : (
          <>
          {/* Mobile list */}
          <div className="lg:hidden -mx-2 divide-y divide-gray-50">
            {recentSales.map(sale => (
              <div key={sale.id} className="px-2 py-3 flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{sale.medicine_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Qty {sale.quantity_sold} · {sale.customer_name || 'Walk-in'} ·{' '}
                    {new Date(sale.sale_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-blue-600 font-semibold text-sm">{fmt(sale.total_revenue)}</p>
                  <p className="text-green-600 text-xs">{fmt(sale.profit)}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-3 text-gray-500 font-medium">Medicine</th>
                  <th className="pb-3 text-gray-500 font-medium">Qty</th>
                  <th className="pb-3 text-gray-500 font-medium">Revenue</th>
                  <th className="pb-3 text-gray-500 font-medium">Profit</th>
                  <th className="pb-3 text-gray-500 font-medium">Customer</th>
                  <th className="pb-3 text-gray-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{sale.medicine_name}</td>
                    <td className="py-3 text-gray-600">{sale.quantity_sold}</td>
                    <td className="py-3 text-blue-600 font-medium">{fmt(sale.total_revenue)}</td>
                    <td className="py-3 text-green-600 font-medium">{fmt(sale.profit)}</td>
                    <td className="py-3 text-gray-500">{sale.customer_name || '—'}</td>
                    <td className="py-3 text-gray-400">
                      {new Date(sale.sale_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
