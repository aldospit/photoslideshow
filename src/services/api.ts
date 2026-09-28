import { GoogleAuthStatus, PickerSession, Project, ProjectSummary, StorageStats } from '../types';

export const api = {
  // Auth & Config
  getAuthStatus: async (): Promise<GoogleAuthStatus> => {
    const res = await fetch('/api/auth/status');
    if (!res.ok) throw new Error('Fout bij ophalen Google status');
    return res.json();
  },

  saveAuthConfig: async (clientId: string, clientSecret: string, customRedirectUri?: string) => {
    const res = await fetch('/api/auth/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret, customRedirectUri }),
    });
    if (!res.ok) throw new Error('Fout bij opslaan configuratie');
    return res.json();
  },

  getGoogleAuthUrl: async (): Promise<{ authUrl: string; redirectUri: string }> => {
    const res = await fetch('/api/auth/google/url');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Kon Google autorisatie URL niet ophalen');
    }
    return res.json();
  },

  saveToken: async (token: string) => {
    const res = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Kon token niet verifiëren');
    }
    return res.json();
  },

  disconnectGoogle: async () => {
    const res = await fetch('/api/auth/disconnect', { method: 'POST' });
    if (!res.ok) throw new Error('Fout bij ontkoppelen');
    return res.json();
  },

  // Google Photos Picker API
  createPickerSession: async (): Promise<PickerSession> => {
    const res = await fetch('/api/photos/session/create', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Fout bij starten Google Photos Picker sessie');
    }
    return res.json();
  },

  pollPickerSessionStatus: async (sessionId: string): Promise<PickerSession> => {
    const res = await fetch(`/api/photos/session/${sessionId}/status`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Fout bij controleren sessiestatus');
    }
    return res.json();
  },

  fetchPickedMedia: async (sessionId: string): Promise<{ total: number; items: any[] }> => {
    const res = await fetch(`/api/photos/session/${sessionId}/media`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Fout bij ophalen geselecteerde media uit Google Photos');
    }
    return res.json();
  },

  cacheItemLocally: async (projectId: string, itemUrl: string, filename: string, mimeType: string) => {
    const res = await fetch('/api/photos/cache-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, itemUrl, filename, mimeType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Fout bij lokaal opslaan van bestand');
    }
    return res.json();
  },

  // Projects
  getProjects: async (): Promise<ProjectSummary[]> => {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Fout bij ophalen projecten');
    return res.json();
  },

  getProject: async (id: string): Promise<Project> => {
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok) throw new Error('Project niet gevonden');
    return res.json();
  },

  createProject: async (title?: string, description?: string): Promise<Project> => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
    if (!res.ok) throw new Error('Fout bij aanmaken project');
    return res.json();
  },

  updateProject: async (id: string, updates: Partial<Project>): Promise<Project> => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Fout bij bijwerken project');
    return res.json();
  },

  duplicateProject: async (id: string): Promise<Project> => {
    const res = await fetch(`/api/projects/${id}/duplicate`, { method: 'POST' });
    if (!res.ok) throw new Error('Fout bij kopiëren project');
    return res.json();
  },

  deleteProject: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Fout bij verwijderen project');
    return res.json();
  },

  toggleShare: async (id: string, enable: boolean, regenerate?: boolean) => {
    const res = await fetch(`/api/projects/${id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable, regenerate }),
    });
    if (!res.ok) throw new Error('Fout bij delen');
    return res.json();
  },

  getSharedProject: async (shareToken: string): Promise<Project> => {
    const res = await fetch(`/api/shared/${shareToken}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gedeeld project niet gevonden');
    }
    return res.json();
  },

  // Upload local file (image/video/audio)
  uploadFile: async (projectId: string, file: File): Promise<{
    url: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    isVideo: boolean;
    isAudio: boolean;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/upload?projectId=${encodeURIComponent(projectId)}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Upload mislukt');
    }
    return res.json();
  },

  getStorageStats: async (): Promise<StorageStats> => {
    const res = await fetch('/api/storage/stats');
    if (!res.ok) throw new Error('Fout bij ophalen opslagstatistieken');
    return res.json();
  },
};
