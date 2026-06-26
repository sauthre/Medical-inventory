-- ================================================================
-- MediStock — Supabase Schema
-- Run this entire file in the Supabase SQL Editor (one shot)
-- ================================================================

-- ── Tables ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS medicines (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  manufacturer  TEXT DEFAULT '',
  batch_number  TEXT DEFAULT '',
  category      TEXT DEFAULT 'General',
  cost_price    NUMERIC(10,2) NOT NULL CHECK (cost_price >= 0),
  mrp           NUMERIC(10,2) NOT NULL CHECK (mrp >= 0),
  discount_percent NUMERIC(5,2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  quantity      INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit          TEXT DEFAULT 'strips',
  expiry_date   DATE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id              BIGSERIAL PRIMARY KEY,
  medicine_id     BIGINT REFERENCES medicines(id) ON DELETE SET NULL,
  medicine_name   TEXT NOT NULL,
  batch_number    TEXT DEFAULT '',
  quantity_sold   INTEGER NOT NULL CHECK (quantity_sold > 0),
  mrp             NUMERIC(10,2) NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  sale_price      NUMERIC(10,2) NOT NULL,
  total_revenue   NUMERIC(10,2) NOT NULL,
  cost_price      NUMERIC(10,2) NOT NULL,
  total_cost      NUMERIC(10,2) NOT NULL,
  profit          NUMERIC(10,2) NOT NULL,
  customer_name   TEXT DEFAULT '',
  sale_date       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ──────────────────────────────────────────
-- Single-user shop: allow full public access via anon key.
-- To add auth later, swap these for user-scoped policies.

ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_medicines" ON medicines;
DROP POLICY IF EXISTS "anon_all_sales"     ON sales;

CREATE POLICY "anon_all_medicines" ON medicines FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_sales"     ON sales     FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── Functions ───────────────────────────────────────────────────

-- 1. Atomic sale recording (deducts inventory in a transaction)
CREATE OR REPLACE FUNCTION record_sale(
  p_medicine_id   BIGINT,
  p_quantity_sold INTEGER,
  p_customer_name TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_med           medicines%ROWTYPE;
  v_sale_price    NUMERIC(10,2);
  v_total_revenue NUMERIC(10,2);
  v_total_cost    NUMERIC(10,2);
  v_profit        NUMERIC(10,2);
  v_sale_id       BIGINT;
BEGIN
  SELECT * INTO v_med FROM medicines WHERE id = p_medicine_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Medicine not found';
  END IF;
  IF v_med.quantity < p_quantity_sold THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %', v_med.quantity;
  END IF;

  v_sale_price    := ROUND(v_med.mrp * (1 - v_med.discount_percent / 100.0), 2);
  v_total_revenue := ROUND(v_sale_price * p_quantity_sold, 2);
  v_total_cost    := ROUND(v_med.cost_price * p_quantity_sold, 2);
  v_profit        := v_total_revenue - v_total_cost;

  INSERT INTO sales (
    medicine_id, medicine_name, batch_number, quantity_sold,
    mrp, discount_percent, sale_price, total_revenue,
    cost_price, total_cost, profit, customer_name
  ) VALUES (
    p_medicine_id, v_med.name, v_med.batch_number, p_quantity_sold,
    v_med.mrp, v_med.discount_percent, v_sale_price, v_total_revenue,
    v_med.cost_price, v_total_cost, v_profit, p_customer_name
  ) RETURNING id INTO v_sale_id;

  UPDATE medicines SET quantity = quantity - p_quantity_sold WHERE id = p_medicine_id;

  RETURN json_build_object(
    'sale_id',         v_sale_id,
    'total_revenue',   v_total_revenue,
    'profit',          v_profit,
    'remaining_stock', v_med.quantity - p_quantity_sold
  );
END;
$$;

-- 2. Dashboard / revenue summary (all aggregations in one round-trip)
CREATE OR REPLACE FUNCTION get_revenue_summary()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN json_build_object(
    'overall', (
      SELECT json_build_object(
        'total_sales',      COUNT(*),
        'total_revenue',    COALESCE(SUM(total_revenue), 0),
        'total_cost',       COALESCE(SUM(total_cost), 0),
        'total_profit',     COALESCE(SUM(profit), 0),
        'total_items_sold', COALESCE(SUM(quantity_sold), 0)
      ) FROM sales
    ),
    'today', (
      SELECT json_build_object(
        'revenue', COALESCE(SUM(total_revenue), 0),
        'profit',  COALESCE(SUM(profit), 0),
        'sales',   COUNT(*)
      ) FROM sales WHERE DATE(sale_date) = CURRENT_DATE
    ),
    'thisMonth', (
      SELECT json_build_object(
        'revenue', COALESCE(SUM(total_revenue), 0),
        'profit',  COALESCE(SUM(profit), 0),
        'sales',   COUNT(*)
      ) FROM sales WHERE TO_CHAR(sale_date, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
    ),
    'inventoryValue', (
      SELECT json_build_object(
        'total_medicines',    COUNT(*),
        'total_stock',        COALESCE(SUM(quantity), 0),
        'stock_value_at_cost',COALESCE(SUM(cost_price * quantity), 0),
        'stock_value_at_mrp', COALESCE(SUM(mrp * quantity), 0)
      ) FROM medicines
    ),
    'lowStock',      (SELECT COUNT(*) FROM medicines WHERE quantity <= 10 AND quantity > 0),
    'expiringCount', (SELECT COUNT(*) FROM medicines WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND quantity > 0)
  );
END;
$$;

-- 3. Monthly revenue breakdown (returns 12 rows, zero-filled)
CREATE OR REPLACE FUNCTION get_monthly_revenue(p_year INTEGER)
RETURNS TABLE(
  month_num    TEXT,
  revenue      NUMERIC,
  cost         NUMERIC,
  profit       NUMERIC,
  total_sales  BIGINT,
  items_sold   BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (SELECT generate_series(1,12) AS m),
  agg AS (
    SELECT
      EXTRACT(MONTH FROM sale_date)::INTEGER AS m,
      SUM(total_revenue) AS revenue,
      SUM(total_cost)    AS cost,
      SUM(profit)        AS profit,
      COUNT(*)           AS total_sales,
      SUM(quantity_sold) AS items_sold
    FROM sales
    WHERE EXTRACT(YEAR FROM sale_date) = p_year
    GROUP BY EXTRACT(MONTH FROM sale_date)
  )
  SELECT
    LPAD(ms.m::TEXT, 2, '0'),
    COALESCE(a.revenue,     0),
    COALESCE(a.cost,        0),
    COALESCE(a.profit,      0),
    COALESCE(a.total_sales, 0),
    COALESCE(a.items_sold,  0)
  FROM months ms
  LEFT JOIN agg a ON ms.m = a.m
  ORDER BY ms.m;
END;
$$;

-- 4. Daily revenue breakdown for a given YYYY-MM month
CREATE OR REPLACE FUNCTION get_daily_revenue(p_month TEXT)
RETURNS TABLE(
  sale_day    TEXT,
  total_sales BIGINT,
  revenue     NUMERIC,
  cost        NUMERIC,
  profit      NUMERIC,
  items_sold  BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE(sale_date), 'YYYY-MM-DD'),
    COUNT(*),
    SUM(total_revenue),
    SUM(total_cost),
    SUM(profit),
    SUM(quantity_sold)
  FROM sales
  WHERE TO_CHAR(sale_date, 'YYYY-MM') = p_month
  GROUP BY DATE(sale_date)
  ORDER BY DATE(sale_date);
END;
$$;

-- 5. Top-selling medicines for an optional month
CREATE OR REPLACE FUNCTION get_top_medicines(
  p_month TEXT    DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  medicine_name TEXT,
  total_qty     BIGINT,
  total_revenue NUMERIC,
  total_profit  NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.medicine_name,
    SUM(s.quantity_sold),
    SUM(s.total_revenue),
    SUM(s.profit)
  FROM sales s
  WHERE (p_month IS NULL OR p_month = '' OR TO_CHAR(s.sale_date, 'YYYY-MM') = p_month)
  GROUP BY s.medicine_name
  ORDER BY SUM(s.total_revenue) DESC
  LIMIT p_limit;
END;
$$;

-- ── Seed Data ───────────────────────────────────────────────────
-- Only inserts when table is empty so re-running is safe.

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM medicines) = 0 THEN

    INSERT INTO medicines (name, manufacturer, batch_number, category, cost_price, mrp, discount_percent, quantity, unit, expiry_date) VALUES
      ('Paracetamol 500mg',  'Cipla Ltd',       'B2024001', 'Analgesic',    28,  42,  5,  150, 'strips',  CURRENT_DATE + 365),
      ('Amoxicillin 250mg',  'Sun Pharma',      'B2024002', 'Antibiotic',   95,  145, 10, 80,  'strips',  CURRENT_DATE + 280),
      ('Cough Syrup 100ml',  'Himalaya',        'B2024003', 'Respiratory',  55,  85,  5,  60,  'bottles', CURRENT_DATE + 18),
      ('Vitamin C 500mg',    'Abbott India',    'B2024004', 'Supplements',  120, 180, 10, 200, 'strips',  CURRENT_DATE + 500),
      ('Aspirin 75mg',       'Bayer',           'B2024005', 'Cardiac',      18,  30,  0,  300, 'strips',  CURRENT_DATE + 400),
      ('Omeprazole 20mg',    'Dr Reddys',       'B2024006', 'Gastro',       65,  98,  8,  120, 'strips',  CURRENT_DATE + 320),
      ('Cetirizine 10mg',    'Cipla Ltd',       'B2024007', 'Anti-allergy', 22,  35,  5,  8,   'strips',  CURRENT_DATE + 10),
      ('Metformin 500mg',    'USV Ltd',         'B2024008', 'Diabetic',     42,  65,  0,  180, 'strips',  CURRENT_DATE + 600),
      ('Azithromycin 500mg', 'Pfizer',          'B2024009', 'Antibiotic',   185, 270, 12, 5,   'strips',  CURRENT_DATE + 25),
      ('Atorvastatin 10mg',  'Ranbaxy',         'B2024010', 'Cardiac',      78,  120, 5,  90,  'strips',  CURRENT_DATE + 450),
      ('Ibuprofen 400mg',    'Wockhardt',       'B2024011', 'Analgesic',    32,  50,  5,  110, 'strips',  CURRENT_DATE + 390),
      ('Pantoprazole 40mg',  'Torrent Pharma',  'B2024012', 'Gastro',       88,  135, 10, 75,  'strips',  CURRENT_DATE + 7),
      ('Multivitamin Syrup', 'Pfizer',          'B2024013', 'Supplements',  110, 165, 5,  40,  'bottles', CURRENT_DATE + 22),
      ('Dolo 650mg',         'Micro Labs',      'B2024014', 'Analgesic',    25,  38,  0,  250, 'strips',  CURRENT_DATE + 480),
      ('Digene Antacid',     'Abbott India',    'B2024015', 'Gastro',       38,  60,  5,  55,  'bottles', CURRENT_DATE + 330);

    INSERT INTO sales (medicine_name, batch_number, quantity_sold, mrp, discount_percent, sale_price, total_revenue, cost_price, total_cost, profit, customer_name, sale_date) VALUES
      ('Paracetamol 500mg',  'B2024001', 3,  42,  5,  39.9,  119.7, 28,  84,   35.7,  'Ramesh Kumar',   NOW() - INTERVAL '0 days'),
      ('Vitamin C 500mg',    'B2024004', 2,  180, 10, 162.0, 324.0, 120, 240,  84.0,  'Priya Sharma',   NOW() - INTERVAL '0 days'),
      ('Amoxicillin 250mg',  'B2024002', 1,  145, 10, 130.5, 130.5, 95,  95,   35.5,  'Suresh Patel',   NOW() - INTERVAL '1 day'),
      ('Omeprazole 20mg',    'B2024006', 2,  98,  8,  90.16, 180.3, 65,  130,  50.3,  'Anil Mehta',     NOW() - INTERVAL '1 day'),
      ('Aspirin 75mg',       'B2024005', 4,  30,  0,  30.0,  120.0, 18,  72,   48.0,  'Kavita Singh',   NOW() - INTERVAL '2 days'),
      ('Dolo 650mg',         'B2024014', 5,  38,  0,  38.0,  190.0, 25,  125,  65.0,  'Mohan Das',      NOW() - INTERVAL '2 days'),
      ('Metformin 500mg',    'B2024008', 3,  65,  0,  65.0,  195.0, 42,  126,  69.0,  'Sunita Rao',     NOW() - INTERVAL '3 days'),
      ('Ibuprofen 400mg',    'B2024011', 2,  50,  5,  47.5,  95.0,  32,  64,   31.0,  'Vijay Kumar',    NOW() - INTERVAL '5 days'),
      ('Paracetamol 500mg',  'B2024001', 6,  42,  5,  39.9,  239.4, 28,  168,  71.4,  'Walk-in',        NOW() - INTERVAL '7 days'),
      ('Vitamin C 500mg',    'B2024004', 3,  180, 10, 162.0, 486.0, 120, 360,  126.0, 'Deepak Joshi',   NOW() - INTERVAL '7 days'),
      ('Atorvastatin 10mg',  'B2024010', 2,  120, 5,  114.0, 228.0, 78,  156,  72.0,  'Rajan Iyer',     NOW() - INTERVAL '10 days'),
      ('Omeprazole 20mg',    'B2024006', 3,  98,  8,  90.16, 270.5, 65,  195,  75.5,  'Nalini Gupta',   NOW() - INTERVAL '12 days'),
      ('Digene Antacid',     'B2024015', 2,  60,  5,  57.0,  114.0, 38,  76,   38.0,  'Walk-in',        NOW() - INTERVAL '14 days'),
      ('Aspirin 75mg',       'B2024005', 3,  30,  0,  30.0,  90.0,  18,  54,   36.0,  'Harish Nair',    NOW() - INTERVAL '15 days'),
      ('Amoxicillin 250mg',  'B2024002', 2,  145, 10, 130.5, 261.0, 95,  190,  71.0,  'Meena Pillai',   NOW() - INTERVAL '18 days'),
      ('Metformin 500mg',    'B2024008', 4,  65,  0,  65.0,  260.0, 42,  168,  92.0,  'Gopal Varma',    NOW() - INTERVAL '20 days'),
      ('Dolo 650mg',         'B2024014', 8,  38,  0,  38.0,  304.0, 25,  200,  104.0, 'Walk-in',        NOW() - INTERVAL '22 days'),
      ('Paracetamol 500mg',  'B2024001', 4,  42,  5,  39.9,  159.6, 28,  112,  47.6,  'Radha Krishnan', NOW() - INTERVAL '25 days'),
      ('Multivitamin Syrup', 'B2024013', 1,  165, 5,  156.8, 156.8, 110, 110,  46.8,  'Sanjay Tripathi',NOW() - INTERVAL '27 days'),
      ('Ibuprofen 400mg',    'B2024011', 3,  50,  5,  47.5,  142.5, 32,  96,   46.5,  'Uma Shankar',    NOW() - INTERVAL '30 days');

  END IF;
END $$;
