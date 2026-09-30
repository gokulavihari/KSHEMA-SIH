import React, { useEffect, useState } from 'react';
import { fetchHabitations } from '../services/api';
import { Habitation } from '../types';
import { Search, Filter, ArrowRight, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HabitationsListView: React.FC = () => {
  const [habitations, setHabitations] = useState<Habitation[]>([]);
  const [search, setSearch] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchHabitations()
      .then((data) => {
        setHabitations(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = habitations.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase()) || h.subdistrict.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter === 'ALL' || h.relocation_priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">Vulnerable Habitations Directory</h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete list of mountain settlements evaluated for hazard exposure, demographic vulnerability & relocation priority.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-command-card p-4 rounded-xl border border-command-border">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search habitation or subdistrict..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-semibold">Priority Filter:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-blue-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="IMMEDIATE">IMMEDIATE</option>
            <option value="SHORT-TERM">SHORT-TERM</option>
            <option value="MEDIUM-TERM">MEDIUM-TERM</option>
            <option value="MONITOR">MONITOR</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-command-card border border-command-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading Habitations...</div>
        ) : (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-command-border">
              <tr>
                <th className="py-3 px-4">Habitation ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Subdistrict</th>
                <th className="py-3 px-4">Population</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Vulnerability</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Dominant Hazard</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((hab) => (
                <tr key={hab.id} className="hover:bg-slate-800/50">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-400">{hab.id}</td>
                  <td className="py-3 px-4 font-bold text-slate-100">{hab.name}</td>
                  <td className="py-3 px-4 text-slate-300">{hab.subdistrict}</td>
                  <td className="py-3 px-4 font-mono">{hab.population}</td>
                  <td className="py-3 px-4 font-mono font-bold text-red-400">{hab.risk_score}/100</td>
                  <td className="py-3 px-4 font-mono text-amber-400">{hab.vulnerability_score}/100</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        hab.relocation_priority === 'IMMEDIATE'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {hab.relocation_priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{hab.dominant_hazard}</td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/executive/habitations/${hab.id}`}
                      className="inline-flex items-center space-x-1 bg-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white px-3 py-1 rounded transition-colors text-xs"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
