import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Home, AlertOctagon, ShieldCheck,
  Layers, Navigation, BrainCircuit, CloudRain, Bell,
  FileText, Database, Smartphone, History, Settings, LogOut, UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const execNavItems = [
  { path: '/executive/map', label: 'National Risk Map (GIS)', icon: Map },
  { path: '/executive/dashboard', label: 'Command Overview', icon: LayoutDashboard },
  { path: '/executive/habitations', label: 'Assessed Risk Locations', icon: Home },
  { path: '/executive/risk-analysis', label: 'Multi-Hazard Risk Engine', icon: AlertOctagon },
  { path: '/executive/relocation-sites', label: 'Safe Relocation Facilities', icon: ShieldCheck },
  { path: '/executive/capacity', label: 'Carrying Capacity Matrix', icon: Layers },
  { path: '/executive/relocation-planner', label: 'Relocation Optimizer', icon: Navigation },
  { path: '/executive/ai-insights', label: 'AI Explainability Logs', icon: BrainCircuit },
  { path: '/executive/simulation', label: 'Extreme Simulation', icon: CloudRain },
  { path: '/executive/alerts', label: 'System Alerts', icon: Bell },
  { path: '/executive/reports', label: 'Reports & Exports', icon: FileText },
  { path: '/executive/data-sources', label: 'Data Sources & Provenance', icon: Database },
  { path: '/executive/field-mode', label: 'Field Officer Mobile Mode', icon: Smartphone },
  { path: '/executive/audit-logs', label: 'Decision Audit Trail', icon: History },
  { path: '/executive/settings', label: 'System Settings', icon: Settings },
];

export const ExecutiveSidebar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-command-card border-r border-command-border flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 z-20 select-none shrink-0">
      <div className="py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-blue-400 font-mono flex items-center justify-between">
          <span>EXECUTIVE CONSOLE</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700/60 text-[9px]">
            {user?.role || 'AUTHORIZED'}
          </span>
        </div>

        {execNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border-l-4 border-blue-500 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* User Badge & Logout */}
      <div className="p-3 border-t border-command-border bg-slate-900/60 text-xs text-slate-300 space-y-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-blue-950 border border-blue-700/80 rounded-lg text-blue-400">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="truncate flex-1">
            <span className="font-bold text-slate-100 block text-xs truncate">
              {user?.full_name || 'Executive Officer'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono block">
              ID: {user?.official_id || 'EXEC-01'}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full mt-1 py-1.5 px-3 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center space-x-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
