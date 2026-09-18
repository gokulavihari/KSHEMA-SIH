import React from 'react';
import { LocationAssessment } from '../types';
import { CloudRain, Thermometer, Waves, Mountain, AlertCircle, Clock } from 'lucide-react';

interface LiveConditionsCardProps {
  assessment: LocationAssessment;
}

export const LiveConditionsCard: React.FC<LiveConditionsCardProps> = ({ assessment }) => {
  const { live_conditions, spatial_features, data_freshness } = assessment;

  const getWarningBadge = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'RED':
        return 'bg-rose-950/90 text-rose-200 border-rose-600 animate-pulse';
      case 'ORANGE':
        return 'bg-amber-950/90 text-amber-200 border-amber-600';
      case 'YELLOW':
        return 'bg-yellow-950/90 text-yellow-200 border-yellow-600';
      default:
        return 'bg-emerald-950/90 text-emerald-200 border-emerald-600';
    }
  };

  return (
    <div className="bg-command-card border border-command-border rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between border-b border-command-border pb-3 mb-4">
        <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-command-accent" />
          CURRENT LIVE CONDITIONS & GEOSPATIAL TELEMETRY
        </h3>
        <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {data_freshness.imd_observation_time}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {/* Current Rainfall */}
        <div className="bg-gray-950/70 border border-gray-800 p-3 rounded-lg">
          <div className="text-[11px] text-gray-400 font-medium mb-1">Current Rainfall</div>
          <div className="text-lg font-bold text-white flex items-baseline gap-1">
            <span>{live_conditions.rainfall_mm_hr.toFixed(1)}</span>
            <span className="text-xs font-normal text-gray-400">mm/hr</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1">IMD AWS Telemetry</div>
        </div>

        {/* Temperature */}
        <div className="bg-gray-950/70 border border-gray-800 p-3 rounded-lg">
          <div className="text-[11px] text-gray-400 font-medium mb-1">Temperature</div>
          <div className="text-lg font-bold text-white flex items-baseline gap-1">
            <span>{live_conditions.temperature_c.toFixed(1)}</span>
            <span className="text-xs font-normal text-gray-400">°C</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Surface Temperature</div>
        </div>

        {/* River Distance */}
        <div className="bg-gray-950/70 border border-gray-800 p-3 rounded-lg">
          <div className="text-[11px] text-gray-400 font-medium mb-1">River Proximity</div>
          {spatial_features.river_distance_m !== null ? (
            <>
              <div className="text-lg font-bold text-white flex items-baseline gap-1">
                <span>{spatial_features.river_distance_m}</span>
                <span className="text-xs font-normal text-gray-400">m</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">Himalayan Channel Vector</div>
            </>
          ) : (
            <>
              <div className="text-sm font-bold text-gray-400 mt-1">
                Unavailable
              </div>
              <div className="text-[10px] text-gray-500 mt-1">Out of Coverage Zone</div>
            </>
          )}
        </div>

        {/* Slope Severity */}
        <div className="bg-gray-950/70 border border-gray-800 p-3 rounded-lg">
          <div className="text-[11px] text-gray-400 font-medium mb-1">Terrain Slope</div>
          <div className="text-lg font-bold text-white flex items-baseline gap-1">
            <span>{spatial_features.slope_degrees.toFixed(1)}</span>
            <span className="text-xs font-normal text-gray-400">° gradient</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1">SRTM DEM Raster</div>
        </div>

        {/* Elevation */}
        <div className="bg-gray-950/70 border border-gray-800 p-3 rounded-lg">
          <div className="text-[11px] text-gray-400 font-medium mb-1">Elevation</div>
          <div className="text-lg font-bold text-white flex items-baseline gap-1">
            <span>{Math.round(spatial_features.elevation_m)}</span>
            <span className="text-xs font-normal text-gray-400">m ASL</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Topographic Height</div>
        </div>

        {/* Hospital Distance */}
        <div className="bg-gray-950/70 border border-gray-800 p-3 rounded-lg">
          <div className="text-[11px] text-gray-400 font-medium mb-1">Nearest Healthcare</div>
          <div className="text-lg font-bold text-white flex items-baseline gap-1">
            <span>{spatial_features.nearest_hospital_km.toFixed(1)}</span>
            <span className="text-xs font-normal text-gray-400">km</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1">OSM Medical Facility</div>
        </div>
      </div>

      {/* Official IMD District Warning Banner */}
      <div className={`p-3 rounded-lg border flex items-center gap-3 ${getWarningBadge(live_conditions.imd_warning_level)}`}>
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <div>
          <div className="text-xs font-bold uppercase tracking-wider">
            IMD DISTRICT WARNING: {live_conditions.imd_warning_level} ALERT
          </div>
          <div className="text-xs opacity-90 mt-0.5">
            {live_conditions.imd_warning_text}
          </div>
        </div>
      </div>
    </div>
  );
};
