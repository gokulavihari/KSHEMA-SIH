import React, { useEffect, useState } from 'react';
import { fetchDataSourcesStatus } from '../services/api';
import { DataSourceStatusItem } from '../types';
import { LocationHeader } from '../components/LocationHeader';
import { ChangeLocationModal } from '../components/ChangeLocationModal';
import { Database, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Clock, RefreshCw } from 'lucide-react';

export const DataSourcesView: React.FC = () => {
  const [providers, setProviders] = useState<DataSourceStatusItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadStatus = () => {
    setLoading(true);
    fetchDataSourcesStatus()
      .then((data) => {
        setProviders(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch data sources status:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'LIVE':
      case 'CONNECTED':
      case 'CURRENT':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
      case 'RECENT':
        return 'bg-blue-950/80 text-blue-300 border-blue-700';
      case 'HISTORICAL':
      case 'STATIC':
        return 'bg-amber-950/80 text-amber-300 border-amber-700';
      case 'MODEL-DERIVED':
        return 'bg-purple-950/80 text-purple-300 border-purple-700';
      default:
        return 'bg-rose-950/80 text-rose-300 border-rose-700';
    }
  };

  return (
    <div className="min-h-screen bg-command-bg pb-12">
      <LocationHeader />
      <ChangeLocationModal />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Database className="w-6 h-6 text-command-accent" />
              Data Sources & Provenance Metadata
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Transparent tracking of India Meteorological Department (IMD), MOSDAC/ISRO, NASA SRTM DEM, OpenStreetMap, Census India, and AASHRAY model logic.
            </p>
          </div>
          <button
            onClick={loadStatus}
            disabled={loading}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs rounded-lg transition-all border border-gray-700 flex items-center gap-1.5 self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Health Status</span>
          </button>
        </div>

        {/* Providers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((item) => (
            <div
              key={item.id}
              className="bg-command-card border border-command-border rounded-xl p-5 shadow-lg space-y-4 hover:border-gray-700 transition-all"
            >
              <div className="flex items-start justify-between gap-3 border-b border-command-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    {item.source_name}
                  </h3>
                  <div className="text-xs text-command-accent font-semibold mt-0.5">
                    {item.dataset_name}
                  </div>
                </div>
                <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md border ${getStatusBadgeClass(item.status)}`}>
                  {item.status}
                </span>
              </div>

              <div className="text-xs text-gray-300">
                <span className="text-gray-400 font-medium">Purpose: </span>
                <span>{item.purpose}</span>
              </div>

              {/* Status Explanation Message */}
              <div className="p-2.5 bg-gray-950/70 border border-gray-800 rounded-lg text-xs text-gray-300 space-y-1">
                <div className="text-[10px] text-gray-400 font-bold uppercase">Provider Message & Status:</div>
                <div className="text-[11px] font-mono leading-relaxed">{item.status_message}</div>
              </div>

              {/* Metadata Details Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-gray-950/50 p-2 rounded border border-gray-850">
                  <div className="text-[10px] text-gray-400 font-sans">Retrieval Time</div>
                  <div className="text-gray-200 text-[11px] font-bold mt-0.5 truncate">{item.retrieval_time}</div>
                </div>

                <div className="bg-gray-950/50 p-2 rounded border border-gray-850">
                  <div className="text-[10px] text-gray-400 font-sans">Observation / Version</div>
                  <div className="text-gray-200 text-[11px] font-bold mt-0.5 truncate">{item.observation_time}</div>
                </div>

                <div className="bg-gray-950/50 p-2 rounded border border-gray-850">
                  <div className="text-[10px] text-gray-400 font-sans">Spatial Resolution</div>
                  <div className="text-gray-200 text-[11px] font-bold mt-0.5">{item.spatial_resolution}</div>
                </div>

                <div className="bg-gray-950/50 p-2 rounded border border-gray-850">
                  <div className="text-[10px] text-gray-400 font-sans">Data Confidence</div>
                  <div className="text-emerald-400 font-bold text-[11px] mt-0.5">{item.confidence}% Confidence</div>
                </div>
              </div>

              {/* Footer License & URL */}
              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-command-border">
                <span>License: <strong className="text-gray-300 font-sans">{item.license}</strong></span>
                {item.provider_url && (
                  <a
                    href={item.provider_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-command-accent hover:underline flex items-center gap-1 font-sans font-semibold"
                  >
                    <span>Provider Web Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
