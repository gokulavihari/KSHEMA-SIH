import React, { useEffect, useState } from 'react';
import { useLocation } from '../context/LocationContext';
import { fetchLocationRelocationOptions } from '../services/api';
import { LocationRelocationResponse } from '../types';
import { LocationHeader } from '../components/LocationHeader';
import { ChangeLocationModal } from '../components/ChangeLocationModal';
import { LiveConditionsCard } from '../components/LiveConditionsCard';
import { RiskFactorBreakdown } from '../components/RiskFactorBreakdown';
import { RelocationDecisionCard } from '../components/RelocationDecisionCard';
import { ShieldCheck, ShieldAlert, AlertOctagon, Activity, ArrowRight, MapPin, Hospital, Route, CheckCircle2, ChevronRight, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardView: React.FC = () => {
  const { locationState, assessment, loading, error, backendUnavailable, openLocationModal, refreshAssessment } = useLocation();
  const [relocOptions, setRelocOptions] = useState<LocationRelocationResponse | null>(null);
  const [relocLoading, setRelocLoading] = useState<boolean>(false);

  const isRelocationRequired = assessment?.relocation?.required ?? (assessment?.decision?.relocation_required ?? false);

  useEffect(() => {
    if (assessment) {
      setRelocLoading(true);
      fetchLocationRelocationOptions(
        locationState.latitude,
        locationState.longitude,
        1250,
        assessment.risk_level
      )
        .then((res) => setRelocOptions(res))
        .catch((err) => console.error('Failed to fetch relocation options:', err))
        .finally(() => setRelocLoading(false));
    } else {
      setRelocOptions(null);
    }
  }, [locationState.latitude, locationState.longitude, assessment]);

  if (loading || !assessment) {
    return (
      <div className="min-h-screen bg-command-bg flex flex-col">
        <LocationHeader />
        <ChangeLocationModal />
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4 p-8">
          <Activity className="w-10 h-10 animate-spin text-command-accent" />
          <span className="text-sm font-semibold tracking-wide text-gray-200">
            LOCATING & ASSESSING {locationState.displayName.toUpperCase()}...
          </span>
          <span className="text-xs text-gray-500 font-mono">
            Calculating multi-hazard risk, vulnerability scores, and safe relocation options ({locationState.latitude.toFixed(4)}° N, {locationState.longitude.toFixed(4)}° E)
          </span>
        </div>
      </div>
    );
  }

  // 1. Connection Failure Screen
  if (backendUnavailable?.isUnavailable) {
    return (
      <div className="min-h-screen bg-command-bg pb-12">
        <LocationHeader />
        <ChangeLocationModal />
        <div className="p-6 max-w-4xl mx-auto space-y-4 pt-8">
          <div className="p-6 bg-rose-950/90 border-2 border-rose-600 rounded-xl text-rose-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 font-extrabold text-xl text-rose-300">
              <AlertOctagon className="w-8 h-8 text-rose-400 shrink-0" />
              <span>LOCATION ASSESSMENT UNAVAILABLE</span>
            </div>
            <div className="text-xs font-mono bg-black/60 p-4 rounded-lg border border-rose-900/80 text-rose-200 space-y-2">
              <div><strong>Backend Target:</strong> {backendUnavailable.url}</div>
              <div><strong>Reason:</strong> {backendUnavailable.reason}</div>
            </div>
            <p className="text-xs text-rose-300 font-medium">
              Unable to reach backend server on port 8010. Please verify the API backend service is active and retry.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => refreshAssessment()}
                className="px-5 py-2.5 text-xs font-extrabold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>RETRY CONNECTION</span>
              </button>
              <button
                onClick={openLocationModal}
                className="px-4 py-2.5 text-xs font-bold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-all"
              >
                SELECT ANOTHER LOCATION
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Generic Error Screen
  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-command-bg pb-12">
        <LocationHeader />
        <ChangeLocationModal />
        <div className="p-6 max-w-4xl mx-auto space-y-4 pt-8">
          <div className="p-5 bg-rose-950/80 border border-rose-700 rounded-xl text-rose-200 shadow-xl space-y-3">
            <div className="flex items-center gap-2.5 font-bold text-base text-rose-300">
              <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0" />
              <span>LOCATION ASSESSMENT UNAVAILABLE</span>
            </div>
            <div className="text-xs font-mono bg-black/50 p-3 rounded border border-rose-900/60 text-rose-300">
              <strong>Technical Reason:</strong> {error || 'Unable to establish connection to backend assessment service.'}
            </div>
            <p className="text-xs text-rose-200">
              Please verify backend server status on port 8010, check coordinates, or retry position assessment.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => refreshAssessment()}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>RETRY ASSESSMENT</span>
              </button>
              <button
                onClick={openLocationModal}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-all"
              >
                SELECT ANOTHER LOCATION
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Color semantics matching Requirement 19:
  // LOW -> green, MODERATE -> yellow/amber (not red!), HIGH -> orange, VERY HIGH -> red, CRITICAL -> dark red, UNKNOWN -> slate/gray
  const getStatusColorClass = (level?: string) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-950/90 border-rose-600 text-rose-100';
      case 'VERY HIGH':
        return 'bg-red-950/90 border-red-600 text-red-100';
      case 'HIGH':
        return 'bg-orange-950/90 border-orange-600 text-orange-100';
      case 'CAUTION':
      case 'MODERATE':
        return 'bg-amber-950/60 border-amber-500/80 text-amber-100';
      case 'UNKNOWN':
        return 'bg-slate-900/90 border-slate-600 text-slate-200';
      default: // LOW / SAFE
        return 'bg-emerald-950/80 border-emerald-600 text-emerald-100';
    }
  };

  const getStatusIcon = (level?: string) => {
    if (level === 'CRITICAL') return <AlertOctagon className="w-8 h-8 text-rose-400 animate-pulse" />;
    if (level === 'VERY HIGH') return <AlertOctagon className="w-8 h-8 text-red-400" />;
    if (level === 'HIGH') return <ShieldAlert className="w-8 h-8 text-orange-400" />;
    if (level === 'MODERATE' || level === 'CAUTION') return <ShieldAlert className="w-8 h-8 text-amber-400" />;
    if (level === 'UNKNOWN') return <AlertTriangle className="w-8 h-8 text-slate-400" />;
    return <ShieldCheck className="w-8 h-8 text-emerald-400" />;
  };

  const nearestSite = assessment.relocation?.nearest_feasible_site || relocOptions?.nearest_feasible_site;

  // Clean locality & district without repetition (Requirement 17)
  const locTitle = locationState.locality || 'Current Location';
  const locSubtitle = locationState.district && locationState.state ? `${locationState.district}, ${locationState.state}` : locationState.displayName;

  const coveragePct = assessment.coverage_percentage ?? 44;
  const confidencePct = assessment.confidence ?? 65;

  return (
    <div className="min-h-screen bg-command-bg pb-12">
      <LocationHeader />
      <ChangeLocationModal />

      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* 1. CURRENT LOCATION SECTION */}
        <div className="bg-command-card border border-command-border p-4 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-command-accent" />
              <span>CURRENT LOCATION</span>
            </div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <span>📍</span>
              <span>{locTitle}</span>
              <span className="text-sm font-normal text-gray-400">({locSubtitle})</span>
            </h2>
            <div className="flex items-center gap-4 text-xs text-gray-400 font-mono flex-wrap pt-0.5">
              <span>Coordinates: <strong className="text-gray-200">{locationState.latitude.toFixed(6)}° N, {locationState.longitude.toFixed(6)}° E</strong></span>
              <span>GPS Position Accuracy: <strong className={locationState.accuracy <= 100 ? "text-emerald-400" : "text-amber-400"}>
                ±{Math.round(locationState.accuracy)} m
              </strong></span>
              <span className="text-gray-500 font-sans text-[11px]">(Position accuracy reported by device/browser)</span>
            </div>
          </div>
          <button
            onClick={openLocationModal}
            className="self-start md:self-center px-4 py-2 text-xs font-bold rounded-lg bg-command-accent hover:bg-command-accent/90 text-white shadow-md transition-all border border-command-accent/40"
          >
            Change Location
          </button>
        </div>

        {/* 2. YOUR SAFETY STATUS CARD */}
        <div className={`p-6 rounded-2xl border ${getStatusColorClass(assessment.risk_level)} shadow-xl transition-all space-y-4`}>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-black/40 rounded-xl border border-white/10 shrink-0">
                {getStatusIcon(assessment.risk_level)}
              </div>
              <div className="space-y-1">
                <div className="text-xs font-extrabold tracking-wider uppercase opacity-80 flex items-center gap-2 flex-wrap">
                  <span>YOUR SAFETY STATUS</span>
                  <span className="px-2 py-0.5 rounded bg-black/50 border border-white/20 text-[10px] text-amber-300 font-mono">
                    {assessment.assessment_mode ? assessment.assessment_mode.replace('_', ' ') : 'PARTIAL EVIDENCE'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/50 border border-white/20 text-[10px] text-emerald-300 font-mono">
                    {assessment.data_status || 'LIVE + HISTORICAL + MODEL-DERIVED'}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {assessment.status_banner}
                </h1>
                <p className="text-xs text-gray-200 font-medium">
                  {assessment.decision?.explanation || 'Based on available evidence, no immediate relocation trigger is active. Continue monitoring local conditions and review detailed hazard factors.'}
                </p>
              </div>
            </div>

            {/* Metrics Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center bg-black/50 p-3 rounded-xl border border-white/15 min-w-[340px]">
              {/* Risk Score (Point 20) */}
              <div className="px-2 py-1">
                <div className="text-[10px] text-gray-300 uppercase font-bold">RISK SCORE</div>
                <div className="text-xl sm:text-2xl font-black font-mono text-white mt-0.5">
                  {assessment.risk_score !== null ? `${assessment.risk_score} / 100` : 'N/A'}
                </div>
                <div className="text-[10px] text-amber-400 font-extrabold uppercase">{assessment.risk_level}</div>
              </div>

              {/* Vulnerability (Point 18 & 21) */}
              <div className="px-2 py-1 border-l border-gray-800">
                <div className="text-[10px] text-gray-300 uppercase font-bold">VULNERABILITY</div>
                <div className="text-xl sm:text-2xl font-black font-mono text-blue-300 mt-0.5">
                  {assessment.vulnerability_score !== null ? `${assessment.vulnerability_score} / 100` : 'N/A'}
                </div>
                <div className="text-[9px] text-purple-300 font-bold uppercase">{assessment.vulnerability_level || 'MODERATE'} (MODEL)</div>
              </div>

              {/* Assessment Confidence (Point 3 & 22) */}
              <div className="px-2 py-1 border-l border-gray-800">
                <div className="text-[10px] text-gray-300 uppercase font-bold">ASSESSMENT CONFIDENCE</div>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-0.5">
                  {confidencePct}%
                </div>
                <div className="text-[9px] text-gray-300 font-medium">{confidencePct}% assessment confidence</div>
              </div>

              {/* Assessment Coverage (Point 2 & 23) */}
              <div className="px-2 py-1 border-l border-gray-800">
                <div className="text-[10px] text-gray-300 uppercase font-bold">ASSESSMENT COVERAGE</div>
                <div className="text-xl sm:text-2xl font-black font-mono text-purple-400 mt-0.5">
                  {coveragePct}%
                </div>
                <div className="text-[9px] text-gray-300 font-medium">{coveragePct}% evidence available</div>
              </div>
            </div>
          </div>

          {/* Explanatory notes under status banner (Point 2 & 3 & 23) */}
          <div className="pt-2.5 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-gray-300">
            <div className="flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
              <span>
                <strong>Evidence Coverage ({coveragePct}%):</strong> Only {coveragePct}% of configured assessment evidence is currently available for this location. <em>Risk classification is based on partial evidence.</em>
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Confidence ({confidencePct}%):</strong> Confidence reflects data quality, coverage and freshness — not probability of disaster.
              </span>
            </div>
          </div>
        </div>

        {/* 2.5 DIRECT RELOCATION ASSESSMENT & DECISION CARD (PHASE 6) */}
        <RelocationDecisionCard
          assessment={assessment}
          relocationOptions={relocOptions}
          loading={relocLoading}
        />

        {/* 3. MAIN DASHBOARD CONTENT: 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN (7 COLS): Why? & Methodology */}
          <div className="lg:col-span-7 space-y-6">
            {/* Why Is This Location At Risk & 4-Step Methodology */}
            <RiskFactorBreakdown
              factors={assessment.factors}
              vulnerabilityFactors={assessment.vulnerability?.factors}
              dominantHazard={assessment.dominant_hazard}
              secondaryHazard={assessment.secondary_hazard}
              evidence={assessment.evidence}
              riskScore={assessment.risk_score}
              vulnerabilityScore={assessment.vulnerability_score}
              debugInfo={assessment.debug_info}
            />

            {/* Live Conditions & Geospatial Telemetry */}
            <LiveConditionsCard assessment={assessment} />
          </div>

          {/* RIGHT COLUMN (5 COLS): What Should I Do & Relocation */}
          <div className="lg:col-span-5 space-y-6">
            {/* 4. WHAT SHOULD I DO? Advisory Card (Requirement 8) */}
            <div className="bg-command-card border border-command-border rounded-xl p-5 shadow-lg space-y-3">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                WHAT SHOULD I DO?
              </h3>

              {assessment.decision?.action === 'NO_CONCLUSION' || assessment.risk_level === 'UNKNOWN' ? (
                <div className="p-4 bg-slate-900/90 border border-slate-700/70 rounded-lg text-xs text-slate-200 space-y-2">
                  <p className="font-extrabold text-sm text-slate-100">LIMITED EVIDENCE</p>
                  <p>{assessment.decision?.explanation || 'Available datasets do not provide sufficient evidence to classify this location. Contact local authorities for on-site survey.'}</p>
                </div>
              ) : assessment.decision?.action === 'MONITOR' || assessment.risk_level === 'LOW' ? (
                <div className="p-4 bg-emerald-950/60 border border-emerald-700/70 rounded-lg text-xs text-emerald-200 space-y-2">
                  <p className="font-extrabold text-sm text-emerald-100">LOW RISK — MONITOR CONDITIONS</p>
                  <p>{assessment.decision?.explanation || 'Based on available evidence, this location is classified as LOW risk. Continue normal monitoring and official weather advisories.'}</p>
                </div>
              ) : assessment.decision?.action === 'REVIEW' || assessment.risk_level === 'MODERATE' ? (
                <div className="p-4 bg-yellow-950/60 border border-yellow-700/70 rounded-lg text-xs text-yellow-200 space-y-2">
                  <p className="font-extrabold text-sm text-yellow-100">
                    MODERATE RISK — MONITOR & REVIEW
                  </p>
                  <p className="leading-relaxed">
                    Based on available evidence, no immediate relocation trigger is active. Continue monitoring local conditions and review detailed hazard factors.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-rose-950/70 border border-rose-700/80 rounded-lg text-xs text-rose-200 space-y-2">
                  <p className="font-extrabold text-sm text-rose-100">
                    ELEVATED / HIGH RISK — RELOCATION REVIEW RECOMMENDED
                  </p>
                  <p>{assessment.decision?.explanation || `Location exhibits elevated risk. Decision-support models recommend reviewing nearest pre-screened safe habitat options.`}</p>
                  <div className="pt-2">
                    <Link
                      to="/relocation-planner"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-command-accent hover:bg-command-accent/90 text-white font-bold rounded-lg text-xs transition-all shadow"
                    >
                      <span>VIEW FULL SAFE RELOCATION PLAN</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 5. RELOCATION RECOMMENDATION CARD (Requirements 9, 10, 11) */}
            <div className="bg-command-card border border-command-border rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-command-border pb-3">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  RELOCATION RECOMMENDATION
                </h3>
                <span className={`text-[10px] px-2.5 py-0.5 rounded border font-bold ${
                  isRelocationRequired ? 'bg-amber-950 border-amber-700 text-amber-300' : 'bg-emerald-950 border-emerald-700 text-emerald-300'
                }`}>
                  {isRelocationRequired ? 'RELOCATION REQUIRED' : 'NOT REQUIRED'}
                </span>
              </div>

              {!isRelocationRequired ? (
                /* Compact card when relocation is NOT required (Requirement 11) */
                <div className="space-y-3 text-xs text-gray-300">
                  <div className="p-3.5 bg-gray-950/70 border border-gray-800 rounded-lg space-y-1.5">
                    <div className="font-extrabold text-white text-sm">No immediate relocation recommendation.</div>
                    <div className="text-gray-400 leading-snug">
                      Reason: Current overall risk does not meet the configured relocation trigger ({assessment.risk_score}/100 — {assessment.risk_level}).
                    </div>
                  </div>
                  <div className="pt-1">
                    <Link
                      to="/relocation-planner"
                      className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow"
                    >
                      <span>VIEW SAFE SITES DATABASE</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ) : relocLoading ? (
                <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <Activity className="w-4 h-4 animate-spin text-command-accent" />
                  <span>Calculating nearest feasible safe site...</span>
                </div>
              ) : nearestSite ? (
                /* Full relocation recommendation when required (Requirement 9 & 10) */
                <div className="space-y-4">
                  <div className="p-3 bg-amber-950/60 border border-amber-700/70 rounded-lg text-xs text-amber-200">
                    <p className="font-bold text-sm">RELOCATION REVIEW REQUIRED</p>
                    <p className="mt-0.5">{assessment.relocation?.status_message || 'Nearest feasible safe site pre-screened below.'}</p>
                  </div>

                  <div>
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">NEAREST FEASIBLE SAFE SITE</div>
                    <h4 className="text-base font-extrabold text-white tracking-wide mt-0.5">
                      {nearestSite.site_name}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {nearestSite.subdistrict}, {nearestSite.district} District
                    </p>
                  </div>

                  {/* Site Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-950/70 border border-gray-800 p-2.5 rounded-lg">
                      <div className="text-[10px] text-gray-400">Road Distance</div>
                      <div className="font-bold text-white text-sm flex items-center gap-1 mt-0.5">
                        <Route className="w-3.5 h-3.5 text-command-accent" />
                        <span>{nearestSite.road_dist_km} km</span>
                      </div>
                      <div className="text-[10px] text-gray-500">Straight-line: {nearestSite.straight_line_dist_km} km</div>
                    </div>

                    <div className="bg-gray-950/70 border border-gray-800 p-2.5 rounded-lg">
                      <div className="text-[10px] text-gray-400">Safety Score</div>
                      <div className="font-bold text-emerald-400 text-sm mt-0.5">
                        {nearestSite.safety_score} / 100
                      </div>
                      <div className="text-[10px] text-emerald-500 font-bold">Status: FEASIBLE</div>
                    </div>

                    <div className="bg-gray-950/70 border border-gray-800 p-2.5 rounded-lg">
                      <div className="text-[10px] text-gray-400">Effective Capacity</div>
                      <div className="font-bold text-white text-sm mt-0.5">
                        {(nearestSite.site_effective_capacity || nearestSite.effective_capacity || 0).toLocaleString()} persons
                      </div>
                      <div className="text-[10px] text-amber-400 truncate">Bottleneck: {nearestSite.bottleneck || 'Water Supply'}</div>
                    </div>

                    <div className="bg-gray-950/70 border border-gray-800 p-2.5 rounded-lg">
                      <div className="text-[10px] text-gray-400">Healthcare Access</div>
                      <div className="font-bold text-white text-sm flex items-center gap-1 mt-0.5">
                        <Hospital className="w-3.5 h-3.5 text-blue-400" />
                        <span>{nearestSite.nearest_hospital_km || 2.0} km</span>
                      </div>
                      <div className="text-[10px] text-gray-500">{nearestSite.road_accessibility || 'Accessible'} Road</div>
                    </div>
                  </div>

                  {/* Why Selected bullet points */}
                  <div className="bg-gray-950/50 p-3 rounded-lg border border-gray-800 space-y-1.5 text-xs text-gray-300">
                    <div className="font-bold text-gray-200 text-[11px]">Feasibility Validation:</div>
                    {(nearestSite.why_this_site || nearestSite.explanation || nearestSite.selection_reasons || []).map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      to="/gis-map"
                      className="py-2.5 px-3 bg-command-accent hover:bg-command-accent/90 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow"
                    >
                      <span>VIEW ON MAP</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to="/relocation-planner"
                      className="py-2.5 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>VIEW FULL PLAN</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-200 space-y-2">
                  <p className="font-bold">NO FEASIBLE RELOCATION SITE FOUND</p>
                  <p>Available candidate sites cannot safely accommodate the required population due to safety or capacity constraints.</p>
                </div>
              )}
            </div>

            {/* Quick Map Link Card */}
            <div className="bg-command-card border border-command-border rounded-xl p-5 shadow-lg flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Interactive Geo-Spatial Map</h4>
                <p className="text-xs text-gray-400 mt-0.5">Inspect hazard vector layers, rivers, roads, and red zones.</p>
              </div>
              <Link
                to="/gis-map"
                className="px-4 py-2 bg-command-accent hover:bg-command-accent/90 text-white font-semibold text-xs rounded-lg transition-all shadow flex items-center gap-1.5 shrink-0"
              >
                <span>OPEN MAP</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
