import React from 'react';
import { Settings, Save, ShieldCheck } from 'lucide-react';
import { API_TARGET } from '../config';

export const SettingsView: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100">AASHRAY Platform Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Configure pilot district, API backend connections & security parameters.</p>
      </div>

      <div className="bg-command-card border border-command-border p-6 rounded-xl space-y-4 text-xs">
        <h3 className="font-bold text-slate-200 border-b border-command-border pb-2">Active Pilot District Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 block mb-1">Target District:</label>
            <input type="text" value="Chamoli District" disabled className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2" />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">State:</label>
            <input type="text" value="Uttarakhand" disabled className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2" />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Backend Server Base URL:</label>
            <input type="text" value={`${API_TARGET}/api`} disabled className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 font-mono" />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Spatial Engine Mode:</label>
            <input type="text" value="Dual Engine (PostgreSQL/PostGIS + GeoPandas)" disabled className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2" />
          </div>
        </div>
      </div>
    </div>
  );
};
