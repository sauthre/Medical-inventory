import { supabase } from '../lib/supabase';

// Throws a normalized error with .message, returns { data } on success.
const ok = async (queryPromise) => {
  const { data, error } = await queryPromise;
  if (error) {
    const msg = error.message || error.details || 'Supabase error';
    throw Object.assign(new Error(msg), { response: { data: { error: msg } } });
  }
  return { data };
};

// ── Medicines ────────────────────────────────────────────────────

export const medicinesApi = {
  getAll: async ({ search, category } = {}) => {
    let q = supabase.from('medicines').select('*');
    if (search) {
      q = q.or(
        `name.ilike.%${search}%,manufacturer.ilike.%${search}%,batch_number.ilike.%${search}%`
      );
    }
    if (category) q = q.eq('category', category);
    return ok(q.order('name'));
  },

  getById: async (id) =>
    ok(supabase.from('medicines').select('*').eq('id', id).single()),

  getExpiring: async (days = 30) => {
    const future = new Date();
    future.setDate(future.getDate() + days);
    const futureStr = future.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .lte('expiry_date', futureStr)
      .gt('quantity', 0)
      .order('expiry_date');

    if (error) throw error;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      data: data.map(m => ({
        ...m,
        days_remaining: Math.ceil((new Date(m.expiry_date) - today) / 86_400_000),
      })),
    };
  },

  getCategories: async () => {
    const { data, error } = await supabase.from('medicines').select('category');
    if (error) throw error;
    return { data: [...new Set(data.map(d => d.category))].sort() };
  },

  create: async (payload) =>
    ok(supabase.from('medicines').insert(payload).select().single()),

  update: async (id, payload) =>
    ok(supabase.from('medicines').update(payload).eq('id', id).select().single()),

  remove: async (id) =>
    ok(supabase.from('medicines').delete().eq('id', id)),
};

// ── Sales ────────────────────────────────────────────────────────

export const salesApi = {
  getAll: async ({ date, month } = {}) => {
    let q = supabase
      .from('sales')
      .select('*')
      .order('sale_date', { ascending: false })
      .limit(200);

    if (date) {
      q = q.gte('sale_date', `${date}T00:00:00`).lte('sale_date', `${date}T23:59:59`);
    }
    if (month) {
      const [y, m] = month.split('-');
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      q = q
        .gte('sale_date', `${month}-01T00:00:00`)
        .lte('sale_date', `${month}-${lastDay}T23:59:59`);
    }
    return ok(q);
  },

  // Calls the atomic PostgreSQL function
  create: async ({ medicine_id, quantity_sold, customer_name = '' }) => {
    const { data, error } = await supabase.rpc('record_sale', {
      p_medicine_id:   medicine_id,
      p_quantity_sold: quantity_sold,
      p_customer_name: customer_name,
    });
    if (error) {
      // Re-throw in the same shape Sales.jsx expects
      throw { response: { data: { error: error.message } } };
    }
    // Normalise to the shape Sales.jsx already reads
    return {
      data: {
        sale: { total_revenue: data.total_revenue },
        remaining_stock: data.remaining_stock,
      },
    };
  },
};

// ── Revenue ──────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const revenueApi = {
  // One round-trip via PostgreSQL function
  getSummary: async () =>
    ok(supabase.rpc('get_revenue_summary')),

  // 12-row result mapped to chart-ready shape
  getMonthly: async (year) => {
    const y = year || new Date().getFullYear();
    const { data, error } = await supabase.rpc('get_monthly_revenue', { p_year: y });
    if (error) throw error;
    return {
      data: (data || []).map((d, i) => ({
        month:       MONTH_LABELS[i],
        month_key:   `${y}-${d.month_num}`,
        revenue:     Number(d.revenue     || 0),
        cost:        Number(d.cost        || 0),
        profit:      Number(d.profit      || 0),
        total_sales: Number(d.total_sales || 0),
        items_sold:  Number(d.items_sold  || 0),
      })),
    };
  },

  getDaily: async (month) => {
    const m = month || new Date().toISOString().slice(0, 7);
    const { data, error } = await supabase.rpc('get_daily_revenue', { p_month: m });
    if (error) throw error;
    return { data: data || [] };
  },

  getTopMedicines: async ({ limit = 10, month } = {}) => {
    const { data, error } = await supabase.rpc('get_top_medicines', {
      p_month: month || null,
      p_limit: limit,
    });
    if (error) throw error;
    return { data: data || [] };
  },
};
