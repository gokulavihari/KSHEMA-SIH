import React, { useState } from 'react';
import { runRainfallSimulation, resetSimulation } from '../services/api';
import { LocationHeader } from '../components/LocationHeader';
import { ChangeLocationModal } from '../components/ChangeLocationModal';
import { useLocation } from '../context/LocationContext';
import { CloudRain, AlertTriangle, RefreshCw, ArrowRight, Activity, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SimulationCommandView: React.FC = () => {
  const { locationState, refreshAssessment } = useLocation();
  const [multiplier, setMultiplier] = useState<number>(2.5);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);

  const handleSimulate = (m: number) => {
    setLoading(true);
    runRainfallSimulation(m)
      .then((res) => {
        setResult(res);
        refreshAssessment();
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleReset = () => {
    setResetting(true);
    resetSimulation()
      .then(() => {
        setResult(null);
        setMultiplier(1.0);
        refreshAssessment();
        setResetting(false);
      })
      .catch(() => setResetting(false));
  };

  return (
    <div className="min-h-screen bg-command-bg pb-12">
      <LocationHeader />
      <ChangeLocationModal />

      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <div className="p-3 bg-purple-950/80 border border-purple-700/80 rounded-lg text-purple-200 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            SCENARIO SIMULATION MODE — DYNAMIC HYPOTHETICAL TESTING (NOT AN OFFICIAL WARNING)
          </span>
          <span className="font-mono text-purple-300">Active Location: {locationState.displayName}</span>
        </div>

      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <CloudRain className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-extrabold text-slate-100">Extreme Rainfall Scenario Simulator</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Dynamic cloudburst & extreme monsoon stress-testing tool. Recalculates multi-hazard risk, Red-Zone polygons, priorities & relocation allocations across the backend pipeline.
        </p>
      </div>

      {/* Control Card */}
      <div className="bg-command-card border border-command-border p-6 rounded-xl space-y-5 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Scenario Multiplier:</span>
            <div className="flex items-center space-x-2 pt-1">
              {[1.0, 1.5, 2.0, 2.5, 3.0].map((val) => (
                <button
                  key={val}
                  onClick={() => setMultiplier(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                    multiplier === val
                      ? 'bg-amber-600 text-white shadow border border-amber-400'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
                  }`}
                >
                  {val}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleSimulate(multiplier)}
              disabled={loading}
              className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-xs px-5 py-3 rounded-lg shadow-lg transition-all active:scale-95 border border-amber-400/30"
            >
              {loading ? <Activity className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              <span>SIMULATE EXTREME RAINFALL ({multiplier}x)</span>
            </button>

            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-4 py-3 rounded-lg border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
              <span>RESET BASELINE</span>
            </button>
          </div>
        </div>

        <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-xs text-amber-300 font-semibold flex items-center justify-between">
          <span>⚠️ SCENARIO SIMULATION — NOT AN OFFICIAL GOVERNMENT WARNING OR EVACUATION ORDER</span>
          <span className="font-mono text-[11px]">PROTOTYPE DECISION SUPPORT</span>
        </div>
      </div>

      {/* Before / After Empirical Comparison Results */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BEFORE Card */}
            <div className="bg-command-card border border-command-border p-6 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-command-border pb-3">
                <h3 className="text-sm font-bold text-slate-300">BEFORE (Baseline Monsoon)</h3>
                <span className="text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-slate-400">
                  {result.before_metrics.rainfall_label}
                </span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Population at Risk:</span>
                  <span className="font-mono font-bold text-slate-100 text-sm">{result.before_metrics.population_at_risk}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Critical Habitations:</span>
                  <span className="font-mono font-bold text-slate-100 text-sm">{result.before_metrics.critical_habitations}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Immediate Relocation Count:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">{result.before_metrics.immediate_relocation_population}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Red-Zone Area:</span>
                  <span className="font-mono font-bold text-slate-100 text-sm">{result.before_metrics.red_zone_area_sqkm} km²</span>
                </div>
              </div>
            </div>

            {/* AFTER Card */}
            <div className="bg-command-card border border-red-800 p-6 rounded-xl space-y-4 shadow-xl bg-red-950/20">
              <div className="flex items-center justify-between border-b border-red-900/80 pb-3">
                <h3 className="text-sm font-bold text-red-400 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>AFTER SIMULATION ({result.rainfall_multiplier}x)</span>
                </h3>
                <span className="text-xs px-2.5 py-1 rounded bg-red-950 border border-red-700 font-mono text-red-300 font-bold">
                  {result.after_metrics.rainfall_label}
                </span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Population at Risk:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-red-400 text-sm">{result.after_metrics.population_at_risk}</span>
                    <span className="text-[10px] bg-red-950 text-red-300 px-1.5 py-0.5 rounded font-mono font-bold border border-red-800">
                      {result.delta.population_at_risk_delta}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Critical Habitations:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-red-400 text-sm">{result.after_metrics.critical_habitations}</span>
                    <span className="text-[10px] bg-red-950 text-red-300 px-1.5 py-0.5 rounded font-mono font-bold border border-red-800">
                      {result.delta.critical_habitations_delta}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Immediate Relocation Count:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-amber-400 text-sm">{result.after_metrics.immediate_relocation_population}</span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold border border-amber-800">
                      {result.delta.immediate_relocation_delta}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Red-Zone Area:</span>
                  <span className="font-mono font-bold text-red-400 text-sm">{result.after_metrics.red_zone_area_sqkm} km²</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              to="/map"
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow"
            >
              <span>INSPECT SIMULATED RED ZONES ON GIS MAP</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
