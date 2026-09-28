import React, { useState, useRef } from 'react';
import {
  X,
  Music,
  Upload,
  Volume2,
  VolumeX,
  Repeat,
  Trash2,
  Play,
  Pause,
  AlertTriangle,
  ShieldAlert,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { AudioTrack } from '../types';
import { api } from '../services/api';

interface AudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  currentAudio?: AudioTrack | null;
  onSaveAudio: (audio: AudioTrack | null) => void;
}

export const AudioModal: React.FC<AudioModalProps> = ({
  isOpen,
  onClose,
  projectId,
  currentAudio,
  onSaveAudio,
}) => {
  const [audioState, setAudioState] = useState<AudioTrack | null>(
    currentAudio || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type (MP3, M4A, AAC, WAV, OGG)
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/aac'];
    const isAudioExt = /\.(mp3|m4a|wav|aac|ogg)$/i.test(file.name);

    if (!validTypes.includes(file.type) && !isAudioExt) {
      setUploadError('Selecteer een geldig audiobestand (MP3, M4A, WAV, AAC of OGG).');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await api.uploadFile(projectId, file);

      // Create AudioTrack
      const newAudio: AudioTrack = {
        id: `audio-${Date.now()}`,
        filename: file.name,
        url: result.url,
        volume: 0.8,
        fadeInSeconds: 2,
        fadeOutSeconds: 3,
        loop: true,
        duckOnVideo: true,
        duckVolume: 0.25,
      };

      setAudioState(newAudio);
    } catch (err: any) {
      setUploadError(err.message || 'Fout bij uploaden audiobestand');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTogglePreview = () => {
    if (!audioPreviewRef.current || !audioState) return;

    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.volume = audioState.volume;
      audioPreviewRef.current.play().then(() => {
        setIsPlayingPreview(true);
      }).catch((e) => console.warn('Preview play error:', e));
    }
  };

  const handleRemoveAudio = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    setIsPlayingPreview(false);
    setAudioState(null);
  };

  const handleSave = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    setIsPlayingPreview(false);
    onSaveAudio(audioState);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Achtergrondmuziek</h2>
              <p className="text-xs text-zinc-400">Beheer soundtrack, volume, fades en video-ducking</p>
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
          {uploadError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Current track or upload area */}
          {!audioState ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-amber-500/80 bg-zinc-950/40 hover:bg-zinc-900/60 rounded-2xl p-8 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mp3,audio/mpeg,audio/m4a,audio/wav,audio/aac,audio/ogg,.mp3,.m4a,.wav"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-white font-bold text-sm">
                Upload eigen muziekbestand (MP3, M4A, WAV)
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                Kies een audiobestand vanaf je computer of telefoon
              </div>
              <div className="mt-3 inline-block px-3 py-1 bg-zinc-800 rounded-full text-[11px] text-zinc-400 border border-zinc-700">
                Ondersteunt MP3, M4A, AAC, WAV &amp; OGG
              </div>
            </div>
          ) : (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
              {/* Audio player element */}
              <audio
                ref={audioPreviewRef}
                src={audioState.url}
                onEnded={() => setIsPlayingPreview(false)}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTogglePreview}
                    className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center shadow transition-colors"
                  >
                    {isPlayingPreview ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>
                  <div className="truncate max-w-[280px]">
                    <div className="font-semibold text-white text-xs truncate">
                      {audioState.filename}
                    </div>
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Muziek gekoppeld aan project
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRemoveAudio}
                  title="Muziek verwijderen"
                  className="p-2 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Sliders and Controls */}
              <div className="space-y-4 pt-3 border-t border-zinc-800/80 text-xs">
                {/* Master Volume */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                      Muziekvolume:
                    </span>
                    <span className="font-mono text-amber-400">
                      {Math.round(audioState.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioState.volume}
                    onChange={(e) => {
                      const vol = parseFloat(e.target.value);
                      setAudioState({ ...audioState, volume: vol });
                      if (audioPreviewRef.current) audioPreviewRef.current.volume = vol;
                    }}
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Fade In & Fade Out */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-zinc-300">
                      <span>Fade-in:</span>
                      <span className="font-mono text-zinc-400">{audioState.fadeInSeconds}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      step="0.5"
                      value={audioState.fadeInSeconds}
                      onChange={(e) =>
                        setAudioState({
                          ...audioState,
                          fadeInSeconds: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-zinc-300">
                      <span>Fade-out:</span>
                      <span className="font-mono text-zinc-400">{audioState.fadeOutSeconds}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      step="0.5"
                      value={audioState.fadeOutSeconds}
                      onChange={(e) =>
                        setAudioState({
                          ...audioState,
                          fadeOutSeconds: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>

                {/* Looping */}
                <div className="flex items-center justify-between p-2.5 bg-zinc-900/80 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Muziek herhalen tijdens lange slideshow</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={audioState.loop}
                    onChange={(e) =>
                      setAudioState({ ...audioState, loop: e.target.checked })
                    }
                    className="accent-amber-500 w-4 h-4 rounded"
                  />
                </div>

                {/* Video Ducking */}
                <div className="p-3 bg-zinc-900/80 rounded-lg space-y-2 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-white flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>Automatisch zachter bij video's (Audio Ducking)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={audioState.duckOnVideo}
                      onChange={(e) =>
                        setAudioState({ ...audioState, duckOnVideo: e.target.checked })
                      }
                      className="accent-amber-500 w-4 h-4 rounded"
                    />
                  </div>

                  {audioState.duckOnVideo && (
                    <div className="space-y-1 pt-1.5">
                      <div className="flex justify-between text-[11px] text-zinc-400">
                        <span>Volume tijdens video's met geluid:</span>
                        <span className="font-mono text-amber-400">
                          {Math.round(audioState.duckVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.5"
                        step="0.05"
                        value={audioState.duckVolume}
                        onChange={(e) =>
                          setAudioState({
                            ...audioState,
                            duckVolume: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-amber-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Privacy & Copyright Disclaimer (mandatory) */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-200/90 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <div className="font-semibold text-amber-300">Auteursrechten &amp; Privacy</div>
              <p>
                Geüploade muziekbestanden worden uitsluitend privé verwerkt binnen jouw project. Let op dat je zelf
                verantwoordelijk bent voor het bezit van de benodigde rechten of licenties wanneer je een slideshow
                met muziek deelt of publiceert.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg shadow transition-colors"
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
};
