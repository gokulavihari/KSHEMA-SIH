import React, { useState } from 'react';
import { FactorContribution, VulnerabilityFactor } from '../types';
import { HelpCircle, Info, Database, ChevronDown, ChevronUp, ArrowRight, Activity, ShieldAlert, AlertTriangle } from 'lucide-react';

interface RiskFactorBreakdownProps {
  factors: FactorContribution[];
  vulnerabilityFactors?: VulnerabilityFactor[];
  dominantHazard: string;
  secondaryHazard: string;
  evidence: string[];
  riskScore: number | null;
  vulnerabilityScore: number | null;
  debugInfo?: Record<string, any>;
}

export const RiskFactorBreakdown: React.FC<RiskFactorBreakdownProps> = ({
  factors,
  vulnerabilityFactors = [],
  dominantHazard,
  secondaryHazard,
  evidence,
  riskScore,
  vulnerabilityScore,
  debugInfo
}) => {
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState<boolean>(false);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);


  // Available active factors sorted by contribution
  const availableFactors = factors.filter(f => f.status !== 'OUT_OF_COVERAGE' && f.status !== 'UNAVAILABLE');
  const topRiskContributors = (availableFactors.length > 0 ? availableFactors : factors).slice(0, 3);

  const getStatusBadge = (status?: string) => {
    const s = status?.toUpperCase() || '';
    if (s.includes('LIVE')) return <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-600 text-emerald-300 font-bold uppercase">LIVE</span>;
    if (s.includes('HISTORICAL')) return <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/90 border border-blue-600 text-blue-300 font-bold uppercase">HISTORICAL</span>;
    if (s.includes('MODEL')) return <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/90 border border-purple-600 text-purple-300 font-bold uppercase">MODEL-DERIVED</span>;
    if (s.includes('AVAILABLE')) return <span className="text-[10px] px-2 py-0.5 rounded bg-teal-950/90 border border-teal-600 text-teal-300 font-bold uppercase">AVAILABLE</span>;
    if (s.includes('OUT_OF_COVERAGE')) return <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/90 border border-rose-700 text-rose-300 font-bold uppercase">OUT OF COVERAGE</span>;
    return <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-bold uppercase">UNAVAILABLE</span>;
  };

  const getImpactLabel = (contrib?: number, pct?: number) => {
    if (contrib === undefined || contrib === null) return 'N/A';
    if (contrib >= 15.0 || (pct && pct >= 30.0)) return 'High impact';
    if (contrib >= 4.0 || (pct && pct >= 15.0)) return 'Moderate impact';
    return 'Low impact';
  };

  const getImpactBadgeClass = (impactLabel: string) => {
    if (impactLabel === 'High impact') return 'text-amber-400 font-bold';
    if (impactLabel === 'Moderate impact') return 'text-yellow-300 font-semibold';
    return 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* 1. WHY THIS RESULT? (TOP 3 RISK CONTRIBUTORS) */}
      <div className="bg-command-card border border-command-border rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-command-border pb-3 gap-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
              WHY THIS RESULT? (TOP RISK CONTRIBUTORS)
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2.5 py-0.5 rounded bg-rose-950/80 border border-rose-700 text-rose-300 font-semibold">
              Dominant: {dominantHazard}
            </span>
            <span className="px-2.5 py-0.5 rounded bg-amber-950/80 border border-amber-700 text-amber-300 font-semibold">
              Secondary: {secondaryHazard}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-300">
          The overall location risk score ({riskScore !== null ? `${riskScore} / 100` : 'N/A'}) is driven by the following top weighted evidence factors:
        </p>

        {/* Top 3 Factor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topRiskContributors.map((item, idx) => {
            const impactStr = getImpactLabel(item.contribution, item.contribution_pct);
            return (
              <div key={idx} className="bg-gray-950/70 p-3.5 rounded-lg border border-gray-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 text-xs mb-1">
                    <span className="font-extrabold text-white truncate">{item.factor || item.name}</span>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="text-[11px] text-gray-400 line-clamp-2">{item.description}</div>
                </div>

                <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Impact:</span>
                  <span className={getImpactBadgeClass(impactStr)}>
                    {impactStr} {item.contribution !== undefined ? `(${item.contribution.toFixed(1)} pts)` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. VULNERABILITY EXPLANATION */}
      <div className="bg-command-card border border-command-border rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-command-border pb-3">
          <h3 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0" />
            <span>VULNERABILITY ASSESSMENT (WHY {vulnerabilityScore !== null ? `${vulnerabilityScore}/100` : 'N/A'})</span>
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 border border-purple-600 text-purple-300 font-bold uppercase">
            MODEL-DERIVED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {vulnerabilityFactors.map((vItem, idx) => (
            <div key={idx} className="bg-gray-950/70 p-3.5 rounded-lg border border-gray-800 space-y-2">
              <div className="flex items-center justify-between gap-1 text-xs">
                <span className="font-bold text-white truncate">{vItem.factor}</span>
                {getStatusBadge(vItem.status)}
              </div>
              <div className="text-[11px] text-gray-400">{vItem.description}</div>
              <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400">Score / Weight:</span>
                <span className="text-blue-300 font-bold">{vItem.score}/100 ({Math.round(vItem.weight * 100)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. HAZARD / EXPOSURE / VULNERABILITY / RISK (4-STEP VISUAL FLOW) */}
      <div className="bg-command-card border border-command-border rounded-xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-2 border-b border-command-border pb-3">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>FOUR-STEP RISK ASSESSMENT METHODOLOGY</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Step 1: Hazard */}
          <div className="bg-gray-950/70 p-3.5 rounded-lg border border-gray-800 relative space-y-1.5">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">STEP 1</div>
            <div className="text-sm font-extrabold text-white">HAZARD</div>
            <p className="text-xs text-gray-400 leading-snug">
              What dangerous environmental conditions exist? Evaluates rainfall intensity, slope failure susceptibility, and flood inundation vectors.
            </p>
          </div>

          {/* Step 2: Exposure */}
          <div className="bg-gray-950/70 p-3.5 rounded-lg border border-gray-800 relative space-y-1.5">
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">STEP 2</div>
            <div className="text-sm font-extrabold text-white">EXPOSURE</div>
            <p className="text-xs text-gray-400 leading-snug">
              Are people and physical assets exposed? Analyzes habitation demographic population density and infrastructure spatial proximity.
            </p>
          </div>

          {/* Step 3: Vulnerability */}
          <div className="bg-gray-950/70 p-3.5 rounded-lg border border-gray-800 relative space-y-1.5">
            <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">STEP 3</div>
            <div className="text-sm font-extrabold text-white">VULNERABILITY</div>
            <p className="text-xs text-gray-400 leading-snug">
              How susceptible are exposed elements? Measures medical distance, road network accessibility, and building structural rating.
            </p>
          </div>

          {/* Step 4: Risk */}
          <div className="bg-gray-950/70 p-3.5 rounded-lg border border-gray-800 relative space-y-1.5">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">STEP 4</div>
            <div className="text-sm font-extrabold text-white">RISK</div>
            <p className="text-xs text-gray-400 leading-snug">
              What is the combined assessment? Coverage-aware renormalized risk classification determining actionable monitoring and relocation advisories.
            </p>
          </div>
        </div>
      </div>

      {/* 4. EXPANDABLE DETAILED RISK ANALYSIS TABLE */}
      <div className="bg-command-card border border-command-border rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setShowDetailedAnalysis(prev => !prev)}
          className="w-full p-4 bg-command-card hover:bg-gray-900/60 transition-colors flex items-center justify-between text-left border-b border-command-border"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-command-accent" />
            <span className="text-xs font-extrabold text-white uppercase tracking-wider">
              VIEW DETAILED MATHEMATICAL ANALYSIS & FACTOR BREAKDOWN
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-command-accent font-semibold">
            <span>{showDetailedAnalysis ? 'Hide detailed analysis' : 'View detailed analysis'}</span>
            {showDetailedAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showDetailedAnalysis && (
          <div className="p-4 space-y-4 bg-gray-950/90">
            <p className="text-xs text-gray-300">
              The table below presents all configured risk assessment factors, their raw observations, normalized 0-100 scores, configured weights, renormalized effective weights over active layers, and mathematically reproducible contributions to the final risk score ({riskScore !== null ? `${riskScore} / 100` : 'N/A'}).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-gray-400 border-b border-gray-800 text-[11px] uppercase">
                    <th className="py-2.5 px-3">Factor</th>
                    <th className="py-2.5 px-3">Raw Value</th>
                    <th className="py-2.5 px-3">Normalized Score</th>
                    <th className="py-2.5 px-3">Configured Weight</th>
                    <th className="py-2.5 px-3">Effective Weight</th>
                    <th className="py-2.5 px-3">Contribution</th>
                    <th className="py-2.5 px-3">Data Status</th>
                    <th className="py-2.5 px-3">Source Provider</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {factors.map((item, idx) => {
                    const normScore = item.normalized_score ?? item.score;
                    const configW = item.configured_weight ?? item.weight;
                    const effW = item.effective_weight;
                    const contrib = item.contribution;

                    return (
                      <tr key={idx} className="hover:bg-gray-900/40 text-gray-300">
                        <td className="py-2.5 px-3 font-semibold text-white font-sans">{item.factor || item.name}</td>
                        <td className="py-2.5 px-3 text-gray-400">{normScore !== null && normScore !== undefined ? `${normScore}` : 'N/A'}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{normScore !== null && normScore !== undefined ? `${normScore} / 100` : 'N/A'}</td>
                        <td className="py-2.5 px-3 text-gray-400">{configW ? `${(configW * 100).toFixed(0)}%` : 'N/A'}</td>
                        <td className="py-2.5 px-3 text-amber-300 font-bold">{effW !== undefined && effW > 0 ? `${(effW * 100).toFixed(1)}%` : '0%'}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-400">
                          {contrib !== undefined && item.status !== 'OUT_OF_COVERAGE' ? `${contrib.toFixed(2)} pts` : '0.00 pts'}
                        </td>
                        <td className="py-2.5 px-3">{getStatusBadge(item.status)}</td>
                        <td className="py-2.5 px-3 text-[10px] text-gray-400 font-sans truncate max-w-[180px]">{item.source || 'Standard Provider'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Evidence summary bullet points */}
            <div className="pt-3 border-t border-gray-800">
              <div className="text-xs font-bold text-gray-300 mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-command-accent" />
                <span>Supporting Spatial & Telemetry Evidence Summary:</span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-400 font-sans">
                {evidence.map((point, idx) => (
                  <li key={idx} className="flex items-center gap-2 bg-gray-900/60 p-2 rounded border border-gray-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-command-accent flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 5. DEVELOPER DEBUG PANEL */}
      {debugInfo && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={() => setShowDebugPanel(prev => !prev)}
            className="w-full p-4 bg-slate-900 hover:bg-slate-850 transition-colors flex items-center justify-between text-left border-b border-slate-800"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                DEVELOPER DEBUG PANEL (MODEL WEIGHTS, RAW FEATURES & PROVENANCE)
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono font-semibold">
              <span>{showDebugPanel ? 'Hide Debug Panel' : 'Show Debug Panel'}</span>
              {showDebugPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showDebugPanel && (
            <div className="p-4 space-y-3 bg-black/90 font-mono text-xs text-slate-300">
              <div className="p-2.5 bg-slate-900/80 border border-slate-700/80 rounded text-[11px]">
                <div className="font-bold text-amber-300 mb-1">{debugInfo.model_name} ({debugInfo.model_version})</div>
                <div className="text-slate-400">{debugInfo.model_disclaimer}</div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">COVERAGE %</div>
                  <div className="text-amber-300 font-bold">{debugInfo.coverage_percentage}%</div>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">RENORMALIZED SCORE</div>
                  <div className="text-emerald-400 font-bold">{debugInfo.renormalized_risk_score} / 100</div>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">CLASSIFICATION</div>
                  <div className="text-rose-300 font-bold">{debugInfo.risk_classification}</div>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">CONFIDENCE SCORE</div>
                  <div className="text-blue-300 font-bold">{debugInfo.confidence_score}%</div>
                </div>
              </div>

              <div className="p-3 bg-slate-900/90 rounded border border-slate-800 max-h-60 overflow-y-auto">
                <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">RAW DEBUG PAYLOAD JSON</div>
                <pre className="text-[10px] text-emerald-400 leading-tight whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

