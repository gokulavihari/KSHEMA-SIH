import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: 'EXECUTIVE' | 'ADMIN';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole = 'EXECUTIVE'
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-command-bg text-command-text">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-400">Verifying Executive Credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to login with requested return path
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-command-bg text-command-text p-6">
        <div className="max-w-md w-full bg-command-card border border-red-800/80 rounded-xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-red-950/80 text-red-400 border border-red-700/80 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            403
          </div>
          <h2 className="text-xl font-bold text-slate-100">Access Restricted</h2>
          <p className="text-xs text-slate-400">
            This module requires Administrator privilege level. Your current executive role is <strong className="text-slate-200">{user.role}</strong>.
          </p>
          <a
            href="/executive/dashboard"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all"
          >
            Return to Executive Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
};
