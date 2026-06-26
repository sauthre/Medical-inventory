const express = require('express');
const cors = require('cors');
const path = require('path');

const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const revenueRoutes = require('./routes/revenue');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/medicines', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/revenue', revenueRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`MediStock server running on http://localhost:${PORT}`);
});
