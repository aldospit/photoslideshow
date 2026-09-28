import React from 'react';
import { Camera, Image as ImageIcon, HelpCircle, HardDrive, CheckCircle2, AlertTriangle, LogIn, LogOut, Film } from 'lucide-react';
import { GoogleAuthStatus, StorageStats } from '../types';

interface NavbarProps {
  authStatus: GoogleAuthStatus | null;
  storageStats: StorageStats | null;
  currentView: 'projects' | 'editor' | 'shared';
  currentProjectTitle?: string;
  onNavigateHome: () => void;
  onOpenGoogleSetup: () => void;
  onOpenStorage: () => void;
  onDisconnectGoogle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  authStatus,
  storageStats,
  currentView,
  currentProjectTitle,
  onNavigateHome,
  onOpenGoogleSetup,
  onOpenStorage,
  onDisconnectGoogle,
}) => {
  return (
    <header className="bg-zinc-900 border-b border-zinc-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 via-rose-300 to-amber-200 bg-clip-text text-transparent">
                FotoShow
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[11px] font-medium bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                Google Photos
              </span>
            </div>
          </button>

          {currentView === 'editor' && currentProjectTitle && (
            <div className="hidden md:flex items-center gap-2 text-sm text-zinc-400 pl-3 border-l border-zinc-700">
              <span className="text-zinc-500">/</span>
              <span className="text-zinc-200 font-medium truncate max-w-xs">{currentProjectTitle}</span>
            </div>
          )}
        </div>

        {/* Right: Actions & Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Storage stats badge */}
          <button
            onClick={onOpenStorage}
            title="Bekijk lokale projectopslag en cache"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 border border-zinc-700/60 transition-colors"
          >
            <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Opslag:</span>
            <span>{storageStats ? `${storageStats.totalMb} MB` : 'Opslag'}</span>
          </button>

          {/* Google Photos status / connect */}
          {authStatus?.isConnected ? (
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-lg text-xs text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="hidden lg:block truncate max-w-[140px]" title={authStatus.userEmail || 'Google Photos verbonden'}>
                {authStatus.userEmail || 'Google gekoppeld'}
              </div>
              <span className="lg:hidden font-medium">Verbonden</span>
              <button
                onClick={onDisconnectGoogle}
                title="Google-account ontkoppelen"
                className="text-zinc-400 hover:text-rose-400 ml-1 p-0.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : authStatus?.hasConfig ? (
            <button
              onClick={onOpenGoogleSetup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Verbind Google Photos</span>
            </button>
          ) : (
            <button
              onClick={onOpenGoogleSetup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40 transition-colors"
              title="Configureer Google Photos API koppeling"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Google Setup</span>
              <span className="sm:hidden">Setup</span>
            </button>
          )}

          {/* Help modal */}
          <button
            onClick={onOpenGoogleSetup}
            title="Hulp & Google Cloud instructies"
            aria-label="Hulp en documentatie"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
