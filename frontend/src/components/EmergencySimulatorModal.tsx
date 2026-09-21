import React, { useState } from 'react';
import { Radio, Send, ShieldAlert, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { triggerDemoEmergencyAlert } from '../services/api';

interface EmergencySimulatorModalProps {
  onClose: () => void;
  onTriggerSuccess?: (result: any) => void;
}

export const EmergencySimulatorModal: React.FC<EmergencySimulatorModalProps> = ({ onClose, onTriggerSuccess }) => {
  const [hazardType, setHazardType] = useState<string>('FLOOD');
  const [riskLevel, setRiskLevel] = useState<string>('CRITICAL');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  const handleSimulate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await triggerDemoEmergencyAlert(hazardType, riskLevel);
      setResult(res);
      if (onTriggerSuccess) onTriggerSuccess(res);
    } catch (err: any) {
      setResult({ error: err.message || 'Failed to trigger demo alert' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Emergency Alert Simulator</h3>
              <p className="text-[11px] text-purple-400 font-medium uppercase tracking-wider">Demo / Development Testing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Demo Disclaimer Badge */}
        <div className="bg-purple-950/40 border border-purple-500/30 rounded-2xl p-3 mb-5 flex items-start space-x-2 text-xs text-purple-200">
          <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-purple-300">DEMO ALERT — NOT A REAL EMERGENCY.</strong> Use this control to trigger a real browser Web Push notification for evaluation.
          </span>
        </div>

        {/* Form Controls */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Hazard Type</label>
            <select
              value={hazardType}
              onChange={(e) => setHazardType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-purple-500"
            >
              <option value="FLOOD">🌊 FLOOD HAZARD</option>
              <option value="LANDSLIDE">⛰️ LANDSLIDE HAZARD</option>
              <option value="CYCLONE">🌀 CYCLONE WARNING</option>
              <option value="EARTHQUAKE">🌋 SEISMIC / EARTHQUAKE</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Risk Level Severity</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRiskLevel('HIGH')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${riskLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
              >
                ⚠️ HIGH RISK
              </button>
              <button
                type="button"
                onClick={() => setRiskLevel('CRITICAL')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${riskLevel === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
              >
                🚨 CRITICAL RISK
              </button>
            </div>
          </div>
        </div>

        {/* Result Message */}
        {result && (
          <div className={`p-3 rounded-xl border mb-4 text-xs font-semibold ${result.error ? 'bg-rose-950/40 border-rose-500/30 text-rose-300' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'}`}>
            {result.error ? (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{result.error}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Simulated push sent! Active subscriptions notified: {result.subscriptions_notified}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleSimulate}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{loading ? 'Dispatching Demo Alert...' : 'Dispatch Simulated Web Push'}</span>
        </button>

      </div>
    </div>
  );
};
