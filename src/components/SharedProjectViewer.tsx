import React, { useState } from 'react';
import { Play, Film, Image as ImageIcon, Clock, Music, Lock, Maximize2, Shield } from 'lucide-react';
import { Project } from '../types';
import { AlbumView } from './AlbumView';
import { SlideshowPlayer } from './SlideshowPlayer';

interface SharedProjectViewerProps {
  project: Project;
  onExitViewer?: () => void;
}

export const SharedProjectViewer: React.FC<SharedProjectViewerProps> = ({
  project,
  onExitViewer,
}) => {
  const [isPlayingSlideshow, setIsPlayingSlideshow] = useState(false);

  const totalDurationSeconds = project.items.reduce((acc, item) => {
    if (item.type === 'VIDEO') {
      return (
        acc +
        (item.videoTrim
          ? item.videoTrim.end - item.videoTrim.start
          : item.durationSeconds || 10)
      );
    }
    return acc + (item.durationSeconds || project.settings.defaultPhotoDuration);
  }, 0);

  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.round(totalSecs % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Top Banner for Viewer */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 sm:px-8 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg bg-gradient-to-r from-amber-400 via-rose-300 to-amber-200 bg-clip-text text-transparent">
              FotoShow
            </span>
            <span className="ml-2 px-2 py-0.5 text-[11px] font-medium bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
              Gedeeld Album
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 text-xs border border-zinc-700/60">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Alleen-lezen privélink</span>
          </div>

          {onExitViewer && (
            <button
              onClick={onExitViewer}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
            >
              Ga naar app
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 space-y-8">
        {/* Hero Card */}
        <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl p-6 sm:p-10 flex flex-col md:flex-row items-center gap-8">
          {/* Cover preview */}
          <div
            onClick={() => setIsPlayingSlideshow(true)}
            className="w-full md:w-80 aspect-video rounded-2xl overflow-hidden bg-zinc-950 shrink-0 relative cursor-pointer group shadow-lg"
          >
            {project.coverImage ? (
              <img
                src={project.coverImage}
                alt={project.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <ImageIcon className="w-12 h-12" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-xl transform scale-95 group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 fill-current ml-0.5" />
              </div>
            </div>
          </div>

          {/* Project Details & CTA */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                {project.title}
              </h1>
              {project.description && (
                <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 bg-zinc-800/60 px-3 py-1.5 rounded-lg border border-zinc-700/60">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>{project.items.length} foto's &amp; video's</span>
              </span>

              <span className="flex items-center gap-1.5 bg-zinc-800/60 px-3 py-1.5 rounded-lg border border-zinc-700/60">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Speelduur: {formatDuration(totalDurationSeconds)}</span>
              </span>

              {project.audio && (
                <span className="flex items-center gap-1.5 bg-zinc-800/60 px-3 py-1.5 rounded-lg border border-zinc-700/60 text-emerald-400">
                  <Music className="w-3.5 h-3.5" />
                  <span>Met achtergrondmuziek</span>
                </span>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsPlayingSlideshow(true)}
                disabled={project.items.length === 0}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-zinc-950 font-bold text-sm rounded-xl shadow-xl transition-all inline-flex items-center justify-center gap-2.5"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
                <span>Bekijk Volledige Slideshow</span>
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-amber-400" />
              <span>Foto's &amp; Video's in dit Album</span>
            </h2>
            <span className="text-xs text-zinc-400">{project.items.length} items</span>
          </div>

          <AlbumView
            items={project.items}
            coverImage={project.coverImage}
            onSetCoverImage={() => {}}
            onUpdateCaption={() => {}}
          />
        </div>
      </main>

      {/* Slideshow Player if active */}
      {isPlayingSlideshow && (
        <SlideshowPlayer
          project={project}
          initialSlideIndex={0}
          onClose={() => setIsPlayingSlideshow(false)}
        />
      )}
    </div>
  );
};
