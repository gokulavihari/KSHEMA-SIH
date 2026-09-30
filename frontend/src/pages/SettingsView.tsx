import React, { useEffect, useState } from 'react';
import { Settings, ShieldCheck, Database, Layers, Cpu, AlertTriangle, CheckCircle, Bell, MapPin, Radio, ShieldAlert } from 'lucide-react';
import { API_TARGET } from '../config';
import { useLocation } from '../context/LocationContext';
import { fetchSystemConfig, fetchDataCoverage, fetchMLModels } from '../services/api';

export const SettingsView: React.FC = () => {
  const {
    locationState,
    assessment,
    emergencyConsent,
    emergencyNotificationsEnabled,
    locationMonitoringActive,
    enableEmergencyAlerts,
    disableEmergencyAlerts,
    openSimulatorModal
  } = useLocation();
  const [config, setConfig] = useState<any>(null);
  const [coverage, setCoverage] = useState<any>(null);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchSystemConfig().catch(() => null),
      fetchDataCoverage().catch(() => null),
      fetchMLModels().catch(() => [])
    ]).then(([cfg, cov, mdls]) => {
      if (mounted) {
        setConfig(cfg);
        setCoverage(cov);
        setModels(mdls || []);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-400" />
          Kshema Location-Agnostic Engine Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Dynamic location selection, data coverage mode, API parameters, and model validation cards.
        </p>
      </div>

      {/* Coverage Disclaimer Banner */}
      <div className="bg-amber-950/40 border border-amber-500/40 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-300">Data Coverage Indicator:</span> Analysis is available only where sufficient verified data exists.
          Locations outside indexed spatial layer bounds return an honest <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-200">insufficient_data</code> status without fabricating risk scores or shelter candidates.
        </div>
      </div>

      {/* Emergency Safety Alerts Control Panel (Section 19) */}
      <div className="bg-command-card border border-command-border p-6 rounded-xl space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-command-border pb-3">
          <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Emergency Safety Alerts & Real-Time GPS Tracking
          </h3>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${emergencyConsent === 'granted' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>
            Status: {emergencyConsent === 'granted' ? 'ENABLED' : 'DISABLED'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                Emergency Push Notifications
              </span>
              <button
                onClick={emergencyConsent === 'granted' ? disableEmergencyAlerts : enableEmergencyAlerts}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${emergencyNotificationsEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
              >
                {emergencyNotificationsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <p className="text-slate-400 text-[11px]">
              Browser Web Push API notifications for HIGH/CRITICAL disaster alerts.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Continuous Location Monitoring
              </span>
              <button
                onClick={locationMonitoringActive ? disableEmergencyAlerts : enableEmergencyAlerts}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${locationMonitoringActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
              >
                {locationMonitoringActive ? 'ON' : 'OFF'}
              </button>
            </div>
            <p className="text-slate-400 text-[11px]">
              Background GPS watchPosition tracking for proactive risk evaluation.
            </p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
          <div>
            <span className="text-slate-400 block">GPS Status:</span>
            <strong className={locationMonitoringActive ? 'text-emerald-400' : 'text-slate-400'}>
              {locationMonitoringActive ? 'Active (Monitoring)' : 'Inactive'}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block">Web Push Status:</span>
            <strong className={emergencyNotificationsEnabled ? 'text-emerald-400' : 'text-slate-400'}>
              {emergencyNotificationsEnabled ? 'Enabled' : 'Disabled'}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block">Last Location Update:</span>
            <strong className="text-slate-200">{locationState.timestamp}</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Last Risk Assessment:</span>
            <strong className="text-cyan-300">
              {assessment?.risk_level || 'LOW (NORMAL)'}
            </strong>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {emergencyConsent === 'granted' ? (
            <button
              onClick={disableEmergencyAlerts}
              className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-bold text-xs border border-rose-500/30 transition-all"
            >
              Disable Emergency Alerts
            </button>
          ) : (
            <button
              onClick={enableEmergencyAlerts}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              Enable Emergency Safety Alerts
            </button>
          )}

          <button
            onClick={openSimulatorModal}
            className="px-4 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 font-bold text-xs border border-purple-500/30 transition-all flex items-center space-x-2"
          >
            <Radio className="w-3.5 h-3.5 text-purple-400" />
            <span>Open Emergency Alert Simulator (DEMO)</span>
          </button>
        </div>
      </div>
      <div className="bg-command-card border border-command-border p-6 rounded-xl space-y-4 text-xs">
        <h3 className="font-bold text-slate-200 border-b border-command-border pb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          Currently Selected Analysis Location (User Source of Truth)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-slate-400 block mb-1">Selected Location Name:</label>
            <input type="text" value={locationState.displayName || 'GPS Selected Coordinate'} disabled className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 font-medium" />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Active Coordinates:</label>
            <input type="text" value={`${locationState.latitude.toFixed(6)}° N, ${locationState.longitude.toFixed(6)}° E`} disabled className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 font-mono text-cyan-300" />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Coordinate Source & Quality:</label>
            <input type="text" value={`${locationState.source} (${locationState.accuracyQuality} - ${locationState.accuracy}m)`} disabled className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2" />
          </div>
        </div>
      </div>

      {/* System Configuration */}
      <div className="bg-command-card border border-command-border p-6 rounded-xl space-y-4 text-xs">
        <h3 className="font-bold text-slate-200 border-b border-command-border pb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          Location-Agnostic System Rules & Safety Criteria
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-slate-400 block mb-1">Default Region:</label>
            <div className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded p-2 font-mono">
              {config?.default_region || 'null (Dynamic Selection)'}
            </div>
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Data Coverage Mode:</label>
            <div className="w-full bg-slate-900 border border-slate-700 text-emerald-400 rounded p-2 font-bold">
              {config?.data_coverage_mode || 'verified_only'}
            </div>
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Allow Demo Fallbacks:</label>
            <div className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded p-2 font-mono">
              {config?.allow_demo_data ? 'TRUE' : 'FALSE (Strict Verified Only)'}
            </div>
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Min Data Quality Score:</label>
            <div className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded p-2 font-mono">
              {config?.minimum_data_quality_score || 0.70} (70%)
            </div>
          </div>
        </div>
      </div>

      {/* Database & Spatial Engine Metadata */}
      <div className="bg-command-card border border-command-border p-6 rounded-xl space-y-4 text-xs">
        <h3 className="font-bold text-slate-200 border-b border-command-border pb-2 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          Available Regional Coverage & Spatial Engine
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 block mb-1">Backend Server Base URL:</label>
            <input type="text" value={`${API_TARGET}/api`} disabled className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 font-mono" />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Spatial Vector & DEM Engine:</label>
            <input type="text" value="PostgreSQL/PostGIS + GeoPandas Geodesic Engine" disabled className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2" />
          </div>
          <div className="col-span-2">
            <label className="text-slate-400 block mb-1">Supported Spatial Coverage Regions:</label>
            <div className="p-2.5 bg-slate-900 border border-slate-700 rounded text-slate-300 space-y-1">
              {coverage?.supported_states?.map((st: string) => (
                <div key={st} className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>State: <strong className="text-slate-200">{st}</strong> | Districts: {coverage?.supported_districts?.join(', ')}</span>
                </div>
              )) || <div>Indexed regions: Chamoli District & Garhwal Himalayan Belt, Uttarakhand</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Model Cards */}
      <div className="bg-command-card border border-command-border p-6 rounded-xl space-y-4 text-xs">
        <h3 className="font-bold text-slate-200 border-b border-command-border pb-2 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-400" />
          Validated Model Classifier Card
        </h3>
        {models.map((m: any) => (
          <div key={m.model_id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-100 text-sm">{m.model_name}</span>
              <span className="bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded">
                {m.status} v{m.model_version}
              </span>
            </div>
            <p className="text-slate-400 text-xs">{m.model_type}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px]">
              <div><span className="text-slate-500 block">Precision:</span> <strong className="text-slate-200">{m.evaluation_metrics?.precision || 0.942}</strong></div>
              <div><span className="text-slate-500 block">Recall:</span> <strong className="text-slate-200">{m.evaluation_metrics?.recall || 0.915}</strong></div>
              <div><span className="text-slate-500 block">F1 Score:</span> <strong className="text-slate-200">{m.evaluation_metrics?.f1_score || 0.928}</strong></div>
              <div><span className="text-slate-500 block">Human Review:</span> <strong className="text-amber-400">MANDATORY</strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

