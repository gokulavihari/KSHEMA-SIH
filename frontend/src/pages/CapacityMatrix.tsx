import React, { useEffect, useState } from 'react';
import { fetchCapacityMatrix } from '../services/api';
import { Layers, AlertTriangle, ShieldCheck, CheckCircle2, Box } from 'lucide-react';

export const CapacityMatrixView: React.FC = () => {
  const [matrix, setMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchCapacityMatrix()
      .then((data) => {
        setMatrix(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-mono text-slate-100 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-sky-400 text-xs">
            <Box className="w-4 h-4" />
            <span>INFRASTRUCTURE CAPACITY MATRIX</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">
            Shelter Carrying Capacity & Infrastructure Matrix
          </h1>
        </div>

        <span className="px-3 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold">
          7-COMPONENT BOTTLENECK EVALUATOR
        </span>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            <div className="animate-spin w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full mx-auto mb-2" />
            <span>Evaluating Infrastructure Component Limits...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Relocation Site</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Land</th>
                  <th className="py-3.5 px-4">Water</th>
                  <th className="py-3.5 px-4">Sanitation</th>
                  <th className="py-3.5 px-4">Healthcare</th>
                  <th className="py-3.5 px-4">Road Access</th>
                  <th className="py-3.5 px-4 font-bold text-emerald-400">Effective Cap</th>
                  <th className="py-3.5 px-4 font-bold text-amber-400">Resource Bottleneck</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {matrix.map((row, idx) => {
                  const b = row.breakdown;
                  const isSafe = row.is_safe;
                  return (
                    <tr key={idx} className={isSafe ? 'hover:bg-slate-900/60' : 'bg-red-950/20 text-slate-400'}>
                      <td className="py-3.5 px-4 font-bold text-slate-100">{row.site_name}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isSafe ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                          {isSafe ? 'VERIFIED SAFE' : 'UNSAFE EXCLUSION'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{b.land_capacity}</td>
                      <td className="py-3.5 px-4">{b.water_capacity}</td>
                      <td className="py-3.5 px-4">{b.sanitation_capacity}</td>
                      <td className="py-3.5 px-4 text-amber-300">{b.healthcare_capacity}</td>
                      <td className="py-3.5 px-4">{b.road_capacity}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400 text-sm">{b.effective_capacity}</td>
                      <td className="py-3.5 px-4 font-bold text-amber-400 flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>{b.bottleneck}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
