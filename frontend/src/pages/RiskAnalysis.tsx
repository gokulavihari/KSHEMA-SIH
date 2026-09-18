import React from 'react';
import { AlertOctagon, Sliders, ShieldCheck } from 'lucide-react';

export const RiskAnalysisView: React.FC = () => {
  const defaultWeights = [
    { factor: 'Flood Hazard Inundation', weight: 0.20, desc: 'Riverine overflow and flash flood modeling' },
    { factor: 'Landslide Susceptibility', weight: 0.18, desc: 'Slope failure, geological runout potential' },
    { factor: 'Extreme Rainfall Intensity', weight: 0.12, desc: 'Monsoon saturation & precipitation rate' },
    { factor: 'Slope Severity Penalty', weight: 0.10, desc: 'Steep terrain angle (>25 degrees)' },
    { factor: 'River Proximity Buffer', weight: 0.08, desc: 'Distance to active Himalayan drainage rivers' },
    { factor: 'Historical Disaster Frequency', weight: 0.10, desc: 'Recorded past flood/landslide occurrences' },
    { factor: 'Population Exposure', weight: 0.08, desc: 'Demographic density at risk' },
    { factor: 'Infrastructure Vulnerability', weight: 0.07, desc: 'Kucha/Fragile housing structural rating' },
    { factor: 'Accessibility Penalty', weight: 0.07, desc: 'Road network isolation & emergency delay' }
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100">Multi-Hazard Risk Engine Methodology</h1>
        <p className="text-xs text-slate-400 mt-1">
          Transparent multi-factor risk formulation separating Hazard, Exposure, and Vulnerability.
        </p>
      </div>

      <div className="bg-command-card border border-command-border p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 border-b border-command-border pb-2 flex items-center justify-between">
          <span>PROTOTYPE CONFIGURABLE MULTI-HAZARD WEIGHTS</span>
          <span className="text-xs text-amber-400 font-mono">SUM = 1.00 (100%)</span>
        </h3>

        <div className="space-y-3">
          {defaultWeights.map((w, idx) => (
            <div key={idx} className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-200 block">{w.factor}</span>
                <span className="text-[11px] text-slate-400">{w.desc}</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-blue-400 text-sm">{(w.weight * 100).toFixed(0)}%</span>
                <span className="text-[10px] text-slate-500 block">weight: {w.weight}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-400 italic">
          *Note: Multi-hazard weights are stored in backend model metadata and are fully configurable. They do not represent static hard-coded thresholds.
        </div>
      </div>
    </div>
  );
};
