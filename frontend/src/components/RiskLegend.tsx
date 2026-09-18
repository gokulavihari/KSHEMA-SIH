import React from 'react';

export const RiskLegend: React.FC = () => {
  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 backdrop-blur-md shadow-xl text-xs space-y-3 text-slate-200">
      <div>
        <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1 mb-2">
          RISK ASSESSMENT LEVELS
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
            <span>LOW (0–20)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>MODERATE (21–40)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>HIGH (41–60)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>VERY HIGH (61–80)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-800"></span>
            <span>CRITICAL (81–100)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500"></span>
            <span>UNKNOWN</span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-2 space-y-1.5">
        <div className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
          LOCATION BOUNDARIES
        </div>
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-400/20"></span>
          <span><b>LOCAL ASSESSMENT AREA</b> (Model Radius)</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="w-3 h-3 rounded-full border border-dashed border-blue-400 bg-blue-400/10"></span>
          <span><b>GPS POSITION ACCURACY</b> (e.g. ±116m)</span>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-2 space-y-1.5">
        <div className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
          HAZARD LAYERS & SITES
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-red-950 border border-red-500"></span>
            <span>Hazard Red Zone</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Safe Relocation Site</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Unsafe/Rejected Site</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-0.5 bg-sky-400"></span>
            <span>River Network</span>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800 leading-tight">
        *Color indicates model assessment at selected location; not an official government warning zone.
      </div>
    </div>
  );
};
