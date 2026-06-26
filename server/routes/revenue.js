const express = require('express');
const router = express.Router();
const db = require('../db');

// GET overall summary stats
router.get('/summary', (req, res) => {
  const overall = db.prepare(`
    SELECT
      COUNT(*) as total_sales,
      COALESCE(SUM(total_revenue), 0) as total_revenue,
      COALESCE(SUM(total_cost), 0) as total_cost,
      COALESCE(SUM(profit), 0) as total_profit,
      COALESCE(SUM(quantity_sold), 0) as total_items_sold
    FROM sales
  `).get();

  const today = db.prepare(`
    SELECT
      COALESCE(SUM(total_revenue), 0) as revenue,
      COALESCE(SUM(profit), 0) as profit,
      COUNT(*) as sales
    FROM sales WHERE date(sale_date) = date('now')
  `).get();

  const thisMonth = db.prepare(`
    SELECT
      COALESCE(SUM(total_revenue), 0) as revenue,
      COALESCE(SUM(profit), 0) as profit,
      COUNT(*) as sales
    FROM sales WHERE strftime('%Y-%m', sale_date) = strftime('%Y-%m', 'now')
  `).get();

  const inventoryValue = db.prepare(`
    SELECT
      COUNT(*) as total_medicines,
      COALESCE(SUM(quantity), 0) as total_stock,
      COALESCE(SUM(cost_price * quantity), 0) as stock_value_at_cost,
      COALESCE(SUM(mrp * quantity), 0) as stock_value_at_mrp
    FROM medicines
  `).get();

  const lowStock = db.prepare(`
    SELECT COUNT(*) as cnt FROM medicines WHERE quantity <= 10 AND quantity > 0
  `).get();

  const expiringCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM medicines
    WHERE date(expiry_date) <= date('now', '+30 days') AND quantity > 0
  `).get();

  res.json({
    overall,
    today,
    thisMonth,
    inventoryValue,
    lowStock: lowStock.cnt,
    expiringCount: expiringCount.cnt
  });
});

// GET monthly revenue breakdown
router.get('/monthly', (req, res) => {
  const { year } = req.query;
  const targetYear = year || new Date().getFullYear();

  const data = db.prepare(`
    SELECT
      strftime('%Y-%m', sale_date) as month,
      strftime('%m', sale_date) as month_num,
      COUNT(*) as total_sales,
      COALESCE(SUM(total_revenue), 0) as revenue,
      COALESCE(SUM(total_cost), 0) as cost,
      COALESCE(SUM(profit), 0) as profit,
      COALESCE(SUM(quantity_sold), 0) as items_sold
    FROM sales
    WHERE strftime('%Y', sale_date) = ?
    GROUP BY strftime('%Y-%m', sale_date)
    ORDER BY month ASC
  `).all(String(targetYear));

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const result = months.map((label, i) => {
    const monthStr = String(i + 1).padStart(2, '0');
    const found = data.find(d => d.month_num === monthStr);
    return {
      month: label,
      month_key: `${targetYear}-${monthStr}`,
      revenue: found ? found.revenue : 0,
      cost: found ? found.cost : 0,
      profit: found ? found.profit : 0,
      total_sales: found ? found.total_sales : 0,
      items_sold: found ? found.items_sold : 0
    };
  });

  res.json(result);
});

// GET daily revenue breakdown for a given month
router.get('/daily', (req, res) => {
  const { month } = req.query;
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const data = db.prepare(`
    SELECT
      date(sale_date) as sale_day,
      COUNT(*) as total_sales,
      COALESCE(SUM(total_revenue), 0) as revenue,
      COALESCE(SUM(total_cost), 0) as cost,
      COALESCE(SUM(profit), 0) as profit,
      COALESCE(SUM(quantity_sold), 0) as items_sold
    FROM sales
    WHERE strftime('%Y-%m', sale_date) = ?
    GROUP BY date(sale_date)
    ORDER BY sale_day ASC
  `).all(targetMonth);

  res.json(data);
});

// GET top selling medicines
router.get('/top-medicines', (req, res) => {
  const { limit = 10, month } = req.query;
  let query = `
    SELECT
      medicine_name,
      SUM(quantity_sold) as total_qty,
      SUM(total_revenue) as total_revenue,
      SUM(profit) as total_profit
    FROM sales
  `;
  const params = [];
  if (month) {
    query += " WHERE strftime('%Y-%m', sale_date) = ?";
    params.push(month);
  }
  query += ' GROUP BY medicine_name ORDER BY total_revenue DESC LIMIT ?';
  params.push(parseInt(limit));

  res.json(db.prepare(query).all(...params));
});

module.exports = router;
