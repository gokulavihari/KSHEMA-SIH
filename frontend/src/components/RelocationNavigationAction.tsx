import React from 'react';
import { Navigation, MapPin, AlertCircle, ExternalLink } from 'lucide-react';
import { validateCoordinates, getGoogleMapsDirectionsUrl, getGoogleMapsViewUrl } from '../utils/navigation';

export interface RelocationNavigationActionProps {
  latitude?: number | null;
  longitude?: number | null;
  siteName?: string;
  locationLabel?: string;
  isEligible?: boolean;
  onViewOnMap?: () => void;
  variant?: 'primary' | 'card' | 'compact';
  className?: string;
}

export const RelocationNavigationAction: React.FC<RelocationNavigationActionProps> = ({
  latitude,
  longitude,
  siteName = 'Relocation Site',
  locationLabel,
  isEligible = true,
  onViewOnMap,
  variant = 'primary',
  className = ''
}) => {
  const validation = validateCoordinates(latitude, longitude);

  // If site is not eligible
  if (!isEligible) {
    return (
      <div className={`p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-center space-x-2 ${className}`}>
        <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
        <span>Navigation unavailable for ineligible relocation site.</span>
      </div>
    );
  }

  // If coordinates missing or invalid
  if (!validation.isValid) {
    return (
      <div
        className={`p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-xs text-amber-300/90 flex items-start space-x-2.5 ${className}`}
        role="status"
        aria-live="polite"
      >
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-semibold text-amber-200">Navigation Unavailable</div>
          <div className="text-[11px] leading-relaxed text-amber-300/80">{validation.message}</div>
        </div>
      </div>
    );
  }

  const directionsUrl = getGoogleMapsDirectionsUrl(latitude, longitude, siteName);
  const viewUrl = getGoogleMapsViewUrl(latitude, longitude);

  if (!directionsUrl) return null;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Get directions to ${siteName}`}
          className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 min-h-[36px] bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Get Directions</span>
          <ExternalLink className="w-3 h-3 text-emerald-200" />
        </a>

        {onViewOnMap ? (
          <button
            type="button"
            onClick={onViewOnMap}
            aria-label={`View ${siteName} on map`}
            className="inline-flex items-center justify-center space-x-1 px-2.5 py-1.5 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>Map</span>
          </button>
        ) : viewUrl ? (
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${siteName} location on Google Maps`}
            className="inline-flex items-center justify-center space-x-1 px-2.5 py-1.5 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>Map</span>
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {locationLabel && (
        <div className="text-xs text-slate-300 font-medium flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Destination Location: <strong className="text-white">{locationLabel}</strong></span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Primary Action: Get Directions */}
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Get directions to ${siteName} on Google Maps`}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs tracking-wide rounded-xl transition-all shadow-md hover:shadow-emerald-900/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950 flex-1 sm:flex-initial"
        >
          <Navigation className="w-4 h-4 text-emerald-100" />
          <span>Get Directions</span>
          <ExternalLink className="w-3.5 h-3.5 text-emerald-200/80" />
        </a>

        {/* Secondary Action: View on Map */}
        {onViewOnMap ? (
          <button
            type="button"
            onClick={onViewOnMap}
            aria-label={`View ${siteName} on map`}
            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 min-h-[44px] bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700/90 transition-all focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-950 flex-1 sm:flex-initial"
          >
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>View on Map</span>
          </button>
        ) : viewUrl ? (
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${siteName} on Google Maps`}
            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 min-h-[44px] bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700/90 transition-all focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-950 flex-1 sm:flex-initial"
          >
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>View on Map</span>
          </a>
        ) : null}
      </div>
    </div>
  );
};
