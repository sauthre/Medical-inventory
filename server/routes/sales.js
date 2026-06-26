const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all sales with optional filters
router.get('/', (req, res) => {
  const { date, month } = req.query;
  let query = `
    SELECT s.*, m.quantity as remaining_stock
    FROM sales s
    LEFT JOIN medicines m ON s.medicine_id = m.id
  `;
  const params = [];
  const conditions = [];

  if (date) {
    conditions.push("date(s.sale_date) = date(?)");
    params.push(date);
  }
  if (month) {
    conditions.push("strftime('%Y-%m', s.sale_date) = ?");
    params.push(month);
  }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY s.sale_date DESC LIMIT 200';

  res.json(db.prepare(query).all(...params));
});

// POST record a sale (deducts from inventory)
router.post('/', (req, res) => {
  const { medicine_id, quantity_sold, customer_name } = req.body;

  if (!medicine_id || !quantity_sold || quantity_sold <= 0) {
    return res.status(400).json({ error: 'Medicine ID and positive quantity are required' });
  }

  const med = db.prepare('SELECT * FROM medicines WHERE id = ?').get(medicine_id);
  if (!med) return res.status(404).json({ error: 'Medicine not found' });
  if (med.quantity < quantity_sold) {
    return res.status(400).json({ error: `Insufficient stock. Available: ${med.quantity} ${med.unit}` });
  }

  const salePrice = med.mrp * (1 - med.discount_percent / 100);
  const totalRevenue = salePrice * quantity_sold;
  const totalCost = med.cost_price * quantity_sold;
  const profit = totalRevenue - totalCost;

  const sale = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO sales (medicine_id, medicine_name, batch_number, quantity_sold, mrp, discount_percent, sale_price, total_revenue, cost_price, total_cost, profit, customer_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      medicine_id, med.name, med.batch_number, quantity_sold,
      med.mrp, med.discount_percent, salePrice, totalRevenue,
      med.cost_price, totalCost, profit, customer_name || ''
    );

    db.prepare('UPDATE medicines SET quantity = quantity - ? WHERE id = ?').run(quantity_sold, medicine_id);
    return db.prepare('SELECT * FROM sales WHERE id = ?').get(result.lastInsertRowid);
  });

  res.status(201).json({ sale: sale(), remaining_stock: med.quantity - quantity_sold });
});

module.exports = router;
