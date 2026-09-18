import React, { useEffect, useState } from 'react';
import { fetchAlerts } from '../services/api';
import { SystemAlert } from '../types';
import { LocationHeader } from '../components/LocationHeader';
import { ChangeLocationModal } from '../components/ChangeLocationModal';
import { Bell, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const AlertsView: React.FC = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAlerts()
      .then((data) => {
        setAlerts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-command-bg pb-12">
      <LocationHeader />
      <ChangeLocationModal />

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-command-accent" />
            Verified System Alerts & Operational Advisories
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time alerts originating strictly from verified IMD warnings, validated hazard engine conditions, and field officer observations.
          </p>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-xs font-semibold">Loading verified system alerts...</div>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className={`p-5 rounded-xl border flex items-start space-x-4 text-xs shadow-lg ${
                  a.severity === 'CRITICAL'
                    ? 'bg-rose-950/70 border-rose-700 text-rose-200'
                    : a.severity === 'WARNING'
                    ? 'bg-amber-950/70 border-amber-700 text-amber-200'
                    : 'bg-blue-950/70 border-blue-700 text-blue-200'
                }`}
              >
                {a.severity === 'CRITICAL' ? (
                  <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-xs">{a.severity} ALERT — {a.source}</span>
                    <span className="font-mono text-[11px] opacity-80">{a.timestamp}</span>
                  </div>
                  <div className="font-bold text-white text-sm">{a.location}</div>
                  <p className="opacity-95 text-xs leading-relaxed">{a.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
