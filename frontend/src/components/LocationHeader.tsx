import React from 'react';
import { useLocation } from '../context/LocationContext';
import { MapPin, Navigation, RefreshCw, AlertTriangle, ShieldCheck, Database, Compass, AlertOctagon } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LocationHeader: React.FC = () => {
  const {
    locationState,
    assessment,
    loading,
    openLocationModal,
    requestGpsLocation,
    toggleDemoMode
  } = useLocation();

  const getAccuracyBadgeClass = (quality: string) => {
    if (quality === 'HIGH') return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
    if (quality === 'MEDIUM') return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
    return 'bg-rose-950/80 text-rose-300 border-rose-700/60';
  };

  const getStatusBadgeClass = (status: string) => {
    if (locationState.demoMode) return 'bg-purple-950/80 text-purple-300 border-purple-700';
    if (status?.includes('LIVE')) return 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
    return 'bg-amber-950/80 text-amber-300 border-amber-700';
  };

  const getLocationSourceLabel = () => {
    if (locationState.permissionState === 'UNAVAILABLE') return 'LOCATION UNAVAILABLE';
    if (locationState.source === 'GPS') return 'GPS LOCATION';
    if (locationState.source === 'MAP' || locationState.source === 'MAP_PIN') return 'MAP LOCATION';
    return 'MANUAL LOCATION';
  };

  const getLocationSourceBadgeClass = () => {
    if (locationState.permissionState === 'UNAVAILABLE') return 'bg-rose-950/90 text-rose-300 border-rose-700';
    if (locationState.source === 'GPS') return 'bg-emerald-950/90 text-emerald-300 border-emerald-700';
    if (locationState.source === 'MAP' || locationState.source === 'MAP_PIN') return 'bg-blue-950/90 text-blue-300 border-blue-700';
    return 'bg-amber-950/90 text-amber-300 border-amber-700';
  };

  return (
    <div className="bg-command-card border-b border-command-border px-4 py-3 shadow-lg">
      {locationState.demoMode && (
        <div className="bg-purple-950/90 text-purple-200 border border-purple-600 px-3 py-1 text-xs font-semibold rounded mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            DEMONSTRATION DATA MODE ACTIVE — NOT LIVE — FOR PROTOTYPE / TESTING
          </span>
          <button
            onClick={toggleDemoMode}
            className="underline hover:text-white transition-colors"
          >
            Switch to Live Data Mode
          </button>
        </div>
      )}

      {/* Permission Denied Warning Banner */}
      {locationState.permissionState === 'DENIED' && (
        <div className="bg-amber-950/90 border border-amber-600 text-amber-200 px-4 py-2.5 rounded-lg mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Location access was not granted. Please select your position manually or pick a point on the GIS map.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openLocationModal}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded shadow transition-all"
            >
              Enter Location Manually
            </button>
            <Link
              to="/gis-map"
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold rounded transition-all"
            >
              Select on Map
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Location & Coordinates */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-command-accent/20 border border-command-accent/40 text-command-accent mt-0.5">
            <MapPin className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base md:text-lg font-bold text-white tracking-wide">
                {locationState.displayName}
              </h2>
              <span className={`px-2.5 py-0.5 text-xs font-bold font-mono rounded border uppercase ${getLocationSourceBadgeClass()}`}>
                <Compass className="w-3 h-3 inline mr-1" />
                {getLocationSourceLabel()}
              </span>
              {locationState.source === 'GPS' && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getAccuracyBadgeClass(locationState.accuracyQuality)}`}>
                  GPS Accuracy ±{Math.round(locationState.accuracy)}m ({locationState.accuracyQuality})
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
              <span className="font-mono text-gray-300">
                {locationState.latitude.toFixed(6)}° N, {locationState.longitude.toFixed(6)}° E
              </span>
              <span>•</span>
              <span>Source: <strong className="text-gray-200">{locationState.source}</strong></span>
              <span>•</span>
              <span>Updated: <strong className="text-gray-200">{assessment?.assessment_timestamp || locationState.timestamp}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Controls & Data Status */}
        <div className="flex items-center gap-2 flex-wrap md:justify-end">
          {/* Data Status Indicator */}
          <div className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 ${getStatusBadgeClass(assessment?.data_status || '')}`}>
            <Database className="w-3.5 h-3.5" />
            <span>{locationState.demoMode ? 'DEMO DATA' : (assessment?.data_status || 'LIVE / HYBRID')}</span>
          </div>

          {/* Refresh Location GPS button */}
          <button
            onClick={() => requestGpsLocation()}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 transition-colors flex items-center gap-1.5"
            title="Refresh current GPS location"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Locating...' : 'Refresh GPS'}</span>
          </button>

          {/* Change Location Button */}
          <button
            onClick={openLocationModal}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-command-accent text-white hover:bg-command-accent/90 transition-all shadow-md flex items-center gap-1.5"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>CHANGE LOCATION</span>
          </button>
        </div>
      </div>
    </div>
  );
};
