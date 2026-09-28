import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// Safe storage directories (fallback to /tmp when running as non-root / read-only in Cloud Run)
function resolveDataDir(): string {
  if (process.env.DATA_DIR) {
    try {
      fs.mkdirSync(process.env.DATA_DIR, { recursive: true });
      return process.env.DATA_DIR;
    } catch (e) {
      console.warn('Configured DATA_DIR not writable, falling back:', e);
    }
  }

  // Try local ./data first
  const localDataDir = path.join(__dirname, 'data');
  try {
    fs.mkdirSync(localDataDir, { recursive: true });
    // Verify write permissions
    const testFile = path.join(localDataDir, `.write_test_${Date.now()}`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return localDataDir;
  } catch {
    // Non-root in Cloud Run cannot write to /app/applet; fallback to /tmp
    const tmpDataDir = path.join('/tmp', 'fotoshow-data');
    try {
      fs.mkdirSync(tmpDataDir, { recursive: true });
    } catch (e) {
      console.warn('Failed to create tmpDataDir:', e);
    }
    return tmpDataDir;
  }
}

const DATA_DIR = resolveDataDir();
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Ensure directories exist safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Directory creation notice:', err);
}

// Multer storage for uploaded media and music
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.query.projectId ? String(req.query.projectId) : 'global';
    const projDir = path.join(UPLOADS_DIR, projectId);
    if (!fs.existsSync(projDir)) {
      fs.mkdirSync(projDir, { recursive: true });
    }
    cb(null, projDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for video/audio
  },
});

// Helper for config
interface ServerConfig {
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  userEmail?: string;
  userName?: string;
  customRedirectUri?: string;
}

// In-memory fallback stores
let inMemoryConfig: ServerConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
};

function readConfig(): ServerConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...inMemoryConfig, ...data };
    }
  } catch (err) {
    console.warn('Notice: Could not read config file, using memory/env config:', err);
  }
  return inMemoryConfig;
}

function saveConfig(config: ServerConfig) {
  inMemoryConfig = config;
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Notice: Could not persist config to disk, preserved in memory:', err);
  }
}

// Helper for projects
interface ProjectItem {
  id: string;
  googleId?: string;
  type: 'PHOTO' | 'VIDEO';
  url: string;
  cachedLocally?: boolean;
  localPath?: string;
  thumbnailUrl: string;
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  durationSeconds: number;
  videoTrim?: {
    start: number;
    end: number;
  };
  muteAudio?: boolean;
  caption?: string;
  transition?: 'default' | 'fade' | 'slide' | 'zoom' | 'none';
  createdAt?: string;
}

interface AudioTrack {
  id: string;
  filename: string;
  url: string;
  durationSeconds?: number;
  volume: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
  loop: boolean;
  duckOnVideo: boolean;
  duckVolume: number;
}

interface ProjectSettings {
  defaultPhotoDuration: number;
  defaultTransition: 'fade' | 'slide' | 'zoom' | 'none';
  kenBurnsEnabled: boolean;
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16';
  autoPlay: boolean;
  showCaptions: boolean;
  loopSlideshow: boolean;
}

interface Project {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  items: ProjectItem[];
  audio?: AudioTrack | null;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
  shareToken?: string;
}

let inMemoryProjects: Project[] = [];

function readProjects(): Project[] {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        inMemoryProjects = data;
        return data;
      }
    }
  } catch (err) {
    console.warn('Notice: Could not read projects file, using memory storage:', err);
  }
  return inMemoryProjects;
}

function saveProjects(projects: Project[]) {
  inMemoryProjects = projects;
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Notice: Could not persist projects to disk, preserved in memory:', err);
  }
}

// Ensure default demo project if empty
function initializeDefaultProject() {
  try {
    const projects = readProjects();
    if (projects.length === 0) {
      const defaultProject: Project = {
        id: 'demo-vakantie-album',
        title: 'Mijn Eerste FotoShow',
        description: 'Een voorbeeldalbum om de vloeiende overgangen, Ken Burns effecten en muziek te bekijken. Voeg je eigen foto’s toe via Google Photos of upload vanaf je apparaat!',
        coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'item-1',
            type: 'PHOTO',
            url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&auto=format&fit=crop&q=80',
            thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format&fit=crop&q=80',
            filename: 'Zonsondergang_aan_zee.jpg',
            mimeType: 'image/jpeg',
            durationSeconds: 5,
            caption: 'Rustgevende zonsondergang aan de kust',
            transition: 'fade',
          },
          {
            id: 'item-2',
            type: 'PHOTO',
            url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&auto=format&fit=crop&q=80',
            thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&auto=format&fit=crop&q=80',
            filename: 'Berglandschap_ochtend.jpg',
            mimeType: 'image/jpeg',
            durationSeconds: 4,
            caption: 'Ochtendwandeling tussen de besneeuwde toppen',
            transition: 'zoom',
          },
          {
            id: 'item-3',
            type: 'PHOTO',
            url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&auto=format&fit=crop&q=80',
            thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&auto=format&fit=crop&q=80',
            filename: 'Vallei_in_de_herfst.jpg',
            mimeType: 'image/jpeg',
            durationSeconds: 4.5,
            caption: 'Kleurrijke herfstkleuren in de bergen',
            transition: 'slide',
          },
        ],
        audio: null,
        settings: {
          defaultPhotoDuration: 4,
          defaultTransition: 'fade',
          kenBurnsEnabled: true,
          aspectRatio: '16:9',
          autoPlay: false,
          showCaptions: true,
          loopSlideshow: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isShared: false,
      };
      saveProjects([defaultProject]);
    }
  } catch (err) {
    console.warn('Notice: Could not initialize default project:', err);
  }
}

try {
  initializeDefaultProject();
} catch (err) {
  console.warn('Initial project bootstrap notice:', err);
}

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static serving for uploaded files
  app.use('/api/media', express.static(UPLOADS_DIR));

  // Determine redirect URI
  const getRedirectUri = (req: express.Request) => {
    const config = readConfig();
    if (config.customRedirectUri) return config.customRedirectUri;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
    return `${protocol}://${host}/api/auth/google/callback`;
  };

  // Helper to refresh Google access token if needed
  async function getValidAccessToken(): Promise<string | null> {
    const config = readConfig();
    if (!config.accessToken) return null;

    if (config.tokenExpiresAt && Date.now() > config.tokenExpiresAt - 60000 && config.refreshToken && config.clientId && config.clientSecret) {
      try {
        const resp = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: config.refreshToken,
            grant_type: 'refresh_token',
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          config.accessToken = data.access_token;
          if (data.expires_in) {
            config.tokenExpiresAt = Date.now() + data.expires_in * 1000;
          }
          saveConfig(config);
          return config.accessToken || null;
        }
      } catch (e) {
        console.error('Failed to refresh token:', e);
      }
    }
    return config.accessToken || null;
  }

  // --- API: Google Configuration & Auth ---

  app.get('/api/auth/status', (req, res) => {
    const config = readConfig();
    const redirectUri = getRedirectUri(req);
    res.json({
      hasConfig: Boolean(config.clientId && config.clientSecret),
      clientId: config.clientId ? `${config.clientId.slice(0, 12)}...` : '',
      rawClientId: config.clientId || '',
      isConnected: Boolean(config.accessToken),
      userEmail: config.userEmail || null,
      userName: config.userName || null,
      redirectUri,
      appUrl: APP_URL,
    });
  });

  app.post('/api/auth/config', (req, res) => {
    const { clientId, clientSecret, customRedirectUri } = req.body;
    const config = readConfig();
    if (clientId !== undefined) config.clientId = clientId.trim();
    if (clientSecret !== undefined) config.clientSecret = clientSecret.trim();
    if (customRedirectUri !== undefined) config.customRedirectUri = customRedirectUri.trim();
    saveConfig(config);
    res.json({ success: true, message: 'Google Cloud configuratie opgeslagen.' });
  });

  app.get('/api/auth/google/url', (req, res) => {
    const config = readConfig();
    if (!config.clientId) {
      return res.status(400).json({ error: 'Google Client ID ontbreekt. Configureer deze eerst in de instellingen.' });
    }
    const redirectUri = getRedirectUri(req);
    const scope = [
      'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
      'email',
      'profile',
    ].join(' ');

    const state = Math.random().toString(36).substring(7);
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ authUrl, redirectUri });
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const { code, error } = req.query;
    if (error || !code) {
      return res.redirect(`/?auth_error=${encodeURIComponent(String(error || 'Geen autorisatiecode ontvangen'))}`);
    }

    const config = readConfig();
    if (!config.clientId || !config.clientSecret) {
      return res.redirect('/?auth_error=' + encodeURIComponent('Client ID of Secret ontbreekt op de server.'));
    }

    try {
      const redirectUri = getRedirectUri(req);
      const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResp.ok) {
        const errText = await tokenResp.text();
        console.error('Token exchange error:', errText);
        return res.redirect('/?auth_error=' + encodeURIComponent('Token uitwisseling mislukt: ' + errText));
      }

      const tokenData = await tokenResp.json();
      config.accessToken = tokenData.access_token;
      if (tokenData.refresh_token) {
        config.refreshToken = tokenData.refresh_token;
      }
      if (tokenData.expires_in) {
        config.tokenExpiresAt = Date.now() + tokenData.expires_in * 1000;
      }

      // Fetch user profile info
      try {
        const profileResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${config.accessToken}` },
        });
        if (profileResp.ok) {
          const profile = await profileResp.json();
          config.userEmail = profile.email;
          config.userName = profile.name;
        }
      } catch (err) {
        console.warn('Failed to fetch userinfo:', err);
      }

      saveConfig(config);
      res.redirect('/?auth_success=1');
    } catch (e: any) {
      console.error('OAuth callback exception:', e);
      res.redirect('/?auth_error=' + encodeURIComponent(e.message || 'Onbekende fout tijdens inloggen'));
    }
  });

  // Manual token input / direct bearer token connection
  app.post('/api/auth/token', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is verplicht' });

    try {
      const profileResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const config = readConfig();
      config.accessToken = token;
      config.tokenExpiresAt = Date.now() + 3600 * 1000; // 1 hr default

      if (profileResp.ok) {
        const profile = await profileResp.json();
        config.userEmail = profile.email;
        config.userName = profile.name;
      }
      saveConfig(config);
      res.json({ success: true, userEmail: config.userEmail, userName: config.userName });
    } catch (err: any) {
      res.status(500).json({ error: 'Token kon niet geverifieerd worden: ' + err.message });
    }
  });

  app.post('/api/auth/disconnect', (req, res) => {
    const config = readConfig();
    config.accessToken = undefined;
    config.refreshToken = undefined;
    config.tokenExpiresAt = undefined;
    config.userEmail = undefined;
    config.userName = undefined;
    saveConfig(config);
    res.json({ success: true, message: 'Google Photos koppeling verbroken.' });
  });

  // --- API: Google Photos Picker API ---

  // 1. Create a session
  app.post('/api/photos/session/create', async (req, res) => {
    const token = await getValidAccessToken();
    if (!token) {
      return res.status(401).json({
        error: 'Geen actieve Google Photos verbinding. Verbind eerst je Google-account.',
      });
    }

    try {
      const response = await fetch('https://photospicker.googleapis.com/v1/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errJson = await response.text();
        console.error('Picker API session create error:', errJson);
        return res.status(response.status).json({
          error: `Google Photos Picker API fout (${response.status}): ${errJson}`,
        });
      }

      const sessionData = await response.json();
      res.json({
        sessionId: sessionData.id,
        pickerUri: sessionData.pickerUri,
        mediaItemsSet: Boolean(sessionData.mediaItemsSet),
        expireTime: sessionData.expireTime,
      });
    } catch (e: any) {
      console.error('Create picker session exception:', e);
      res.status(500).json({ error: 'Fout bij aanmaken Picker sessie: ' + e.message });
    }
  });

  // 2. Poll session status
  app.get('/api/photos/session/:sessionId/status', async (req, res) => {
    const token = await getValidAccessToken();
    if (!token) {
      return res.status(401).json({ error: 'Niet geautoriseerd' });
    }

    const { sessionId } = req.params;
    try {
      const response = await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: err });
      }

      const session = await response.json();
      res.json({
        sessionId: session.id,
        mediaItemsSet: Boolean(session.mediaItemsSet),
        pickerUri: session.pickerUri,
        expireTime: session.expireTime,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3. Retrieve all picked media items with full pagination
  app.post('/api/photos/session/:sessionId/media', async (req, res) => {
    const token = await getValidAccessToken();
    if (!token) {
      return res.status(401).json({ error: 'Niet geautoriseerd' });
    }

    const { sessionId } = req.params;
    const allItems: any[] = [];
    let nextPageToken: string | undefined = undefined;

    try {
      do {
        const url: string = `https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}&pageSize=100${
          nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : ''
        }`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({ error: 'Fout bij ophalen media: ' + errText });
        }

        const data = await response.json();
        if (data.mediaItems && Array.isArray(data.mediaItems)) {
          allItems.push(...data.mediaItems);
        }
        nextPageToken = data.nextPageToken;
      } while (nextPageToken);

      // Map to consistent format
      const formattedItems = allItems.map((item) => {
        const isVideo = item.type === 'VIDEO';
        const baseUrl = item.mediaFile?.baseUrl;
        // In Google Photos API, appending =w1920-h1080 creates high quality image,
        // and =dv triggers direct video download/stream for video items.
        const displayUrl = isVideo ? `${baseUrl}=dv` : `${baseUrl}=w1920-h1080`;
        const thumbUrl = `${baseUrl}=w400-h400-c`;

        return {
          googleId: item.id,
          type: (isVideo ? 'VIDEO' : 'PHOTO') as 'PHOTO' | 'VIDEO',
          baseUrl,
          url: displayUrl,
          thumbnailUrl: thumbUrl,
          filename: item.mediaFile?.filename || (isVideo ? 'video.mp4' : 'foto.jpg'),
          mimeType: item.mediaFile?.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
          createTime: item.createTime,
        };
      });

      res.json({
        total: formattedItems.length,
        items: formattedItems,
      });
    } catch (e: any) {
      console.error('Fetch media items error:', e);
      res.status(500).json({ error: 'Fout bij ophalen geselecteerde media: ' + e.message });
    }
  });

  // 4. Download / cache media file to server storage (permanent availability)
  app.post('/api/photos/cache-item', async (req, res) => {
    const { projectId, itemUrl, filename, mimeType } = req.body;
    if (!projectId || !itemUrl) {
      return res.status(400).json({ error: 'projectId en itemUrl zijn vereist' });
    }

    try {
      const projDir = path.join(UPLOADS_DIR, projectId);
      if (!fs.existsSync(projDir)) {
        fs.mkdirSync(projDir, { recursive: true });
      }

      const ext = path.extname(filename) || (mimeType?.includes('video') ? '.mp4' : '.jpg');
      const uniqueName = `cached-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      const filePath = path.join(projDir, uniqueName);

      const resp = await fetch(itemUrl);
      if (!resp.ok) {
        return res.status(resp.status).json({ error: 'Kon bestand niet downloaden van Google' });
      }

      const buffer = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      const localUrl = `/api/media/${projectId}/${uniqueName}`;
      res.json({
        success: true,
        localUrl,
        sizeBytes: buffer.length,
      });
    } catch (e: any) {
      console.error('Cache item error:', e);
      res.status(500).json({ error: 'Fout bij lokaal opslaan van bestand: ' + e.message });
    }
  });

  // --- API: Projects Management ---

  app.get('/api/projects', (req, res) => {
    const projects = readProjects();
    // Return summary without heavy internals for quick list
    res.json(
      projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        coverImage: p.coverImage || (p.items[0]?.thumbnailUrl || p.items[0]?.url) || null,
        itemCount: p.items.length,
        photoCount: p.items.filter((i) => i.type === 'PHOTO').length,
        videoCount: p.items.filter((i) => i.type === 'VIDEO').length,
        hasAudio: Boolean(p.audio),
        totalDurationSeconds: p.items.reduce(
          (acc, item) => acc + (item.type === 'VIDEO' ? (item.videoTrim ? item.videoTrim.end - item.videoTrim.start : item.durationSeconds || 5) : item.durationSeconds || p.settings.defaultPhotoDuration),
          0
        ),
        updatedAt: p.updatedAt,
        createdAt: p.createdAt,
        isShared: p.isShared,
        shareToken: p.shareToken,
      }))
    );
  });

  app.post('/api/projects', (req, res) => {
    const { title, description } = req.body;
    const newProject: Project = {
      id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title?.trim() || 'Nieuw FotoShow Project',
      description: description?.trim() || '',
      items: [],
      audio: null,
      settings: {
        defaultPhotoDuration: 4,
        defaultTransition: 'fade',
        kenBurnsEnabled: true,
        aspectRatio: '16:9',
        autoPlay: false,
        showCaptions: true,
        loopSlideshow: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isShared: false,
    };

    const projects = readProjects();
    projects.unshift(newProject);
    saveProjects(projects);

    res.json(newProject);
  });

  app.get('/api/projects/:id', (req, res) => {
    const projects = readProjects();
    const proj = projects.find((p) => p.id === req.params.id);
    if (!proj) return res.status(404).json({ error: 'Project niet gevonden' });
    res.json(proj);
  });

  app.put('/api/projects/:id', (req, res) => {
    const projects = readProjects();
    const index = projects.findIndex((p) => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Project niet gevonden' });

    const existing = projects[index];
    const updated: Project = {
      ...existing,
      ...req.body,
      id: existing.id, // ID cannot change
      updatedAt: new Date().toISOString(),
    };

    projects[index] = updated;
    saveProjects(projects);
    res.json(updated);
  });

  app.post('/api/projects/:id/duplicate', (req, res) => {
    const projects = readProjects();
    const existing = projects.find((p) => p.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Project niet gevonden' });

    const duplicatedId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const copy: Project = {
      ...JSON.parse(JSON.stringify(existing)),
      id: duplicatedId,
      title: `${existing.title} (Kopie)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isShared: false,
      shareToken: undefined,
    };

    projects.unshift(copy);
    saveProjects(projects);
    res.json(copy);
  });

  // Delete project and remove all its cached local media files
  app.delete('/api/projects/:id', (req, res) => {
    const projects = readProjects();
    const index = projects.findIndex((p) => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Project niet gevonden' });

    const [deletedProj] = projects.splice(index, 1);
    saveProjects(projects);

    // Clean up local files for this project
    const projDir = path.join(UPLOADS_DIR, deletedProj.id);
    if (fs.existsSync(projDir)) {
      try {
        fs.rmSync(projDir, { recursive: true, force: true });
        console.log(`Cleaned up media directory for project ${deletedProj.id}`);
      } catch (err) {
        console.error(`Failed to clean up files for project ${deletedProj.id}:`, err);
      }
    }

    res.json({ success: true, message: 'Project en bijbehorende bestanden succesvol verwijderd.' });
  });

  // Share toggle & token generation
  app.post('/api/projects/:id/share', (req, res) => {
    const { enable, regenerate } = req.body;
    const projects = readProjects();
    const proj = projects.find((p) => p.id === req.params.id);
    if (!proj) return res.status(404).json({ error: 'Project niet gevonden' });

    if (enable === false) {
      proj.isShared = false;
      proj.shareToken = undefined;
    } else {
      proj.isShared = true;
      if (!proj.shareToken || regenerate) {
        proj.shareToken = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
      }
    }
    proj.updatedAt = new Date().toISOString();
    saveProjects(projects);

    res.json({
      isShared: proj.isShared,
      shareToken: proj.shareToken,
      shareUrl: proj.shareToken ? `${APP_URL}/?share=${proj.shareToken}` : null,
    });
  });

  // Public shared project reader (no auth required)
  app.get('/api/shared/:token', (req, res) => {
    const { token } = req.params;
    const projects = readProjects();
    const proj = projects.find((p) => p.isShared && p.shareToken === token);
    if (!proj) {
      return res.status(404).json({ error: 'Gedeeld album niet gevonden of de deellink is ingetrokken.' });
    }
    // Return read-only project view
    res.json({
      title: proj.title,
      description: proj.description,
      coverImage: proj.coverImage,
      items: proj.items,
      audio: proj.audio,
      settings: proj.settings,
      createdAt: proj.createdAt,
      updatedAt: proj.updatedAt,
    });
  });

  // Upload local media or music file
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Geen bestand geüpload' });
    }

    const projectId = req.query.projectId ? String(req.query.projectId) : 'global';
    const relativeUrl = `/api/media/${projectId}/${req.file.filename}`;
    const mime = req.file.mimetype;
    const isVideo = mime.startsWith('video/');
    const isAudio = mime.startsWith('audio/');

    res.json({
      url: relativeUrl,
      filename: req.file.originalname,
      mimeType: mime,
      sizeBytes: req.file.size,
      isVideo,
      isAudio,
    });
  });

  // Storage stats for transparency
  app.get('/api/storage/stats', (req, res) => {
    try {
      let totalBytes = 0;
      const getDirSize = (dir: string) => {
        if (!fs.existsSync(dir)) return 0;
        const files = fs.readdirSync(dir, { withFileTypes: true });
        let size = 0;
        for (const file of files) {
          const filePath = path.join(dir, file.name);
          if (file.isDirectory()) {
            size += getDirSize(filePath);
          } else {
            size += fs.statSync(filePath).size;
          }
        }
        return size;
      };

      totalBytes = getDirSize(UPLOADS_DIR);
      const projects = readProjects();

      res.json({
        totalBytes,
        totalMb: (totalBytes / (1024 * 1024)).toFixed(2),
        projectCount: projects.length,
        totalItemsCount: projects.reduce((acc, p) => acc + p.items.length, 0),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Health check endpoint for Cloud Run and monitoring
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- Vite Dev & Production Serving ---
  const distCandidates = [
    path.resolve(__dirname, 'dist'),
    path.resolve(process.cwd(), 'dist'),
  ];
  const foundDistPath = distCandidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html')));
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(foundDistPath);

  if (isProduction) {
    if (foundDistPath) {
      const indexHtmlPath = path.join(foundDistPath, 'index.html');
      app.use(express.static(foundDistPath));
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'Niet gevonden' });
        }
        res.sendFile(indexHtmlPath);
      });
    } else {
      // Clean fallback if dist folder is in unexpected path
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'Niet gevonden' });
        }
        res.status(200).send('<!doctype html><html><head><title>FotoShow</title></head><body><div id="root">FotoShow wordt gestart...</div></body></html>');
      });
    }
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`FotoShow server listening on http://0.0.0.0:${PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
