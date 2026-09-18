import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Home, AlertOctagon, ShieldCheck,
  Layers, Navigation, BrainCircuit, CloudRain, Bell,
  FileText, Database, Smartphone, History, Settings
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Command Dashboard', icon: LayoutDashboard },
  { path: '/map', label: 'GIS Command Map', icon: Map },
  { path: '/habitations', label: 'Vulnerable Habitations', icon: Home },
  { path: '/risk-analysis', label: 'Multi-Hazard Risk Engine', icon: AlertOctagon },
  { path: '/relocation-sites', label: 'Safe Relocation Sites', icon: ShieldCheck },
  { path: '/capacity', label: 'Carrying Capacity Matrix', icon: Layers },
  { path: '/relocation-planner', label: 'Relocation Optimizer', icon: Navigation },
  { path: '/ai-insights', label: 'AI Explainability Logs', icon: BrainCircuit },
  { path: '/simulation', label: 'Extreme Simulation', icon: CloudRain },
  { path: '/alerts', label: 'System Alerts', icon: Bell },
  { path: '/reports', label: 'Reports & Exports', icon: FileText },
  { path: '/data-sources', label: 'Data Sources & Provenance', icon: Database },
  { path: '/field-mode', label: 'Field Officer Mobile Mode', icon: Smartphone },
  { path: '/audit-logs', label: 'Decision Audit Trail', icon: History },
  { path: '/settings', label: 'System Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-command-card border-r border-command-border flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 z-20 select-none">
      <div className="py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          OPERATIONAL COMMAND
        </div>
        {navItems.map((item) => {
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

      <div className="p-3 border-t border-command-border bg-slate-900/40 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>Engine Version:</span>
          <span className="font-mono text-slate-200">v1.0.4</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Mode:</span>
          <span className="text-emerald-400 font-semibold">DECISION SUPPORT</span>
        </div>
      </div>
    </aside>
  );
};
