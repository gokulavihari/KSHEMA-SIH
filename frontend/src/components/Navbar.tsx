import React from 'react';
import { ShieldAlert, CloudRain, Activity, AlertTriangle } from 'lucide-react';

interface NavbarProps {
  simulationLabel?: string;
  onQuickSimulate?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  simulationLabel = '1.0x Baseline Monsoon',
  onQuickSimulate
}) => {
  return (
    <header className="h-16 bg-command-card border-b border-command-border px-6 flex items-center justify-between text-command-text shadow-lg z-30 sticky top-0">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-red-950/60 border border-red-800/80 rounded-lg flex items-center justify-center text-red-500 shadow-inner">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-lg tracking-wide text-slate-100">AASHRAY</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-400 font-mono font-medium">
              NDRF / MHA
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            AI-Assisted Hazard Assessment, Safe Habitat & Relocation System
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Simulation Scenario Indicator Badge */}
        <div className="flex items-center space-x-2 bg-slate-900/90 border border-amber-500/40 px-3 py-1.5 rounded-lg">
          <CloudRain className="w-4 h-4 text-amber-400" />
          <div className="text-xs">
            <span className="text-slate-400 block leading-none text-[10px]">SCENARIO</span>
            <span className="font-semibold text-amber-300">{simulationLabel}</span>
          </div>
        </div>

        {/* SIH Demo Mode Badge */}
        <div className="hidden md:flex items-center space-x-1.5 bg-indigo-950/80 border border-indigo-700/80 px-3 py-1.5 rounded-lg text-indigo-300 text-xs font-semibold">
          <Activity className="w-4 h-4 text-indigo-400" />
          <span>PROTOTYPE DECISION SUPPORT</span>
        </div>

        {/* Quick Simulation Trigger */}
        {onQuickSimulate && (
          <button
            onClick={onQuickSimulate}
            className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-md transition-all active:scale-95 border border-amber-400/30"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>SIMULATE RAINFALL</span>
          </button>
        )}
      </div>
    </header>
  );
};
