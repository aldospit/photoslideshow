import React, { useState, useRef, useEffect } from 'react';
import { X, Scissors, Volume2, VolumeX, Play, Pause, Check } from 'lucide-react';
import { ProjectItem } from '../types';

interface VideoTrimModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ProjectItem;
  onSave: (updatedItem: ProjectItem) => void;
}

export const VideoTrimModal: React.FC<VideoTrimModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(item.durationSeconds || 10);
  const [start, setStart] = useState(item.videoTrim?.start ?? 0);
  const [end, setEnd] = useState(item.videoTrim?.end ?? (item.durationSeconds || 10));
  const [muteAudio, setMuteAudio] = useState(Boolean(item.muteAudio));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStart(item.videoTrim?.start ?? 0);
      setEnd(item.videoTrim?.end ?? (item.durationSeconds || 10));
      setMuteAudio(Boolean(item.muteAudio));
      setIsPlaying(false);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const vidDur = videoRef.current.duration;
      if (vidDur && !isNaN(vidDur)) {
        setDuration(vidDur);
        if (!item.videoTrim) {
          setEnd(Math.min(vidDur, 30)); // default trim to first 30s or full
        }
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      // Loop within start and end
      if (cur >= end) {
        videoRef.current.currentTime = start;
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < start || videoRef.current.currentTime >= end) {
        videoRef.current.currentTime = start;
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.warn(e));
    }
  };

  const handleSave = () => {
    const trimmedDuration = Math.max(1, end - start);
    onSave({
      ...item,
      videoTrim: {
        start,
        end,
      },
      durationSeconds: trimmedDuration,
      muteAudio,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Video Bijsnijden (Trimmen)</h2>
              <p className="text-xs text-zinc-400">{item.filename}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="p-6 space-y-5 text-sm text-zinc-300">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-zinc-800">
            <video
              ref={videoRef}
              src={item.url}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              muted={muteAudio}
              className="max-h-full max-w-full object-contain"
            />

            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-transform hover:scale-105"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>

            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-[11px] font-mono text-zinc-300">
              {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
            </div>
          </div>

          {/* Sliders for Start & End */}
          <div className="space-y-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 text-xs">
            <div className="flex items-center justify-between font-semibold text-white">
              <span>Trim segment:</span>
              <span className="font-mono text-amber-400">
                Speelduur in slideshow: {(end - start).toFixed(1)}s
              </span>
            </div>

            {/* Start slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Beginpunt:</span>
                <span className="font-mono text-white">{start.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0, end - 0.5)}
                step="0.2"
                value={start}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setStart(val);
                  if (videoRef.current) videoRef.current.currentTime = val;
                }}
                className="w-full accent-amber-500"
              />
            </div>

            {/* End slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Eindpunt:</span>
                <span className="font-mono text-white">{end.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min={start + 0.5}
                max={duration}
                step="0.2"
                value={end}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setEnd(val);
                  if (videoRef.current) videoRef.current.currentTime = val;
                }}
                className="w-full accent-rose-500"
              />
            </div>

            {/* Mute video toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                {muteAudio ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
                <span>Oorspronkelijk videogeluid dempen in slideshow</span>
              </div>
              <input
                type="checkbox"
                checked={muteAudio}
                onChange={(e) => setMuteAudio(e.target.checked)}
                className="accent-amber-500 w-4 h-4 rounded"
              />
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
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Trim Opslaan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
