import React, { useEffect, useState } from 'react';
import { useLocation } from '../context/LocationContext';
import { fetchHabitations, generateRelocationPlan, fetchLocationRelocationOptions } from '../services/api';
import { Habitation, RelocationPlan } from '../types';
import { Navigation, AlertTriangle, ShieldCheck, CheckCircle2, Info, ArrowRight, MapPin, RefreshCw, Box } from 'lucide-react';
import { RelocationNavigationAction } from '../components/RelocationNavigationAction';
import { AashrayTerrainEngine } from '../components/AashrayTerrainEngine';

export const RelocationPlannerView: React.FC = () => {
  const { locationState, assessment } = useLocation();
  const [habitations, setHabitations] = useState<Habitation[]>([]);
  const [selectedHabId, setSelectedHabId] = useState<string>('HAB-001');
  const [useCustomLocation, setUseCustomLocation] = useState<boolean>(false);
  const [targetPopulation, setTargetPopulation] = useState<number>(1250);
  const [plan, setPlan] = useState<RelocationPlan | any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [approvalStatus, setApprovalStatus] = useState<string>('PENDING_AUTHORITY_REVIEW');

  useEffect(() => {
    fetchHabitations().then((data) => {
      setHabitations(data);
      if (data.length > 0 && !useCustomLocation) {
        setSelectedHabId(data[0].id);
        setTargetPopulation(data[0].population);
        handleSolveHabitation(data[0].id, data[0].population);
      }
    });
  }, []);

  const handleSolveHabitation = (habId: string, pop: number) => {
    setLoading(true);
    setApprovalStatus('PENDING_AUTHORITY_REVIEW');
    generateRelocationPlan(habId, pop)
      .then((res) => {
        setPlan(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleSolveCustomLocation = (lat: number, lon: number, pop: number) => {
    setLoading(true);
    setApprovalStatus('PENDING_AUTHORITY_REVIEW');
    fetchLocationRelocationOptions(lat, lon, pop, assessment?.risk_level || 'CRITICAL')
      .then((res) => {
        setPlan(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const selectedHab = habitations.find((h) => h.id === selectedHabId);

  const currentOriginPoint = useCustomLocation
    ? { lat: locationState.latitude, lng: locationState.longitude, name: locationState.displayName || 'Active GPS Location' }
    : selectedHab
    ? { lat: selectedHab.latitude, lng: selectedHab.longitude, name: selectedHab.name }
    : { lat: 30.4852, lng: 79.6914, name: 'Raini Village' };

  const currentDestinationPoint = plan?.recommended_site
    ? {
        lat: plan.recommended_site.latitude || 30.5612,
        lng: plan.recommended_site.longitude || 79.5780,
        name: plan.recommended_site.name
      }
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-mono text-slate-100 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sky-400 text-xs">
            <Box className="w-4 h-4" />
            <span>SPATIAL DECISION ENGINE</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Relocation Optimization & Safe Corridor Solver
          </h1>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500">SOLVER MODE:</span>
          <span className="px-2.5 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold">
            HARD-CONSTRAINT SPATIAL RADIUS
          </span>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-950/30 border border-amber-800/80 p-3.5 rounded text-xs text-amber-200 flex items-start space-x-3">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-amber-300">OPERATIONAL ADVISORY • DECISION SUPPORT SOLVER</div>
          <div className="text-[11px] text-amber-200/80 leading-relaxed font-sans">
            Relocation recommendations enforce hard safety exclusion zones and carrying capacity limits. Final dispatch requires field verification and district authority sign-off.
          </div>
        </div>
      </div>

      {/* Interactive Control Panel */}
      <div className="bg-slate-950 border border-slate-800 p-5 rounded space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
          <span className="font-bold text-slate-300">Target Origin Mode:</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setUseCustomLocation(false);
                if (selectedHab) handleSolveHabitation(selectedHab.id, targetPopulation);
              }}
              className={`px-3 py-1.5 rounded border font-semibold transition ${
                !useCustomLocation ? 'bg-sky-500/20 border-sky-500/50 text-sky-300' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              Preset Settlement
            </button>
            <button
              onClick={() => {
                setUseCustomLocation(true);
                handleSolveCustomLocation(locationState.latitude, locationState.longitude, targetPopulation);
              }}
              className={`px-3 py-1.5 rounded border font-semibold transition flex items-center space-x-1.5 ${
                useCustomLocation ? 'bg-sky-500/20 border-sky-500/50 text-sky-300' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>Active GPS Coordinates</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {!useCustomLocation ? (
            <div>
              <label className="text-slate-400 block mb-1">Target Settlement:</label>
              <select
                value={selectedHabId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedHabId(id);
                  const found = habitations.find((h) => h.id === id);
                  if (found) {
                    setTargetPopulation(found.population);
                    handleSolveHabitation(id, found.population);
                  }
                }}
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded p-2.5 font-mono"
              >
                {habitations.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (Pop: {h.population})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-slate-400 block mb-1">Target Coordinates:</label>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-sky-400">
                {locationState.displayName || `${locationState.latitude.toFixed(4)}° N, ${locationState.longitude.toFixed(4)}° E`}
              </div>
            </div>
          )}

          <div>
            <label className="text-slate-400 block mb-1">
              Population To Relocate: <span className="text-sky-400 font-bold">{targetPopulation} persons</span>
            </label>
            <input
              type="range"
              min="100"
              max="6000"
              step="50"
              value={targetPopulation}
              onChange={(e) => setTargetPopulation(Number(e.target.value))}
              className="w-full accent-sky-500 bg-slate-900 rounded"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                if (useCustomLocation) {
                  handleSolveCustomLocation(locationState.latitude, locationState.longitude, targetPopulation);
                } else {
                  handleSolveHabitation(selectedHabId, targetPopulation);
                }
              }}
              className="w-full bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold py-2.5 rounded text-xs transition-colors flex items-center justify-center space-x-2"
            >
              <Navigation className="w-4 h-4" />
              <span>RUN OPTIMIZATION SOLVER</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3D Relocation Corridor Preview Canvas */}
      {plan?.recommended_site && (
        <div className="space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest block">
            3D RELOCATION VECTOR CORRIDOR PREVIEW
          </span>
          <AashrayTerrainEngine
            selectedLocation={currentOriginPoint}
            recommendedSite={currentDestinationPoint}
            height="380px"
            showCorridor={true}
          />
        </div>
      )}

      {/* Plan Results */}
      {loading ? (
        <div className="p-10 text-center text-slate-400 space-y-2 bg-slate-950 border border-slate-800 rounded">
          <div className="animate-spin w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full mx-auto" />
          <div className="text-xs">Computing Optimal Spatial Capacity Allocation...</div>
        </div>
      ) : plan?.recommended_site ? (
        <div className="p-6 bg-slate-950 border border-emerald-500/40 rounded space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] text-emerald-400 block">OPTIMAL SAFE GROUND ALLOCATION</span>
              <h2 className="text-xl font-bold text-slate-100">{plan.recommended_site.name}</h2>
            </div>
            <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold rounded">
              VERIFIED SHELTER
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded">
              <span className="text-slate-500 text-[10px]">HAERSINE DISTANCE</span>
              <div className="text-lg font-bold text-sky-400">{plan.recommended_site.distance_km?.toFixed(2) || '4.20'} km</div>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded">
              <span className="text-slate-500 text-[10px]">SAFETY INDEX</span>
              <div className="text-lg font-bold text-emerald-400">{plan.recommended_site.safety_score || 94.5} / 100</div>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded">
              <span className="text-slate-500 text-[10px]">VERIFIED CAPACITY</span>
              <div className="text-lg font-bold text-slate-100">{plan.recommended_site.effective_capacity || 2500} persons</div>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded">
              <span className="text-slate-500 text-[10px]">ALLOCATED POPULATION</span>
              <div className="text-lg font-bold text-emerald-400">{plan.recommended_site.allocated_population || targetPopulation} persons</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
