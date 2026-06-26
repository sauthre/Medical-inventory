const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'inventory.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    manufacturer TEXT DEFAULT '',
    batch_number TEXT DEFAULT '',
    category TEXT DEFAULT 'General',
    cost_price REAL NOT NULL,
    mrp REAL NOT NULL,
    discount_percent REAL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'strips',
    expiry_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER NOT NULL,
    medicine_name TEXT NOT NULL,
    batch_number TEXT,
    quantity_sold INTEGER NOT NULL,
    mrp REAL NOT NULL,
    discount_percent REAL NOT NULL,
    sale_price REAL NOT NULL,
    total_revenue REAL NOT NULL,
    cost_price REAL NOT NULL,
    total_cost REAL NOT NULL,
    profit REAL NOT NULL,
    customer_name TEXT DEFAULT '',
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id)
  );
`);

const count = db.prepare('SELECT COUNT(*) as cnt FROM medicines').get();
if (count.cnt === 0) {
  const today = new Date();
  const addDays = (d) => {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    return date.toISOString().split('T')[0];
  };

  const medicines = [
    { name: 'Paracetamol 500mg', manufacturer: 'Cipla Ltd', batch: 'B2024001', category: 'Analgesic', cost: 28, mrp: 42, discount: 5, qty: 150, unit: 'strips', expiry: addDays(365) },
    { name: 'Amoxicillin 250mg', manufacturer: 'Sun Pharma', batch: 'B2024002', category: 'Antibiotic', cost: 95, mrp: 145, discount: 10, qty: 80, unit: 'strips', expiry: addDays(280) },
    { name: 'Cough Syrup 100ml', manufacturer: 'Himalaya', batch: 'B2024003', category: 'Respiratory', cost: 55, mrp: 85, discount: 5, qty: 60, unit: 'bottles', expiry: addDays(18) },
    { name: 'Vitamin C 500mg', manufacturer: 'Abbott India', batch: 'B2024004', category: 'Supplements', cost: 120, mrp: 180, discount: 10, qty: 200, unit: 'strips', expiry: addDays(500) },
    { name: 'Aspirin 75mg', manufacturer: 'Bayer', batch: 'B2024005', category: 'Cardiac', cost: 18, mrp: 30, discount: 0, qty: 300, unit: 'strips', expiry: addDays(400) },
    { name: 'Omeprazole 20mg', manufacturer: 'Dr Reddys', batch: 'B2024006', category: 'Gastro', cost: 65, mrp: 98, discount: 8, qty: 120, unit: 'strips', expiry: addDays(320) },
    { name: 'Cetirizine 10mg', manufacturer: 'Cipla Ltd', batch: 'B2024007', category: 'Anti-allergy', cost: 22, mrp: 35, discount: 5, qty: 8, unit: 'strips', expiry: addDays(10) },
    { name: 'Metformin 500mg', manufacturer: 'USV Ltd', batch: 'B2024008', category: 'Diabetic', cost: 42, mrp: 65, discount: 0, qty: 180, unit: 'strips', expiry: addDays(600) },
    { name: 'Azithromycin 500mg', manufacturer: 'Pfizer', batch: 'B2024009', category: 'Antibiotic', cost: 185, mrp: 270, discount: 12, qty: 5, unit: 'strips', expiry: addDays(25) },
    { name: 'Atorvastatin 10mg', manufacturer: 'Ranbaxy', batch: 'B2024010', category: 'Cardiac', cost: 78, mrp: 120, discount: 5, qty: 90, unit: 'strips', expiry: addDays(450) },
    { name: 'Ibuprofen 400mg', manufacturer: 'Wockhardt', batch: 'B2024011', category: 'Analgesic', cost: 32, mrp: 50, discount: 5, qty: 110, unit: 'strips', expiry: addDays(390) },
    { name: 'Pantoprazole 40mg', manufacturer: 'Torrent Pharma', batch: 'B2024012', category: 'Gastro', cost: 88, mrp: 135, discount: 10, qty: 75, unit: 'strips', expiry: addDays(7) },
    { name: 'Multivitamin Syrup', manufacturer: 'Pfizer', batch: 'B2024013', category: 'Supplements', cost: 110, mrp: 165, discount: 5, qty: 40, unit: 'bottles', expiry: addDays(22) },
    { name: 'Dolo 650mg', manufacturer: 'Micro Labs', batch: 'B2024014', category: 'Analgesic', cost: 25, mrp: 38, discount: 0, qty: 250, unit: 'strips', expiry: addDays(480) },
    { name: 'Digene Antacid', manufacturer: 'Abbott India', batch: 'B2024015', category: 'Gastro', cost: 38, mrp: 60, discount: 5, qty: 55, unit: 'bottles', expiry: addDays(330) },
  ];

  const insertMed = db.prepare(`
    INSERT INTO medicines (name, manufacturer, batch_number, category, cost_price, mrp, discount_percent, quantity, unit, expiry_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((meds) => {
    for (const m of meds) {
      insertMed.run(m.name, m.manufacturer, m.batch, m.category, m.cost, m.mrp, m.discount, m.qty, m.unit, m.expiry);
    }
  });
  insertMany(medicines);

  // Seed some sales across past 30 days
  const insertSale = db.prepare(`
    INSERT INTO sales (medicine_id, medicine_name, batch_number, quantity_sold, mrp, discount_percent, sale_price, total_revenue, cost_price, total_cost, profit, customer_name, sale_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sampleSales = [
    { med_id: 1, name: 'Paracetamol 500mg', batch: 'B2024001', qty: 3, mrp: 42, disc: 5, cost: 28, customer: 'Ramesh Kumar', daysAgo: 0 },
    { med_id: 4, name: 'Vitamin C 500mg', batch: 'B2024004', qty: 2, mrp: 180, disc: 10, cost: 120, customer: 'Priya Sharma', daysAgo: 0 },
    { med_id: 2, name: 'Amoxicillin 250mg', batch: 'B2024002', qty: 1, mrp: 145, disc: 10, cost: 95, customer: 'Suresh Patel', daysAgo: 1 },
    { med_id: 6, name: 'Omeprazole 20mg', batch: 'B2024006', qty: 2, mrp: 98, disc: 8, cost: 65, customer: 'Anil Mehta', daysAgo: 1 },
    { med_id: 5, name: 'Aspirin 75mg', batch: 'B2024005', qty: 4, mrp: 30, disc: 0, cost: 18, customer: 'Kavita Singh', daysAgo: 2 },
    { med_id: 14, name: 'Dolo 650mg', batch: 'B2024014', qty: 5, mrp: 38, disc: 0, cost: 25, customer: 'Mohan Das', daysAgo: 2 },
    { med_id: 8, name: 'Metformin 500mg', batch: 'B2024008', qty: 3, mrp: 65, disc: 0, cost: 42, customer: 'Sunita Rao', daysAgo: 3 },
    { med_id: 11, name: 'Ibuprofen 400mg', batch: 'B2024011', qty: 2, mrp: 50, disc: 5, cost: 32, customer: 'Vijay Kumar', daysAgo: 5 },
    { med_id: 1, name: 'Paracetamol 500mg', batch: 'B2024001', qty: 6, mrp: 42, disc: 5, cost: 28, customer: 'Walk-in', daysAgo: 7 },
    { med_id: 4, name: 'Vitamin C 500mg', batch: 'B2024004', qty: 3, mrp: 180, disc: 10, cost: 120, customer: 'Deepak Joshi', daysAgo: 7 },
    { med_id: 10, name: 'Atorvastatin 10mg', batch: 'B2024010', qty: 2, mrp: 120, disc: 5, cost: 78, customer: 'Rajan Iyer', daysAgo: 10 },
    { med_id: 6, name: 'Omeprazole 20mg', batch: 'B2024006', qty: 3, mrp: 98, disc: 8, cost: 65, customer: 'Nalini Gupta', daysAgo: 12 },
    { med_id: 15, name: 'Digene Antacid', batch: 'B2024015', qty: 2, mrp: 60, disc: 5, cost: 38, customer: 'Walk-in', daysAgo: 14 },
    { med_id: 5, name: 'Aspirin 75mg', batch: 'B2024005', qty: 3, mrp: 30, disc: 0, cost: 18, customer: 'Harish Nair', daysAgo: 15 },
    { med_id: 2, name: 'Amoxicillin 250mg', batch: 'B2024002', qty: 2, mrp: 145, disc: 10, cost: 95, customer: 'Meena Pillai', daysAgo: 18 },
    { med_id: 8, name: 'Metformin 500mg', batch: 'B2024008', qty: 4, mrp: 65, disc: 0, cost: 42, customer: 'Gopal Varma', daysAgo: 20 },
    { med_id: 14, name: 'Dolo 650mg', batch: 'B2024014', qty: 8, mrp: 38, disc: 0, cost: 25, customer: 'Walk-in', daysAgo: 22 },
    { med_id: 1, name: 'Paracetamol 500mg', batch: 'B2024001', qty: 4, mrp: 42, disc: 5, cost: 28, customer: 'Radha Krishnan', daysAgo: 25 },
    { med_id: 13, name: 'Multivitamin Syrup', batch: 'B2024013', qty: 1, mrp: 165, disc: 5, cost: 110, customer: 'Sanjay Tripathi', daysAgo: 27 },
    { med_id: 11, name: 'Ibuprofen 400mg', batch: 'B2024011', qty: 3, mrp: 50, disc: 5, cost: 32, customer: 'Uma Shankar', daysAgo: 30 },
  ];

  const insertSalesMany = db.transaction((sales) => {
    for (const s of sales) {
      const salePrice = s.mrp * (1 - s.disc / 100);
      const totalRevenue = salePrice * s.qty;
      const totalCost = s.cost * s.qty;
      const profit = totalRevenue - totalCost;
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - s.daysAgo);
      insertSale.run(
        s.med_id, s.name, s.batch, s.qty, s.mrp, s.disc,
        salePrice, totalRevenue, s.cost, totalCost, profit,
        s.customer, saleDate.toISOString()
      );
    }
  });
  insertSalesMany(sampleSales);
}

module.exports = db;
