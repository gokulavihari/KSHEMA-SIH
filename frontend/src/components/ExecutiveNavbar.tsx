import React from 'react';
import { CloudRain, Activity, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AashrayLogo } from './AashrayLogo';

interface ExecutiveNavbarProps {
  simulationLabel?: string;
  onQuickSimulate?: () => void;
}

export const ExecutiveNavbar: React.FC<ExecutiveNavbarProps> = ({
  simulationLabel = '1.0x Baseline Monsoon',
  onQuickSimulate
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-slate-950/95 border-b border-slate-800/80 px-6 flex items-center justify-between text-slate-100 backdrop-blur-md z-30 sticky top-0 select-none">
      <div className="flex items-center space-x-6">
        <AashrayLogo size="md" />
        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono text-[10px]">
          EXECUTIVE OPERATIONAL CONSOLE
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Simulation Scenario Indicator Badge */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-amber-500/40 px-3 py-1.5 rounded font-mono text-xs">
          <CloudRain className="w-4 h-4 text-amber-400" />
          <div className="text-xs">
            <span className="text-slate-500 block leading-none text-[9px]">SCENARIO</span>
            <span className="font-semibold text-amber-300">{simulationLabel}</span>
          </div>
        </div>

        {/* Executive Identity Badge */}
        <div className="hidden md:flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded text-slate-300 text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>{user?.official_id || 'EXEC-01'}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-sky-950 border border-sky-800 text-sky-300 rounded">
            {user?.role || 'EXECUTIVE'}
          </span>
        </div>

        {/* Quick Simulation Trigger */}
        {onQuickSimulate && (
          <button
            onClick={onQuickSimulate}
            className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs font-mono px-3.5 py-1.5 rounded transition-all active:scale-95 shadow-md"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>SIMULATE RAINFALL</span>
          </button>
        )}

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign Out of Executive Console"
          className="p-2 bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-800 rounded transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
