import React from 'react';
import { Download, FileText } from 'lucide-react';
import { fetchHabitations, fetchRelocationSites } from '../services/api';

export const ReportsView: React.FC = () => {
  const handleExportHabitationsCSV = async () => {
    const data = await fetchHabitations();
    const headers = ['ID', 'Name', 'Subdistrict', 'Population', 'RiskScore', 'RiskLevel', 'Vulnerability', 'Priority', 'DominantHazard'];
    const rows = data.map(h => [h.id, `"${h.name}"`, h.subdistrict, h.population, h.risk_score, h.risk_level, h.vulnerability_score, h.relocation_priority, `"${h.dominant_hazard}"`]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kshema_vulnerable_habitations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSitesCSV = async () => {
    const data = await fetchRelocationSites();
    const headers = ['ID', 'Name', 'Subdistrict', 'SiteType', 'IsSafe', 'SafetyScore', 'EffectiveCapacity', 'Bottleneck'];
    const rows = data.map(s => [s.id, `"${s.name}"`, s.subdistrict, s.site_type, s.is_safe, s.safety_score, s.capacity?.effective_capacity || 0, `"${s.capacity?.bottleneck || ''}"`]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kshema_candidate_relocation_sites.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100">Operational Reports & CSV Exports</h1>
        <p className="text-xs text-slate-400 mt-1">Export decision support summaries for NDRF and State Disaster Management Authority briefing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-command-card border border-command-border p-6 rounded-xl space-y-4">
          <div className="flex items-center space-x-3 text-slate-100">
            <FileText className="w-6 h-6 text-blue-400" />
            <h3 className="font-bold text-sm">Vulnerable Habitations Risk Report</h3>
          </div>
          <p className="text-xs text-slate-400">Complete summary table of all habitations, populations, hazard scores & priority urgency.</p>
          <button
            onClick={handleExportHabitationsCSV}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT HABITATIONS CSV</span>
          </button>
        </div>

        <div className="bg-command-card border border-command-border p-6 rounded-xl space-y-4">
          <div className="flex items-center space-x-3 text-slate-100">
            <FileText className="w-6 h-6 text-emerald-400" />
            <h3 className="font-bold text-sm">Candidate Relocation Sites Report</h3>
          </div>
          <p className="text-xs text-slate-400">Summary table of safe candidate sites, hard exclusion safety status, effective capacity & bottlenecks.</p>
          <button
            onClick={handleExportSitesCSV}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT SAFE SITES CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
