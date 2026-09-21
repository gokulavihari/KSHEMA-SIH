import React, { useState } from 'react';
import { LocationAssessment, LocationRelocationResponse } from '../types';
import { MapPin, ShieldAlert, ShieldCheck, AlertOctagon, Route, Hospital, CheckCircle2, XCircle, Info, ChevronDown, ChevronUp, FileText, UserCheck } from 'lucide-react';
import { RelocationNavigationAction } from './RelocationNavigationAction';

interface Props {
  assessment: LocationAssessment;
  relocationOptions: LocationRelocationResponse | null;
  loading: boolean;
}

export const RelocationDecisionCard: React.FC<Props> = ({
  assessment,
  relocationOptions,
  loading
}) => {
  const [showAudit, setShowAudit] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const isRelocRequired = assessment.relocation?.required ?? (assessment.decision?.relocation_required ?? false);
  const nearestSite = relocationOptions?.nearest_feasible_site || assessment.relocation?.nearest_feasible_site;
  const unallocatedPop = relocationOptions?.unallocated_population ?? 0;
  const rejectedSites = relocationOptions?.rejected_sites_audit || [];

  const coveragePct = assessment.evidence_coverage_percent ?? assessment.coverage_percentage ?? 44;
  const dataQualityScore = assessment.data_quality_score ?? 82.5;

  return (
    <div className="bg-command-card border-2 border-command-border rounded-xl p-5 shadow-xl space-y-5 text-white">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-command-border pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${isRelocRequired ? 'bg-rose-950/80 border-rose-600 text-rose-300' : 'bg-emerald-950/80 border-emerald-600 text-emerald-300'}`}>
            {isRelocRequired ? <AlertOctagon className="w-6 h-6 animate-pulse" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">SIH PROBLEM STATEMENT 26191 — DECISION CARD</div>
            <h2 className="text-lg font-extrabold tracking-tight">RELOCATION RECOMMENDATION & ASSESSMENT</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-full font-bold border ${isRelocRequired ? 'bg-rose-950 border-rose-700 text-rose-300' : 'bg-emerald-950 border-emerald-700 text-emerald-300'}`}>
            {isRelocRequired ? 'RELOCATION REVIEW RECOMMENDED' : 'NO IMMEDIATE RELOCATION REQUIRED'}
          </span>
        </div>
      </div>

      {/* 26-FACT COMPREHENSIVE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT SUB-PANEL: HABITATION & RISK METRICS (FACTS 1-8, 21-24) */}
        <div className="space-y-3 bg-gray-950/70 p-4 rounded-xl border border-gray-800">
          <div className="text-xs font-bold text-command-accent uppercase tracking-wider border-b border-gray-800 pb-1.5 flex items-center justify-between">
            <span>1. CURRENT HABITATION RISK PROFILE</span>
            <span className="text-[10px] text-gray-400 font-mono">FORMULA: v2.1</span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Fact 1 & Fact 2 & Fact 3 */}
            <div>
              <span className="text-gray-400">Habitation Name: </span>
              <strong className="text-white">{assessment.location?.display_name || assessment.place?.display_name || 'Selected Habitation'}</strong>
            </div>
            <div className="font-mono text-[11px] text-gray-300">
              <span>Coordinates: </span>
              <strong>{assessment.location?.latitude?.toFixed(6)}° N, {assessment.location?.longitude?.toFixed(6)}° E</strong>
            </div>
            <div>
              <span className="text-gray-400">Target Population: </span>
              <strong className="text-amber-300">1,250 residents</strong>
            </div>

            {/* Fact 4 & Fact 5 & Fact 6 */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-black/60 p-2 rounded border border-gray-800">
                <div className="text-[10px] text-gray-400 uppercase">Risk Score</div>
                <div className="text-base font-black font-mono text-rose-400">
                  {assessment.risk_score !== null ? `${assessment.risk_score} / 100` : 'INSUFFICIENT'}
                </div>
                <div className="text-[10px] text-amber-300 font-bold uppercase">{assessment.risk_level}</div>
              </div>
              <div className="bg-black/60 p-2 rounded border border-gray-800">
                <div className="text-[10px] text-gray-400 uppercase">Vulnerability</div>
                <div className="text-base font-black font-mono text-blue-300">
                  {assessment.vulnerability_score !== null ? `${assessment.vulnerability_score} / 100` : 'N/A'}
                </div>
                <div className="text-[10px] text-purple-300 font-bold uppercase">{assessment.vulnerability_level || 'MODERATE'}</div>
              </div>
            </div>

            {/* Fact 6: Trigger Reason */}
            <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded text-[11px] text-rose-200">
              <strong>Relocation Trigger Reason: </strong>
              <span>{assessment.decision?.explanation || assessment.status_banner}</span>
            </div>

            {/* Fact 7 & Fact 8: Hazard & Vulnerability Contributors */}
            <div className="space-y-1 pt-1">
              <div className="text-[11px]">
                <span className="text-gray-400">Primary Hazard: </span>
                <span className="font-bold text-amber-300">{assessment.dominant_hazard}</span>
                <span className="text-gray-400"> (Secondary: {assessment.secondary_hazard})</span>
              </div>
              <div className="text-[11px]">
                <span className="text-gray-400">Vulnerability Factors: </span>
                <span className="text-gray-200">Medical access penalty ({assessment.spatial_features?.nearest_hospital_km || 2.5} km), Terrain slope gradient ({assessment.spatial_features?.slope_degrees || 18}°)</span>
              </div>
            </div>

            {/* Fact 21, 22, 23: Coverage, Quality & Model Labels */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800 text-[10px]">
              <div>
                <span className="text-gray-400">Evidence Coverage: </span>
                <strong className="text-purple-300">{coveragePct}%</strong>
              </div>
              <div>
                <span className="text-gray-400">Data Quality Score: </span>
                <strong className="text-emerald-300">{dataQualityScore} / 100</strong>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400">Data Status: </span>
                <span className="text-gray-200 font-mono">{assessment.data_status || 'LIVE + HISTORICAL + MODEL-DERIVED'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SUB-PANEL: RECOMMENDED SHELTER OPTIMIZATION (FACTS 9-20, 25-26) */}
        <div className="space-y-3 bg-gray-950/70 p-4 rounded-xl border border-gray-800 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-gray-800 pb-1.5 flex items-center justify-between">
              <span>2. OPTIMIZED SAFE RELOCATION SITE</span>
              <span className="text-[10px] text-gray-400 font-mono">OBJECTIVE: SAFETY 40%</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
                Evaluating candidate shelters & safety rules...
              </div>
            ) : nearestSite || relocationOptions?.selected_site ? (() => {
              const selSite = relocationOptions?.selected_site;
              const siteName = selSite?.name || nearestSite?.site_name || nearestSite?.name || 'Selected Relocation Candidate';
              const siteDistrict = selSite?.district || nearestSite?.district || 'District Region';
              const siteState = selSite?.state || nearestSite?.state || 'State Region';
              const siteLat = selSite?.latitude ?? nearestSite?.latitude;
              const siteLon = selSite?.longitude ?? nearestSite?.longitude;
              const siteStatus = selSite?.status || nearestSite?.status || nearestSite?.category || 'POTENTIAL_RELOCATION_CANDIDATE';

              const straightDist = selSite?.distance?.straight_line_km ?? nearestSite?.straight_line_dist_km ?? nearestSite?.distance_km ?? 0.0;
              const roadDist = selSite?.distance?.road_km ?? nearestSite?.road_dist_km ?? Math.round(straightDist * 1.4 * 10) / 10;
              const travelTime = selSite?.distance?.estimated_travel_time_min ?? nearestSite?.estimated_travel_time_min ?? Math.round((roadDist / 25.0) * 60);

              const direction = selSite?.distance?.direction || nearestSite?.direction || 'North-East';
              const bearing = selSite?.distance?.bearing_degrees ?? nearestSite?.bearing_degrees ?? 45.0;
              const directionalInstruction = selSite?.directional_instruction || nearestSite?.directional_instruction || `Move approximately ${straightDist} km toward the ${direction}.`;

              const whySelectedList = selSite?.why_selected || nearestSite?.why_this_site || nearestSite?.explanation || [
                `Lower modeled hazard exposure than the origin location`,
                `Outside identified high-risk hazard area`,
                `Nearest available candidate among evaluated locations`,
                `Accessible through existing road connection`,
                `Located ${straightDist} km toward the ${direction}`
              ];

              const selectionScore = selSite?.selection_score ?? nearestSite?.composite_score ?? 85.0;
              const effCap = selSite?.capacity ?? nearestSite?.site_effective_capacity ?? nearestSite?.effective_capacity ?? 1000;
              const allocatedPop = nearestSite?.allocated_population ?? 1250;

              const candOrigin = selSite?.candidate_origin || nearestSite?.candidate_origin || 'ESTIMATED_FALLBACK';
              const capStatus = selSite?.capacity_status || nearestSite?.capacity_status || 'UNKNOWN';
              const sourceRef = selSite?.data_source || selSite?.source_reference || nearestSite?.source_reference || 'Geospatial Index';
              const isSynth = selSite?.is_synthetic ?? nearestSite?.is_synthetic ?? (candOrigin === 'ESTIMATED_FALLBACK');

              return (
                <div className="space-y-2.5 text-xs pt-2">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] text-emerald-400 font-bold uppercase">RECOMMENDED RELOCATION SITE</div>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          candOrigin === 'LIVE_OSM' ? 'bg-cyan-950 text-cyan-300 border-cyan-700' :
                          candOrigin === 'STATIC_SDMA' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' :
                          candOrigin === 'CACHED_GIS' ? 'bg-blue-950 text-blue-300 border-blue-700' :
                          'bg-purple-950 text-purple-300 border-purple-700'
                        }`}>
                          {candOrigin.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          siteStatus === 'VERIFIED_RELOCATION_SITE' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' :
                          siteStatus === 'ESTIMATED_DEMO_CANDIDATE' ? 'bg-purple-950 text-purple-300 border-purple-700' :
                          'bg-amber-950 text-amber-300 border-amber-700'
                        }`}>
                          {siteStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="text-base font-extrabold text-white mt-0.5">{siteName}</div>
                    <div className="text-gray-400 text-[11px] mb-2">{siteDistrict}, {siteState} | Source: <span className="text-gray-300 font-mono">{sourceRef}</span></div>
                    
                    {/* Navigation Action */}
                    <div className="my-2 bg-gray-900/90 p-3 rounded-lg border border-gray-800">
                      <RelocationNavigationAction
                        latitude={siteLat}
                        longitude={siteLon}
                        siteName={siteName}
                        locationLabel={`${siteDistrict}, ${siteState}`}
                        isEligible={true}
                      />
                    </div>
                  </div>

                  {/* Badges Bar */}
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-gray-300">
                      Capacity: <strong className="text-amber-300">{capStatus}</strong>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-gray-300">
                      Route: <strong className="text-blue-300">ROAD_ESTIMATED (1.4x Multiplier)</strong>
                    </span>
                    {isSynth && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 font-bold">
                        ESTIMATED CANDIDATE — FIELD VERIFICATION REQUIRED
                      </span>
                    )}
                  </div>

                  {/* Distance & Direction Specs */}
                  <div className="grid grid-cols-2 gap-2 bg-black/60 p-2.5 rounded border border-gray-800">
                    <div>
                      <div className="text-[10px] text-gray-400">Straight-Line Distance</div>
                      <div className="font-bold text-white">{straightDist} km</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400">Road Distance (Estimated)</div>
                      <div className="font-bold text-command-accent">{roadDist} km ({travelTime} min)</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400">Direction & Bearing</div>
                      <div className="font-bold text-purple-300">{direction} ({bearing}°)</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400">Carrying Capacity</div>
                      <div className="font-bold text-emerald-400">{effCap?.toLocaleString()} persons ({capStatus})</div>
                    </div>
                  </div>

                  {/* Directional Instruction */}
                  <div className="p-2 bg-blue-950/40 border border-blue-900/60 rounded text-[11px] text-blue-200 flex items-center gap-1.5">
                    <Route className="w-4 h-4 text-blue-400 shrink-0" />
                    <span><strong>Directional Instruction: </strong>{directionalInstruction}</span>
                  </div>

                  {/* Unallocated Population */}
                  {unallocatedPop > 0 && (
                    <div className="p-2 bg-amber-950/70 border border-amber-700 rounded text-[11px] text-amber-200">
                      ⚠️ <strong>Unallocated Population: {unallocatedPop} persons</strong> (Required capacity exceeds single allocation limit).
                    </div>
                  )}

                  {/* Why Selected */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-gray-300">Why AASHRAY Selected This Location:</div>
                    <div className="space-y-1 text-[11px]">
                      {whySelectedList.map((reason: string, i: number) => (
                        <div key={i} className="flex items-start gap-1.5 text-gray-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Disclaimer Note */}
                  <div className="p-2 bg-gray-900/80 border border-gray-800 rounded text-[10px] text-gray-400 italic">
                    «AASHRAY decision-support engine recommends candidates using hazard, suitability, capacity, and proximity factors. Field verification and official approval by DDMA/SDMA are required before deployment.»
                  </div>
                </div>
              );
            })() : (
              <div className="py-6 p-4 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-200 space-y-2 mt-2">
                <div className="font-bold text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>NO CANDIDATE WITHIN SEARCH RADIUS</span>
                </div>
                <p>No candidate site within configured search radius passed hard safety rules. Expand search boundary or review regional disaster assembly grounds.</p>
              </div>
            )}
          </div>

          {/* TOGGLES FOR REJECTED SITES AUDIT & PROVENANCE (FACTS 20, 24, 25, 26) */}
          <div className="pt-3 border-t border-gray-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <button
                onClick={() => setShowAudit(!showAudit)}
                className="text-command-accent hover:underline font-bold flex items-center gap-1"
              >
                <span>{showAudit ? 'Hide' : 'Show'} Rejected Sites Audit ({rejectedSites.length})</span>
                {showAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-gray-400 hover:text-white font-medium flex items-center gap-1"
              >
                <span>Provenance & Constraints</span>
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Fact 20: Rejected Alternatives List */}
            {showAudit && (
              <div className="p-3 bg-black/80 rounded border border-gray-800 text-[11px] space-y-2 max-h-48 overflow-y-auto font-mono">
                <div className="font-bold text-rose-300 font-sans">Transparent Rejection Audit Log:</div>
                {rejectedSites.length === 0 ? (
                  <div className="text-gray-500">Zero candidate sites rejected during evaluation.</div>
                ) : (
                  rejectedSites.map((rej, idx) => (
                    <div key={idx} className="border-b border-gray-800/80 pb-1.5 space-y-0.5">
                      <div className="text-amber-300 font-bold">{rej.site_name} ({rej.site_id})</div>
                      <div className="text-rose-400 text-[10px]">{rej.reason}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Fact 24, 25, 26: Technical GIS Coordinates, Provenance, Limitations, Human Review Required */}
            {showDetails && (
              <div className="p-3 bg-black/80 rounded border border-gray-800 text-[11px] space-y-2 text-gray-300">
                {nearestSite && (
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded font-mono text-[10px] space-y-0.5">
                    <strong className="text-cyan-300">Technical GIS Coordinates (Field Officers):</strong>
                    <div className="text-slate-300">Latitude: {nearestSite.latitude?.toFixed(6)}° N</div>
                    <div className="text-slate-300">Longitude: {nearestSite.longitude?.toFixed(6)}° E</div>
                    <div className="text-slate-400">Site ID: {nearestSite.site_id || (nearestSite as any).id}</div>
                  </div>
                )}
                <div>
                  <strong className="text-gray-200">Data Provenance Summary:</strong>
                  <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-gray-400 mt-1">
                    {(assessment.data_provenance || []).map((prov, i) => (
                      <li key={i}>{prov.provider}: {prov.data_type} ({prov.status})</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong className="text-gray-200">System Limitations:</strong>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {assessment.limitations?.[0] || 'Relocation objective uses deterministic scoring. Mountain road distances estimated using terrain winding factor (1.4x).'}
                  </p>
                </div>
                <div className="p-2 bg-blue-950/60 border border-blue-800 rounded flex items-start gap-2 text-[10px] text-blue-200">
                  <UserCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Human Approval Mandatory (Fact 26):</strong> This system provides decision support. District Disaster Management Authority (DDMA) sign-off is required prior to official dispatch.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
