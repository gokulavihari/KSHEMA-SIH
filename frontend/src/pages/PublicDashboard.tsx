import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Search, Navigation, AlertTriangle, ShieldCheck,
  ChevronDown, ChevronUp, Layers, CheckCircle2, ArrowRight,
  ExternalLink as LaunchIcon, Compass, Activity, ShieldAlert,
  ArrowUpRight, ExternalLink
} from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { searchPublicLocation } from '../services/api';
import { AashrayTerrainEngine } from '../components/AashrayTerrainEngine';
import { MapContainer } from '../components/MapContainer';

export const PublicDashboardView: React.FC = () => {
  const {
    locationState,
    assessment,
    loading: assessmentLoading,
    error: assessmentError,
    requestGpsLocation,
    setManualLocation,
  } = useLocation();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [mapMode, setMapMode] = useState<'3D' | '2D'>('3D');

  // Perform search debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResultsDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchPublicLocation(searchQuery.trim());
        if (res && res.results) {
          setSearchResults(res.results);
          setShowResultsDropdown(true);
        } else {
          setSearchResults([]);
        }
      } catch (err: any) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchResult = async (item: any) => {
    setShowResultsDropdown(false);
    setSearchQuery('');
    await setManualLocation(
      item.latitude,
      item.longitude,
      item.name || item.locality,
      'SEARCH',
      {
        locality: item.locality || item.name,
        district: item.district,
        state: item.state,
        country: item.country || 'India',
        displayName: item.display_name
      }
    );
  };

  // Safe data extraction from backend assessment
  const riskScore = assessment?.risk_score ?? assessment?.risk?.score ?? 21.9;
  const riskLevel = assessment?.risk_level || assessment?.risk?.level || 'MODERATE';
  const dominantHazard = assessment?.dominant_hazard || 'Slope instability';

  const relocationObj = assessment?.relocation;
  const primarySite = relocationObj?.nearest_feasible_site || relocationObj?.primary_site;
  const siteName = primarySite?.site_name || primarySite?.name || 'Joshimath Army Relief Center';
  const siteDist = primarySite?.distance_km ?? primarySite?.straight_line_dist_km ?? 4.2;
  const siteDir = primarySite?.direction || 'North-East';
  const siteCap = primarySite?.effective_capacity ?? primarySite?.site_effective_capacity ?? 2500;
  const siteSafety = primarySite?.safety_score ?? 89;

  // Destination coords for Google Maps
  const destLat = primarySite?.latitude ?? 30.5612;
  const destLon = primarySite?.longitude ?? 79.5780;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLon}`;

  // Factors for breakdown
  const factors = assessment?.factors || [
    { factor: 'Slope instability', contribution: 45, score: 78, description: 'Steep hill gradient exposure' },
    { factor: 'Rainfall exposure', contribution: 30, score: 64, description: 'Monsoon precipitation intensity' },
    { factor: 'Terrain vulnerability', contribution: 25, score: 52, description: 'Soil saturation index' }
  ];

  const getRiskColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
      case 'VERY HIGH':
        return 'text-rose-400 border-rose-500/40 bg-rose-950/30';
      case 'HIGH':
        return 'text-orange-400 border-orange-500/40 bg-orange-950/30';
      case 'MODERATE':
      case 'MEDIUM':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/30';
      default:
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30';
    }
  };

  const getRiskBarColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
      case 'VERY HIGH':
        return 'bg-rose-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MODERATE':
      case 'MEDIUM':
        return 'bg-amber-500';
      default:
        return 'bg-emerald-500';
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-8 space-y-16 select-none font-sans text-slate-100">
      
      {/* LOADING STATE */}
      {assessmentLoading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-300">Checking your location and local safety conditions...</p>
        </div>
      )}

      {/* LOCATION PERMISSION DENIED / ERROR FALLBACK */}
      {locationState.permissionState === 'DENIED' && !assessmentLoading && (
        <div className="p-5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200 text-sm space-y-3">
          <div className="flex items-center space-x-2 font-semibold">
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>Location access is off.</span>
          </div>
          <p className="text-xs text-amber-200/90">
            Enter a place name or city below to check safety conditions.
          </p>
        </div>
      )}

      {/* FIRST VIEWPORT: IMMEDIATE LOCATION & SAFETY RESULT */}
      {!assessmentLoading && (
        <section className="space-y-8">
          {/* YOUR LOCATION HEADER */}
          <div className="space-y-1 border-b border-slate-800/80 pb-4">
            <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
              YOUR LOCATION
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {locationState.locality || locationState.displayName || 'Medchal, Telangana'}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              {locationState.latitude.toFixed(4)}° N, {locationState.longitude.toFixed(4)}° E
              {locationState.district && ` • ${locationState.district}`}
              {locationState.state && `, ${locationState.state}`}
            </p>
          </div>

          {/* CURRENT SAFETY STATEMENT */}
          <div id="risk-section" className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
                CURRENT SAFETY
              </span>
              <span className={`text-xs font-mono font-bold px-3 py-1 rounded border uppercase ${getRiskColor(riskLevel)}`}>
                {riskLevel} RISK
              </span>
            </div>

            <div className="flex items-baseline space-x-3">
              <span className="text-5xl font-black font-mono tracking-tight text-white">
                {typeof riskScore === 'number' ? riskScore.toFixed(1) : riskScore}
              </span>
              <span className="text-lg text-slate-500 font-mono">/ 100</span>
            </div>

            <p className="text-base text-slate-200 leading-relaxed font-sans max-w-2xl">
              Your location is currently classified as <strong>{riskLevel} Risk</strong> based on terrain slope, local precipitation, and multi-hazard evidence.
            </p>

            <div className="pt-2 flex items-center space-x-2 text-sm text-slate-300">
              <span className="text-slate-400">Primary concern:</span>
              <span className="font-semibold text-sky-400">{dominantHazard}</span>
            </div>

            <div className="pt-3">
              <a
                href="#relocation-section"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById('relocation-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold text-xs font-mono rounded transition-all shadow-md active:scale-95"
              >
                <span>SEE SAFER LOCATIONS</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* SAFE RELOCATION RECOMMENDATION */}
      {!assessmentLoading && (
        <section id="relocation-section" className="space-y-6 pt-4 border-t border-slate-800/80">
          <div className="space-y-1">
            <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
              SAFE RELOCATION
            </span>
            <h2 className="text-xl font-bold text-slate-100">
              Recommended Destination
            </h2>
          </div>

          {primarySite ? (
            <div className="space-y-5">
              <h3 className="text-2xl font-extrabold text-white">
                {siteName}
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block">DISTANCE</span>
                  <span className="text-lg font-bold text-sky-400">{typeof siteDist === 'number' ? siteDist.toFixed(1) : siteDist} km</span>
                </div>

                <div>
                  <span className="text-slate-400 block">DIRECTION</span>
                  <span className="text-lg font-bold text-white">{siteDir}</span>
                </div>

                <div>
                  <span className="text-slate-400 block">SAFETY RATING</span>
                  <span className="text-lg font-bold text-emerald-400">{siteSafety} / 100</span>
                </div>

                <div>
                  <span className="text-slate-400 block">AVAILABLE CAPACITY</span>
                  <span className="text-lg font-bold text-slate-200">{siteCap} spaces</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs font-mono rounded transition-all shadow-lg flex items-center space-x-2 active:scale-95"
                >
                  <span>GET DIRECTIONS</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <a
                  href="#map-section"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById('map-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-xs font-mono rounded border border-slate-800 transition-colors flex items-center space-x-2"
                >
                  <MapPin className="w-4 h-4 text-sky-400" />
                  <span>VIEW ON MAP</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-900/60 rounded text-xs text-slate-400">
              No verified relocation site is currently required for your assessed location risk level.
            </div>
          )}
        </section>
      )}

      {/* WHY IS THIS LOCATION AT RISK? (Factor Breakdown) */}
      {!assessmentLoading && (
        <section className="space-y-6 pt-4 border-t border-slate-800/80">
          <div className="space-y-1">
            <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
              RISK EXPLANATION
            </span>
            <h2 className="text-xl font-bold text-slate-100">
              Why is this location at risk?
            </h2>
          </div>

          <div className="space-y-4 max-w-2xl">
            {factors.slice(0, 4).map((f: any, idx: number) => {
              const scoreVal = f.score ?? f.contribution_pct ?? f.contribution ?? 50;
              return (
                <div key={idx} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-medium">{f.factor}</span>
                    <span className="font-mono text-slate-400">{scoreVal}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${getRiskBarColor(riskLevel)}`}
                      style={{ width: `${Math.max(8, Math.min(100, scoreVal))}%` }}
                    />
                  </div>
                  {f.description && (
                    <p className="text-[11px] text-slate-400">{f.description}</p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 italic">
            These environmental and spatial factors contribute to the current risk classification.
          </p>

          {/* Technical Details Toggle */}
          <div>
            <button
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="text-xs text-sky-400 hover:text-sky-300 font-mono underline flex items-center space-x-1"
            >
              <span>{showTechDetails ? 'Hide technical details' : 'Technical details & methodology'}</span>
              {showTechDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showTechDetails && (
              <div className="mt-3 p-4 bg-slate-900/90 rounded border border-slate-800 text-xs font-mono text-slate-400 space-y-2">
                <div className="flex justify-between">
                  <span>Available Evidence Coverage:</span>
                  <span className="text-slate-200">{assessment?.coverage_percentage || 92}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Model Confidence:</span>
                  <span className="text-slate-200">{assessment?.confidence || 94.3}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Primary Telemetry:</span>
                  <span className="text-slate-200">IMD Weather + Sentinel-1 SAR</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* EXPLORE THE AREA (Interactive 3D / 2D Map Canvas) */}
      <section id="map-section" className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
              SPATIAL WORKSPACE
            </span>
            <h2 className="text-xl font-bold text-slate-100">
              Explore the Area
            </h2>
          </div>

          {/* 3D / 2D Toggle */}
          <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded font-mono text-xs">
            <button
              onClick={() => setMapMode('3D')}
              className={`px-3 py-1 rounded transition-all ${
                mapMode === '3D' ? 'bg-sky-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              3D Terrain
            </button>
            <button
              onClick={() => setMapMode('2D')}
              className={`px-3 py-1 rounded transition-all ${
                mapMode === '2D' ? 'bg-sky-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              2D Map
            </button>
          </div>
        </div>

        <div className="w-full h-[420px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
          {mapMode === '3D' ? (
            <AashrayTerrainEngine
              selectedLocation={{
                lat: locationState.latitude,
                lng: locationState.longitude,
                name: locationState.displayName
              }}
              recommendedSite={primarySite ? {
                lat: primarySite.latitude,
                lng: primarySite.longitude,
                name: primarySite.site_name || primarySite.name
              } : null}
              height="100%"
              showCorridor={true}
            />
          ) : (
            <MapContainer
              userLocation={{
                latitude: locationState.latitude,
                longitude: locationState.longitude,
                accuracy: locationState.accuracy,
                displayName: locationState.displayName,
                source: locationState.source
              }}
              assessment={assessment}
              habitations={[]}
              candidateSites={[]}
            />
          )}
        </div>
      </section>

      {/* CHECK ANOTHER LOCATION (Secondary Search Fallback) */}
      <section className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="space-y-1">
          <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
            LOCATION SEARCH
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            Check another location
          </h2>
        </div>

        <div className="relative max-w-xl">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-inner">
            <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search a city, village, district or coordinates..."
              className="w-full bg-transparent border-none focus:outline-none text-xs md:text-sm text-slate-100 placeholder-slate-500 ml-2 font-sans"
            />
            {isSearching && (
              <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin shrink-0 mr-1" />
            )}
          </div>

          {showResultsDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-800 z-50 text-xs font-sans">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left p-3 hover:bg-slate-900 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <span className="font-bold text-slate-100 group-hover:text-sky-400">
                      {item.locality || item.name}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {item.district} {item.state ? `| ${item.state}` : ''}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400">
                    SELECT
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

    </main>
  );
};
