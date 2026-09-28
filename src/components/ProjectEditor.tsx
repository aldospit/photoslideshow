import React, { useState } from 'react';
import {
  ArrowLeft,
  Play,
  Plus,
  Music,
  Settings,
  Share2,
  Film,
  Image as ImageIcon,
  Clock,
  Download,
  Video,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';
import {
  Project,
  ProjectItem,
  GoogleAuthStatus,
  AudioTrack,
  ProjectSettings,
} from '../types';
import { TimelineView } from './TimelineView';
import { AlbumView } from './AlbumView';
import { MediaPickerModal } from './MediaPickerModal';
import { AudioModal } from './AudioModal';
import { SettingsModal } from './SettingsModal';
import { ShareModal } from './ShareModal';
import { VideoTrimModal } from './VideoTrimModal';
import { VideoExportModal } from './VideoExportModal';

interface ProjectEditorProps {
  project: Project;
  authStatus: GoogleAuthStatus | null;
  onBack: () => void;
  onUpdateProject: (updated: Project) => void;
  onPlaySlideshow: (initialSlideIndex?: number) => void;
  onOpenGoogleSetup: () => void;
}

export const ProjectEditor: React.FC<ProjectEditorProps> = ({
  project,
  authStatus,
  onBack,
  onUpdateProject,
  onPlaySlideshow,
  onOpenGoogleSetup,
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'album'>('timeline');

  // Modals state
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTrimItem, setActiveTrimItem] = useState<ProjectItem | null>(null);

  // Total duration calculation
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

  // Handlers for modifying project
  const handleItemsChange = (newItems: ProjectItem[]) => {
    // If coverImage is empty and we have items, set the first as cover
    let cover = project.coverImage;
    if (!cover && newItems.length > 0) {
      cover = newItems[0].thumbnailUrl || newItems[0].url;
    }
    onUpdateProject({
      ...project,
      items: newItems,
      coverImage: cover,
    });
  };

  const handleAddItems = (addedItems: ProjectItem[]) => {
    handleItemsChange([...project.items, ...addedItems]);
  };

  const handleSaveAudio = (audio: AudioTrack | null) => {
    onUpdateProject({
      ...project,
      audio,
    });
  };

  const handleSaveSettings = (
    title: string,
    description: string,
    settings: ProjectSettings
  ) => {
    onUpdateProject({
      ...project,
      title,
      description,
      settings,
    });
  };

  const handleSaveTrim = (updatedItem: ProjectItem) => {
    const newItems = project.items.map((it) =>
      it.id === updatedItem.id ? updatedItem : it
    );
    handleItemsChange(newItems);
  };

  const handleSetCover = (url: string) => {
    onUpdateProject({
      ...project,
      coverImage: url,
    });
  };

  const handleUpdateCaption = (itemId: string, caption: string) => {
    const newItems = project.items.map((it) =>
      it.id === itemId ? { ...it, caption } : it
    );
    handleItemsChange(newItems);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        {/* Row 1: Back + Title + Live Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700/60"
              title="Terug naar alle projecten"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight truncate max-w-md sm:max-w-xl">
                {project.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                <span>{project.items.length} items</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-300 font-mono font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Totale speelduur: {formatDuration(totalDurationSeconds)}</span>
                </span>
                {project.audio && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Music className="w-3 h-3" />
                      <span>{project.audio.filename}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Play CTA */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => onPlaySlideshow(0)}
              disabled={project.items.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-30"
              title="Bekijk de slideshow schermvullend"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Start Slideshow</span>
            </button>
          </div>
        </div>

        {/* Row 2: Mode Toggle & Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
          {/* Mode Switch: Tijdlijn vs Album */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Slideshow Tijdlijn</span>
            </button>
            <button
              onClick={() => setViewMode('album')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'album'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Album Galerij</span>
            </button>
          </div>

          {/* Actions: Add Media, Music, Settings, Share, Export */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsMediaPickerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Media Toevoegen</span>
            </button>

            <button
              onClick={() => setIsAudioModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                project.audio
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700/60 text-zinc-300'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Muziek</span>
            </button>

            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700/60 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instellingen</span>
            </button>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                project.isShared
                  ? 'bg-indigo-950/40 border-indigo-800 text-indigo-300'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700/60 text-zinc-300'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Delen</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              disabled={project.items.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700/60 transition-colors disabled:opacity-40"
              title="Exporteer als video"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'timeline' ? (
        <TimelineView
          projectId={project.id}
          items={project.items}
          defaultPhotoDuration={project.settings.defaultPhotoDuration}
          onUpdateItems={handleItemsChange}
          onOpenTrimModal={(item) => setActiveTrimItem(item)}
          onPlayFromIndex={(index) => onPlaySlideshow(index)}
        />
      ) : (
        <AlbumView
          items={project.items}
          coverImage={project.coverImage}
          onSetCoverImage={handleSetCover}
          onUpdateCaption={handleUpdateCaption}
        />
      )}

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        projectId={project.id}
        existingItems={project.items}
        defaultPhotoDuration={project.settings.defaultPhotoDuration}
        authStatus={authStatus}
        onOpenGoogleSetup={onOpenGoogleSetup}
        onItemsAdded={handleAddItems}
      />

      {/* Audio Modal */}
      <AudioModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        projectId={project.id}
        currentAudio={project.audio}
        onSaveAudio={handleSaveAudio}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        project={project}
        onSaveSettings={handleSaveSettings}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        project={project}
        onUpdateProject={onUpdateProject}
      />

      {/* Video Trim Modal */}
      {activeTrimItem && (
        <VideoTrimModal
          isOpen={Boolean(activeTrimItem)}
          onClose={() => setActiveTrimItem(null)}
          item={activeTrimItem}
          onSave={handleSaveTrim}
        />
      )}

      {/* Video Export Modal */}
      <VideoExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
      />
    </div>
  );
};
