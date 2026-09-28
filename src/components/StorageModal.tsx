import React, { useState } from 'react';
import { X, HardDrive, CheckCircle2, ShieldCheck, Download, AlertTriangle, RefreshCw, Trash2, Folder } from 'lucide-react';
import { StorageStats, Project } from '../types';
import { api } from '../services/api';

interface StorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageStats: StorageStats | null;
  currentProject?: Project | null;
  onRefreshProject?: () => void;
  onRefreshStats: () => void;
}

export const StorageModal: React.FC<StorageModalProps> = ({
  isOpen,
  onClose,
  storageStats,
  currentProject,
  onRefreshProject,
  onRefreshStats,
}) => {
  const [cachingProgress, setCachingProgress] = useState<{ current: number; total: number } | null>(null);
  const [cacheError, setCacheError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Count items in current project that are not yet cached locally
  const unCachedItems = currentProject?.items.filter(
    (item) => item.baseUrl && !item.cachedLocally && !item.url.startsWith('/api/media/')
  ) || [];

  const handleCacheAllInProject = async () => {
    if (!currentProject || unCachedItems.length === 0) return;
    setCachingProgress({ current: 0, total: unCachedItems.length });
    setCacheError(null);

    try {
      const updatedItems = [...currentProject.items];

      for (let i = 0; i < unCachedItems.length; i++) {
        const item = unCachedItems[i];
        setCachingProgress({ current: i + 1, total: unCachedItems.length });

        try {
          const downloadUrl = item.type === 'VIDEO' ? `${item.baseUrl}=dv` : `${item.baseUrl}=w1920-h1080`;
          const result = await api.cacheItemLocally(
            currentProject.id,
            downloadUrl,
            item.filename,
            item.mimeType
          );

          const idx = updatedItems.findIndex((it) => it.id === item.id);
          if (idx !== -1) {
            updatedItems[idx] = {
              ...updatedItems[idx],
              url: result.localUrl,
              cachedLocally: true,
              sizeBytes: result.sizeBytes,
            };
          }
        } catch (err: any) {
          console.error(`Failed to cache item ${item.filename}:`, err);
        }
      }

      // Save project updates
      await api.updateProject(currentProject.id, { items: updatedItems });
      if (onRefreshProject) onRefreshProject();
      onRefreshStats();
    } catch (err: any) {
      setCacheError(err.message || 'Fout bij cachen van mediabestanden');
    } finally {
      setCachingProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Opslag &amp; Mediabeheer</h2>
              <p className="text-xs text-zinc-400">Inzicht in opslagstrategie en permanente beschikbaarheid</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm text-zinc-300">
          {/* Storage stats cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-800/50 border border-zinc-700/60 p-3.5 rounded-xl">
              <div className="text-[11px] text-zinc-400 font-medium">Totale Schijfruimte</div>
              <div className="text-xl font-bold text-white mt-1">
                {storageStats ? `${storageStats.totalMb} MB` : '0 MB'}
              </div>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/60 p-3.5 rounded-xl">
              <div className="text-[11px] text-zinc-400 font-medium">Aantal Projecten</div>
              <div className="text-xl font-bold text-white mt-1">
                {storageStats?.projectCount ?? 0}
              </div>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/60 p-3.5 rounded-xl">
              <div className="text-[11px] text-zinc-400 font-medium">Totale Media-items</div>
              <div className="text-xl font-bold text-white mt-1">
                {storageStats?.totalItemsCount ?? 0}
              </div>
            </div>
          </div>

          {/* Transparent Storage Strategy Explanation */}
          <div className="bg-zinc-800/30 border border-zinc-700/60 rounded-xl p-4 space-y-2 text-xs">
            <div className="font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Transparante Opslagstrategie</span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              Google Photos Picker API verstrekt tijdelijke media-URL’s die standaard{' '}
              <strong className="text-amber-300">~60 minuten geldig</strong> blijven.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              Om te garanderen dat je slideshow en fotoalbum ook na dagen of maanden perfect blijven afspelen, biedt
              FotoShow <strong>Lokale Projectopslag</strong>. De app kan geselecteerde beelden automatisch veilig naar de
              lokale projectmap downloaden.
            </p>
            <p className="text-zinc-400 text-[11px]">
              🔒 <strong>Privacy &amp; Verwijdering:</strong> Als je een project verwijdert, worden alle gekoppelde
              bestanden, gecachte foto’s en muziek direct en onherroepelijk van de schijf gewist.
            </p>
          </div>

          {/* Current Project Cache Action */}
          {currentProject && (
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-xs">
                    Huidig project: <span className="text-amber-400">{currentProject.title}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {unCachedItems.length > 0 ? (
                      <span className="text-amber-300 font-medium">
                        ⚠️ {unCachedItems.length} van de {currentProject.items.length} items gebruiken nog een tijdelijke Google link.
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Alle {currentProject.items.length} items zijn permanent lokaal opgeslagen!
                      </span>
                    )}
                  </div>
                </div>

                {unCachedItems.length > 0 && (
                  <button
                    onClick={handleCacheAllInProject}
                    disabled={Boolean(cachingProgress)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Alles Lokaal Cachen</span>
                  </button>
                )}
              </div>

              {cachingProgress && (
                <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Bestanden downloaden naar veilige projectopslag...</span>
                    <span>
                      {cachingProgress.current} / {cachingProgress.total}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${Math.round((cachingProgress.current / cachingProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {cacheError && (
                <div className="text-xs text-rose-400 bg-rose-950/30 p-2.5 rounded-lg border border-rose-900">
                  {cacheError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};
