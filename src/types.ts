export type MediaType = 'PHOTO' | 'VIDEO';
export type TransitionType = 'default' | 'fade' | 'slide' | 'zoom' | 'none';
export type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16';

export interface ProjectItem {
  id: string;
  googleId?: string;
  type: MediaType;
  url: string;
  baseUrl?: string;
  cachedLocally?: boolean;
  localPath?: string;
  thumbnailUrl: string;
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  durationSeconds: number; // in seconds
  videoTrim?: {
    start: number; // in seconds
    end: number; // in seconds
  };
  muteAudio?: boolean;
  caption?: string;
  transition?: TransitionType;
  createdAt?: string;
}

export interface AudioTrack {
  id: string;
  filename: string;
  url: string;
  durationSeconds?: number;
  volume: number; // 0.0 to 1.0
  fadeInSeconds: number;
  fadeOutSeconds: number;
  loop: boolean;
  duckOnVideo: boolean;
  duckVolume: number; // e.g. 0.25
}

export interface ProjectSettings {
  defaultPhotoDuration: number;
  defaultTransition: 'fade' | 'slide' | 'zoom' | 'none';
  kenBurnsEnabled: boolean;
  aspectRatio: AspectRatio;
  autoPlay: boolean;
  showCaptions: boolean;
  loopSlideshow: boolean;
}

export interface Project {
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

export interface ProjectSummary {
  id: string;
  title: string;
  description: string;
  coverImage?: string | null;
  itemCount: number;
  photoCount: number;
  videoCount: number;
  hasAudio: boolean;
  totalDurationSeconds: number;
  updatedAt: string;
  createdAt: string;
  isShared: boolean;
  shareToken?: string;
}

export interface GoogleAuthStatus {
  hasConfig: boolean;
  clientId: string;
  rawClientId: string;
  isConnected: boolean;
  userEmail: string | null;
  userName: string | null;
  redirectUri: string;
  appUrl: string;
}

export interface PickerSession {
  sessionId: string;
  pickerUri: string;
  mediaItemsSet: boolean;
  expireTime: string;
}

export interface StorageStats {
  totalBytes: number;
  totalMb: string;
  projectCount: number;
  totalItemsCount: number;
}
