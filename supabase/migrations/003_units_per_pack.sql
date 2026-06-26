-- Migration 003: per-unit selling (e.g. sell tablets from a strip)
-- Run this in the Supabase SQL Editor if you already applied schema.sql earlier.

-- Add units_per_pack to medicines (1 = no sub-units, 10 = 10 tablets per strip, etc.)
ALTER TABLE medicines
  ADD COLUMN IF NOT EXISTS units_per_pack INTEGER DEFAULT 1 CHECK (units_per_pack >= 1);

-- Replace record_sale with a version that supports selling by individual unit
CREATE OR REPLACE FUNCTION record_sale(
  p_medicine_id      BIGINT,
  p_quantity_sold    INTEGER,   -- count in the selling unit (tablets if p_sell_by_unit=true, packs otherwise)
  p_customer_name    TEXT    DEFAULT '',
  p_discount_percent NUMERIC DEFAULT NULL,
  p_sell_by_unit     BOOLEAN DEFAULT FALSE  -- TRUE = selling individual tablets/units, not full packs
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_med              medicines%ROWTYPE;
  v_discount         NUMERIC(5,2);
  v_pack_sale_price  NUMERIC(10,4);
  v_unit_sale_price  NUMERIC(10,4);
  v_total_revenue    NUMERIC(10,2);
  v_total_cost       NUMERIC(10,2);
  v_profit           NUMERIC(10,2);
  v_sale_id          BIGINT;
  v_packs_to_deduct  INTEGER;
  v_utp              INTEGER;
BEGIN
  SELECT * INTO v_med FROM medicines WHERE id = p_medicine_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Medicine not found';
  END IF;

  v_utp             := COALESCE(v_med.units_per_pack, 1);
  v_discount        := COALESCE(p_discount_percent, v_med.discount_percent);
  v_pack_sale_price := ROUND(v_med.mrp * (1 - v_discount / 100.0), 4);

  IF p_sell_by_unit AND v_utp > 1 THEN
    -- Selling individual units (tablets): each unit = 1/utp of a pack
    v_packs_to_deduct := CEIL(p_quantity_sold::NUMERIC / v_utp);
    v_unit_sale_price := v_pack_sale_price / v_utp;
    v_total_revenue   := ROUND(v_unit_sale_price * p_quantity_sold, 2);
    v_total_cost      := ROUND((v_med.cost_price::NUMERIC / v_utp) * p_quantity_sold, 2);
  ELSE
    -- Selling full packs (strips / bottles)
    v_packs_to_deduct := p_quantity_sold;
    v_total_revenue   := ROUND(v_pack_sale_price * p_quantity_sold, 2);
    v_total_cost      := ROUND(v_med.cost_price * p_quantity_sold, 2);
  END IF;

  IF v_med.quantity < v_packs_to_deduct THEN
    RAISE EXCEPTION 'Insufficient stock. Available: % %', v_med.quantity, v_med.unit;
  END IF;

  v_profit := v_total_revenue - v_total_cost;

  INSERT INTO sales (
    medicine_id, medicine_name, batch_number, quantity_sold,
    mrp, discount_percent, sale_price, total_revenue,
    cost_price, total_cost, profit, customer_name
  ) VALUES (
    p_medicine_id, v_med.name, v_med.batch_number, p_quantity_sold,
    v_med.mrp, v_discount, ROUND(v_pack_sale_price, 2), v_total_revenue,
    v_med.cost_price, v_total_cost, v_profit, p_customer_name
  ) RETURNING id INTO v_sale_id;

  UPDATE medicines SET quantity = quantity - v_packs_to_deduct WHERE id = p_medicine_id;

  RETURN json_build_object(
    'sale_id',         v_sale_id,
    'total_revenue',   v_total_revenue,
    'profit',          v_profit,
    'remaining_stock', v_med.quantity - v_packs_to_deduct
  );
END;
$$;
