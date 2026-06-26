import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart,
  AlertTriangle, TrendingUp, Activity, LogOut
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const navItems = [
  { path: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/inventory', icon: Package,         label: 'Inventory' },
  { path: '/sales',     icon: ShoppingCart,    label: 'Sales' },
  { path: '/expiry',    icon: AlertTriangle,   label: 'Expiry Alert' },
  { path: '/revenue',   icon: TrendingUp,      label: 'Revenue' },
];

export default function Layout({ children, session }) {
  const email    = session?.user?.email ?? '';
  const initials = email[0]?.toUpperCase() ?? '?';

  const handleSignOut = () => supabase.auth.signOut();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">MediStock</h1>
              <p className="text-slate-400 text-xs">Chemist Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + sign-out */}
        <div className="p-4 border-t border-slate-700 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <p className="text-slate-300 text-sm truncate">{email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
