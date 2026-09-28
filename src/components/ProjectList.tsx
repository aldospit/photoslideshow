import React, { useState } from 'react';
import {
  Film,
  Plus,
  Play,
  Copy,
  Trash2,
  Share2,
  Clock,
  Image as ImageIcon,
  Music,
  Search,
  ExternalLink,
  MoreVertical,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { ProjectSummary } from '../types';

interface ProjectListProps {
  projects: ProjectSummary[];
  onSelectProject: (id: string) => void;
  onPlayProject: (id: string) => void;
  onCreateProject: (title: string, description: string) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onOpenShareModal: (id: string) => void;
  onOpenGoogleSetup: () => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  onSelectProject,
  onPlayProject,
  onCreateProject,
  onDuplicateProject,
  onDeleteProject,
  onOpenShareModal,
  onOpenGoogleSetup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateProject(newTitle.trim() || 'Nieuw FotoShow Project', newDescription.trim());
    setNewTitle('');
    setNewDescription('');
    setIsCreateModalOpen(false);
  };

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.round(totalSeconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Mijn Slideshows &amp; Fotoalbums
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Kies foto's en video's via de officiële Google Photos Picker of importeer vanaf je apparaat.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-zinc-950 font-bold text-sm rounded-xl shadow-lg hover:shadow-amber-500/10 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nieuw Project Maken</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Zoek in projecten..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="text-xs text-zinc-400">
          {projects.length} {projects.length === 1 ? 'project' : 'projecten'} in totaal
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-20 px-4 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Film className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">
              {searchQuery ? 'Geen overeenkomende projecten gevonden' : 'Nog geen projecten aangemaakt'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Maak een nieuw album aan en kies direct foto's en video's via Google Photos of upload vanaf je apparaat.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Start Je Eerste Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl overflow-hidden shadow-lg flex flex-col group transition-all"
            >
              {/* Cover Image & Quick Play */}
              <div
                onClick={() => onSelectProject(proj.id)}
                className="relative aspect-video bg-zinc-950 cursor-pointer overflow-hidden group/cover"
              >
                {proj.coverImage ? (
                  <img
                    src={proj.coverImage}
                    alt={proj.title}
                    className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-600 space-y-2">
                    <ImageIcon className="w-10 h-10" />
                    <span className="text-xs">Geen media</span>
                  </div>
                )}

                {/* Gradient shade */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* Duration Badge */}
                <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-amber-300 font-mono text-xs font-semibold flex items-center gap-1.5 border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{formatDuration(proj.totalDurationSeconds)}</span>
                </div>

                {/* Shared badge */}
                {proj.isShared && (
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[11px] font-semibold flex items-center gap-1 shadow">
                    <Share2 className="w-3 h-3" />
                    <span>Gedeeld</span>
                  </div>
                )}

                {/* Big Hover Play Button */}
                {proj.itemCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayProject(proj.id);
                    }}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-all transform scale-90 group-hover/cover:scale-100 shadow-xl"
                    title="Start slideshow direct schermvullend"
                  >
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </button>
                )}
              </div>

              {/* Project Info */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2
                      onClick={() => onSelectProject(proj.id)}
                      className="font-bold text-white text-base hover:text-amber-400 cursor-pointer line-clamp-1 transition-colors"
                      title={proj.title}
                    >
                      {proj.title}
                    </h2>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {proj.description || 'Geen beschrijving opgegeven.'}
                  </p>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-3 text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
                  <span className="flex items-center gap-1 text-zinc-300">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>{proj.photoCount} foto's</span>
                  </span>
                  {proj.videoCount > 0 && (
                    <span className="flex items-center gap-1 text-zinc-300">
                      <Film className="w-3.5 h-3.5 text-rose-400" />
                      <span>{proj.videoCount} video's</span>
                    </span>
                  )}
                  {proj.hasAudio && (
                    <span className="flex items-center gap-1 text-emerald-400 ml-auto" title="Achtergrondmuziek ingesteld">
                      <Music className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Muziek</span>
                    </span>
                  )}
                </div>

                {/* Action Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
                  <button
                    onClick={() => onSelectProject(proj.id)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-lg transition-colors"
                  >
                    Bewerken
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onPlayProject(proj.id)}
                      disabled={proj.itemCount === 0}
                      className="p-1.5 text-zinc-400 hover:text-amber-400 rounded-lg hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                      title="Slideshow afspelen"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      onClick={() => onOpenShareModal(proj.id)}
                      className="p-1.5 text-zinc-400 hover:text-indigo-400 rounded-lg hover:bg-zinc-800 transition-colors"
                      title="Delen beheren"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDuplicateProject(proj.id)}
                      className="p-1.5 text-zinc-400 hover:text-amber-400 rounded-lg hover:bg-zinc-800 transition-colors"
                      title="Project kopiëren"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteProject(proj.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors"
                      title="Project en bestanden verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-amber-400" />
              <span>Nieuw Slideshow Project Maken</span>
            </h2>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Projecttitel
                </label>
                <input
                  type="text"
                  placeholder="bv. Familiefeest &amp; Verjaardag"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Beschrijving (optioneel)
                </label>
                <textarea
                  placeholder="Korte toelichting of herinnering..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-lg"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg shadow"
                >
                  Project Aanmaken
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
