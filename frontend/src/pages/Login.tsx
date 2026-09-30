import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User, AlertCircle, ArrowRight, Activity } from 'lucide-react';

export const LoginView: React.FC = () => {
  const [officialId, setOfficialId] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/executive/map';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officialId.trim() || !password.trim()) return;

    setIsSubmitting(true);
    clearError();

    const success = await login(officialId.trim(), password);
    setIsSubmitting(false);

    if (success) {
      navigate(redirect, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-command-bg flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex p-3 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl shadow-xl mb-3 text-blue-400">
            <Shield className="w-10 h-10 animate-pulse text-blue-500" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-mono">KSHEMA</h1>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-700/60 text-blue-400 text-xs font-semibold tracking-wide">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>KSHEMA EXECUTIVE PORTAL</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Disaster Risk & Safe Relocation Intelligence Platform
          </p>
        </div>

        {/* Glassmorphism Login Card */}
        <div className="bg-command-card/90 backdrop-blur-md border border-command-border rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="border-b border-command-border pb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Executive Authentication</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your official credentials to access protected command tools.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 text-red-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Official / Executive ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={officialId}
                  onChange={(e) => setOfficialId(e.target.value)}
                  placeholder="e.g., EXEC-01 or official ID"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Executive Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Development Quick Credentials Note */}
          <div className="pt-2 border-t border-command-border/60 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase font-mono text-slate-500">
              <span>Security Policy:</span>
              <span className="text-emerald-400 font-semibold">Argon2id Encrypted</span>
            </div>
            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              Authorized personnel only. Unauthenticated access attempts are logged for security compliance.
            </p>
          </div>
        </div>

        {/* Return to Public Portal */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center space-x-1"
          >
            <span>← Return to Kshema Public Portal</span>
          </a>
        </div>
      </div>
    </div>
  );
};
