import React, { useState } from 'react';
import {
  Clock,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Film,
  Image as ImageIcon,
  Scissors,
  Volume2,
  VolumeX,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { ProjectItem, TransitionType } from '../types';
import { api } from '../services/api';

interface TimelineViewProps {
  projectId: string;
  items: ProjectItem[];
  defaultPhotoDuration: number;
  onUpdateItems: (updatedItems: ProjectItem[]) => void;
  onOpenTrimModal: (item: ProjectItem) => void;
  onPlayFromIndex: (index: number) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  projectId,
  items,
  defaultPhotoDuration,
  onUpdateItems,
  onOpenTrimModal,
  onPlayFromIndex,
}) => {
  const [editingDurationId, setEditingDurationId] = useState<string | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [captionInput, setCaptionInput] = useState('');
  const [isCachingItem, setIsCachingItem] = useState<string | null>(null);

  // Reorder items
  const moveItem = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);
    onUpdateItems(newItems);
  };

  // Duplicate item
  const duplicateItem = (index: number) => {
    const original = items[index];
    const copy: ProjectItem = {
      ...original,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      filename: `${original.filename.replace(/\.[^/.]+$/, '')} (Kopie)${original.filename.slice(original.filename.lastIndexOf('.')) || ''}`,
    };
    const newItems = [...items];
    newItems.splice(index + 1, 0, copy);
    onUpdateItems(newItems);
  };

  // Delete item
  const deleteItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onUpdateItems(newItems);
  };

  // Update duration
  const updateDuration = (id: string, newDuration: number) => {
    const newItems = items.map((it) =>
      it.id === id ? { ...it, durationSeconds: Math.max(1, newDuration) } : it
    );
    onUpdateItems(newItems);
  };

  // Update transition
  const updateTransition = (id: string, transition: TransitionType) => {
    const newItems = items.map((it) => (it.id === id ? { ...it, transition } : it));
    onUpdateItems(newItems);
  };

  // Save caption
  const handleSaveCaption = (id: string) => {
    const newItems = items.map((it) =>
      it.id === id ? { ...it, caption: captionInput.trim() || undefined } : it
    );
    onUpdateItems(newItems);
    setEditingCaptionId(null);
  };

  // Cache single item locally
  const handleCacheItem = async (item: ProjectItem) => {
    if (!item.baseUrl) return;
    setIsCachingItem(item.id);
    try {
      const downloadUrl = item.type === 'VIDEO' ? `${item.baseUrl}=dv` : `${item.baseUrl}=w1920-h1080`;
      const res = await api.cacheItemLocally(projectId, downloadUrl, item.filename, item.mimeType);
      const newItems = items.map((it) =>
        it.id === item.id ? { ...it, url: res.localUrl, cachedLocally: true, sizeBytes: res.sizeBytes } : it
      );
      onUpdateItems(newItems);
    } catch (e) {
      console.error('Failed to cache item:', e);
    } finally {
      setIsCachingItem(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl">
        <ImageIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">Nog geen foto’s of video’s in dit project</h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
          Klik bovenaan op ‘Media Toevoegen’ om materiaal uit Google Photos of vanaf je apparaat te importeren.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Items list / filmstrip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item, index) => {
          const isPhoto = item.type === 'PHOTO';
          const duration = isPhoto
            ? item.durationSeconds || defaultPhotoDuration
            : item.videoTrim
            ? item.videoTrim.end - item.videoTrim.start
            : item.durationSeconds || 10;

          return (
            <div
              key={item.id}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl overflow-hidden shadow-md flex flex-col group transition-all"
            >
              {/* Media Preview Box */}
              <div
                onClick={() => onPlayFromIndex(index)}
                className="relative aspect-video bg-zinc-950 cursor-pointer overflow-hidden group/thumb"
                title="Klik om slideshow vanaf deze slide te starten"
              >
                <img
                  src={item.thumbnailUrl || item.url}
                  alt={item.caption || item.filename}
                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                />

                {/* Index badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white font-mono text-xs font-bold border border-white/10">
                  #{index + 1}
                </div>

                {/* Type badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-zinc-200 text-[11px] font-medium border border-white/10">
                  {isPhoto ? (
                    <>
                      <ImageIcon className="w-3 h-3 text-amber-400" />
                      <span>Foto</span>
                    </>
                  ) : (
                    <>
                      <Film className="w-3 h-3 text-rose-400" />
                      <span>Video</span>
                    </>
                  )}
                </div>

                {/* Duration indicator pill */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-amber-300 font-mono text-[11px] font-semibold flex items-center gap-1 border border-amber-500/20">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{duration.toFixed(1)}s</span>
                </div>

                {/* Local storage badge */}
                <div className="absolute bottom-2 right-2">
                  {item.cachedLocally || item.url.startsWith('/api/media/') ? (
                    <span
                      title="Lokaal opgeslagen (blijvend beschikbaar)"
                      className="p-1 rounded-md bg-black/80 text-emerald-400 inline-flex items-center"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCacheItem(item);
                      }}
                      disabled={isCachingItem === item.id}
                      title="Tijdelijke Google link. Klik om nu lokaal op te slaan."
                      className="p-1 rounded-md bg-black/80 text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 text-[10px]"
                    >
                      <Download className="w-3 h-3" />
                      <span>Cachen</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Card Details & Settings */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                {/* Filename & Caption */}
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-white truncate" title={item.filename}>
                    {item.filename}
                  </div>

                  {editingCaptionId === item.id ? (
                    <div className="flex gap-1 pt-1">
                      <input
                        type="text"
                        value={captionInput}
                        onChange={(e) => setCaptionInput(e.target.value)}
                        placeholder="Voeg bijschrift toe..."
                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveCaption(item.id)}
                      />
                      <button
                        onClick={() => handleSaveCaption(item.id)}
                        className="px-2 py-1 bg-amber-500 text-zinc-950 text-xs font-semibold rounded"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setEditingCaptionId(item.id);
                        setCaptionInput(item.caption || '');
                      }}
                      className="text-[11px] text-zinc-400 hover:text-amber-300 cursor-pointer truncate flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3 shrink-0" />
                      <span>{item.caption || 'Bijschrift toevoegen...'}</span>
                    </div>
                  )}
                </div>

                {/* Controls per item: Duration & Transitions */}
                <div className="space-y-2 pt-2 border-t border-zinc-800 text-xs">
                  {isPhoto ? (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-[11px]">Duur foto:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="range"
                          min="2"
                          max="15"
                          step="0.5"
                          value={item.durationSeconds || defaultPhotoDuration}
                          onChange={(e) =>
                            updateDuration(item.id, parseFloat(e.target.value))
                          }
                          className="w-16 accent-amber-500 h-1 bg-zinc-700 rounded-lg cursor-pointer"
                        />
                        <span className="font-mono text-zinc-300 text-[11px] w-8 text-right">
                          {(item.durationSeconds || defaultPhotoDuration).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onOpenTrimModal(item)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-colors"
                      >
                        <Scissors className="w-3 h-3 text-rose-400" />
                        <span>Trim video</span>
                      </button>

                      <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                        {item.muteAudio ? (
                          <span className="flex items-center gap-0.5 text-zinc-500">
                            <VolumeX className="w-3 h-3" /> Gedempt
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-emerald-400">
                            <Volume2 className="w-3 h-3" /> Audio aan
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transition selector */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Overgang:</span>
                    <select
                      value={item.transition || 'default'}
                      onChange={(e) => updateTransition(item.id, e.target.value as any)}
                      className="bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-300 text-[11px] focus:outline-none"
                    >
                      <option value="default">Standaard</option>
                      <option value="fade">Vervagen (Fade)</option>
                      <option value="slide">Schuiven (Slide)</option>
                      <option value="zoom">Zacht zoomen</option>
                      <option value="none">Geen</option>
                    </select>
                  </div>
                </div>

                {/* Card Action Buttons (Move, Duplicate, Delete) */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveItem(index, 'left')}
                      disabled={index === 0}
                      className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 disabled:opacity-20 transition-colors"
                      title="Naar voren verplaatsen"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'right')}
                      disabled={index === items.length - 1}
                      className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 disabled:opacity-20 transition-colors"
                      title="Naar achteren verplaatsen"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => duplicateItem(index)}
                      className="p-1 text-zinc-400 hover:text-amber-400 rounded hover:bg-zinc-800 transition-colors"
                      title="Item dupliceren"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteItem(index)}
                      className="p-1 text-zinc-400 hover:text-rose-400 rounded hover:bg-zinc-800 transition-colors"
                      title="Item verwijderen uit project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
