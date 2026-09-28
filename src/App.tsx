/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { Project, ProjectSummary, GoogleAuthStatus, StorageStats } from './types';
import { Navbar } from './components/Navbar';
import { ProjectList } from './components/ProjectList';
import { ProjectEditor } from './components/ProjectEditor';
import { SlideshowPlayer } from './components/SlideshowPlayer';
import { SharedProjectViewer } from './components/SharedProjectViewer';
import { GoogleSetupModal } from './components/GoogleSetupModal';
import { StorageModal } from './components/StorageModal';
import { ShareModal } from './components/ShareModal';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [sharedProject, setSharedProject] = useState<Project | null>(null);
  const [authStatus, setAuthStatus] = useState<GoogleAuthStatus | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  // Slideshow Player state
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false);
  const [slideshowSlideIndex, setSlideshowSlideIndex] = useState(0);

  // Global Modals
  const [isGoogleSetupOpen, setIsGoogleSetupOpen] = useState(false);
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [shareModalProjectId, setShareModalProjectId] = useState<string | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Load initial data
  const loadProjects = useCallback(async () => {
    try {
      const projs = await api.getProjects();
      setProjects(projs);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
    }
  }, []);

  const loadAuthStatus = useCallback(async () => {
    try {
      const status = await api.getAuthStatus();
      setAuthStatus(status);
    } catch (err: any) {
      console.error('Error fetching auth status:', err);
    }
  }, []);

  const loadStorageStats = useCallback(async () => {
    try {
      const stats = await api.getStorageStats();
      setStorageStats(stats);
    } catch (err: any) {
      console.error('Error fetching storage stats:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      // 1. Check for share token in URL query
      const urlParams = new URLSearchParams(window.location.search);
      const shareToken = urlParams.get('share');
      if (shareToken) {
        try {
          const shared = await api.getSharedProject(shareToken);
          setSharedProject(shared);
          setIsLoading(false);
          return;
        } catch (err: any) {
          showNotification('Gedeelde link is ongeldig of ingetrokken.', 'error');
        }
      }

      // 2. Check for auth callbacks
      if (urlParams.get('auth_success') === 'true') {
        showNotification('Google Photos account succesvol gekoppeld!', 'success');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (urlParams.get('auth_error')) {
        showNotification(`Google autorisatie mislukt: ${urlParams.get('auth_error')}`, 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      await Promise.all([loadProjects(), loadAuthStatus(), loadStorageStats()]);
      setIsLoading(false);
    };

    init();
  }, [loadProjects, loadAuthStatus, loadStorageStats]);

  // Load full project when entering editor
  const handleSelectProject = async (id: string) => {
    try {
      setIsLoading(true);
      const proj = await api.getProject(id);
      setCurrentProject(proj);
      setCurrentProjectId(proj.id);
    } catch (err: any) {
      showNotification(`Kon project niet laden: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new project
  const handleCreateProject = async (title: string, description: string) => {
    try {
      setIsLoading(true);
      const newProj = await api.createProject(title, description);
      await loadProjects();
      await loadStorageStats();
      setCurrentProject(newProj);
      setCurrentProjectId(newProj.id);
      showNotification(`Project '${newProj.title}' aangemaakt!`, 'success');
    } catch (err: any) {
      showNotification(`Kon project niet aanmaken: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Duplicate project
  const handleDuplicateProject = async (id: string) => {
    try {
      setIsLoading(true);
      const duplicated = await api.duplicateProject(id);
      await loadProjects();
      await loadStorageStats();
      showNotification(`Project gekopieerd als '${duplicated.title}'`, 'success');
    } catch (err: any) {
      showNotification(`Kon project niet kopiëren: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete project
  const handleDeleteProject = async (id: string) => {
    const proj = projects.find((p) => p.id === id);
    const title = proj?.title || 'dit project';

    const confirmed = window.confirm(
      `Weet je zeker dat je '${title}' wilt verwijderen?\n\nAlle gekoppelde bestanden, opgeslagen foto's, video's en muziek worden definitief van de schijf gewist.`
    );
    if (!confirmed) return;

    try {
      setIsLoading(true);
      await api.deleteProject(id);
      await loadProjects();
      await loadStorageStats();
      if (currentProjectId === id) {
        setCurrentProjectId(null);
        setCurrentProject(null);
      }
      showNotification(`Project '${title}' en alle opgeslagen bestanden zijn verwijderd.`, 'success');
    } catch (err: any) {
      showNotification(`Fout bij verwijderen: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Update project in editor (persists immediately)
  const handleUpdateCurrentProject = async (updated: Project) => {
    setCurrentProject(updated);
    try {
      await api.updateProject(updated.id, {
        title: updated.title,
        description: updated.description,
        coverImage: updated.coverImage,
        items: updated.items,
        audio: updated.audio,
        settings: updated.settings,
        isShared: updated.isShared,
        shareToken: updated.shareToken,
      });
      // Refresh summaries in background
      loadProjects();
      loadStorageStats();
    } catch (err: any) {
      console.error('Failed to auto-save project:', err);
      showNotification('Fout bij automatisch opslaan van wijzigingen.', 'error');
    }
  };

  // Play project directly from dashboard
  const handlePlayProjectFromList = async (id: string) => {
    try {
      const proj = await api.getProject(id);
      setCurrentProject(proj);
      setSlideshowSlideIndex(0);
      setIsSlideshowPlaying(true);
    } catch (err: any) {
      showNotification('Kon slideshow niet starten: ' + err.message, 'error');
    }
  };

  // Disconnect Google
  const handleDisconnectGoogle = async () => {
    if (!window.confirm('Weet je zeker dat je de Google Photos koppeling wilt verbreken?')) return;
    try {
      await api.disconnectGoogle();
      await loadAuthStatus();
      showNotification('Google Photos koppeling is verbroken.', 'success');
    } catch (err: any) {
      showNotification('Fout bij ontkoppelen: ' + err.message, 'error');
    }
  };

  // If in shared viewer mode:
  if (sharedProject) {
    return (
      <SharedProjectViewer
        project={sharedProject}
        onExitViewer={() => {
          setSharedProject(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    );
  }

  const shareTargetProject = shareModalProjectId
    ? projects.find((p) => p.id === shareModalProjectId)
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col selection:bg-amber-500 selection:text-zinc-950 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-300">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2.5 backdrop-blur-md ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/90 border-rose-800 text-rose-200'
                : 'bg-zinc-900/90 border-zinc-700 text-zinc-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        authStatus={authStatus}
        storageStats={storageStats}
        currentView={currentProjectId ? 'editor' : 'projects'}
        currentProjectTitle={currentProject?.title}
        onNavigateHome={() => {
          setCurrentProjectId(null);
          setCurrentProject(null);
        }}
        onOpenGoogleSetup={() => setIsGoogleSetupOpen(true)}
        onOpenStorage={() => setIsStorageOpen(true)}
        onDisconnectGoogle={handleDisconnectGoogle}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {isLoading && !currentProject ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
            <div className="text-xs">FotoShow laden...</div>
          </div>
        ) : currentProjectId && currentProject ? (
          <ProjectEditor
            project={currentProject}
            authStatus={authStatus}
            onBack={() => {
              setCurrentProjectId(null);
              setCurrentProject(null);
              loadProjects();
            }}
            onUpdateProject={handleUpdateCurrentProject}
            onPlaySlideshow={(index = 0) => {
              setSlideshowSlideIndex(index);
              setIsSlideshowPlaying(true);
            }}
            onOpenGoogleSetup={() => setIsGoogleSetupOpen(true)}
          />
        ) : (
          <ProjectList
            projects={projects}
            onSelectProject={handleSelectProject}
            onPlayProject={handlePlayProjectFromList}
            onCreateProject={handleCreateProject}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
            onOpenShareModal={(id) => setShareModalProjectId(id)}
            onOpenGoogleSetup={() => setIsGoogleSetupOpen(true)}
          />
        )}
      </main>

      {/* Fullscreen Slideshow Player */}
      {isSlideshowPlaying && currentProject && (
        <SlideshowPlayer
          project={currentProject}
          initialSlideIndex={slideshowSlideIndex}
          onClose={() => setIsSlideshowPlaying(false)}
        />
      )}

      {/* Google Setup Modal */}
      <GoogleSetupModal
        isOpen={isGoogleSetupOpen}
        onClose={() => setIsGoogleSetupOpen(false)}
        authStatus={authStatus}
        onRefreshAuth={loadAuthStatus}
      />

      {/* Storage Management Modal */}
      <StorageModal
        isOpen={isStorageOpen}
        onClose={() => setIsStorageOpen(false)}
        storageStats={storageStats}
        currentProject={currentProject}
        onRefreshProject={() => {
          if (currentProjectId) handleSelectProject(currentProjectId);
        }}
        onRefreshStats={loadStorageStats}
      />

      {/* Share Modal from Project List */}
      {shareTargetProject && (
        <ShareModal
          isOpen={Boolean(shareModalProjectId)}
          onClose={() => setShareModalProjectId(null)}
          project={
            currentProject?.id === shareTargetProject.id
              ? currentProject
              : (shareTargetProject as any)
          }
          onUpdateProject={(updated) => {
            loadProjects();
            if (currentProject?.id === updated.id) {
              setCurrentProject(updated);
            }
          }}
        />
      )}
    </div>
  );
}
