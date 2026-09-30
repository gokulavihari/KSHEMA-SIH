import React, { useEffect, useState, useMemo } from 'react';
import {
  fetchNationalGISOverview,
  fetchSupportedStates,
  fetchStateBoundariesGeoJSON,
  fetchNationalGISLocations,
  fetchStateGISSummary
} from '../services/api';
import {
  NationalGISLocation,
  NationalGISOverview,
  StateGISSummary,
  PriorityCategory
} from '../types';
import { NationalRiskMap } from '../components/NationalRiskMap';
import { LocationDetailPanel } from '../components/LocationDetailPanel';
import { GISErrorBoundary } from '../components/GISErrorBoundary';
import { AashrayTerrainEngine } from '../components/AashrayTerrainEngine';
import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Users,
  Layers,
  MapPin,
  List,
  Compass,
  Zap,
  SlidersHorizontal,
  ArrowRight,
  Shield,
  Activity
} from 'lucide-react';

export const GISMapView: React.FC = () => {
  // 1. Data States
  const [overview, setOverview] = useState<NationalGISOverview | null>(null);
  const [supportedStates, setSupportedStates] = useState<any[]>([]);
  const [stateBoundariesGeoJSON, setStateBoundariesGeoJSON] = useState<any>(null);
  const [locations, setLocations] = useState<NationalGISLocation[]>([]);
  const [stateSummary, setStateSummary] = useState<StateGISSummary | null>(null);

  // 2. Filter States
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [hazardFilter, setHazardFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. Selection & View States
  const [selectedLocation, setSelectedLocation] = useState<NationalGISLocation | null>(null);
  const [detailPanelTab, setDetailPanelTab] = useState<'overview' | 'spatial' | 'factors' | 'history' | 'relocation'>('overview');
  const [focusTarget, setFocusTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);
  const [isPriorityDrawerOpen, setIsPriorityDrawerOpen] = useState<boolean>(true);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // 4. Map Layer Toggles
  const [activeLayers, setActiveLayers] = useState({
    riskLocations: true,
    riskZones: true,
    relocationSites: true,
    stateBoundaries: true,
    riskDensity: false,
  });

  // Load Initial National Datasets
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchNationalGISOverview(),
      fetchSupportedStates(),
      fetchStateBoundariesGeoJSON(),
      fetchNationalGISLocations()
    ])
      .then(([ov, states, boundaries, locs]) => {
        setOverview(ov);
        setSupportedStates(Array.isArray(states) ? states : []);
        setStateBoundariesGeoJSON(boundaries);
        const safeLocs = Array.isArray(locs) ? locs : (locs?.locations || []);
        setLocations(safeLocs);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load initial National GIS data:', err);
        setLoading(false);
      });
  }, []);

  // Update Locations when Filters Change
  useEffect(() => {
    fetchNationalGISLocations({
      state: selectedState,
      district: selectedDistrict,
      risk_level: severityFilter,
      priority_category: priorityFilter,
      hazard_type: hazardFilter
    })
      .then((res) => {
        const safeLocs = Array.isArray(res) ? res : (res?.locations || []);
        setLocations(safeLocs);
      })
      .catch((err) => {
        console.error('Failed to query filtered GIS locations:', err);
      });
  }, [selectedState, selectedDistrict, severityFilter, priorityFilter, hazardFilter]);

  // Load State Summary when State changes
  useEffect(() => {
    if (selectedState && selectedState !== 'ALL') {
      fetchStateGISSummary(selectedState)
        .then((summary) => setStateSummary(summary))
        .catch((err) => {
          console.warn(`Could not load summary for ${selectedState}:`, err);
          setStateSummary(null);
        });
    } else {
      setStateSummary(null);
    }
  }, [selectedState]);

  // Handle State Selection
  const handleSelectState = (stateName: string) => {
    setSelectedState(stateName);
    setSelectedDistrict('ALL');
  };

  // Districts for selected state
  const availableDistricts = useMemo(() => {
    if (!selectedState || selectedState === 'ALL') return [];
    const stateObj = supportedStates.find(
      (s) => s.name?.toLowerCase() === selectedState.toLowerCase()
    );
    return stateObj?.districts || [];
  }, [selectedState, supportedStates]);

  // Available Hazard Types from loaded dataset
  const availableHazards = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(locations)) {
      locations.forEach((loc) => {
        if (loc.primary_hazard) set.add(loc.primary_hazard);
      });
    }
    return Array.from(set).sort();
  }, [locations]);

  // Client-side search filtering
  const displayedLocations = useMemo(() => {
    if (!Array.isArray(locations)) return [];
    if (!searchQuery.trim()) return locations;
    const q = searchQuery.toLowerCase().trim();
    return locations.filter((loc) => {
      const matchName = loc.location_name?.toLowerCase().includes(q);
      const matchDistrict = loc.district?.toLowerCase().includes(q);
      const matchState = loc.state?.toLowerCase().includes(q);
      const matchHazard = loc.primary_hazard?.toLowerCase().includes(q);
      const matchCoords = `${loc.latitude?.toFixed(2)}, ${loc.longitude?.toFixed(2)}`.includes(q);
      return matchName || matchDistrict || matchState || matchHazard || matchCoords;
    });
  }, [locations, searchQuery]);

  // Counts calculated from current view
  const currentSeverityCounts = useMemo(() => {
    let moderate = 0;
    let high = 0;
    let extremelyHigh = 0;
    let critical = 0;

    if (Array.isArray(locations)) {
      locations.forEach((loc) => {
        const lvl = loc.risk_level?.toUpperCase();
        if (lvl === 'CRITICAL') critical++;
        else if (lvl === 'EXTREMELY HIGH' || lvl === 'VERY HIGH') extremelyHigh++;
        else if (lvl === 'HIGH') high++;
        else if (lvl === 'MODERATE') moderate++;
      });
    }

    return {
      all: Array.isArray(locations) ? locations.length : 0,
      moderate,
      high,
      extremelyHigh,
      critical,
    };
  }, [locations]);

  // Priority Category Counts
  const priorityCounts = useMemo(() => {
    let immediate = 0;
    let assessment = 0;
    let monitor = 0;

    if (Array.isArray(locations)) {
      locations.forEach((loc) => {
        const cat = loc.priority_category;
        if (cat === 'IMMEDIATE REVIEW') immediate++;
        else if (cat === 'PRIORITY ASSESSMENT') assessment++;
        else monitor++;
      });
    }

    return {
      all: Array.isArray(locations) ? locations.length : 0,
      immediate,
      assessment,
      monitor,
    };
  }, [locations]);

  // Total affected population in current scope
  const totalPopulationAtRisk = useMemo(() => {
    if (!Array.isArray(locations)) return 0;
    return locations.reduce((sum, l) => sum + (l.population || 0), 0);
  }, [locations]);

  // Reset entire view to All India
  const handleResetToIndia = () => {
    setSelectedState('ALL');
    setSelectedDistrict('ALL');
    setSeverityFilter('ALL');
    setPriorityFilter('ALL');
    setHazardFilter('ALL');
    setSearchQuery('');
    setSelectedLocation(null);
  };

  // Synchronized Selection handler: clicking priority list item moves map and selects location
  const handleSelectPriorityLocation = (loc: NationalGISLocation) => {
    setSelectedLocation(loc);
    setDetailPanelTab('overview');
    setFocusTarget({ lat: loc.latitude, lng: loc.longitude, zoom: 13 });
  };

  // Inspect Spatial Intelligence handler: triggered from popup button
  const handleInspectSpatialIntelligence = (loc: NationalGISLocation) => {
    setSelectedLocation(loc);
    setDetailPanelTab('spatial');
    setActiveLayers(prev => ({
      ...prev,
      riskZones: true,
      relocationSites: true,
      riskLocations: true
    }));
    setFocusTarget({ lat: loc.latitude, lng: loc.longitude, zoom: 14 });
  };

  const handleZoomToLocation = (loc: NationalGISLocation) => {
    setFocusTarget({ lat: loc.latitude, lng: loc.longitude, zoom: 14 });
  };

  const handleZoomToSafeSite = (loc: NationalGISLocation) => {
    if (loc.recommended_safe_site) {
      setFocusTarget({
        lat: loc.recommended_safe_site.latitude,
        lng: loc.recommended_safe_site.longitude,
        zoom: 14
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-slate-950 text-slate-100 select-none overflow-hidden relative font-sans">
      {/* ============================================================== */}
      {/* 1. MASTER ADMINISTRATIVE TOP CONTROL BAR                      */}
      {/* ============================================================== */}
      <header className="h-14 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between gap-3 shrink-0 z-30">
        {/* Left: Branding & Geographic Scope */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500/20 via-sky-600/30 to-blue-700/40 border border-sky-500/40 flex items-center justify-center shadow-lg shadow-sky-950/50">
              <span className="text-base font-extrabold text-sky-400">🛡️</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-wider text-sm text-slate-100 font-mono">KSHEMA</span>
                <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                  SDMA GIS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden lg:block leading-none">
                Disaster Risk & Safe Relocation Intelligence
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden md:block" />

          {/* STATE SELECTOR */}
          <div className="flex items-center space-x-1.5">
            <select
              value={selectedState}
              onChange={(e) => handleSelectState(e.target.value)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-mono font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 transition shadow-inner cursor-pointer"
            >
              <option value="ALL">🇮🇳 All India (National Overview)</option>
              {supportedStates.map((st) => (
                <option key={st.name} value={st.name}>
                  {st.name} ({st.state_code})
                </option>
              ))}
            </select>

            {/* DISTRICT SELECTOR */}
            {selectedState !== 'ALL' && availableDistricts.length > 0 && (
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-mono rounded-lg px-2 py-1.5 focus:outline-none focus:border-sky-500 transition shadow-inner cursor-pointer max-w-[150px] truncate"
              >
                <option value="ALL">All Districts</option>
                {availableDistricts.map((d: string) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Center: The 4 Primary Risk Severity Filters */}
        <div className="hidden md:flex items-center space-x-1 bg-slate-900/90 border border-slate-800 p-1 rounded-lg font-mono text-xs">
          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-2.5 py-1 rounded transition flex items-center space-x-1.5 ${
              severityFilter === 'ALL'
                ? 'bg-slate-800 text-slate-100 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>ALL</span>
            <span className="text-[10px] text-slate-500">({currentSeverityCounts.all})</span>
          </button>

          <button
            onClick={() => setSeverityFilter('MODERATE')}
            className={`px-2.5 py-1 rounded transition flex items-center space-x-1.5 ${
              severityFilter === 'MODERATE'
                ? 'bg-amber-950 text-amber-300 font-bold border border-amber-800/80 shadow'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>MODERATE</span>
            <span className="text-[10px] text-amber-500/70">({currentSeverityCounts.moderate})</span>
          </button>

          <button
            onClick={() => setSeverityFilter('HIGH')}
            className={`px-2.5 py-1 rounded transition flex items-center space-x-1.5 ${
              severityFilter === 'HIGH'
                ? 'bg-orange-950 text-orange-300 font-bold border border-orange-800/80 shadow'
                : 'text-orange-400/80 hover:text-orange-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>HIGH</span>
            <span className="text-[10px] text-orange-500/70">({currentSeverityCounts.high})</span>
          </button>

          <button
            onClick={() => setSeverityFilter('EXTREMELY HIGH')}
            className={`px-2.5 py-1 rounded transition flex items-center space-x-1.5 ${
              severityFilter === 'EXTREMELY HIGH'
                ? 'bg-orange-950 text-orange-200 font-bold border border-orange-700 shadow'
                : 'text-orange-300/80 hover:text-orange-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-600" />
            <span>EXTREMELY HIGH</span>
            <span className="text-[10px] text-orange-400/70">({currentSeverityCounts.extremelyHigh})</span>
          </button>

          <button
            onClick={() => setSeverityFilter('CRITICAL')}
            className={`px-2.5 py-1 rounded transition flex items-center space-x-1.5 ${
              severityFilter === 'CRITICAL'
                ? 'bg-red-950 text-red-200 font-bold border border-red-700 shadow animate-pulse'
                : 'text-red-400 hover:text-red-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span>CRITICAL</span>
            <span className="text-[10px] text-red-400/80">({currentSeverityCounts.critical})</span>
          </button>
        </div>

        {/* Right: Search, Hazard Filter, Priority Filter, Layers, 2D/3D & Reset View */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Quick Search */}
          <div className="relative hidden xl:block w-48">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search location / coords..."
              className="w-full pl-7 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Hazard Filter Dropdown */}
          {availableHazards.length > 0 && (
            <select
              value={hazardFilter}
              onChange={(e) => setHazardFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono rounded-lg px-2 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer hidden lg:block"
            >
              <option value="ALL">All Hazard Types</option>
              {availableHazards.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          )}

          {/* Priority Category Filter Dropdown */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-amber-300 text-xs font-mono font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer hidden md:block"
          >
            <option value="ALL">All Priorities ({priorityCounts.all})</option>
            <option value="IMMEDIATE REVIEW">⚡ Immediate Review ({priorityCounts.immediate})</option>
            <option value="PRIORITY ASSESSMENT">⚠️ Priority Assessment ({priorityCounts.assessment})</option>
            <option value="MONITOR">🔍 Monitor ({priorityCounts.monitor})</option>
          </select>

          {/* Layer Controls Toggle Button */}
          <div className="relative">
            <button
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              className={`p-1.5 rounded-lg border text-xs font-mono flex items-center space-x-1 transition ${
                isLayerMenuOpen
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
              title="Map Layers"
            >
              <Layers className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Layers</span>
            </button>

            {isLayerMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200">GIS MAP LAYERS</span>
                  <button
                    onClick={() => setIsLayerMenuOpen(false)}
                    className="text-slate-500 hover:text-slate-300 text-xs"
                  >
                    ✕
                  </button>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-slate-100">
                  <input
                    type="checkbox"
                    checked={activeLayers.riskLocations}
                    onChange={(e) =>
                      setActiveLayers({ ...activeLayers, riskLocations: e.target.checked })
                    }
                    className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <span>Assessed Risk Points</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-slate-100">
                  <input
                    type="checkbox"
                    checked={activeLayers.riskZones}
                    onChange={(e) =>
                      setActiveLayers({ ...activeLayers, riskZones: e.target.checked })
                    }
                    className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <span>Risk Radius & Zones</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-slate-100">
                  <input
                    type="checkbox"
                    checked={activeLayers.relocationSites}
                    onChange={(e) =>
                      setActiveLayers({ ...activeLayers, relocationSites: e.target.checked })
                    }
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Safe Sites & Corridors</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-slate-100">
                  <input
                    type="checkbox"
                    checked={activeLayers.stateBoundaries}
                    onChange={(e) =>
                      setActiveLayers({ ...activeLayers, stateBoundaries: e.target.checked })
                    }
                    className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <span>State Boundaries (GeoJSON)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-slate-100 pt-1 border-t border-slate-900">
                  <input
                    type="checkbox"
                    checked={activeLayers.riskDensity}
                    onChange={(e) =>
                      setActiveLayers({ ...activeLayers, riskDensity: e.target.checked })
                    }
                    className="rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-0"
                  />
                  <span>Spatial Risk Density</span>
                </label>
              </div>
            )}
          </div>

          {/* Toggle Priority Drawer */}
          <button
            onClick={() => setIsPriorityDrawerOpen(!isPriorityDrawerOpen)}
            className={`p-1.5 rounded-lg border text-xs font-mono flex items-center space-x-1 transition ${
              isPriorityDrawerOpen
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Toggle Priority For Action List"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Priority List</span>
          </button>

          {/* 2D / 3D Canvas Switch */}
          <div className="flex items-center space-x-0.5 p-0.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs">
            <button
              onClick={() => setViewMode('2D')}
              className={`px-2 py-1 rounded text-[11px] ${
                viewMode === '2D' ? 'bg-sky-500/20 text-sky-400 font-bold' : 'text-slate-400'
              }`}
            >
              2D
            </button>
            <button
              onClick={() => setViewMode('3D')}
              className={`px-2 py-1 rounded text-[11px] ${
                viewMode === '3D' ? 'bg-sky-500/20 text-sky-400 font-bold' : 'text-slate-400'
              }`}
            >
              3D
            </button>
          </div>

          {/* Reset View Button */}
          <button
            onClick={handleResetToIndia}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 transition"
            title="Reset to All India View"
          >
            <RefreshCw className="w-4 h-4 text-sky-400" />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN GIS WORKSPACE (DOMINANT VIEWPORT)                      */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden relative w-full h-[calc(100%-3.5rem)]">
        {/* ============================================================== */}
        {/* LEFT: EXECUTIVE PRIORITY FOR ACTION RANKED LIST               */}
        {/* ============================================================== */}
        {isPriorityDrawerOpen && (
          <aside className="w-80 md:w-96 bg-slate-950 border-r border-slate-800 flex flex-col h-full z-20 shadow-2xl overflow-hidden font-mono text-xs shrink-0 animate-in slide-in-from-left duration-200">
            <div className="p-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5 font-bold text-slate-200">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>PRIORITY FOR ACTION</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Deterministic administrative decision-support ranking
                </div>
              </div>
              <button
                onClick={() => setIsPriorityDrawerOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-1"
                title="Collapse Priority Drawer"
              >
                ✕
              </button>
            </div>

            {/* Quick Priority Category Tabs */}
            <div className="grid grid-cols-3 gap-1 p-2 bg-slate-900/40 border-b border-slate-800/80 text-[10px]">
              <button
                onClick={() => setPriorityFilter(priorityFilter === 'IMMEDIATE REVIEW' ? 'ALL' : 'IMMEDIATE REVIEW')}
                className={`p-1 rounded text-center font-bold border transition ${
                  priorityFilter === 'IMMEDIATE REVIEW'
                    ? 'bg-red-950 border-red-700 text-red-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-red-300'
                }`}
              >
                Immediate ({priorityCounts.immediate})
              </button>
              <button
                onClick={() => setPriorityFilter(priorityFilter === 'PRIORITY ASSESSMENT' ? 'ALL' : 'PRIORITY ASSESSMENT')}
                className={`p-1 rounded text-center font-bold border transition ${
                  priorityFilter === 'PRIORITY ASSESSMENT'
                    ? 'bg-amber-950 border-amber-700 text-amber-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-amber-300'
                }`}
              >
                Assessment ({priorityCounts.assessment})
              </button>
              <button
                onClick={() => setPriorityFilter(priorityFilter === 'MONITOR' ? 'ALL' : 'MONITOR')}
                className={`p-1 rounded text-center font-bold border transition ${
                  priorityFilter === 'MONITOR'
                    ? 'bg-sky-950 border-sky-700 text-sky-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-sky-300'
                }`}
              >
                Monitor ({priorityCounts.monitor})
              </button>
            </div>

            {/* Ranked Locations List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {displayedLocations.length > 0 ? (
                displayedLocations.map((loc, idx) => {
                  const isSelected = selectedLocation?.id === loc.id;
                  const rank = loc.priority_rank || idx + 1;
                  const isCritical = loc.risk_level === 'CRITICAL';
                  const isImmediate = loc.priority_category === 'IMMEDIATE REVIEW';

                  return (
                    <button
                      key={loc.id}
                      data-testid="priority-item-button"
                      data-rank={rank}
                      onClick={() => handleSelectPriorityLocation(loc)}
                      className={`w-full text-left p-2.5 rounded-xl border transition ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-500/70 text-slate-100 shadow-lg'
                          : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded flex items-center justify-center font-black text-[11px] shrink-0 ${
                              isImmediate
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : loc.priority_category === 'PRIORITY ASSESSMENT'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {rank.toString().padStart(2, '0')}
                          </span>
                          <span className="font-bold truncate text-slate-100 text-xs" title={loc.location_name}>
                            {loc.location_name}
                          </span>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                            isCritical
                              ? 'bg-red-950 border-red-800 text-red-300'
                              : loc.risk_level === 'EXTREMELY HIGH'
                              ? 'bg-orange-950 border-orange-800 text-orange-300'
                              : 'bg-amber-950 border-amber-800 text-amber-300'
                          }`}
                        >
                          {loc.risk_level}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 flex justify-between ml-7.5">
                        <span>{loc.district}, {loc.state}</span>
                        <span className="text-amber-400 font-bold">
                          Priority {loc.priority_score ? loc.priority_score.toFixed(1) : loc.risk_score?.toFixed(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1 mt-1.5 pt-1.5 border-t border-slate-800/80 text-[10px] ml-7.5">
                        <div className="text-slate-400 truncate">
                          👥 {loc.population ? loc.population.toLocaleString('en-IN') : 'N/A'} pop
                        </div>
                        <div className="text-right truncate" title={loc.recommended_safe_site ? `${loc.recommended_safe_site.status || 'Safe site'} (${loc.recommended_safe_site.distance_km} km)` : 'No site allocated'}>
                          {loc.recommended_safe_site ? (
                            <span className="text-emerald-400 font-medium">
                              🛡️ {loc.recommended_safe_site.distance_km}km • {loc.recommended_safe_site.status === 'EXTENDED-RANGE CANDIDATE' ? 'Extended' : loc.recommended_safe_site.status === 'PARTIAL CAPACITY' ? 'Partial' : 'Safe Site'}
                            </span>
                          ) : (
                            <span className="text-rose-400">⚠️ No site allocated</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : selectedState !== 'ALL' ? (
                <div className="p-6 text-center text-slate-400 space-y-2.5">
                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-sky-400 text-lg">
                    🏛️
                  </div>
                  <div className="font-bold text-slate-200 text-xs tracking-wider uppercase font-mono">
                    0 assessed risk locations in current dataset
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans max-w-xs mx-auto">
                    0 assessed risk locations in current dataset for <span className="text-sky-300 font-bold">{selectedState}</span>. Zero records do not represent zero risk; baseline field assessments and hazard monitoring remain active.
                  </p>
                  <button
                    onClick={handleResetToIndia}
                    className="inline-block mt-2 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 rounded border border-slate-800 font-mono text-[11px] transition"
                  >
                    ← Return to All India
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 space-y-2">
                  <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto" />
                  <div>No locations matching active filters</div>
                  <button
                    onClick={handleResetToIndia}
                    className="text-sky-400 hover:underline text-xs"
                  >
                    Reset all filters
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ============================================================== */}
        {/* CENTER: INTERACTIVE GIS MAP (DOMINANT analytical WORKSPACE)   */}
        {/* ============================================================== */}
        <main
          className="flex-1 h-full w-full relative"
          style={{ width: '100%', height: '100%', minHeight: '520px' }}
        >
          <GISErrorBoundary
            fallbackTitle="GIS Map temporarily unavailable"
            onFallbackListToggle={() => setIsPriorityDrawerOpen(true)}
          >
            {viewMode === '3D' ? (
              <AashrayTerrainEngine
                selectedLocation={
                  selectedLocation
                    ? {
                        lat: selectedLocation.latitude,
                        lng: selectedLocation.longitude,
                        name: selectedLocation.location_name,
                      }
                    : { lat: 30.4852, lng: 79.6914, name: 'Raini Village' }
                }
                recommendedSite={
                  selectedLocation?.recommended_safe_site
                    ? {
                        lat: selectedLocation.recommended_safe_site.latitude,
                        lng: selectedLocation.recommended_safe_site.longitude,
                        name: selectedLocation.recommended_safe_site.name,
                      }
                    : undefined
                }
                habitations={displayedLocations.map((l) => ({
                  id: l.id,
                  name: l.location_name,
                  lat: l.latitude,
                  lng: l.longitude,
                  riskScore: l.risk_score,
                }))}
                height="100%"
                showCorridor={true}
              />
            ) : (
              <NationalRiskMap
                locations={displayedLocations}
                stateBoundariesGeoJSON={stateBoundariesGeoJSON}
                selectedState={selectedState}
                selectedDistrict={selectedDistrict}
                selectedLocation={selectedLocation}
                onSelectLocation={(loc) => setSelectedLocation(loc)}
                onInspectSpatialIntelligence={handleInspectSpatialIntelligence}
                focusTarget={focusTarget}
                onSelectState={handleSelectState}
                activeLayers={activeLayers}
                onMapReset={handleResetToIndia}
              />
            )}
          </GISErrorBoundary>

          {/* ========================================================== */}
          {/* FLOATING STATE / NATIONAL SUMMARY OVERLAY                  */}
          {/* ========================================================== */}
          <div className="absolute top-4 left-4 z-20 max-w-sm pointer-events-auto">
            <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl overflow-hidden font-sans">
              <div
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-900/80 transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wide">
                      {selectedState === 'ALL' ? 'India National Overview' : `${selectedState} State Summary`}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {displayedLocations.length} Assessed Locations Displayed
                  </div>
                </div>

                <button className="text-slate-400 hover:text-slate-200">
                  {isSummaryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {isSummaryExpanded && (
                <div className="p-3 space-y-3 font-mono text-xs">
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-400 space-y-1">
                    <div className="flex items-center justify-between text-slate-300 font-bold">
                      <span>Assessed Coverage Status</span>
                      <span className="text-sky-400">VERIFIED SDMA</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {overview?.coverage?.honest_coverage_statement ||
                        `Displaying ${displayedLocations.length} officially assessed locations across verified state hazard databases.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                    <div className="p-1.5 bg-yellow-950/40 border border-yellow-800/60 rounded">
                      <span className="text-yellow-400 font-bold block">{currentSeverityCounts.moderate}</span>
                      <span className="text-[9px] text-yellow-500/80">Moderate</span>
                    </div>
                    <div className="p-1.5 bg-amber-950/40 border border-amber-800/60 rounded">
                      <span className="text-amber-400 font-bold block">{currentSeverityCounts.high}</span>
                      <span className="text-[9px] text-amber-500/80">High</span>
                    </div>
                    <div className="p-1.5 bg-orange-950/40 border border-orange-800/60 rounded">
                      <span className="text-orange-400 font-bold block">{currentSeverityCounts.extremelyHigh}</span>
                      <span className="text-[9px] text-orange-400/80">Extr. High</span>
                    </div>
                    <div className="p-1.5 bg-red-950/40 border border-red-800/60 rounded">
                      <span className="text-red-400 font-bold block">{currentSeverityCounts.critical}</span>
                      <span className="text-[9px] text-red-400/80">Critical</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      <span>Affected Population:</span>
                    </span>
                    <strong className="text-xs text-slate-100">
                      {totalPopulationAtRisk.toLocaleString('en-IN')} residents
                    </strong>
                  </div>

                  <button
                    onClick={() => {
                      setSeverityFilter(severityFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL');
                    }}
                    className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      severityFilter === 'CRITICAL'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-950'
                        : 'bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/80'
                    }`}
                  >
                    <span>⚡</span>
                    <span>
                      {severityFilter === 'CRITICAL'
                        ? 'SHOW ALL RISK SEVERITIES'
                        : `ISOLATE CRITICAL LOCATIONS (${currentSeverityCounts.critical})`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================== */}
          {/* MAP LEGEND (BOTTOM RIGHT)                                  */}
          {/* ========================================================== */}
          <div className="absolute bottom-6 right-4 z-20 hidden sm:block pointer-events-auto">
            <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-lg p-2.5 shadow-2xl font-mono text-[10px] space-y-1.5">
              <span className="text-slate-400 font-bold uppercase tracking-wider block border-b border-slate-800/80 pb-1">
                Risk Classification
              </span>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-300">Moderate</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-slate-300">High</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
                <span className="text-slate-300">Extremely High</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                <span className="text-red-400 font-bold">Critical</span>
              </div>
              <div className="flex items-center space-x-2 pt-1 border-t border-slate-900">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                <span className="text-emerald-400">Safe Relocation Site</span>
              </div>
            </div>
          </div>
        </main>

        {/* ============================================================== */}
        {/* RIGHT: CONTEXTUAL LOCATION DETAIL PANEL (SLIDES IN OVER MAP)  */}
        {/* ============================================================== */}
        {selectedLocation && (
          <LocationDetailPanel
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
            onZoomToLocation={handleZoomToLocation}
            onZoomToSafeSite={handleZoomToSafeSite}
            activeTab={detailPanelTab}
            onTabChange={setDetailPanelTab}
          />
        )}
      </div>
    </div>
  );
};
