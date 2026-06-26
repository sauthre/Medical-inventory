import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import ExpiryAlert from './pages/ExpiryAlert';
import Revenue from './pages/Revenue';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/expiry" element={<ExpiryAlert />} />
          <Route path="/revenue" element={<Revenue />} />
        </Routes>
      </Layout>
    </Router>
  );
}
