import React, { useState } from 'react';
import { X, Settings, Sparkles, Clock, Sliders, Layers, Check } from 'lucide-react';
import { Project, ProjectSettings, AspectRatio } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSaveSettings: (title: string, description: string, settings: ProjectSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  project,
  onSaveSettings,
}) => {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [settings, setSettings] = useState<ProjectSettings>({ ...project.settings });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(title.trim() || 'Mijn FotoShow Project', description.trim(), settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Projectinstellingen</h2>
              <p className="text-xs text-zinc-400">Pas titel, overgangen, speelduur en effecten aan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-sm text-zinc-300">
          {/* Title & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-200 mb-1.5">
                Projecttitel
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="bv. Zomervakantie Frankrijk 2026"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-200 mb-1.5">
                Beschrijving / Ondertitel (optioneel)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                placeholder="bv. Een verzameling van onze mooiste herinneringen aan de kust en in de bergen."
              />
            </div>
          </div>

          <div className="border-t border-zinc-800/80 pt-5 space-y-5">
            {/* Default photo duration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Standaardduur per foto:
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {settings.defaultPhotoDuration} seconden
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="15"
                step="0.5"
                value={settings.defaultPhotoDuration}
                onChange={(e) =>
                  setSettings({ ...settings, defaultPhotoDuration: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>2s (snel)</span>
                <span>4s - 5s (aanbevolen)</span>
                <span>15s (rustig)</span>
              </div>
            </div>

            {/* Default transition */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-200">
                Standaard Overgangsstijl
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'fade', label: 'Vervagen (Fade)' },
                  { id: 'slide', label: 'Schuiven (Slide)' },
                  { id: 'zoom', label: 'Zacht zoomen' },
                  { id: 'none', label: 'Geen overgang' },
                ].map((tr) => (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() =>
                      setSettings({ ...settings, defaultTransition: tr.id as any })
                    }
                    className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-colors ${
                      settings.defaultTransition === tr.id
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {tr.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ken Burns Effect */}
            <div className="flex items-center justify-between p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-xl">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ken Burns Effect (Pan &amp; Zoom)</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Subtiele camerabeweging en lichte zoom, met gezichten en compositie gecentreerd gehouden.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.kenBurnsEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, kenBurnsEnabled: e.target.checked })
                }
                className="accent-amber-500 w-4 h-4 rounded"
              />
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-200">
                Beeldverhouding Slideshow Speler
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: '16:9', label: '16:9 Breedbeeld' },
                  { id: '4:3', label: '4:3 Klassiek' },
                  { id: '1:1', label: '1:1 Vierkant' },
                  { id: '9:16', label: '9:16 Verticaal' },
                ].map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() =>
                      setSettings({ ...settings, aspectRatio: ar.id as AspectRatio })
                    }
                    className={`py-2 px-1 rounded-xl text-xs font-medium border text-center transition-colors ${
                      settings.aspectRatio === ar.id
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Captions and Loop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl cursor-pointer">
                <span className="text-xs text-zinc-200">Bijschriften tonen tijdens spelen</span>
                <input
                  type="checkbox"
                  checked={settings.showCaptions}
                  onChange={(e) =>
                    setSettings({ ...settings, showCaptions: e.target.checked })
                  }
                  className="accent-amber-500 w-4 h-4 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl cursor-pointer">
                <span className="text-xs text-zinc-200">Slideshow continu herhalen</span>
                <input
                  type="checkbox"
                  checked={settings.loopSlideshow}
                  onChange={(e) =>
                    setSettings({ ...settings, loopSlideshow: e.target.checked })
                  }
                  className="accent-amber-500 w-4 h-4 rounded"
                />
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg shadow transition-colors"
            >
              Instellingen Toepassen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
