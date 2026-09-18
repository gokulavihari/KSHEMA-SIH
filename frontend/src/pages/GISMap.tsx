import React, { useEffect, useState } from 'react';
import { fetchRiskMapData, fetchHabitations, fetchRelocationSites, generateRelocationPlan } from '../services/api';
import { Habitation, CandidateSite, RelocationPlan } from '../types';
import { MapContainer } from '../components/MapContainer';
import { RiskLegend } from '../components/RiskLegend';
import { LocationHeader } from '../components/LocationHeader';
import { ChangeLocationModal } from '../components/ChangeLocationModal';
import { useLocation } from '../context/LocationContext';
import { Layers, ShieldAlert, Navigation, Info, Search, Filter, RefreshCw, MapPin, X, HelpCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const GISMapView: React.FC = () => {
  const {
    locationState,
    assessment,
    assessmentRadiusM,
    setAssessmentRadiusM,
    setManualLocation,
    requestGpsLocation,
    openLocationModal,
    refreshAssessment,
    isMapSelectionMode,
    disableMapSelectionMode
  } = useLocation();

  const activeRelocationRoute = assessment?.relocation?.nearest_feasible_site ? {
    from: {
      latitude: locationState.latitude,
      longitude: locationState.longitude,
      label: locationState.displayName
    },
    to: {
      latitude: assessment.relocation.nearest_feasible_site.latitude,
      longitude: assessment.relocation.nearest_feasible_site.longitude,
      label: assessment.relocation.nearest_feasible_site.site_name
    }
  } : undefined;

  const [habitations, setHabitations] = useState<Habitation[]>([]);
  const [sites, setSites] = useState<CandidateSite[]>([]);
  const [redZonesGeoJSON, setRedZonesGeoJSON] = useState<any>(null);
  const [riversGeoJSON, setRiversGeoJSON] = useState<any>(null);
  const [roadsGeoJSON, setRoadsGeoJSON] = useState<any>(null);
  const [infrastructure, setInfrastructure] = useState<any>(null);

  const [selectedHabitation, setSelectedHabitation] = useState<Habitation | null>(null);
  const [selectedSite, setSelectedSite] = useState<CandidateSite | null>(null);
  const [relocationPlan, setRelocationPlan] = useState<RelocationPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<boolean>(false);
  const [isFactorsModalOpen, setIsFactorsModalOpen] = useState<boolean>(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  // Layer Toggles
  const [showRedZones, setShowRedZones] = useState<boolean>(true);
  const [showSites, setShowSites] = useState<boolean>(true);
  const [showRivers, setShowRivers] = useState<boolean>(true);
  const [showRoads, setShowRoads] = useState<boolean>(true);
  const [showHospitals, setShowHospitals] = useState<boolean>(true);
  const [showSchools, setShowSchools] = useState<boolean>(true);
  const [showEmergencyCentres, setShowEmergencyCentres] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([fetchHabitations(), fetchRelocationSites(), fetchRiskMapData()])
      .then(([habs, candidateSites, mapData]) => {
        setHabitations(habs);
        setSites(candidateSites);
        setRedZonesGeoJSON(mapData.red_zones);
        setRiversGeoJSON(mapData.rivers);
        setRoadsGeoJSON(mapData.roads);
        setInfrastructure(mapData.infrastructure);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load GIS map data', err);
        setLoading(false);
      });
  }, []);

  const handleSelectHabitation = (hab: Habitation) => {
    setSelectedHabitation(hab);
    setSelectedSite(null);
    setLoadingPlan(true);
    generateRelocationPlan(hab.id)
      .then((plan) => {
        setRelocationPlan(plan);
        setLoadingPlan(false);
      })
      .catch(() => setLoadingPlan(false));
  };

  const handleSelectSite = (site: CandidateSite) => {
    setSelectedSite(site);
  };

  const filteredHabitations = habitations.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          h.subdistrict.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'ALL' || h.relocation_priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const riskLevel = assessment?.risk_level || 'UNKNOWN';
  const riskScore = assessment?.risk_score;
  const vulnLevel = assessment?.vulnerability_level || 'N/A';
  const vulnScore = assessment?.vulnerability_score;
  const dominantHazard = assessment?.dominant_hazard || 'Slope instability';
  const radiusKm = ((assessment?.assessment_radius_m || 1000) / 1000).toFixed(1);
  const gpsAccuracy = Math.round(locationState.accuracy || 15);

  const getBadgeColorClass = (lvl: string) => {
    switch (lvl.toUpperCase()) {
      case 'LOW': return 'bg-emerald-950 text-emerald-300 border-emerald-700';
      case 'MODERATE': return 'bg-amber-950 text-amber-300 border-amber-700';
      case 'HIGH': return 'bg-orange-950 text-orange-300 border-orange-700';
      case 'VERY HIGH': return 'bg-rose-950 text-rose-300 border-rose-700';
      case 'CRITICAL': return 'bg-red-950 text-red-300 border-red-700';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-command-bg overflow-hidden">
      <LocationHeader />
      <ChangeLocationModal />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* LEFT CONTROL DRAWER */}
        <aside className="w-full md:w-80 bg-command-card border-r border-command-border p-4 flex flex-col justify-between shrink-0 space-y-4 overflow-y-auto z-10">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-command-border pb-2">
              <div className="flex items-center space-x-2 text-slate-200">
                <Layers className="w-5 h-5 text-command-accent" />
                <h2 className="font-bold text-sm tracking-wide uppercase">GIS Layer Controls</h2>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-700">
                AUTHORITATIVE GIS
              </span>
            </div>

            {/* Active User Location Display */}
            <div className="p-3 bg-gray-950/70 border border-gray-800 rounded-lg text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase">
                <span>Active Center Location</span>
                <span className="text-blue-400 font-semibold">{locationState.source}</span>
              </div>
              <div className="font-bold text-white truncate">{locationState.displayName}</div>
              <div className="font-mono text-gray-400 text-[11px] flex justify-between">
                <span>{locationState.latitude.toFixed(4)}° N, {locationState.longitude.toFixed(4)}° E</span>
                <span>±{gpsAccuracy}m</span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => requestGpsLocation()}
                className="flex items-center justify-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded text-xs font-semibold transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span>Refresh GPS</span>
              </button>
              <button
                onClick={() => openLocationModal()}
                className="flex items-center justify-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded text-xs font-semibold transition"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Change Location</span>
              </button>
            </div>

            {/* Search & Priority Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter habitations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="IMMEDIATE">IMMEDIATE (Risk &gt;= 80)</option>
                  <option value="SHORT-TERM">SHORT-TERM (Risk 60-79)</option>
                  <option value="MEDIUM-TERM">MEDIUM-TERM (Risk 40-59)</option>
                  <option value="MONITOR">MONITOR (Risk &lt; 40)</option>
                </select>
              </div>
            </div>

            {/* Layer Visibility Toggles */}
            <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs">
              <span className="font-semibold text-slate-300 block mb-2">Toggle Map Overlays:</span>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>Hazard Red Zones</span>
                <input
                  type="checkbox"
                  checked={showRedZones}
                  onChange={(e) => setShowRedZones(e.target.checked)}
                  className="accent-red-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>Safe Candidate Sites</span>
                <input
                  type="checkbox"
                  checked={showSites}
                  onChange={(e) => setShowSites(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>River Drainage Channels</span>
                <input
                  type="checkbox"
                  checked={showRivers}
                  onChange={(e) => setShowRivers(e.target.checked)}
                  className="accent-sky-400 rounded"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>Road Network</span>
                <input
                  type="checkbox"
                  checked={showRoads}
                  onChange={(e) => setShowRoads(e.target.checked)}
                  className="accent-amber-400 rounded"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>Hospitals & Healthcare</span>
                <input
                  type="checkbox"
                  checked={showHospitals}
                  onChange={(e) => setShowHospitals(e.target.checked)}
                  className="accent-blue-400 rounded"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>Schools & Infrastructure</span>
                <input
                  type="checkbox"
                  checked={showSchools}
                  onChange={(e) => setShowSchools(e.target.checked)}
                  className="accent-emerald-400 rounded"
                />
              </label>
            </div>

            {/* Configurable Assessment Radius Control */}
            <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs">
              <div className="flex justify-between items-center text-slate-300 font-semibold">
                <span>Assessment Radius:</span>
                <span className="font-mono text-blue-400 font-bold">{(assessmentRadiusM / 1000).toFixed(1)} km</span>
              </div>
              <select
                value={assessmentRadiusM}
                onChange={(e) => setAssessmentRadiusM(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={500}>500 metres (0.5 km)</option>
                <option value={1000}>1000 metres (1.0 km - Standard)</option>
                <option value={2000}>2000 metres (2.0 km)</option>
                <option value={3000}>3000 metres (3.0 km)</option>
                <option value={5000}>5000 metres (5.0 km)</option>
              </select>
              <div className="text-[10px] text-slate-400 italic">
                Geodesic meter buffer around selected position
              </div>
            </div>
          </div>

          <RiskLegend />
        </aside>

        {/* MAP CONTAINER */}
        <main className="flex-1 relative h-full">
          {/* MAP LOCATION SELECTION MODE BANNER (Phase 7) */}
          {isMapSelectionMode && (
            <div className="absolute top-4 left-4 z-30 bg-blue-950/95 border-2 border-blue-500 rounded-xl p-3 shadow-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-blue-200 text-xs font-extrabold">
                <MapPin className="w-5 h-5 text-blue-400 animate-bounce" />
                <span>MAP LOCATION SELECTION MODE: Click anywhere on the map to select a location.</span>
              </div>
              <button
                onClick={() => disableMapSelectionMode()}
                className="px-3 py-1 bg-blue-900 hover:bg-blue-800 border border-blue-700 rounded text-[11px] text-white font-bold transition"
              >
                Cancel Selection
              </button>
            </div>
          )}

          {/* FLOATING CURRENT ASSESSMENT BADGE (Requirement #11) */}
          <div className="absolute top-4 right-4 z-20 w-72 bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 backdrop-blur-md shadow-2xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                CURRENT ASSESSMENT
              </span>
              <span className="text-[9px] bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded font-mono">
                {assessment?.live_conditions?.imd_status || 'MODEL-DERIVED'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Risk Level</span>
                <div className="flex items-baseline space-x-1 mt-0.5">
                  <span className="font-bold text-sm text-white">{riskScore !== null && riskScore !== undefined ? riskScore : 'N/A'}</span>
                  <span className="text-[10px] text-slate-400">/100</span>
                </div>
                <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${getBadgeColorClass(riskLevel)}`}>
                  {riskLevel}
                </span>
              </div>

              <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Vulnerability</span>
                <div className="flex items-baseline space-x-1 mt-0.5">
                  <span className="font-bold text-sm text-blue-400">{vulnScore !== null && vulnScore !== undefined ? vulnScore : 'N/A'}</span>
                  <span className="text-[10px] text-slate-400">/100</span>
                </div>
                <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded border bg-blue-950 text-blue-300 border-blue-800">
                  {vulnLevel}
                </span>
              </div>
            </div>

            <div className="text-xs space-y-1 bg-slate-950/40 p-2 rounded border border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400 text-[11px]">Dominant Hazard:</span>
                <span className="font-bold text-slate-200 text-[11px] truncate max-w-[130px]">{dominantHazard}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Assessment Area:</span>
                <span className="font-mono font-bold text-slate-300">{radiusKm} km radius</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">GPS Accuracy:</span>
                <span className="font-mono font-bold text-blue-400">±{gpsAccuracy} m</span>
              </div>
            </div>

            <button
              onClick={() => setIsFactorsModalOpen(true)}
              className="w-full flex items-center justify-center space-x-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-1.5 rounded-lg shadow transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Why? Top Risk Contributors</span>
            </button>
          </div>

          <MapContainer
            userLocation={{
              latitude: locationState.latitude,
              longitude: locationState.longitude,
              accuracy: locationState.accuracy,
              displayName: locationState.displayName,
              source: locationState.source
            }}
            assessment={assessment}
            habitations={filteredHabitations}
            candidateSites={sites}
            redZonesGeoJSON={redZonesGeoJSON}
            riversGeoJSON={riversGeoJSON}
            roadsGeoJSON={roadsGeoJSON}
            infrastructure={infrastructure}
            selectedHabitationId={selectedHabitation?.id}
            onSelectHabitation={handleSelectHabitation}
            onSelectSite={handleSelectSite}
            onMapClick={(lat, lon) => {
              setManualLocation(lat, lon, `Selected Map Coordinate (${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E)`, 'MAP');
              disableMapSelectionMode();
            }}
            onSelectAssessmentArea={() => setIsFactorsModalOpen(true)}
            onViewFullAssessment={() => setIsFactorsModalOpen(true)}
            showRedZones={showRedZones}

            showSites={showSites}
            showRivers={showRivers}
            showRoads={showRoads}
            showHospitals={showHospitals}
            showSchools={showSchools}
            showEmergencyCentres={showEmergencyCentres}
            activeRelocationRoute={activeRelocationRoute}
          />
        </main>
      </div>

      {/* TOP RISK CONTRIBUTORS MODAL (Requirement #20) */}
      {isFactorsModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-command-card border border-command-border rounded-xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-command-border pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>Top Risk Contributors</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Factors influencing risk at {locationState.displayName}
                </p>
              </div>
              <button
                onClick={() => setIsFactorsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {assessment?.factors && assessment.factors.length > 0 ? (
                assessment.factors.map((f, idx) => (
                  <div key={idx} className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">{idx + 1}. {f.factor}</span>
                      <span className="font-mono text-amber-400 font-bold">{f.contribution ? `${f.contribution} pts` : `${f.score || 0}/100`}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, f.score || f.contribution_pct || 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Source: {f.source}</span>
                      <span>Weight: {f.effective_weight ? `${(f.effective_weight * 100).toFixed(0)}%` : `${((f.configured_weight || 0.1) * 100).toFixed(0)}%`}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 italic">{f.description}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No factor breakdown available for coordinate.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-command-border flex justify-end">
              <button
                onClick={() => setIsFactorsModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
