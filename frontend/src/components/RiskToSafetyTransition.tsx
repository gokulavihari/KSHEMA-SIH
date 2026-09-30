import React, { useState, useEffect } from 'react';
import { LocationAssessment, LocationRelocationResponse } from '../types';
import { Play, RotateCcw, CheckCircle2, ShieldAlert, Navigation, ArrowRight } from 'lucide-react';

interface RiskToSafetyTransitionProps {
  assessment?: LocationAssessment | null;
  relocationData?: any;
  onComplete?: () => void;
  className?: string;
}

export const RiskToSafetyTransition: React.FC<RiskToSafetyTransitionProps> = ({
  assessment,
  relocationData,
  onComplete,
  className = ''
}) => {
  const [step, setStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const steps = [
    { label: '01. HIGHLIGHT ORIGIN', desc: 'Locking geographic coordinates' },
    { label: '02. TERRAIN DARKENS', desc: 'Focusing spatial radar canvas' },
    { label: '03. RISK PROPAGATION', desc: 'Simulating slope hazard boundaries' },
    { label: '04. DEMARCATE UNSAFE ZONES', desc: 'Mapping high-vulnerability corridors' },
    { label: '05. PROGRESSIVE SEARCH', desc: 'Scanning regional shelter capacities' },
    { label: '06. EVALUATE CANDIDATES', desc: 'Verifying ground infrastructure' },
    { label: '07. HIGHLIGHT SAFE GROUND', desc: 'Target shelter verified' },
    { label: '08. FORM RELOCATION VECTOR', desc: 'Illuminating safe route arc' },
    { label: '09. DECISION COMPLETE', desc: 'Full spatial explanation ready' }
  ];

  const startSequence = () => {
    setIsPlaying(true);
    setStep(1);
  };

  useEffect(() => {
    if (!isPlaying) return;

    if (step < 9) {
      const timer = setTimeout(() => {
        setStep((prev) => prev + 1);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setIsPlaying(false);
      if (onComplete) onComplete();
    }
  }, [step, isPlaying, onComplete]);

  return (
    <div className={`p-5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-4 font-mono ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
          <h4 className="text-xs font-bold text-slate-100 tracking-wider">
            SIGNATURE KSHEMA WORKFLOW: RISK-TO-SAFETY TRANSITION
          </h4>
        </div>

        <div className="flex items-center space-x-2">
          {!isPlaying && step === 0 && (
            <button
              onClick={startSequence}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-slate-950 text-xs font-semibold rounded flex items-center space-x-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN TRANSITION</span>
            </button>
          )}

          {step > 0 && !isPlaying && (
            <button
              onClick={() => setStep(0)}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded border border-slate-700 flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>RESET</span>
            </button>
          )}
        </div>
      </div>

      {/* Progressive Step Sequence Visualizer */}
      <div className="grid grid-cols-3 md:grid-cols-9 gap-1.5 py-1">
        {steps.map((s, idx) => {
          const stepNum = idx + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;

          return (
            <div
              key={idx}
              className={`p-2 rounded border transition-all ${
                isActive
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-inner scale-105'
                  : isDone
                  ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-400'
                  : 'bg-slate-900/40 border-slate-800 text-slate-600'
              }`}
            >
              <div className="text-[9px] font-bold">0{stepNum}</div>
              <div className="text-[10px] truncate">{s.label.replace(`0${stepNum}. `, '')}</div>
            </div>
          );
        })}
      </div>

      {/* Active Narrative State Box */}
      {step > 0 && (
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs space-y-1">
          <div className="flex items-center justify-between text-sky-400">
            <span className="font-bold">{steps[step - 1]?.label}</span>
            <span className="text-[10px] text-slate-500">STAGE {step} OF 9</span>
          </div>
          <p className="text-slate-300 font-sans">{steps[step - 1]?.desc}</p>
        </div>
      )}

      {/* Target Destination Reveal upon sequence completion */}
      {step === 9 && relocationData?.recommended_site && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-lg flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>SAFE GROUND LOCATED: <strong>{relocationData.recommended_site.name}</strong></span>
          </div>
          <span className="font-bold text-sky-400">{relocationData.recommended_site.distance_km?.toFixed(2)} KM CORRIDOR</span>
        </div>
      )}
    </div>
  );
};
