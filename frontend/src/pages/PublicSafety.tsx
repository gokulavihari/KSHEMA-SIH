import React, { useEffect, useState } from 'react';
import { fetchPublicSafetyInfo } from '../services/api';
import { PhoneCall, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

export const PublicSafetyView: React.FC = () => {
  const [safetyInfo, setSafetyInfo] = useState<any>(null);

  useEffect(() => {
    fetchPublicSafetyInfo()
      .then((res) => setSafetyInfo(res))
      .catch((err) => console.error('Failed to load safety info:', err));
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-command-card border border-command-border rounded-2xl p-6 shadow-xl space-y-2">
        <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
          <ShieldAlert className="w-5 h-5" />
          <span>Emergency & Public Safety Information</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Disaster Safety Protocols & Helplines</h1>
        <p className="text-xs text-slate-400">
          Official emergency contacts and public safety guidelines for high-hazard regions.
        </p>
      </div>

      {/* Emergency Helplines Card */}
      <div className="bg-command-card border border-blue-800/40 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
          <PhoneCall className="w-4 h-4 text-blue-400" />
          <span>Emergency Control Room Helplines</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safetyInfo?.helpline_numbers?.map((hp: any, idx: number) => (
            <div key={idx} className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="font-semibold text-xs text-slate-200 block">{hp.name}</span>
                <span className="text-xs text-blue-400 font-mono font-bold">{hp.number}</span>
              </div>
              <a
                href={`tel:${hp.number.split('/')[0].trim()}`}
                className="px-3 py-1.5 bg-blue-600/30 border border-blue-500/50 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-semibold rounded-lg transition-all"
              >
                Call
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Steps */}
      <div className="bg-command-card border border-command-border rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Public Safety Protocols</span>
        </h2>

        <div className="space-y-3">
          {safetyInfo?.guidance_steps?.map((step: string, idx: number) => (
            <div key={idx} className="flex items-start space-x-3 p-3 bg-slate-900/60 rounded-xl border border-command-border/60">
              <span className="w-6 h-6 rounded-full bg-blue-950 text-blue-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-blue-700/60">
                {idx + 1}
              </span>
              <p className="text-xs text-slate-300 leading-relaxed pt-0.5">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
