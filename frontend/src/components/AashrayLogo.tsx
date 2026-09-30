import React from 'react';

interface RakshaLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const RakshaLogo: React.FC<RakshaLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11'
  };

  const titleSizes = {
    sm: 'text-sm tracking-wider font-extrabold',
    md: 'text-base tracking-wider font-extrabold',
    lg: 'text-xl tracking-wider font-extrabold'
  };

  return (
    <div className={`flex items-center space-x-2.5 select-none ${className}`}>
      {/* KSHEMA National Shield & Geospatial Radar Emblem */}
      <div className={`relative flex items-center justify-center ${iconSizes[size]} bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-blue-500/40 rounded-lg shadow-lg overflow-hidden shrink-0`}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          {/* Outer Protective Shield Geometry */}
          <path
            d="M 20 4 L 33 9 C 33 22 20 35 20 35 C 20 35 7 22 7 9 L 20 4 Z"
            fill="rgba(14, 165, 233, 0.08)"
            stroke="#38BDF8"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Concentric Geospatial Surveillance Rings */}
          <circle cx="20" cy="18" r="8" stroke="#0284C7" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
          <circle cx="20" cy="18" r="4.5" stroke="#10B981" strokeWidth="1.2" opacity="0.8" />
          {/* Center Coordinates Reticle Point */}
          <circle cx="20" cy="18" r="2.2" fill="#F59E0B" />
          {/* Compass Axis Reticle */}
          <line x1="20" y1="10" x2="20" y2="26" stroke="#38BDF8" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
          <line x1="12" y1="18" x2="28" y2="18" stroke="#38BDF8" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
        </svg>
      </div>

      <div>
        <div className="flex items-center space-x-2">
          <span className={`font-mono text-slate-100 ${titleSizes[size]}`}>
            KSHEMA
          </span>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/40 text-blue-300 tracking-wider">
            NATIONAL RISK MAP
          </span>
        </div>
        {showSubtitle && (
          <p className="text-[10px] text-slate-400 font-sans font-medium tracking-tight leading-none mt-0.5">
            Disaster Risk & Safe Relocation Intelligence
          </p>
        )}
      </div>
    </div>
  );
};

export const KshemaLogo = RakshaLogo;
export const AashrayLogo = RakshaLogo;
export default RakshaLogo;

