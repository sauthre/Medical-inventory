-- ================================================================
-- MediStock — Enable Authentication
-- Run this in Supabase SQL Editor AFTER schema.sql
-- This locks the app so only signed-in users can read/write data.
-- ================================================================

-- Step 1: Remove the open anon policies
DROP POLICY IF EXISTS "anon_all_medicines" ON medicines;
DROP POLICY IF EXISTS "anon_all_sales"     ON sales;

-- Step 2: New policies — authenticated (logged-in) users only
CREATE POLICY "auth_all_medicines" ON medicines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_sales" ON sales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Step 3: Revoke anon access to all RPC functions
REVOKE EXECUTE ON FUNCTION record_sale(BIGINT, INTEGER, TEXT)  FROM anon;
REVOKE EXECUTE ON FUNCTION get_revenue_summary()               FROM anon;
REVOKE EXECUTE ON FUNCTION get_monthly_revenue(INTEGER)        FROM anon;
REVOKE EXECUTE ON FUNCTION get_daily_revenue(TEXT)             FROM anon;
REVOKE EXECUTE ON FUNCTION get_top_medicines(TEXT, INTEGER)    FROM anon;

-- ── Create your account ─────────────────────────────────────────
-- After running this, go to:
--   Supabase Dashboard → Authentication → Users → "Add user"
-- Enter your email and a strong password. That's the only account
-- that will ever be able to log in.
-- ================================================================
