import React from 'react';
import { AlertTriangle, MapPin, Navigation, ShieldCheck, Info, X, ExternalLink } from 'lucide-react';

interface SafetyPlanModalProps {
  alertData: any;
  onClose: () => void;
}

export const SafetyPlanModal: React.FC<SafetyPlanModalProps> = ({ alertData, onClose }) => {
  if (!alertData) return null;

  const riskLevel = (alertData.risk_level || alertData.riskCategory || 'CRITICAL').toUpperCase();
  const hazardType = (alertData.hazard_type || alertData.primaryHazard || 'FLOOD').toUpperCase();
  const relocationSite = alertData.relocation_site || alertData.recommended_site_name || alertData.relocation_plan?.recommended_site?.name || 'Nearest Designated High-Ground Zone';
  const distance = alertData.distance_km || alertData.distance_km_str || alertData.relocation_plan?.recommended_site?.distance_km ? `${alertData.relocation_plan?.recommended_site?.distance_km.toFixed(1)} km` : '3.8 km';
  const direction = alertData.direction || alertData.direction_str || alertData.relocation_plan?.recommended_site?.compass_direction || 'North-East';
  const verificationStatus = alertData.verification_status || alertData.verification_status_label || 'Potential safer relocation location identified. Field verification may be required.';
  const isDemo = alertData.is_demo === true;

  const isCritical = riskLevel === 'CRITICAL';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg animate-fadeIn overflow-y-auto">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative my-8">
        
        {/* Header Header */}
        <div className={`p-6 border-b ${isCritical ? 'bg-rose-950/40 border-rose-500/30' : 'bg-amber-950/40 border-amber-500/30'} flex items-start justify-between relative`}>
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl ${isCritical ? 'bg-rose-600 shadow-lg shadow-rose-600/30 animate-pulse' : 'bg-amber-500 shadow-lg shadow-amber-500/30'}`}>
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide uppercase ${isCritical ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                  {riskLevel} RISK
                </span>
                {isDemo && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    DEMO ALERT
                  </span>
                )}
              </div>
              <h2 className="text-xl font-extrabold text-slate-100 mt-1">
                Kshema Emergency Safety Plan
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {isDemo && (
            <div className="bg-purple-950/50 border border-purple-500/30 rounded-2xl p-3.5 flex items-center space-x-3 text-purple-200 text-xs font-semibold">
              <Info className="w-5 h-5 text-purple-400 shrink-0" />
              <span>DEMO ALERT — NOT A REAL EMERGENCY. Used for testing real-time browser push notifications and safety plan display.</span>
            </div>
          )}

          {/* Hazard Overview */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Primary Hazard:</span>
              <span className="font-bold text-slate-100 uppercase">{hazardType}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Risk Assessment:</span>
              <span className={`font-bold ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                {alertData.reason || `High confidence ${hazardType.toLowerCase()} hazard detected near GPS location.`}
              </span>
            </div>
          </div>

          {/* Recommended Relocation Section */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm border-b border-slate-700 pb-3">
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>Recommended Relocation Location</span>
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-extrabold text-emerald-400">{relocationSite}</h4>
              <div className="flex items-center space-x-4 text-xs text-slate-300">
                <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 font-semibold text-slate-200">
                  Distance: <strong className="text-emerald-300">{distance}</strong>
                </span>
                <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 font-semibold text-slate-200">
                  Direction: <strong className="text-cyan-300">{direction}</strong>
                </span>
              </div>
            </div>

            <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 flex items-start space-x-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-slate-300 leading-snug">
                <strong className="text-amber-300">Candidate Status:</strong> {verificationStatus}
              </span>
            </div>
          </div>

          {/* Immediate Action Steps */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recommended Immediate Actions</h5>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start space-x-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Move calmly towards higher ground along designated evacuation routes in the <strong>{direction}</strong> direction.</span>
              </li>
              <li className="flex items-start space-x-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Avoid low-lying stream beds, flooded underpasses, and steep unstable soil slopes.</span>
              </li>
              <li className="flex items-start space-x-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Keep your smartphone connected to Kshema live location tracking for continuous safety updates.</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2"
          >
            <span>Acknowledge & View Live Map</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
