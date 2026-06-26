-- Migration: allow per-sale discount override in record_sale()
-- Run this in the Supabase SQL Editor if you already applied schema.sql earlier.

CREATE OR REPLACE FUNCTION record_sale(
  p_medicine_id      BIGINT,
  p_quantity_sold    INTEGER,
  p_customer_name    TEXT    DEFAULT '',
  p_discount_percent NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_med           medicines%ROWTYPE;
  v_discount      NUMERIC(5,2);
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

  v_discount      := COALESCE(p_discount_percent, v_med.discount_percent);
  v_sale_price    := ROUND(v_med.mrp * (1 - v_discount / 100.0), 2);
  v_total_revenue := ROUND(v_sale_price * p_quantity_sold, 2);
  v_total_cost    := ROUND(v_med.cost_price * p_quantity_sold, 2);
  v_profit        := v_total_revenue - v_total_cost;

  INSERT INTO sales (
    medicine_id, medicine_name, batch_number, quantity_sold,
    mrp, discount_percent, sale_price, total_revenue,
    cost_price, total_cost, profit, customer_name
  ) VALUES (
    p_medicine_id, v_med.name, v_med.batch_number, p_quantity_sold,
    v_med.mrp, v_discount, v_sale_price, v_total_revenue,
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
