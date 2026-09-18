import React, { useEffect, useState } from 'react';
import { fetchRelocationSites } from '../services/api';
import { CandidateSite } from '../types';
import { ShieldCheck, AlertOctagon, CheckCircle2, XCircle, Layers } from 'lucide-react';

export const RelocationSitesView: React.FC = () => {
  const [sites, setSites] = useState<CandidateSite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchRelocationSites()
      .then((data) => {
        setSites(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center space-x-3">
          <Layers className="w-6 h-6 text-emerald-400" />
          <span>Candidate Relocation Sites & Safe Habitats</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Evaluated relocation shelter locations with hard multi-hazard exclusion filters, carrying capacity component breakdowns, and traceable data source labels.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="p-8 text-slate-400">Loading Candidate Relocation Sites...</div>
        ) : (
          sites.map((site) => {
            const isSafe = site.is_safe;
            const isDemo = site.is_demonstration || site.source_type === 'DEMONSTRATION_DATA';
            return (
              <div
                key={site.id || site.site_id}
                className={`bg-command-card border p-5 rounded-xl space-y-4 shadow-sm flex flex-col justify-between ${
                  isSafe ? 'border-command-border' : 'border-red-800/80 bg-red-950/20'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                      {site.site_id || site.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 ${
                        isSafe ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {isSafe ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{isSafe ? 'FEASIBLE CANDIDATE' : 'REJECTED (UNSAFE)'}</span>
                    </span>
                  </div>

                  {isDemo && (
                    <div className="bg-purple-950/70 border border-purple-700/80 text-purple-300 text-[10px] font-bold px-2 py-1 rounded">
                      DEMONSTRATION SITE — NOT AN OFFICIAL SHELTER
                    </div>
                  )}

                  <h3 className="text-base font-bold text-slate-100">{site.name}</h3>
                  <p className="text-xs text-slate-400">Subdistrict: {site.subdistrict} | Type: {site.site_type}</p>

                  <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800 space-y-1">
                    <div className="flex justify-between">
                      <span>Source Label:</span>
                      <b className="text-slate-200">{site.source_type || 'DEMONSTRATION_DATA'}</b>
                    </div>
                    <div className="flex justify-between">
                      <span>Verification:</span>
                      <b className="text-amber-400">{site.verification_status || 'DEMONSTRATION_ONLY'}</b>
                    </div>
                    <div className="flex justify-between">
                      <span>Freshness:</span>
                      <b className="text-slate-300">{site.data_freshness || 'CURRENT'}</b>
                    </div>
                  </div>

                  {isSafe ? (
                    <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Safety Rating:</span>
                        <span className="font-mono font-bold text-emerald-400">{site.safety_score} / 100</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Effective Capacity:</span>
                        <span className="font-mono font-bold text-slate-100">{site.capacity?.effective_capacity || site.remaining_capacity} persons</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Resource Bottleneck:</span>
                        <span className="font-bold text-amber-400">{site.capacity?.bottleneck || 'Healthcare Access'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Hospital Access:</span>
                        <span className="font-mono text-slate-200">{site.nearest_hospital_km} km</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300 space-y-1">
                      <div className="font-bold text-red-400">HARD SAFETY CONSTRAINTS VIOLATION:</div>
                      <div className="text-[11px] leading-relaxed">{site.rejection_reason || 'High Hazard Inundation / Landslide Runout Zone'}</div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-command-border text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Land Area: {site.land_area_sqm} m²</span>
                  <span>Road: {site.road_accessibility}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
