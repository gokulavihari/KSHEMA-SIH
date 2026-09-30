import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, List } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onFallbackListToggle?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GISErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GISErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center p-8 bg-slate-950 text-center font-mono">
          <div className="p-4 bg-amber-950/40 border border-amber-600/60 rounded-2xl max-w-md space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-amber-900/60 text-amber-400 border border-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-100">
                {this.props.fallbackTitle || 'Map visualization is temporarily unavailable.'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                A rendering or geographic data issue occurred. The operational location dataset, filters, and priority list remain accessible.
              </p>
              {this.state.error && (
                <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 text-[10px] text-rose-400 text-left font-mono truncate">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold py-2 px-3 rounded-lg text-xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Map</span>
              </button>

              {this.props.onFallbackListToggle && (
                <button
                  onClick={this.props.onFallbackListToggle}
                  className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 px-3 rounded-lg text-xs transition border border-slate-700"
                >
                  <List className="w-3.5 h-3.5 text-sky-400" />
                  <span>View Risk List</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
