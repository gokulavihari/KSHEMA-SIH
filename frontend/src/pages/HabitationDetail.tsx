import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchHabitationDetail } from '../services/api';
import { Habitation, RelocationPlan } from '../types';
import { ArrowLeft, ShieldAlert, Navigation, Info, Users, Home, Activity } from 'lucide-react';
import { RelocationNavigationAction } from '../components/RelocationNavigationAction';

export const HabitationDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<(Habitation & { recommended_plan: RelocationPlan }) | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchHabitationDetail(id)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading Habitation Intelligence...</div>;
  if (error || !data) return <div className="p-8 text-red-400">Error: {error || 'Habitation not found'}</div>;

  const plan = data.recommended_plan;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Link to="/executive/habitations" className="inline-flex items-center space-x-2 text-xs text-blue-400 hover:underline">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Habitations Directory</span>
      </Link>

      {/* Header Banner */}
      <div className="bg-command-card border border-command-border p-6 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              {data.id}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-100">{data.name}</h1>
          </div>
          <span
            className={`px-3 py-1 rounded text-xs font-bold ${
              data.relocation_priority === 'IMMEDIATE'
                ? 'bg-red-950 text-red-400 border border-red-800'
                : 'bg-amber-950 text-amber-300 border border-amber-800'
            }`}
          >
            RELOCATION PRIORITY: {data.relocation_priority}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block">Subdistrict:</span>
            <span className="font-bold text-slate-200">{data.subdistrict}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Population:</span>
            <span className="font-bold text-slate-200 font-mono">{data.population}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Risk Score:</span>
            <span className="font-bold text-red-400 font-mono">{data.risk_score} / 100 ({data.risk_level})</span>
          </div>
          <div>
            <span className="text-slate-400 block">Vulnerability Score:</span>
            <span className="font-bold text-amber-400 font-mono">{data.vulnerability_score} / 100</span>
          </div>
        </div>
      </div>

      {/* Factor Contribution Breakdown */}
      <div className="bg-command-card border border-command-border p-6 rounded-xl space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2 border-b border-command-border pb-2">
          <Info className="w-5 h-5 text-blue-400" />
          <span>WHY IS THIS LOCATION AT RISK? (Factor Level Explanation)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.factors.map((f, idx) => (
            <div key={idx} className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200 text-xs">{f.factor}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{f.description}</div>
              </div>
              <div className="text-right pl-3">
                <span className="font-mono text-sm font-bold text-amber-400">+{f.contribution}</span>
                <span className="block text-[9px] text-slate-500">weight: {f.weight}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Relocation Plan */}
      <div className="bg-command-card border border-command-border p-6 rounded-xl space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2 border-b border-command-border pb-2">
          <Navigation className="w-5 h-5 text-emerald-400" />
          <span>RECOMMENDED MULTI-SITE RELOCATION PLAN</span>
        </h3>

        <div className="p-4 bg-slate-900/90 rounded-lg border border-slate-800 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Optimization Status:</span>
            <span className="font-mono font-bold text-emerald-400">{plan.status}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Required Relocation Capacity:</span>
            <span className="font-mono font-bold">{plan.required_population} residents</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Allocated Safe Capacity:</span>
            <span className="font-mono font-bold text-emerald-400">{plan.allocated_population} residents</span>
          </div>
          {plan.unallocated_population > 0 && (
            <div className="flex justify-between items-center text-red-400 font-bold">
              <span>Unallocated Population:</span>
              <span className="font-mono">{plan.unallocated_population} residents</span>
            </div>
          )}
        </div>

        {/* Allocation List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Allocated Destination Safe Sites:</h4>
          {plan.allocations.map((alloc, idx) => (
            <div key={idx} className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-xs space-y-2">
              <div className="flex justify-between items-center font-bold text-slate-100">
                <span className="text-sm text-emerald-300">{alloc.site_name}</span>
                <span className="font-mono text-emerald-400">{alloc.allocated_population} residents allocated</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-400 pt-1 border-t border-emerald-900/60">
                <div>Distance: <b className="text-slate-200">{alloc.distance_km} km</b></div>
                <div>Safety Score: <b className="text-emerald-400">{alloc.safety_score}/100</b></div>
                <div>Capacity Util: <b className="text-blue-400">{alloc.utilization_percentage}%</b></div>
                <div>Bottleneck: <b className="text-amber-400">{alloc.bottleneck}</b></div>
              </div>
              <div className="pt-2 border-t border-emerald-900/60">
                <RelocationNavigationAction
                  latitude={(alloc as any).latitude}
                  longitude={(alloc as any).longitude}
                  siteName={alloc.site_name}
                  isEligible={true}
                  variant="compact"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
