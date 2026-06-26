const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all medicines
router.get('/', (req, res) => {
  const { search, category } = req.query;
  let query = 'SELECT * FROM medicines';
  const params = [];
  const conditions = [];

  if (search) {
    conditions.push('(name LIKE ? OR manufacturer LIKE ? OR batch_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY name ASC';

  res.json(db.prepare(query).all(...params));
});

// GET medicines expiring within N days (default 30)
router.get('/expiring', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const medicines = db.prepare(`
    SELECT *,
      CAST((julianday(expiry_date) - julianday('now')) AS INTEGER) AS days_remaining
    FROM medicines
    WHERE date(expiry_date) <= date('now', '+${days} days')
      AND quantity > 0
    ORDER BY expiry_date ASC
  `).all();
  res.json(medicines);
});

// GET categories list
router.get('/categories', (req, res) => {
  const cats = db.prepare('SELECT DISTINCT category FROM medicines ORDER BY category').all();
  res.json(cats.map(c => c.category));
});

// GET single medicine
router.get('/:id', (req, res) => {
  const med = db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
  if (!med) return res.status(404).json({ error: 'Medicine not found' });
  res.json(med);
});

// POST add new medicine
router.post('/', (req, res) => {
  const { name, manufacturer, batch_number, category, cost_price, mrp, discount_percent, quantity, unit, expiry_date } = req.body;

  if (!name || !cost_price || !mrp || !expiry_date || !quantity) {
    return res.status(400).json({ error: 'Name, cost price, MRP, quantity, and expiry date are required' });
  }
  if (cost_price <= 0 || mrp <= 0) return res.status(400).json({ error: 'Prices must be positive' });
  if (mrp < cost_price) return res.status(400).json({ error: 'MRP cannot be less than cost price' });

  const result = db.prepare(`
    INSERT INTO medicines (name, manufacturer, batch_number, category, cost_price, mrp, discount_percent, quantity, unit, expiry_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, manufacturer || '', batch_number || '', category || 'General', cost_price, mrp, discount_percent || 0, quantity, unit || 'strips', expiry_date);

  res.status(201).json(db.prepare('SELECT * FROM medicines WHERE id = ?').get(result.lastInsertRowid));
});

// PUT update medicine
router.put('/:id', (req, res) => {
  const { name, manufacturer, batch_number, category, cost_price, mrp, discount_percent, quantity, unit, expiry_date } = req.body;
  const existing = db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Medicine not found' });

  db.prepare(`
    UPDATE medicines SET
      name = ?, manufacturer = ?, batch_number = ?, category = ?,
      cost_price = ?, mrp = ?, discount_percent = ?,
      quantity = ?, unit = ?, expiry_date = ?
    WHERE id = ?
  `).run(
    name ?? existing.name,
    manufacturer ?? existing.manufacturer,
    batch_number ?? existing.batch_number,
    category ?? existing.category,
    cost_price ?? existing.cost_price,
    mrp ?? existing.mrp,
    discount_percent ?? existing.discount_percent,
    quantity ?? existing.quantity,
    unit ?? existing.unit,
    expiry_date ?? existing.expiry_date,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id));
});

// DELETE medicine
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Medicine not found' });
  db.prepare('DELETE FROM medicines WHERE id = ?').run(req.params.id);
  res.json({ message: 'Medicine deleted successfully' });
});

module.exports = router;
