'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class DeltaErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DeltaErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 rounded-3xl bg-slate-900 border border-red-500/40 text-center space-y-4 max-w-lg mx-auto shadow-2xl animate-fadeIn">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-2xl">
            <AlertTriangle size={28} />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-white uppercase tracking-wider">
              {this.props.fallbackTitle || 'Wystąpił nieoczekiwany błąd modułu'}
            </h3>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'Aplikacja napotkała drobny problem z renderowaniem danych.'}
            </p>
          </div>

          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition-all"
            >
              <RefreshCw size={13} /> Spróbuj Ponownie
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
            >
              <Home size={13} /> Pulpit Główny
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
