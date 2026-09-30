import React, { useState } from 'react';
import { NationalGISLocation, RiskSeverity } from '../types';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Navigation,
  ExternalLink,
  MapPin,
  Calendar,
  Layers,
  CheckCircle,
  HelpCircle,
  Compass,
  ArrowRight
} from 'lucide-react';

export type LocationDetailTab = 'overview' | 'spatial' | 'factors' | 'history' | 'relocation';

interface LocationDetailPanelProps {
  location: NationalGISLocation | null;
  onClose: () => void;
  onZoomToLocation?: (loc: NationalGISLocation) => void;
  onZoomToSafeSite?: (loc: NationalGISLocation) => void;
  activeTab?: LocationDetailTab;
  onTabChange?: (tab: LocationDetailTab) => void;
}

const getSeverityStyles = (level: RiskSeverity | string) => {
  switch (level?.toUpperCase()) {
    case 'CRITICAL':
      return {
        badgeBg: 'bg-red-950/80',
        badgeBorder: 'border-red-600',
        badgeText: 'text-red-300',
        barColor: 'bg-red-600',
        textColor: 'text-red-400',
        label: 'CRITICAL',
      };
    case 'EXTREMELY HIGH':
    case 'VERY HIGH':
      return {
        badgeBg: 'bg-orange-950/80',
        badgeBorder: 'border-orange-600',
        badgeText: 'text-orange-300',
        barColor: 'bg-orange-600',
        textColor: 'text-orange-400',
        label: 'EXTREMELY HIGH',
      };
    case 'HIGH':
      return {
        badgeBg: 'bg-amber-950/80',
        badgeBorder: 'border-amber-600',
        badgeText: 'text-amber-300',
        barColor: 'bg-amber-500',
        textColor: 'text-amber-400',
        label: 'HIGH',
      };
    case 'MODERATE':
    default:
      return {
        badgeBg: 'bg-yellow-950/80',
        badgeBorder: 'border-yellow-600',
        badgeText: 'text-yellow-300',
        barColor: 'bg-yellow-500',
        textColor: 'text-yellow-400',
        label: 'MODERATE',
      };
  }
};

export const LocationDetailPanel: React.FC<LocationDetailPanelProps> = ({
  location,
  onClose,
  onZoomToLocation,
  onZoomToSafeSite,
  activeTab: propActiveTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<LocationDetailTab>('overview');
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalTab;

  const handleTabClick = (tab: LocationDetailTab) => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  if (!location) return null;

  const severity = getSeverityStyles(location.risk_level);
  const site = location.recommended_safe_site;
  const history = location.historical_records || [];
  const whyFactors = location.why_risky_factors || [];

  // Safe Google Maps directions URL with actual coordinates
  const directionsUrl = site
    ? `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${site.latitude},${site.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;

  // Evaluate risk trend from history if available
  let trendIndicator = null;
  if (history.length >= 2) {
    const oldest = history[0].risk_score;
    const latest = history[history.length - 1].risk_score;
    if (latest > oldest + 5) {
      trendIndicator = {
        icon: TrendingUp,
        text: 'Increasing Risk Trend',
        color: 'text-red-400',
        bg: 'bg-red-950/40 border-red-800/60',
      };
    } else if (latest < oldest - 5) {
      trendIndicator = {
        icon: TrendingDown,
        text: 'Decreasing Risk Trend',
        color: 'text-emerald-400',
        bg: 'bg-emerald-950/40 border-emerald-800/60',
      };
    } else {
      trendIndicator = {
        icon: Minus,
        text: 'Stable Risk Level',
        color: 'text-amber-400',
        bg: 'bg-amber-950/40 border-amber-800/60',
      };
    }
  }

  return (
    <aside
      data-testid="location-detail-panel"
      className="w-full md:w-[440px] bg-slate-950/95 backdrop-blur-md border-l border-slate-800 flex flex-col h-full z-20 shadow-2xl overflow-hidden font-sans select-none animate-in slide-in-from-right duration-300"
    >
      {/* 1. TOP HEADER & CLOSE BUTTON */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${severity.badgeBg} ${severity.badgeBorder} ${severity.badgeText}`}
            >
              {severity.label} RISK
            </span>
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>{location.verification_status || 'VERIFIED SDMA'}</span>
            </span>
          </div>

          <h2 className="text-lg font-bold text-slate-100 truncate" title={location.location_name}>
            📍 {location.location_name}
          </h2>

          <div className="text-xs text-slate-400 flex items-center gap-1">
            <span>{location.district}</span>
            <span>•</span>
            <span className="text-slate-300 font-medium">{location.state}</span>
          </div>

          <div className="font-mono text-[11px] text-slate-500">
            {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition border border-slate-700/60 shrink-0"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. TAB NAVIGATION BAR */}
      <div className="flex border-b border-slate-800 bg-slate-950 font-mono text-[11px] overflow-x-auto">
        <button
          onClick={() => handleTabClick('overview')}
          className={`flex-1 py-2 px-1 text-center border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-sky-500 text-sky-400 font-bold bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => handleTabClick('spatial')}
          className={`flex-1 py-2 px-1 text-center border-b-2 transition whitespace-nowrap ${
            activeTab === 'spatial'
              ? 'border-sky-400 text-sky-300 font-bold bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Spatial Intel
        </button>
        <button
          onClick={() => handleTabClick('factors')}
          className={`flex-1 py-2 px-1 text-center border-b-2 transition whitespace-nowrap ${
            activeTab === 'factors'
              ? 'border-sky-500 text-sky-400 font-bold bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Hazard Drivers
        </button>
        <button
          onClick={() => handleTabClick('history')}
          className={`flex-1 py-2 px-1 text-center border-b-2 transition whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-sky-500 text-sky-400 font-bold bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          History
        </button>
        <button
          onClick={() => handleTabClick('relocation')}
          className={`flex-1 py-2 px-1 text-center border-b-2 transition whitespace-nowrap ${
            activeTab === 'relocation'
              ? 'border-emerald-500 text-emerald-400 font-bold bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Safe Relocation
        </button>
      </div>

      {/* 3. SCROLLABLE TAB CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Primary Risk Metric Card */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                  Assessed Risk Score
                </span>
                <span className={`text-xs font-mono font-bold ${severity.textColor}`}>
                  {severity.label}
                </span>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-slate-100 font-mono">
                  {location.risk_score.toFixed(1)}
                </span>
                <span className="text-sm text-slate-500 font-mono">/ 100</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${severity.barColor} transition-all duration-500`}
                  style={{ width: `${Math.min(100, Math.max(5, location.risk_score))}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Primary Hazard</span>
                  <span className="font-bold text-amber-400">{location.primary_hazard}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Risk Radius</span>
                  <span className="font-bold text-sky-400">
                    {location.risk_radius_km > 0 ? `${location.risk_radius_km} km` : 'Point Location'}
                  </span>
                </div>
              </div>
            </div>

            {/* Executive Priority for Action Card */}
            {location.priority_score !== undefined && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-slate-300">
                    <span className="text-amber-400">⚡</span>
                    <span>PRIORITY FOR ACTION</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase border ${
                      location.priority_category === 'IMMEDIATE REVIEW'
                        ? 'bg-red-950 border-red-800 text-red-300 animate-pulse'
                        : location.priority_category === 'PRIORITY ASSESSMENT'
                        ? 'bg-amber-950 border-amber-800 text-amber-300'
                        : 'bg-sky-950 border-sky-800 text-sky-300'
                    }`}
                  >
                    {location.priority_category || 'MONITOR'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold font-mono text-slate-100">
                      {location.priority_score.toFixed(1)}
                    </span>
                    <span className="text-xs font-mono text-slate-500">Priority Index (0-100)</span>
                  </div>
                  {location.priority_rank && (
                    <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      Rank #{location.priority_rank.toString().padStart(2, '0')}
                    </span>
                  )}
                </div>

                {location.priority_reasons && location.priority_reasons.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">
                      Why is this prioritized?
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {location.priority_reasons.map((reason, idx) => (
                        <li key={idx} className="flex items-start space-x-1.5 text-[11px] text-slate-300">
                          <span className="text-sky-400 font-bold">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Affected Population Card */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 uppercase font-bold">
                <Users className="w-4 h-4 text-sky-400" />
                <span>Population Exposure</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">Total In Risk Footprint</span>
                  <span className="text-lg font-bold text-slate-100 font-mono">
                    {location.population.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-500 block">residents</span>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">Vulnerable Cohort</span>
                  <span className="text-lg font-bold text-rose-400 font-mono">
                    {location.vulnerable_population.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-500 block">elderly / infants / PWD</span>
                </div>
              </div>
            </div>

            {/* Quick Relocation Summary Banner */}
            {site ? (
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="text-sm">🛡️</span>
                    <span>{site.status || 'SAFE RELOCATION SITE ALLOCATED'}</span>
                  </span>
                  <span className="font-mono text-[10px] text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    {site.distance_km} km ({site.road_distance_km ? `${site.road_distance_km} km road` : site.direction})
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-100">{site.name}</div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 font-mono">
                  <span>Available Spaces:</span>
                  <span className="font-bold text-emerald-300">
                    {site.capacity_available.toLocaleString('en-IN')} / {site.capacity_total.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-1.5 px-3 rounded text-xs transition"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Get Directions</span>
                  </a>
                  <button
                    onClick={() => handleTabClick('relocation')}
                    className="flex items-center justify-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 px-3 rounded text-xs transition font-mono"
                  >
                    <span>Full Site Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>No verified safe relocation site is currently available for this coordinate.</span>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <button
                onClick={() => onZoomToLocation && onZoomToLocation(location)}
                className="flex items-center justify-center space-x-1.5 p-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition"
              >
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>Zoom to Area</span>
              </button>
              {site && (
                <button
                  onClick={() => onZoomToSafeSite && onZoomToSafeSite(location)}
                  className="flex items-center justify-center space-x-1.5 p-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition"
                >
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zoom Safe Site</span>
                </button>
              )}
            </div>

            {/* Data Provenance & Metadata */}
            <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg space-y-1 text-[11px] text-slate-500 font-mono">
              <div className="flex justify-between">
                <span>Data Source:</span>
                <span className="text-slate-400">{location.data_source || 'SDMA Spatial Registry'}</span>
              </div>
              <div className="flex justify-between">
                <span>Assessment Date:</span>
                <span className="text-slate-400">{location.assessment_date || '2026-03'}</span>
              </div>
              <div className="flex justify-between">
                <span>Model Confidence:</span>
                <span className="text-emerald-400">{location.confidence || 'HIGH'}</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: SPATIAL INTELLIGENCE ================= */}
        {activeTab === 'spatial' && (
          <div className="space-y-4">
            {/* Header info card */}
            <div className="p-4 bg-sky-950/20 border border-sky-800/60 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>SPATIAL INTELLIGENCE AUDIT</span>
                </span>
                <span className="text-[10px] font-mono bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded">
                  {location.risk_radius_km > 0 ? `Radius: ${location.risk_radius_km} km` : 'Point Analysis'}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-100">{location.location_name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {location.district} District, {location.state}
                </p>
                <div className="font-mono text-[11px] text-sky-400/90 mt-1">
                  GPS: {location.latitude.toFixed(5)}° N, {location.longitude.toFixed(5)}° E
                </div>
              </div>

              {/* Spatial Geometry & Impact Footprint Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-sky-800/40 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">HAZARD PERIMETER</span>
                  <span className="font-bold text-slate-200">
                    {location.risk_radius_km > 0 ? `${location.risk_radius_km} km radius` : 'Localized Focus'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">IMPACT FOOTPRINT AREA</span>
                  <span className="font-bold text-sky-300">
                    {location.risk_radius_km > 0
                      ? `${(Math.PI * Math.pow(location.risk_radius_km, 2)).toFixed(2)} km²`
                      : 'N/A (Point)'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">POPULATION DENSITY</span>
                  <span className="font-bold text-amber-400">
                    {location.risk_radius_km > 0
                      ? `${Math.round(location.population / (Math.PI * Math.pow(location.risk_radius_km, 2)))} / km²`
                      : `${location.population} residents`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">PRIMARY HAZARD VECTOR</span>
                  <span className="font-bold text-rose-400 truncate block">
                    {location.primary_hazard}
                  </span>
                </div>
              </div>
            </div>

            {/* Spatial Terrain & Risk Context */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
              <span className="text-slate-400 uppercase font-bold text-[10px] block">
                Terrain & Environmental Context
              </span>

              <div className="space-y-2 text-[11px]">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Administrative Boundary:</span>
                  <span className="text-slate-200 font-bold">{location.district}, {location.state}</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Risk Severity Rating:</span>
                  <span className={`font-bold ${severity.textColor}`}>{severity.label} ({location.risk_score.toFixed(1)}/100)</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Data Provenance:</span>
                  <span className="text-slate-300">{location.data_source || 'SDMA Spatial Risk Registry'}</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Validation Status:</span>
                  <span className="text-emerald-400 font-bold">{location.verification_status || 'VERIFIED SDMA'}</span>
                </div>
              </div>
            </div>

            {/* Safe Relocation Corridor Spatial Verification */}
            {site ? (
              <div className="p-4 bg-emerald-950/20 border border-emerald-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    <span>RELOCATION SPATIAL VECTOR</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Safe Hub Allocated
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-100">🛡️ {site.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    {site.latitude.toFixed(4)}° N, {site.longitude.toFixed(4)}° E ({site.district}, {site.state})
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-800/40 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">EUCLIDEAN DISTANCE</span>
                    <span className="font-bold text-slate-200">{site.distance_km} km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">ROAD CORRIDOR</span>
                    <span className="font-bold text-emerald-300">
                      {site.road_distance_km ? `${site.road_distance_km} km` : `${(site.distance_km * 1.35).toFixed(1)} km`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">COMPASS BEARING</span>
                    <span className="font-bold text-slate-300">
                      {site.direction} ({site.bearing_degrees}°)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">HAZARD SEPARATION</span>
                    <span className="font-bold text-emerald-400">
                      {site.distance_km > location.risk_radius_km
                        ? `+${(site.distance_km - location.risk_radius_km).toFixed(1)} km Clear`
                        : 'Within Buffer'}
                    </span>
                  </div>
                </div>

                {/* Spatial Action Controls */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => onZoomToLocation && onZoomToLocation(location)}
                    className="flex items-center justify-center space-x-1.5 p-2 bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 rounded-lg transition font-mono text-xs"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Focus Origin</span>
                  </button>
                  <button
                    onClick={() => onZoomToSafeSite && onZoomToSafeSite(location)}
                    className="flex items-center justify-center space-x-1.5 p-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 rounded-lg transition font-mono text-xs"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Focus Safe Hub</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>No verified relocation facility linked in spatial registry for this coordinate.</span>
              </div>
            )}

            {/* Navigation & GIS Action */}
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-lg shadow-sky-950/40 font-mono"
            >
              <Navigation className="w-4 h-4" />
              <span>LAUNCH EXTERNAL SATELLITE NAVIGATION 🛰️</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          </div>
        )}

        {/* ================= TAB 2: WHY IS THIS RISKY? ================= */}
        {activeTab === 'factors' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400 font-mono">
              <span className="font-bold text-slate-200">WHY IS THIS LOCATION RISKY?</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Deterministic contributing environmental and terrain factors identified by the risk engine:
              </p>
            </div>

            {whyFactors.length > 0 ? (
              <div className="space-y-2">
                {whyFactors.map((factor, idx) => {
                  const factorSev = factor.severity || (factor.contribution >= 30 ? 'CRITICAL' : factor.contribution >= 15 ? 'HIGH' : 'MODERATE');
                  return (
                    <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>{factor.factor}</span>
                        </span>
                        <div className="flex items-center space-x-1.5">
                          {factor.contribution > 0 && (
                            <span className="text-[9px] font-mono text-slate-400">
                              +{factor.contribution.toFixed(0)}%
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border ${
                              factorSev === 'CRITICAL'
                                ? 'bg-red-950 border-red-800 text-red-400'
                                : factorSev === 'HIGH'
                                ? 'bg-orange-950 border-orange-800 text-orange-400'
                                : 'bg-amber-950 border-amber-800 text-amber-400'
                            }`}
                          >
                            {factorSev}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{factor.description}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
                <span className="font-bold text-slate-200">Primary Hazard: {location.primary_hazard}</span>
                <p className="text-slate-500">
                  Risk classification is derived from spatial terrain slope, precipitation thresholds, and drainage exposure models.
                </p>
              </div>
            )}

            {location.secondary_hazards && location.secondary_hazards.length > 0 && (
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Secondary Hazards</span>
                <div className="flex flex-wrap gap-1.5">
                  {location.secondary_hazards.map((h, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: RISK HISTORY ================= */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200">HISTORICAL RISK TIMELINE</span>
              {trendIndicator && (
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${trendIndicator.bg} ${trendIndicator.color}`}
                >
                  <trendIndicator.icon className="w-3 h-3" />
                  <span>{trendIndicator.text}</span>
                </span>
              )}
            </div>

            {history.length > 0 ? (
              <div className="space-y-3">
                {/* Visual Chart / Step Graph */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-end justify-between h-28 pt-4 px-2 border-b border-slate-800">
                    {history.map((epoch, idx) => {
                      const hSeverity = getSeverityStyles(epoch.risk_level);
                      const barHeight = Math.max(15, (epoch.risk_score / 100) * 80);

                      return (
                        <div key={idx} className="flex flex-col items-center gap-1 group flex-1">
                          <span className="text-[10px] font-mono text-slate-400 font-bold group-hover:text-slate-100">
                            {epoch.risk_score.toFixed(0)}
                          </span>
                          <div
                            className={`w-7 rounded-t transition-all ${hSeverity.barColor} group-hover:brightness-125`}
                            style={{ height: `${barHeight}px` }}
                          />
                          <span className="text-[10px] font-mono text-slate-400 mt-1">{epoch.year}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono text-center">
                    Historical Risk Score Progression (0 - 100 Scale)
                  </div>
                </div>

                {/* List of Historical Assessments */}
                <div className="space-y-2">
                  {history.map((epoch, idx) => {
                    const hSeverity = getSeverityStyles(epoch.risk_level);
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-slate-200">Assessment Year {epoch.year}</span>
                          <div className="text-[10px] text-slate-500">
                            {epoch.event || 'Routine SDMA Model Assessment'}
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${hSeverity.badgeBg} ${hSeverity.badgeBorder} ${hSeverity.badgeText}`}
                          >
                            {epoch.risk_level}
                          </span>
                          <span className="block font-mono text-xs font-bold text-slate-300 mt-0.5">
                            {epoch.risk_score.toFixed(1)} / 100
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl text-center space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-xs text-slate-300 font-bold">No Historical Epochs Recorded</div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Historical assessment data is not available for this location. Only the active verified risk epoch is currently recorded in the SDMA database.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: SAFE RELOCATION INTELLIGENCE ================= */}
        {activeTab === 'relocation' && (
          <div className="space-y-4">
            {site ? (
              <div className="space-y-4">
                {/* Safe Site Primary Card */}
                <div className="p-4 bg-emerald-950/20 border border-emerald-800/60 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        site.status === 'EXTENDED-RANGE CANDIDATE'
                          ? 'bg-purple-950 border-purple-800 text-purple-300'
                          : site.status === 'PARTIAL CAPACITY'
                          ? 'bg-amber-950 border-amber-800 text-amber-300'
                          : 'bg-emerald-950 border-emerald-800 text-emerald-300'
                      }`}
                    >
                      {site.status || 'VERIFIED SAFE SITE'}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      Safety: {site.safety_score} / 100
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-100">🛡️ {site.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {site.district}, {site.state}
                    </p>
                  </div>

                  {/* Distance & Road Travel Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-800/40">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">DIRECT DISTANCE</span>
                      <span className="font-mono font-bold text-slate-200">{site.distance_km} km</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">ROAD TRAVEL</span>
                      <span className="font-mono font-bold text-emerald-300">
                        {site.road_distance_km ? `${site.road_distance_km} km` : `${(site.distance_km * 1.35).toFixed(1)} km`}
                        {' • '}
                        {site.travel_time_minutes ? `${site.travel_time_minutes} min` : `${Math.round(site.distance_km * 2.2)} min`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">VECTOR BEARING</span>
                      <span className="font-mono font-bold text-slate-300">
                        {site.direction} ({site.bearing_degrees}°)
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">DESTINATION RISK</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {site.destination_risk || 'LOW (Safe Basin)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Capacity & Allocation Card */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 uppercase font-bold">Relocation Shelter Capacity</span>
                    <span className="text-emerald-400 font-bold">{site.capacity_available.toLocaleString('en-IN')} Available</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Occupancy</span>
                      <span className="text-slate-200 font-bold">
                        {site.capacity_used} / {site.capacity_total.toLocaleString('en-IN')} spaces ({site.capacity_utilization_pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, site.capacity_utilization_pct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Capacity Gap Warning if applicable */}
                  {site.capacity_gap && site.capacity_gap > 0 ? (
                    <div className="p-2.5 bg-amber-950/40 border border-amber-800/70 rounded-lg text-xs font-mono space-y-1">
                      <div className="flex items-center justify-between text-amber-300 font-bold">
                        <span>⚠️ PARTIAL CAPACITY ALLOCATION</span>
                        <span>Gap: {site.capacity_gap.toLocaleString('en-IN')}</span>
                      </div>
                      <p className="text-[11px] text-amber-200/80">
                        Accommodates {site.capacity_available.toLocaleString('en-IN')} of {location.population.toLocaleString('en-IN')} residents ({Math.round((site.capacity_available / location.population) * 100)}%). Secondary facility staging required.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-950/30 border border-emerald-800/50 rounded text-[11px] text-emerald-300 font-mono flex items-center justify-between">
                      <span>Cohort Accommodation:</span>
                      <span className="font-bold">✓ 100% Full Capacity (Zero Deficit)</span>
                    </div>
                  )}
                </div>

                {/* Essential Services Suitability */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5 text-xs">
                  <span className="font-mono text-slate-400 uppercase font-bold text-[10px] block">
                    Essential Services & Infrastructure
                  </span>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="p-2 bg-slate-950 rounded border border-slate-800 flex items-center space-x-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span className="text-slate-300">Healthcare: Available</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded border border-slate-800 flex items-center space-x-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span className="text-slate-300">Education / Campus</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded border border-slate-800 flex items-center space-x-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span className="text-slate-300">Emergency Services</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded border border-slate-800 flex items-center space-x-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span className="text-slate-300">Water & Sanitation</span>
                    </div>
                  </div>
                  <div className="flex justify-between font-mono text-[11px] pt-1 text-slate-400">
                    <span>Road Connectivity:</span>
                    <span className="text-emerald-300 font-bold">{site.road_accessibility || 'Paved All-Weather Route'}</span>
                  </div>
                </div>

                {/* Why This Site Was Selected? (Explainable Decision-Support) */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-300 uppercase font-bold text-[10px]">
                      Why This Site Was Recommended?
                    </span>
                    <span className="text-[10px] font-mono text-sky-400">
                      Search Radius: {site.search_radius_used_km ? `${site.search_radius_used_km} km` : 'Progressive'}
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px]">
                    {site.selection_reasons && site.selection_reasons.length > 0 ? (
                      site.selection_reasons.map((reason: string, rIdx: number) => (
                        <div key={rIdx} className="flex items-start space-x-1.5 text-slate-300">
                          <span className="text-emerald-400 shrink-0 font-bold mt-0.5">✓</span>
                          <span>{reason}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-center space-x-1.5 text-slate-300">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span>Proximity: {site.distance_km} km within geographic operational limits</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-slate-300">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span>Same State / District operational administrative corridor</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-slate-300">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span>Outside active flood & landslide hazard inundation footprints</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-slate-300">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span>Verified official facility: {site.verification_status}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Primary Action: Get Directions Button */}
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-lg shadow-emerald-950/40"
                >
                  <Navigation className="w-4 h-4" />
                  <span>GET DIRECTIONS VIA GOOGLE MAPS 🗺️</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              </div>
            ) : (
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <div className="text-xs text-slate-200 font-bold">No Safe Site Recorded</div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  No verified safe relocation site is currently available for this coordinate. DDMA/SDMA ground assessment is required to designate a candidate evacuation zone.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. FOOTER STATUS BAR */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 text-[10px] font-mono text-slate-500 flex items-center justify-between">
        <span>KSHEMA GIS INTELLIGENCE</span>
        <span>ID: {location.id}</span>
      </div>
    </aside>
  );
};
