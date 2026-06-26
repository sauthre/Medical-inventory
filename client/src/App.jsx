import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import ExpiryAlert from './pages/ExpiryAlert';
import Revenue from './pages/Revenue';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
        <Activity className="w-7 h-7 text-white" />
      </div>
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Keep session in sync (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading)  return <LoadingScreen />;
  if (!session) return <Login />;

  return (
    <Router>
      <Layout session={session}>
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sales"    element={<Sales />} />
          <Route path="/expiry"   element={<ExpiryAlert />} />
          <Route path="/revenue"  element={<Revenue />} />
        </Routes>
      </Layout>
    </Router>
  );
}
