import React, { useEffect, useState } from 'react';
import { fetchCapacityMatrix } from '../services/api';
import { Layers, AlertTriangle } from 'lucide-react';

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100">Carrying Capacity Assessment Matrix</h1>
        <p className="text-xs text-slate-400 mt-1">
          Independent evaluation of 7 infrastructure capacity components (Land, Water, Sanitation, Healthcare, Education, Road, Emergency) with MIN bottleneck detection.
        </p>
      </div>

      <div className="bg-command-card border border-command-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading Carrying Capacity Matrix...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-command-border">
                <tr>
                  <th className="py-3 px-4">Candidate Site</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Land Cap</th>
                  <th className="py-3 px-4">Water Cap</th>
                  <th className="py-3 px-4">Sanitation</th>
                  <th className="py-3 px-4">Healthcare</th>
                  <th className="py-3 px-4">Schools</th>
                  <th className="py-3 px-4">Roads</th>
                  <th className="py-3 px-4">Emergency</th>
                  <th className="py-3 px-4 font-bold text-emerald-400">Effective Cap</th>
                  <th className="py-3 px-4 font-bold text-amber-400">Resource Bottleneck</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {matrix.map((row, idx) => {
                  const b = row.breakdown;
                  const isSafe = row.is_safe;
                  return (
                    <tr key={idx} className={isSafe ? 'hover:bg-slate-800/50' : 'bg-red-950/20 opacity-70'}>
                      <td className="py-3 px-4 font-bold text-slate-100">{row.site_name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isSafe ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                          {isSafe ? 'SAFE' : 'UNSAFE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{b.land_capacity}</td>
                      <td className="py-3 px-4 font-mono">{b.water_capacity}</td>
                      <td className="py-3 px-4 font-mono">{b.sanitation_capacity}</td>
                      <td className="py-3 px-4 font-mono text-amber-300">{b.healthcare_capacity}</td>
                      <td className="py-3 px-4 font-mono">{b.education_capacity}</td>
                      <td className="py-3 px-4 font-mono">{b.road_capacity}</td>
                      <td className="py-3 px-4 font-mono">{b.emergency_capacity}</td>
                      <td className="py-3 px-4 font-mono font-extrabold text-emerald-400 text-sm">{b.effective_capacity}</td>
                      <td className="py-3 px-4 font-bold text-amber-400 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
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
