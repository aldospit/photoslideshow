import React, { useState } from 'react';
import {
  Film,
  Image as ImageIcon,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  HardDrive,
  MessageSquare,
  Play,
} from 'lucide-react';
import { ProjectItem } from '../types';

interface AlbumViewProps {
  items: ProjectItem[];
  coverImage?: string;
  onSetCoverImage: (url: string) => void;
  onUpdateCaption: (itemId: string, caption: string) => void;
}

export const AlbumView: React.FC<AlbumViewProps> = ({
  items,
  coverImage,
  onSetCoverImage,
  onUpdateCaption,
}) => {
  const [filter, setFilter] = useState<'all' | 'photos' | 'videos'>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionInput, setCaptionInput] = useState('');

  const filteredItems = items.filter((item) => {
    if (filter === 'photos') return item.type === 'PHOTO';
    if (filter === 'videos') return item.type === 'VIDEO';
    return true;
  });

  const activeLightboxItem =
    lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setCaptionInput(filteredItems[index]?.caption || '');
    setEditingCaption(false);
  };

  const handlePrev = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      const newIdx = lightboxIndex - 1;
      setLightboxIndex(newIdx);
      setCaptionInput(filteredItems[newIdx]?.caption || '');
    }
  };

  const handleNext = () => {
    if (lightboxIndex !== null && lightboxIndex < filteredItems.length - 1) {
      const newIdx = lightboxIndex + 1;
      setLightboxIndex(newIdx);
      setCaptionInput(filteredItems[newIdx]?.caption || '');
    }
  };

  const handleSaveCaption = () => {
    if (activeLightboxItem) {
      onUpdateCaption(activeLightboxItem.id, captionInput.trim());
      setEditingCaption(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl">
        <ImageIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">Nog geen foto’s in het album</h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
          Voeg foto’s en video’s toe om je album te bekijken.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Alle Media ({items.length})
          </button>
          <button
            onClick={() => setFilter('photos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'photos'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Foto's ({items.filter((i) => i.type === 'PHOTO').length})
          </button>
          <button
            onClick={() => setFilter('videos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'videos'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Video's ({items.filter((i) => i.type === 'VIDEO').length})
          </button>
        </div>

        <div className="text-xs text-zinc-400">
          Klik op een foto of video voor de lightbox weergave
        </div>
      </div>

      {/* Grid of items */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredItems.map((item, index) => {
          const isCover = coverImage === (item.thumbnailUrl || item.url);

          return (
            <div
              key={item.id}
              onClick={() => openLightbox(index)}
              className="group relative aspect-square bg-zinc-900 rounded-xl overflow-hidden cursor-pointer border border-zinc-800 hover:border-amber-500/80 transition-all shadow-sm"
            >
              <img
                src={item.thumbnailUrl || item.url}
                alt={item.caption || item.filename}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-zinc-200 font-medium">
                    {item.type === 'VIDEO' ? 'Video' : 'Foto'}
                  </span>

                  {isCover && (
                    <span
                      title="Omslagfoto van project"
                      className="p-1 rounded bg-amber-500 text-zinc-950"
                    >
                      <Star className="w-3 h-3 fill-current" />
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white truncate">
                    {item.filename}
                  </div>
                  {item.caption && (
                    <div className="text-[11px] text-zinc-300 truncate">
                      {item.caption}
                    </div>
                  )}
                </div>
              </div>

              {/* Badges always visible */}
              {item.type === 'VIDEO' && (
                <div className="absolute bottom-2 left-2 p-1 rounded-md bg-black/75 backdrop-blur-sm text-white">
                  <Play className="w-3.5 h-3.5 fill-current text-rose-400 ml-0.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {activeLightboxItem && lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 select-none">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white z-10">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-400">
                {lightboxIndex + 1} / {filteredItems.length}
              </span>
              <span className="text-sm font-semibold truncate max-w-sm">
                {activeLightboxItem.filename}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  onSetCoverImage(activeLightboxItem.thumbnailUrl || activeLightboxItem.url)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-semibold border border-zinc-700 transition-colors"
                title="Stel in als omslagfoto van het project"
              >
                <Star className="w-3.5 h-3.5" />
                <span>Als Omslagfoto</span>
              </button>

              <button
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Media Center */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden my-4">
            {activeLightboxItem.type === 'PHOTO' ? (
              <img
                src={activeLightboxItem.url}
                alt={activeLightboxItem.caption || activeLightboxItem.filename}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <video
                src={activeLightboxItem.url}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-lg shadow-2xl"
              />
            )}

            {/* Prev / Next buttons */}
            <button
              onClick={handlePrev}
              disabled={lightboxIndex === 0}
              className="absolute left-2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white disabled:opacity-20 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              disabled={lightboxIndex === filteredItems.length - 1}
              className="absolute right-2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white disabled:opacity-20 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Caption & Metadata */}
          <div className="max-w-2xl mx-auto w-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-3.5 rounded-2xl text-xs text-zinc-300 flex items-center justify-between gap-4">
            {editingCaption ? (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={captionInput}
                  onChange={(e) => setCaptionInput(e.target.value)}
                  placeholder="Bijschrift voor deze foto..."
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCaption()}
                />
                <button
                  onClick={handleSaveCaption}
                  className="px-3 py-1.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-lg"
                >
                  Opslaan
                </button>
              </div>
            ) : (
              <div
                onClick={() => setEditingCaption(true)}
                className="flex-1 cursor-pointer hover:text-amber-300 flex items-center gap-2 truncate"
              >
                <MessageSquare className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="truncate">
                  {activeLightboxItem.caption || 'Klik om een bijschrift toe te voegen...'}
                </span>
              </div>
            )}

            <div className="text-[11px] text-zinc-500 shrink-0">
              {activeLightboxItem.type === 'PHOTO' ? 'Foto' : 'Video'} •{' '}
              {activeLightboxItem.durationSeconds?.toFixed(1)}s
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
