import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Upload,
  RefreshCw,
  Search,
  Film,
  Image as ImageIcon,
  Key,
  FolderOpen,
  ArrowRight,
  HardDriveDownload,
  Info,
} from 'lucide-react';
import { GoogleAuthStatus, ProjectItem, MediaType } from '../types';
import { api } from '../services/api';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  existingItems: ProjectItem[];
  defaultPhotoDuration: number;
  authStatus: GoogleAuthStatus | null;
  onOpenGoogleSetup: () => void;
  onItemsAdded: (newItems: ProjectItem[]) => void;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  projectId,
  existingItems,
  defaultPhotoDuration,
  authStatus,
  onOpenGoogleSetup,
  onItemsAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'device'>(
    authStatus?.isConnected ? 'google' : 'device'
  );

  // Google Picker State
  const [session, setSession] = useState<{
    sessionId: string;
    pickerUri: string;
    mediaItemsSet: boolean;
    expireTime: string;
  } | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cacheLocallyOnImport, setCacheLocallyOnImport] = useState(true);

  // Polling ref
  const pollTimerRef = useRef<any>(null);

  // Device upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setImportStatusMessage(null);
      if (!authStatus?.isConnected) {
        setActiveTab('device');
      } else {
        setActiveTab('google');
      }
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, authStatus?.isConnected]);

  if (!isOpen) return null;

  // --- GOOGLE PHOTOS PICKER API FLOW ---

  // Step 1: Start a Picker Session
  const handleStartGooglePickerSession = async () => {
    setIsStartingSession(true);
    setErrorMessage(null);
    setImportStatusMessage(null);

    try {
      const newSession = await api.createPickerSession();
      setSession(newSession);

      // Start automatic polling every 2.5 seconds
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(() => {
        checkSessionStatus(newSession.sessionId, false);
      }, 2500);

      // Also trigger opening the window safely (in iframe sandbox, popup might be blocked)
      try {
        window.open(newSession.pickerUri, '_blank', 'noopener,noreferrer');
      } catch {
        // Fallback: user can click the manual button in the UI
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Kon Google Photos Picker sessie niet starten');
    } finally {
      setIsStartingSession(false);
    }
  };

  // Step 2: Poll / Check status
  const checkSessionStatus = async (sessionId: string, manual: boolean = false) => {
    if (isCheckingStatus || isImporting) return;
    if (manual) setIsCheckingStatus(true);

    try {
      const status = await api.pollPickerSessionStatus(sessionId);
      if (status.mediaItemsSet) {
        // Selection completed by user in Google Photos! Stop polling and import.
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        await handleImportMediaItems(sessionId);
      } else if (manual) {
        setImportStatusMessage('Nog geen selectie voltooid in Google Photos. Klik op Klaar in Google Photos wanneer je klaar bent.');
      }
    } catch (err: any) {
      if (manual) {
        setErrorMessage(err.message || 'Fout bij controleren selectie');
      }
    } finally {
      if (manual) setIsCheckingStatus(false);
    }
  };

  // Step 3: Fetch media items, deduplicate, cache, and add to project
  const handleImportMediaItems = async (sessionId: string) => {
    setIsImporting(true);
    setImportStatusMessage('Selectie gedetecteerd! Media-items ophalen uit Google Photos...');
    setErrorMessage(null);

    try {
      const result = await api.fetchPickedMedia(sessionId);
      if (!result.items || result.items.length === 0) {
        setErrorMessage('Geen media-items gevonden in de selectie.');
        setIsImporting(false);
        return;
      }

      setImportStatusMessage(`${result.items.length} items ontvangen. Controleren op dubbelen...`);

      // Prevent duplicates: filter out items whose googleId already exists in this project
      const existingGoogleIds = new Set(
        existingItems.map((it) => it.googleId).filter(Boolean)
      );

      const itemsToAdd: any[] = [];
      let duplicateCount = 0;

      for (const item of result.items) {
        if (existingGoogleIds.has(item.googleId)) {
          duplicateCount++;
          continue;
        }
        itemsToAdd.push(item);
      }

      if (itemsToAdd.length === 0) {
        setErrorMessage(
          `Alle ${result.items.length} geselecteerde items stonden al in dit project (dubbelen voorkomen).`
        );
        setIsImporting(false);
        return;
      }

      // Convert to ProjectItem format
      const formattedProjectItems: ProjectItem[] = [];

      for (let i = 0; i < itemsToAdd.length; i++) {
        const item = itemsToAdd[i];
        const isVideo = item.type === 'VIDEO';

        let finalUrl = item.url;
        let isLocallyCached = false;
        let sizeBytes: number | undefined = undefined;

        // Auto-cache locally if enabled
        if (cacheLocallyOnImport && item.baseUrl) {
          setImportStatusMessage(
            `Beveilig lokaal opslaan van item ${i + 1} van ${itemsToAdd.length} (${item.filename})...`
          );
          try {
            const downloadUrl = isVideo ? `${item.baseUrl}=dv` : `${item.baseUrl}=w1920-h1080`;
            const cacheRes = await api.cacheItemLocally(
              projectId,
              downloadUrl,
              item.filename,
              item.mimeType
            );
            finalUrl = cacheRes.localUrl;
            isLocallyCached = true;
            sizeBytes = cacheRes.sizeBytes;
          } catch (e) {
            console.warn('Could not cache locally, using Google temporary URL:', e);
          }
        }

        formattedProjectItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          googleId: item.googleId,
          type: item.type,
          url: finalUrl,
          baseUrl: item.baseUrl,
          cachedLocally: isLocallyCached,
          thumbnailUrl: item.thumbnailUrl,
          filename: item.filename,
          mimeType: item.mimeType,
          sizeBytes,
          durationSeconds: isVideo ? 10 : defaultPhotoDuration,
          videoTrim: isVideo ? { start: 0, end: 10 } : undefined,
          muteAudio: false,
          transition: 'default',
          createdAt: item.createTime || new Date().toISOString(),
        });
      }

      onItemsAdded(formattedProjectItems);

      const msg = `Succesvol ${formattedProjectItems.length} items geïmporteerd!${
        duplicateCount > 0 ? ` (${duplicateCount} dubbele items overgeslagen)` : ''
      }`;
      setImportStatusMessage(msg);

      // Clean session after short delay so user can choose to add more items
      setTimeout(() => {
        setSession(null);
        setImportStatusMessage(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMessage(err.message || 'Fout bij importeren van items');
    } finally {
      setIsImporting(false);
    }
  };

  // --- LOCAL DEVICE UPLOAD FLOW ---

  const handleDeviceFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress({ current: 0, total: files.length });

    const newProjectItems: ProjectItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });

        const uploadRes = await api.uploadFile(projectId, file);
        const isVideo = uploadRes.isVideo;

        newProjectItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: isVideo ? 'VIDEO' : 'PHOTO',
          url: uploadRes.url,
          cachedLocally: true,
          thumbnailUrl: uploadRes.url, // For local image, thumbnail is same or handled
          filename: uploadRes.filename,
          mimeType: uploadRes.mimeType,
          sizeBytes: uploadRes.sizeBytes,
          durationSeconds: isVideo ? 10 : defaultPhotoDuration,
          videoTrim: isVideo ? { start: 0, end: 10 } : undefined,
          muteAudio: false,
          transition: 'default',
          createdAt: new Date().toISOString(),
        });
      }

      onItemsAdded(newProjectItems);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Fout bij uploaden van apparaatbestanden');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Header with Tabs */}
        <div className="border-b border-zinc-800 bg-zinc-900/90 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-400" />
              <span>Foto's &amp; Video's Toevoegen</span>
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('google')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'google'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Google Photos Picker</span>
              {authStatus?.isConnected && (
                <span className="w-2 h-2 rounded-full bg-emerald-950" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('device')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'device'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Vanaf Apparaat Importeren</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-sm text-zinc-300">
          {errorMessage && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {importStatusMessage && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-800 rounded-xl text-xs text-amber-300 flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
              <div className="leading-relaxed font-medium">{importStatusMessage}</div>
            </div>
          )}

          {/* TAB 1: GOOGLE PHOTOS PICKER */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              {!authStatus?.isConnected ? (
                /* OAuth not connected */
                <div className="bg-zinc-800/40 border border-zinc-700/60 rounded-xl p-5 text-center space-y-4">
                  <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
                    <Key className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-base">Google Photos is nog niet verbonden</h3>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                      Om foto's en video's uit je Google Photos-bibliotheek te kiezen via de officiële Picker API,
                      dient eenmalig een OAuth-koppeling ingesteld te worden.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      onClick={onOpenGoogleSetup}
                      className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      <span>Google Koppeling Instellen</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('device')}
                      className="w-full sm:w-auto px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-xl border border-zinc-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Nu vanaf apparaat kiezen</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Connected: Google Photos Picker Flow */
                <div className="space-y-4">
                  {/* Instructions Card */}
                  <div className="bg-zinc-800/40 border border-zinc-700/60 rounded-xl p-4 text-xs text-zinc-300 space-y-2">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <Search className="w-4 h-4 text-amber-400" />
                      <span>Zoeken en selecteren binnen Google Photos</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed">
                      Wanneer je op de knop hieronder klikt, opent FotoShow de officiële Google Photos selectieomgeving.
                      Daar kun je vrij zoeken op <strong>trefwoord, datum, locatie, album of personen</strong>.
                    </p>
                    <p className="text-zinc-400 leading-relaxed">
                      Selecteer de items die je wilt toevoegen en klik rechtsboven op <strong>Klaar</strong>.
                      FotoShow detecteert automatisch wanneer je selectie voltooid is en haalt uitsluitend de door jou gekozen beelden op.
                    </p>
                  </div>

                  {/* Local cache toggle for permanence */}
                  <div className="flex items-center justify-between p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <HardDriveDownload className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-white">Permanente lokale opslag</div>
                        <div className="text-[11px] text-zinc-400">
                          Sla de geselecteerde bestanden veilig lokaal op (voorkomt dat Google links na ~60 min verlopen)
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cacheLocallyOnImport}
                        onChange={(e) => setCacheLocallyOnImport(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Session Action Card */}
                  {!session ? (
                    <div className="text-center py-4">
                      <button
                        onClick={handleStartGooglePickerSession}
                        disabled={isStartingSession}
                        className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-zinc-950 font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2.5 mx-auto"
                      >
                        {isStartingSession ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Sessie voorbereiden...</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4 text-zinc-950" />
                            <span>Google Photos Selectievenster Openen</span>
                          </>
                        )}
                      </button>
                      <p className="text-[11px] text-zinc-500 mt-2">
                        Je kunt de Picker meerdere keren openen om items uit verschillende albums of zoekopdrachten toe te voegen.
                      </p>
                    </div>
                  ) : (
                    /* Active Session Waiting Box */
                    <div className="bg-zinc-950 border border-amber-500/40 rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">Google Photos sessie is actief</div>
                          <div className="text-xs text-zinc-400">
                            Selecteer je foto's/video's in Google Photos en klik op 'Klaar'.
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <a
                          href={session.pickerUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Heropen Google Photos Venster</span>
                        </a>

                        <button
                          onClick={() => checkSessionStatus(session.sessionId, true)}
                          disabled={isCheckingStatus || isImporting}
                          className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 border border-zinc-700"
                        >
                          {isCheckingStatus ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>Controleer selectie nu</span>
                        </button>
                      </div>

                      <div className="text-[11px] text-zinc-500 text-center">
                        FotoShow controleert ook elke 2,5 seconden automatisch of je klaar bent.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DEVICE IMPORT */}
          {activeTab === 'device' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 hover:border-amber-500/80 bg-zinc-950/40 hover:bg-zinc-900/60 rounded-2xl p-8 text-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleDeviceFilesSelected}
                  className="hidden"
                />
                <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-white font-bold text-sm">
                  Klik om foto's &amp; video's te kiezen vanaf je apparaat
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Of sleep bestanden direct naar dit vak (JPG, PNG, WebP, MP4, MOV, WebM)
                </div>
                <div className="mt-3 inline-block px-3 py-1 bg-zinc-800 rounded-full text-[11px] text-zinc-400 border border-zinc-700">
                  Meerdere bestanden tegelijk ondersteund
                </div>
              </div>

              {isUploading && uploadProgress && (
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-300">
                    <span>Bestanden uploaden en verwerken...</span>
                    <span className="font-semibold text-amber-400">
                      {uploadProgress.current} / {uploadProgress.total}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{
                        width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            {existingItems.length} items momenteel in dit project
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};
