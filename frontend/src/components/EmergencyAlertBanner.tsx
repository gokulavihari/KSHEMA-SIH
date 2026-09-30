import React from 'react';
import { ShieldAlert, Bell, MapPin, X, Check } from 'lucide-react';

interface EmergencyAlertBannerProps {
  onAllow: () => void;
  onDeny: () => void;
}

export const EmergencyAlertBanner: React.FC<EmergencyAlertBannerProps> = ({ onAllow, onDeny }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Enable Emergency Safety Alerts</h3>
            <p className="text-xs text-amber-400 font-medium">Real-Time Disaster Protection</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-5">
          Allow Kshema to use your location and send emergency disaster alerts when your current area is identified as high risk.
        </p>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 mb-6 space-y-2">
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>GPS Monitoring: <strong className="text-slate-100">Low-frequency & Minimal Payload</strong></span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <Bell className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Web Push: <strong className="text-slate-100">Active only during HIGH / CRITICAL hazards</strong></span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onAllow}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Allow Emergency Alerts</span>
          </button>
          <button
            onClick={onDeny}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm border border-slate-700 flex items-center justify-center transition-all"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};
