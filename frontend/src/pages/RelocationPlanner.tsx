import React, { useEffect, useState } from 'react';
import { useLocation } from '../context/LocationContext';
import { fetchHabitations, generateRelocationPlan, fetchLocationRelocationOptions } from '../services/api';
import { Habitation, RelocationPlan } from '../types';
import { Navigation, AlertTriangle, ShieldCheck, CheckCircle2, UserCheck, XCircle, Info, ArrowRight, Layers, HelpCircle, MapPin, RefreshCw } from 'lucide-react';
import { RelocationNavigationAction } from '../components/RelocationNavigationAction';

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center space-x-3">
          <Navigation className="w-6 h-6 text-blue-400" />
          <span>Relocation Optimization & Safe Habitat Engine</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Deterministic decision-support solver enforcing hard safety exclusions, carrying capacity limits, and spatial radius bounds.
        </p>
      </div>

      {/* Mandatory Operational Warning Banner */}
      <div className="bg-amber-950/40 border border-amber-700/80 p-3.5 rounded-xl text-xs text-amber-200 flex items-start space-x-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold tracking-wide text-amber-300 uppercase">
            MODEL-DERIVED RISK — NOT AN OFFICIAL EVACUATION ORDER
          </div>
          <div className="text-[11px] text-amber-200/90 leading-relaxed">
            NOT VALIDATED FOR OPERATIONAL USE — INSUFFICIENT VALIDATION DATA. Relocation recommendations are calculated for decision support only. All actions require field verification and district authority approval.
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-command-card border border-command-border p-5 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-bold text-slate-200">Location Selection Mode:</span>
          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={() => {
                setUseCustomLocation(false);
                if (selectedHab) handleSolveHabitation(selectedHab.id, targetPopulation);
              }}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                !useCustomLocation ? 'bg-blue-900 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              Preset Habitation List
            </button>
            <button
              onClick={() => {
                setUseCustomLocation(true);
                handleSolveCustomLocation(locationState.latitude, locationState.longitude, targetPopulation);
              }}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition flex items-center space-x-1.5 ${
                useCustomLocation ? 'bg-blue-900 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Active GPS / Map Point ({locationState.latitude.toFixed(4)}°, {locationState.longitude.toFixed(4)}°)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {!useCustomLocation ? (
            <div>
              <label className="font-bold text-slate-300 block mb-1">Select Target Habitation:</label>
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
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2.5 font-medium"
              >
                {habitations.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (Pop: {h.population}, Risk: {h.risk_score})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="font-bold text-slate-300 block mb-1">Active Target Coordinates:</label>
              <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-blue-300 font-bold">
                {locationState.displayName || `${locationState.latitude.toFixed(6)}° N, ${locationState.longitude.toFixed(6)}° E`}
              </div>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-300 block mb-1">
              Required Relocation Population: <span className="font-mono text-blue-400">{targetPopulation} persons</span>
            </label>
            <input
              type="range"
              min="100"
              max="6000"
              step="50"
              value={targetPopulation}
              onChange={(e) => setTargetPopulation(Number(e.target.value))}
              className="w-full accent-blue-500 bg-slate-900 rounded"
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
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center space-x-2 shadow-md"
            >
              <Navigation className="w-4 h-4" />
              <span>RE-RUN OPTIMIZATION SOLVER</span>
            </button>
          </div>
        </div>

        {/* Selected Location Details Bar */}
        <div className="pt-3 border-t border-slate-800 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">Source Target:</span>
            <b className="text-slate-100">{useCustomLocation ? locationState.displayName : selectedHab?.name}</b>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Coordinates:</span>
            <b className="font-mono text-slate-200">
              {useCustomLocation ? `${locationState.latitude.toFixed(4)}° N, ${locationState.longitude.toFixed(4)}° E` : `${selectedHab?.latitude.toFixed(4)}° N, ${selectedHab?.longitude.toFixed(4)}° E`}
            </b>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">District Region:</span>
            <b className="text-slate-200">{useCustomLocation ? (locationState.district || 'Chamoli') : selectedHab?.subdistrict}</b>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Search Radius Used:</span>
            <b className="text-blue-400">{plan?.search_parameters?.search_radius_used_km || plan?.search_radius_km || 50} km</b>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Data Provenance:</span>
            <b className="text-emerald-400">{plan?.data_status || 'VERIFIED_OFFICIAL'}</b>
          </div>
        </div>
      </div>

      {/* Plan Results Display */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 space-y-2 bg-command-card border border-command-border rounded-xl">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <div>Solving Multi-Site Allocation Constraints & Spatial Radius Filters...</div>
        </div>
      ) : plan ? (
        <div className="space-y-6">
          {plan.status === 'insufficient_data' || plan.overall_status === 'insufficient_data' ? (
            <div className="p-6 bg-slate-900 border-2 border-amber-600/80 rounded-xl text-xs space-y-3">
              <div className="flex items-center space-x-2 text-amber-300 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>INSUFFICIENT DATA COVERAGE</span>
              </div>
              <div className="text-slate-300">{plan.message || 'Reliable data is not available for this location.'}</div>
              {plan.missing_data && plan.missing_data.length > 0 && (
                <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
                  <div className="text-slate-400 font-bold">Missing Required Data:</div>
                  {plan.missing_data.map((m: string, i: number) => (
                    <div key={i} className="text-amber-200 text-[11px]">• {m}</div>
                  ))}
                </div>
              )}
              <div className="text-slate-400">Next Action: <strong className="text-cyan-300">{plan.next_action || 'Collect or connect verified data.'}</strong></div>
            </div>
          ) : (
            <>
          {/* Status Alert Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-semibold ${
              plan.status === 'FEASIBLE_COMPLETE' || plan.overall_status === 'FEASIBLE_COMPLETE' || plan.status === 'SUCCESS'
                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                : 'bg-red-950/60 border-red-700 text-red-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              {plan.status === 'FEASIBLE_COMPLETE' || plan.overall_status === 'FEASIBLE_COMPLETE' || plan.status === 'SUCCESS' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 animate-bounce" />
              )}
              <div>
                <div className="font-bold text-sm">OPTIMIZATION STATUS: {plan.overall_status || plan.status}</div>
                <div className="text-[11px] opacity-90 mt-0.5">
                  Required: {plan.required_population || targetPopulation} | Allocated: {plan.allocated_population || (plan.recommended_site ? plan.recommended_site.allocated_population : 0)} | Unallocated: {plan.unallocated_population}
                </div>
              </div>
            </div>

            {/* Human Authority Review Buttons */}
            <div className="flex items-center space-x-2">
              {approvalStatus === 'APPROVED' ? (
                <span className="bg-emerald-900 border border-emerald-500 text-emerald-300 px-3 py-1.5 rounded font-bold">
                  ✓ APPROVED BY AUTHORITY
                </span>
              ) : approvalStatus === 'REJECTED' ? (
                <span className="bg-red-900 border border-red-500 text-red-300 px-3 py-1.5 rounded font-bold">
                  ✕ REJECTED BY AUTHORITY
                </span>
              ) : (
                <>
                  <button
                    onClick={() => setApprovalStatus('APPROVED')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-all shadow"
                  >
                    AUTHORIZE PLAN
                  </button>
                  <button
                    onClick={() => setApprovalStatus('REJECTED')}
                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-all shadow"
                  >
                    REJECT PLAN
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Warnings List */}
          {plan.warnings && plan.warnings.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs text-slate-300 space-y-1">
              <span className="font-bold text-amber-400 block mb-1">Notice & Distance Warnings:</span>
              {plan.warnings.map((w: string, idx: number) => (
                <div key={idx} className="flex items-center space-x-2 text-[11px]">
                  <span className="text-amber-400">•</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recommended Site Card (If Available) */}
          {plan.recommended_site ? (
            <div className="bg-emerald-950/20 border-2 border-emerald-700/80 p-5 rounded-xl space-y-4 shadow-lg">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-emerald-800/80 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="bg-emerald-900 border border-emerald-600 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      RECOMMENDED FEASIBLE DESTINATION
                    </span>
                    {plan.recommended_site.is_demonstration ? (
                      <span className="bg-purple-950 border border-purple-700 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded">
                        DEMONSTRATION FALLBACK — NOT LOCATION-OPTIMIZED
                      </span>
                    ) : (
                      <span className="bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">
                        OFFICIAL VERIFIED SHELTER
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-100">{plan.recommended_site.name}</h2>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                  <RelocationNavigationAction
                    latitude={plan.recommended_site.latitude}
                    longitude={plan.recommended_site.longitude}
                    siteName={plan.recommended_site.name}
                    locationLabel={plan.recommended_site.district ? `${plan.recommended_site.district}, ${plan.recommended_site.subdistrict || ''}` : undefined}
                    isEligible={true}
                    variant="compact"
                  />
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Allocated Population</div>
                    <div className="text-lg font-mono font-bold text-emerald-400">
                      {plan.recommended_site.allocated_population} persons
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Geodesic Straight-Line Distance:</span>
                  <b className="text-slate-200 text-sm font-mono">{plan.recommended_site.distance_km || plan.recommended_site.straight_line_dist_km} km</b>
                  <span className="block text-[10px] text-amber-400 mt-0.5">Road travel: ~{plan.recommended_site.road_dist_km || (plan.recommended_site.distance_km * 1.4).toFixed(1)} km</span>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Safety Rating:</span>
                  <b className="text-emerald-400 text-sm font-mono">{plan.recommended_site.safety_score} / 100</b>
                  <span className="block text-[10px] text-emerald-300 mt-0.5">{plan.recommended_site.safety_status || 'Eligible'}</span>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Effective Carrying Capacity:</span>
                  <b className="text-slate-100 text-sm font-mono">{plan.recommended_site.effective_capacity} persons</b>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Remaining: {plan.recommended_site.remaining_capacity}</span>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Resource Bottleneck:</span>
                  <b className="text-amber-400 text-sm font-bold">{plan.recommended_site.bottleneck}</b>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Min component capacity</span>
                </div>
              </div>

              {/* Justification Explanations */}
              <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 text-xs space-y-1.5">
                <span className="font-bold text-slate-300 block border-b border-slate-800 pb-1">Safety & Evidence Justification:</span>
                {plan.recommended_site.explanation && plan.recommended_site.explanation.map((exp: string, idx: number) => (
                  <div key={idx} className="text-slate-300 text-[11px]">{exp}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-200 space-y-2">
              <div className="font-bold text-sm text-red-300 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>NO VERIFIED SITE FOUND</span>
              </div>
              <div>No verified suitable relocation site was found within the maximum 50 km search radius passing all safety rules.</div>
            </div>
          )}

          {/* Alternative Sites Section */}
          {(plan.alternative_sites || plan.alternatives || []).length > 0 && (
            <div className="bg-command-card border border-command-border p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-100 border-b border-command-border pb-2 flex justify-between items-center">
                <span>Feasible Alternative Relocation Sites ({(plan.alternative_sites || plan.alternatives).length})</span>
                <span className="text-[10px] text-slate-400 font-normal">Ranked by Distance & Safety</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(plan.alternative_sites || plan.alternatives).map((alt: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center font-bold text-slate-200">
                        <span className="text-blue-400">{alt.name}</span>
                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                          Cap: {alt.effective_capacity}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-1">
                        <div>Geodesic Straight-Line: <b>{alt.distance_km} km</b></div>
                        <div>Safety Score: <b className="text-emerald-400">{alt.safety_score}/100</b></div>
                        <div>Bottleneck: <b className="text-amber-400">{alt.bottleneck}</b></div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800">
                      <RelocationNavigationAction
                        latitude={alt.latitude}
                        longitude={alt.longitude}
                        siteName={alt.name}
                        locationLabel={alt.district ? `${alt.district}, ${alt.subdistrict || ''}` : undefined}
                        isEligible={true}
                        variant="compact"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected Sites Audit Log */}
          <div className="bg-command-card border border-command-border p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 border-b border-command-border pb-2 flex justify-between items-center">
              <span>Rejected Sites Audit Trail ({(plan.rejected_sites || plan.rejected_sites_audit || []).length})</span>
              <span className="text-[10px] text-red-400 font-normal">Hard Exclusion Violations</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(plan.rejected_sites || plan.rejected_sites_audit || []).map((rej: any, idx: number) => (
                <div key={idx} className="p-3 bg-red-950/30 border border-red-900/60 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-red-300 flex items-center justify-between">
                    <span>{rej.site_name}</span>
                    <span className="text-[10px] text-red-400 font-mono">REJECTED</span>
                  </div>
                  <div className="text-[11px] text-red-300/80 leading-relaxed">{rej.reason}</div>
                </div>
              ))}
            </div>
          </div>
          </>
          )}
        </div>
      ) : null}
    </div>
  );
};
