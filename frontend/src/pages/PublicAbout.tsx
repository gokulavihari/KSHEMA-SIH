import React from 'react';
import { Shield, Activity, Lock, Users, Map, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PublicAboutView: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 py-10">
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 bg-blue-950/80 border border-blue-700/80 rounded-2xl text-blue-400 shadow-xl mb-2">
          <Shield className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100 font-mono">KSHEMA</h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto font-medium">
          Disaster Risk & Safe Relocation Intelligence Platform
        </p>
      </div>

      <div className="bg-command-card border border-command-border rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-command-border pb-3">
          <h2 className="text-lg font-bold text-slate-100">
            About Kshema
          </h2>
          <span className="text-xs font-serif italic text-sky-400 bg-sky-950/80 px-2.5 py-1 rounded border border-sky-800/80">
            Kshema (क्षेम) — well-being, safety, welfare, and protection
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Kshema is a national disaster-risk and safe relocation intelligence platform designed to evaluate multi-hazard vulnerabilities (landslides, flash floods, extreme rainfall, seismic risks) across mountain, riverine, and coastal regions. It assists State Disaster Management Authorities (SDMA), NDRF, and local administrators in identifying high-risk habitations and executing capacity-verified safe relocations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-command-card border border-command-border rounded-xl p-5 space-y-2">
          <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm">
            <Users className="w-4 h-4" />
            <span>Public Viewer Portal</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Provides community members and the general public with clear, accessible hazard warnings, district safety advisories, and emergency helpline details without complex technical jargon.
          </p>
        </div>

        <div className="bg-command-card border border-command-border rounded-xl p-5 space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
            <Lock className="w-4 h-4" />
            <span>Authorized Executive Console</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Accessible exclusively to authorized government officials and executives, offering complete operational capabilities including relocation engines, capacity matrix, AI explainability, and audit trails.
          </p>
        </div>
      </div>

      <div className="text-center pt-4">
        <Link
          to="/login"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
        >
          <Lock className="w-4 h-4" />
          <span>Authorized Personnel Executive Access</span>
        </Link>
      </div>
    </div>
  );
};
