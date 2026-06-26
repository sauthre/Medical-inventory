import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, IndianRupee, ShoppingCart, Package, Calendar } from 'lucide-react';
import { revenueApi } from '../api';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtFull = (n) => `₹${Number(n || 0).toFixed(2)}`;

function SummaryCard({ title, value, sub, icon: Icon, color }) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    amber: 'text-amber-600 bg-amber-50',
    purple: 'text-purple-600 bg-purple-50',
  };
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-800">₹{Number(p.value).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
};

export default function Revenue() {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [daily, setDaily] = useState([]);
  const [topMeds, setTopMeds] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    revenueApi.getSummary().then(r => setSummary(r.data));
  }, []);

  useEffect(() => {
    revenueApi.getMonthly(selectedYear).then(r => setMonthly(r.data)).finally(() => setLoading(false));
  }, [selectedYear]);

  useEffect(() => {
    revenueApi.getDaily(selectedMonth).then(r => setDaily(r.data));
    revenueApi.getTopMedicines({ limit: 8, month: selectedMonth }).then(r => setTopMeds(r.data));
  }, [selectedMonth]);

  const s = summary || {};
  const profitMargin = s.overall?.total_revenue > 0
    ? ((s.overall?.total_profit / s.overall?.total_revenue) * 100).toFixed(1)
    : '0';

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const years = [2024, 2025, 2026];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Revenue Analytics</h2>
        <p className="text-gray-500 text-sm mt-1">Track your shop's financial performance over time.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Revenue" value={fmt(s.overall?.total_revenue)}
          sub={`${s.overall?.total_sales || 0} total transactions`}
          icon={IndianRupee} color="blue"
        />
        <SummaryCard
          title="Net Profit" value={fmt(s.overall?.total_profit)}
          sub={`${profitMargin}% profit margin`}
          icon={TrendingUp} color="green"
        />
        <SummaryCard
          title="This Month" value={fmt(s.thisMonth?.revenue)}
          sub={`Profit: ${fmtFull(s.thisMonth?.profit)}`}
          icon={Calendar} color="purple"
        />
        <SummaryCard
          title="Today's Sales" value={fmt(s.today?.revenue)}
          sub={`${s.today?.sales || 0} transactions today`}
          icon={ShoppingCart} color="amber"
        />
      </div>

      {/* Monthly Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h3 className="font-semibold text-gray-900">Monthly Revenue Overview</h3>
          <select className="input w-32" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthly} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" name="Cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Daily Chart */}
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h3 className="font-semibold text-gray-900">Daily Revenue</h3>
            <input type="month" className="input w-44"
              value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          </div>
          {daily.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-300">
              <Package className="w-10 h-10 mb-2" />
              <p className="text-sm">No data for selected month</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={daily} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="sale_day" tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={v => new Date(v).getDate()} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `₹${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Medicines */}
        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-gray-900 mb-4">Top Selling Medicines</h3>
          <p className="text-xs text-gray-400 mb-4">For: {new Date(selectedMonth + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</p>
          {topMeds.length === 0 ? (
            <div className="text-center text-gray-300 py-8">
              <Package className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topMeds.map((med, i) => {
                const maxRevenue = topMeds[0].total_revenue;
                const pct = (med.total_revenue / maxRevenue) * 100;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700 truncate max-w-[60%]">{med.medicine_name}</span>
                      <span className="text-blue-600 font-semibold">₹{Number(med.total_revenue).toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                      <span className="text-xs text-gray-400 w-12 text-right">{med.total_qty} sold</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Daily Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Day-wise Revenue Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Sales Count', 'Items Sold', 'Revenue', 'Cost', 'Profit', 'Margin'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {daily.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No data for selected period</td></tr>
              ) : daily.map((d, i) => {
                const margin = d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) : '0';
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {new Date(d.sale_day).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{d.total_sales}</td>
                    <td className="px-6 py-3 text-gray-600">{d.items_sold}</td>
                    <td className="px-6 py-3 text-blue-600 font-medium">₹{Number(d.revenue).toFixed(2)}</td>
                    <td className="px-6 py-3 text-amber-600">₹{Number(d.cost).toFixed(2)}</td>
                    <td className="px-6 py-3 text-green-600 font-medium">₹{Number(d.profit).toFixed(2)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${Math.min(100, margin)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{margin}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {daily.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td className="px-6 py-3 font-bold text-gray-900">Total</td>
                  <td className="px-6 py-3 font-bold">{daily.reduce((a, d) => a + d.total_sales, 0)}</td>
                  <td className="px-6 py-3 font-bold">{daily.reduce((a, d) => a + d.items_sold, 0)}</td>
                  <td className="px-6 py-3 font-bold text-blue-600">₹{daily.reduce((a, d) => a + d.revenue, 0).toFixed(2)}</td>
                  <td className="px-6 py-3 font-bold text-amber-600">₹{daily.reduce((a, d) => a + d.cost, 0).toFixed(2)}</td>
                  <td className="px-6 py-3 font-bold text-green-600">₹{daily.reduce((a, d) => a + d.profit, 0).toFixed(2)}</td>
                  <td className="px-6 py-3 text-gray-400 text-xs">Monthly total</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
