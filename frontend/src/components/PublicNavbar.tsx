import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Navigation, MapPin } from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { AashrayLogo } from './AashrayLogo';

export const PublicNavbar: React.FC = () => {
  const { locationState, requestGpsLocation, loading } = useLocation();

  return (
    <header className="h-16 bg-slate-950/90 border-b border-slate-800/80 px-6 flex items-center justify-between text-slate-100 backdrop-blur-md z-30 sticky top-0 select-none">
      {/* Brand & Subtitle */}
      <Link to="/" className="flex items-center space-x-3 group">
        <AashrayLogo size="sm" showSubtitle={true} />
      </Link>

      {/* Minimal Navigation */}
      <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? 'text-sky-400 font-semibold border-b-2 border-sky-400 pb-0.5' : 'text-slate-300 hover:text-white transition-colors'
          }
        >
          Home
        </NavLink>

        <a
          href="#risk-section"
          onClick={(e) => {
            if (window.location.pathname === '/') {
              e.preventDefault();
              const el = document.getElementById('risk-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="text-slate-300 hover:text-white transition-colors"
        >
          Risk
        </a>

        <a
          href="#relocation-section"
          onClick={(e) => {
            if (window.location.pathname === '/') {
              e.preventDefault();
              const el = document.getElementById('relocation-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="text-slate-300 hover:text-white transition-colors"
        >
          Relocation
        </a>

        <NavLink
          to="/map"
          className={({ isActive }) =>
            isActive ? 'text-sky-400 font-semibold border-b-2 border-sky-400 pb-0.5' : 'text-slate-300 hover:text-white transition-colors'
          }
        >
          Map
        </NavLink>

        <NavLink
          to="/safety"
          className={({ isActive }) =>
            isActive ? 'text-sky-400 font-semibold border-b-2 border-sky-400 pb-0.5' : 'text-slate-300 hover:text-white transition-colors'
          }
        >
          Safety Guide
        </NavLink>
      </nav>

      {/* Small Right Location Status Indicator */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => requestGpsLocation()}
          disabled={loading}
          title="Detect Current GPS Location"
          className="flex items-center space-x-2 text-xs font-sans text-slate-300 hover:text-white bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800 transition-all active:scale-95"
        >
          <Navigation className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
          <span className="truncate max-w-[140px]">
            {loading ? 'Detecting...' : locationState.locality || locationState.displayName || 'GPS Location'}
          </span>
        </button>
      </div>
    </header>
  );
};
