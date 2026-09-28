import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  X,
  Volume2,
  VolumeX,
  Volume1,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Project, ProjectItem, TransitionType } from '../types';

interface SlideshowPlayerProps {
  project: Project;
  initialSlideIndex?: number;
  onClose: () => void;
}

export const SlideshowPlayer: React.FC<SlideshowPlayerProps> = ({
  project,
  initialSlideIndex = 0,
  onClose,
}) => {
  const { items, audio, settings } = project;

  const [currentIndex, setCurrentIndex] = useState(
    Math.min(initialSlideIndex, Math.max(0, items.length - 1))
  );
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentSlideElapsed, setCurrentSlideElapsed] = useState(0);

  // Audio state
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState(audio?.volume ?? 0.8);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const slideTimerRef = useRef<any>(null);

  const currentItem: ProjectItem | undefined = items[currentIndex];

  // Calculate current item duration
  const currentDuration = currentItem
    ? currentItem.type === 'VIDEO'
      ? currentItem.videoTrim
        ? currentItem.videoTrim.end - currentItem.videoTrim.start
        : currentItem.durationSeconds || 10
      : currentItem.durationSeconds || settings.defaultPhotoDuration
    : settings.defaultPhotoDuration;

  // Total duration calculation
  const totalDuration = items.reduce((acc, item) => {
    if (item.type === 'VIDEO') {
      return (
        acc +
        (item.videoTrim
          ? item.videoTrim.end - item.videoTrim.start
          : item.durationSeconds || 10)
      );
    }
    return acc + (item.durationSeconds || settings.defaultPhotoDuration);
  }, 0);

  // Handle next / prev slide
  const goToNextSlide = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev < items.length - 1) {
        return prev + 1;
      }
      if (settings.loopSlideshow) {
        return 0;
      }
      setIsPlaying(false);
      return prev;
    });
    setCurrentSlideElapsed(0);
  }, [items.length, settings.loopSlideshow]);

  const goToPrevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
    setCurrentSlideElapsed(0);
  }, []);

  // Timer loop for photo slides
  useEffect(() => {
    if (!isPlaying || !currentItem) return;

    if (currentItem.type === 'PHOTO') {
      const startTime = Date.now() - currentSlideElapsed * 1000;
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setCurrentSlideElapsed(elapsed);

        if (elapsed >= currentDuration) {
          clearInterval(interval);
          goToNextSlide();
        }
      }, 50);

      slideTimerRef.current = interval;
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentIndex, currentItem, currentDuration, goToNextSlide]);

  // Video playback management
  useEffect(() => {
    if (!currentItem || currentItem.type !== 'VIDEO' || !videoRef.current) return;

    const vid = videoRef.current;
    const start = currentItem.videoTrim?.start ?? 0;
    const end = currentItem.videoTrim?.end ?? (currentItem.durationSeconds || 10);

    vid.currentTime = start;
    vid.muted = Boolean(currentItem.muteAudio) || isAudioMuted;

    if (isPlaying) {
      vid.play().catch((e) => console.warn('Video play error:', e));
    } else {
      vid.pause();
    }

    const handleTimeUpdate = () => {
      const cur = vid.currentTime;
      setCurrentSlideElapsed(Math.max(0, cur - start));
      if (cur >= end) {
        vid.pause();
        goToNextSlide();
      }
    };

    vid.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      vid.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [currentIndex, currentItem, isPlaying, isAudioMuted, goToNextSlide]);

  // Background Music & Audio Ducking management
  useEffect(() => {
    if (!audioRef.current || !audio) return;
    const music = audioRef.current;

    if (isPlaying) {
      // Check if current item is a video with sound -> Duck music
      const isVideoWithSound =
        currentItem?.type === 'VIDEO' && !currentItem.muteAudio && !isAudioMuted;

      const targetVolume = isAudioMuted
        ? 0
        : isVideoWithSound && audio.duckOnVideo
        ? audio.duckVolume * masterVolume
        : audio.volume * masterVolume;

      music.volume = Math.max(0, Math.min(1, targetVolume));
      music.loop = audio.loop;

      music.play().catch((e) => console.warn('Music play blocked:', e));
    } else {
      music.pause();
    }
  }, [isPlaying, currentIndex, currentItem, audio, isAudioMuted, masterVolume]);

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen?.();
        } else {
          onClose();
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsAudioMuted((m) => !m);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, goToNextSlide, goToPrevSlide, onClose]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Auto-hide controls on mouse idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3200);
  };

  // Determine transition class
  const activeTransition =
    currentItem?.transition && currentItem.transition !== 'default'
      ? currentItem.transition
      : settings.defaultTransition;

  const getTransitionStyle = (type: TransitionType) => {
    switch (type) {
      case 'slide':
        return 'transition-transform duration-700 ease-in-out';
      case 'zoom':
        return 'transition-all duration-700 ease-out';
      case 'none':
        return '';
      case 'fade':
      default:
        return 'transition-opacity duration-700 ease-in-out';
    }
  };

  // Ken Burns style calculation
  const getKenBurnsStyle = () => {
    if (!settings.kenBurnsEnabled || currentItem?.type !== 'PHOTO') {
      return {};
    }
    // Subtly alternate zoom in and zoom out depending on slide index
    const isEven = currentIndex % 2 === 0;
    const scale = isEven ? 1.08 : 1.02;
    const translateX = isEven ? '1.5%' : '-1.5%';
    const translateY = isEven ? '-1%' : '1%';

    return {
      transform: `scale(${scale}) translate(${translateX}, ${translateY})`,
      transition: `transform ${currentDuration}s ease-in-out`,
    };
  };

  if (!currentItem) {
    return (
      <div className="fixed inset-0 z-50 bg-black text-white flex flex-col items-center justify-center p-4">
        <p className="text-zinc-400 mb-4">Geen media in dit project gevonden.</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-semibold"
        >
          Terug naar editor
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black select-none overflow-hidden flex flex-col items-center justify-center cursor-default"
    >
      {/* Background Audio element */}
      {audio && <audio ref={audioRef} src={audio.url} />}

      {/* Media Canvas Area */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {currentItem.type === 'PHOTO' ? (
          <div
            key={currentItem.id}
            className={`w-full h-full flex items-center justify-center overflow-hidden ${getTransitionStyle(
              activeTransition
            )}`}
          >
            <img
              src={currentItem.url}
              alt={currentItem.caption || currentItem.filename}
              style={getKenBurnsStyle()}
              className="max-h-full max-w-full w-full h-full object-contain pointer-events-none transform will-change-transform"
            />
          </div>
        ) : (
          <div
            key={currentItem.id}
            className="w-full h-full flex items-center justify-center"
          >
            <video
              ref={videoRef}
              src={currentItem.url}
              playsInline
              className="max-h-full max-w-full w-full h-full object-contain pointer-events-none"
            />
          </div>
        )}

        {/* Captions Overlay */}
        {settings.showCaptions && currentItem.caption && (
          <div
            className={`absolute bottom-20 left-1/2 -translate-x-1/2 max-w-xl px-5 py-2.5 rounded-2xl bg-black/65 backdrop-blur-md border border-white/10 text-white text-center text-sm shadow-xl transition-opacity duration-300 ${
              showControls ? 'opacity-90' : 'opacity-80'
            }`}
          >
            {currentItem.caption}
          </div>
        )}
      </div>

      {/* Top Bar Overlay */}
      <div
        className={`absolute top-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between text-white transition-opacity duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-black/50 hover:bg-white/20 backdrop-blur-md transition-colors"
            title="Sluiten (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-sm sm:text-base tracking-tight text-white drop-shadow">
              {project.title}
            </h1>
            <div className="text-[11px] text-zinc-300 flex items-center gap-2">
              <span>
                Slide {currentIndex + 1} van {items.length}
              </span>
              <span>•</span>
              <span className="truncate max-w-[200px]">{currentItem.filename}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio volume & mute */}
          {audio && (
            <button
              onClick={() => setIsAudioMuted((m) => !m)}
              className="p-2.5 rounded-full bg-black/50 hover:bg-white/20 backdrop-blur-md transition-colors"
              title={isAudioMuted ? 'Geluid aanzetten (M)' : 'Geluid dempen (M)'}
            >
              {isAudioMuted ? (
                <VolumeX className="w-5 h-5 text-rose-400" />
              ) : (
                <Volume2 className="w-5 h-5 text-amber-400" />
              )}
            </button>
          )}

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-full bg-black/50 hover:bg-white/20 backdrop-blur-md transition-colors"
            title={isFullscreen ? 'Schermvullend afsluiten (F)' : 'Schermvullend afspelen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Bottom Controls Overlay */}
      <div
        className={`absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-3 transition-opacity duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline progress line with individual slide markers */}
        <div className="relative w-full h-1.5 bg-white/20 hover:h-2 rounded-full cursor-pointer transition-all overflow-hidden flex">
          {items.map((it, idx) => {
            const isPast = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const progressRatio = isCurrent
              ? Math.min(1, currentSlideElapsed / currentDuration)
              : isPast
              ? 1
              : 0;

            return (
              <div
                key={it.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                  setCurrentSlideElapsed(0);
                }}
                title={`Ga naar slide ${idx + 1}: ${it.filename}`}
                className="flex-1 h-full relative border-r border-black/40 last:border-none"
              >
                <div
                  className="h-full bg-amber-400 transition-all duration-75"
                  style={{ width: `${progressRatio * 100}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Playback Controls Row */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left: Timing display */}
          <div className="font-mono text-zinc-300 w-28">
            {currentSlideElapsed.toFixed(1)}s / {currentDuration.toFixed(1)}s
          </div>

          {/* Center: Play/Pause/Prev/Next */}
          <div className="flex items-center gap-3">
            <button
              onClick={goToPrevSlide}
              disabled={currentIndex === 0}
              className="p-2.5 rounded-full bg-black/40 hover:bg-white/20 backdrop-blur-md transition-colors disabled:opacity-30"
              title="Vorige slide (Pijl links)"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              title={isPlaying ? 'Pauzeren (Spatie)' : 'Afspelen (Spatie)'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={goToNextSlide}
              className="p-2.5 rounded-full bg-black/40 hover:bg-white/20 backdrop-blur-md transition-colors"
              title="Volgende slide (Pijl rechts)"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>

          {/* Right: Quick settings indicator */}
          <div className="flex items-center justify-end gap-2 text-zinc-400 w-28 text-[11px]">
            {settings.kenBurnsEnabled && (
              <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-amber-300" title="Ken Burns actief">
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">Ken Burns</span>
              </span>
            )}
            <span className="capitalize">{activeTransition}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
