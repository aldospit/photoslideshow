import React, { useState } from 'react';
import { X, Share2, Copy, Check, Shield, AlertTriangle, RefreshCw, Link2, Eye } from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (updated: Project) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
}) => {
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const shareUrl = project.shareToken
    ? `${window.location.origin}/?share=${project.shareToken}`
    : '';

  const handleToggleShare = async (enable: boolean) => {
    setIsUpdating(true);
    setError(null);
    try {
      const res = await api.toggleShare(project.id, enable);
      onUpdateProject({
        ...project,
        isShared: res.isShared,
        shareToken: res.shareToken,
      });
    } catch (err: any) {
      setError(err.message || 'Fout bij wijzigen deelstatus');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!window.confirm('Weet je zeker dat je een nieuwe link wilt genereren? De oude deellink zal direct stoppen met werken.')) {
      return;
    }
    setIsUpdating(true);
    setError(null);
    try {
      const res = await api.toggleShare(project.id, true, true);
      onUpdateProject({
        ...project,
        isShared: res.isShared,
        shareToken: res.shareToken,
      });
    } catch (err: any) {
      setError(err.message || 'Fout bij vernieuwen link');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Project Delen</h2>
              <p className="text-xs text-zinc-400">Beheer privétoegang en deelbare kijklinks</p>
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
        <div className="p-6 space-y-5 text-sm text-zinc-300">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Toggle Sharing */}
          <div className="flex items-center justify-between p-4 bg-zinc-800/40 border border-zinc-700/60 rounded-xl">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-white">Privé Deellink Inschakelen</div>
              <div className="text-xs text-zinc-400">
                Standaard staat delen uitgeschakeld om je privacy te waarborgen.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={project.isShared}
                onChange={(e) => handleToggleShare(e.target.checked)}
                disabled={isUpdating}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Share Link box if enabled */}
          {project.isShared && project.shareToken && (
            <div className="bg-zinc-950 border border-indigo-500/30 rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-indigo-400" />
                <span>Geheime Privélink</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 select-all"
                />
                <button
                  onClick={handleCopy}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Gekopieerd!' : 'Kopiëren'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Kijkersweergave testen</span>
                </a>

                <button
                  onClick={handleRegenerateToken}
                  disabled={isUpdating}
                  className="text-zinc-400 hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Link intrekken &amp; vernieuwen</span>
                </button>
              </div>
            </div>
          )}

          {/* Info note */}
          <div className="bg-zinc-800/20 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-400 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Mensen met deze geheime link kunnen de slideshow en het fotoalbum uitsluitend bekijken. Ze kunnen geen foto's toevoegen, bewerken of verwijderen. Je kunt de link op elk moment intrekken.
            </div>
          </div>
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
