import React, { useState } from 'react';
import { X, CheckCircle2, ExternalLink, Key, ShieldCheck, Copy, AlertCircle, Info, RefreshCw, LogOut } from 'lucide-react';
import { GoogleAuthStatus } from '../types';
import { api } from '../services/api';

interface GoogleSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  authStatus: GoogleAuthStatus | null;
  onRefreshAuth: () => void;
}

export const GoogleSetupModal: React.FC<GoogleSetupModalProps> = ({
  isOpen,
  onClose,
  authStatus,
  onRefreshAuth,
}) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const redirectUri = authStatus?.redirectUri || `${window.location.origin}/api/auth/google/callback`;

  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2500);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim()) {
      setMessage({ text: 'Vul minimaal een Client ID in.', type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      await api.saveAuthConfig(clientId.trim(), clientSecret.trim());
      setMessage({ text: 'Configuratie succesvol opgeslagen op de server!', type: 'success' });
      onRefreshAuth();
    } catch (err: any) {
      setMessage({ text: err.message || 'Fout bij opslaan', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartOAuthLogin = async () => {
    try {
      setMessage(null);
      const data = await api.getGoogleAuthUrl();
      // Redirect to Google's OAuth consent screen
      window.location.href = data.authUrl;
    } catch (err: any) {
      setMessage({ text: err.message || 'Kon Google login niet starten', type: 'error' });
    }
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await api.saveToken(manualToken.trim());
      setMessage({ text: 'Access token succesvol gekoppeld!', type: 'success' });
      setManualToken('');
      onRefreshAuth();
    } catch (err: any) {
      setMessage({ text: err.message || 'Token ongeldig', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Weet je zeker dat je de Google Photos koppeling wilt verbreken?')) return;
    try {
      await api.disconnectGoogle();
      setMessage({ text: 'Google Photos koppeling is verbroken.', type: 'success' });
      onRefreshAuth();
    } catch (err: any) {
      setMessage({ text: err.message || 'Fout bij ontkoppelen', type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Google Photos &amp; OAuth Configuratie</h2>
              <p className="text-xs text-zinc-400">Officiële Google Photos Picker API integratie</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-zinc-300">
          {message && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                message.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="text-xs leading-relaxed">{message.text}</div>
            </div>
          )}

          {/* Current Connection Status */}
          <div className="bg-zinc-800/50 border border-zinc-700/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  authStatus?.isConnected ? 'bg-emerald-400 ring-4 ring-emerald-950' : 'bg-amber-500'
                }`}
              />
              <div>
                <div className="font-semibold text-white">
                  {authStatus?.isConnected ? 'Google Photos is verbonden' : 'Nog niet verbonden met Google'}
                </div>
                <div className="text-xs text-zinc-400">
                  {authStatus?.isConnected
                    ? `Ingelogd als: ${authStatus.userEmail || 'Geautoriseerd Google-account'}`
                    : authStatus?.hasConfig
                    ? 'Client ID ingesteld. Klik op verbinden om in te loggen.'
                    : 'Configureer eerst je Google Cloud Client ID en Secret.'}
                </div>
              </div>
            </div>

            {authStatus?.isConnected ? (
              <button
                onClick={handleDisconnect}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-300 bg-rose-950/40 border border-rose-800/60 hover:bg-rose-900/60 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ontkoppelen</span>
              </button>
            ) : authStatus?.hasConfig ? (
              <button
                onClick={handleStartOAuthLogin}
                className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Inloggen met Google</span>
              </button>
            ) : null}
          </div>

          {/* Explanation about Official Google Photos Picker API */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-200/90 space-y-2">
            <div className="font-semibold flex items-center gap-2 text-amber-300">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Hoe werkt de Google Photos Picker API?</span>
            </div>
            <p className="leading-relaxed">
              Google heeft de directe bibliotheek-API’s afgesloten en vervangen door de officiële, privacy-vriendelijke{' '}
              <strong>Google Photos Picker API</strong>. Wanneer je op ‘Foto’s en video’s kiezen’ klikt, opent FotoShow
              een veilige Google-sessie. Binnen die officiële Google-omgeving zoek je zelf op trefwoord, album, datum of
              persoon. Alleen de foto’s en video’s die je zelf selecteert en bevestigt met ‘Klaar’, worden naar FotoShow
              geïmporteerd.
            </p>
          </div>

          {/* Setup Guide Steps */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Stappenplan: Eigen Google Cloud project koppelen</span>
            </h3>

            <ol className="space-y-3 text-xs text-zinc-300 list-decimal list-inside pl-1 leading-relaxed">
              <li>
                Ga naar de{' '}
                <a
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline inline-flex items-center gap-0.5"
                >
                  Google Cloud Console <ExternalLink className="w-3 h-3" />
                </a>{' '}
                en maak een nieuw project (of selecteer een bestaand project).
              </li>
              <li>
                Schakel de <strong>Google Photos Picker API</strong> in via{' '}
                <em>APIs &amp; Services &gt; Library</em> (zoek naar <code className="text-amber-300">Photos Picker API</code> of ga naar de bibliotheekpagina).
              </li>
              <li>
                Configureer het <em>OAuth consent screen</em> (Toestemmingsscherm) als <strong>External</strong> en voeg
                je eigen Google-e-mailadres toe als testgebruiker.
              </li>
              <li>
                Voeg de vereiste scope toe:{' '}
                <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[11px]">
                  https://www.googleapis.com/auth/photospicker.mediaitems.readonly
                </code>
              </li>
              <li>
                Maak bij <em>Credentials &gt; Create Credentials &gt; OAuth client ID</em> een client aan van het type{' '}
                <strong>Web application</strong>.
              </li>
              <li>
                Vul bij <strong>Authorized redirect URIs</strong> exact onderstaande URL in:
                <div className="mt-1.5 flex items-center gap-2 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                  <code className="text-[11px] font-mono text-zinc-300 truncate select-all">{redirectUri}</code>
                  <button
                    type="button"
                    onClick={handleCopyRedirectUri}
                    className="ml-auto shrink-0 p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 text-[11px]"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedUri ? 'Gekopieerd!' : 'Kopiëren'}</span>
                  </button>
                </div>
              </li>
              <li>Kopieer je <strong>Client ID</strong> en <strong>Client Secret</strong> en plak ze hieronder:</li>
            </ol>
          </div>

          {/* Form to save Client ID and Client Secret */}
          <form onSubmit={handleSaveCredentials} className="space-y-3 bg-zinc-800/40 p-4 rounded-xl border border-zinc-800">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Google Client ID
              </label>
              <input
                type="text"
                placeholder="bv. 123456789-abcdef.apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {authStatus?.rawClientId && (
                <div className="text-[11px] text-zinc-400 mt-1">
                  Huidige server Client ID:{' '}
                  <span className="font-mono text-zinc-300">{authStatus.rawClientId}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Google Client Secret (veilig opgeslagen op de server)
              </label>
              <input
                type="password"
                placeholder="GOCSPX-..."
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Opslaan...' : 'Credentials Opslaan'}
              </button>

              {authStatus?.hasConfig && !authStatus?.isConnected && (
                <button
                  type="button"
                  onClick={handleStartOAuthLogin}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Start Google Login</span>
                </button>
              )}
            </div>
          </form>

          {/* Direct Token Fallback for testing */}
          <div className="border-t border-zinc-800 pt-4">
            <details className="text-xs text-zinc-400 group">
              <summary className="cursor-pointer hover:text-zinc-200 font-medium list-none flex items-center gap-1.5">
                <span className="text-amber-400">▶</span> Geavanceerd: Handmatig OAuth Bearer Token invoeren (Testen)
              </summary>
              <form onSubmit={handleManualTokenSubmit} className="mt-3 space-y-2 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
                <p className="text-[11px] text-zinc-400">
                  Heb je via Google OAuth Playground of gcloud CLI al een token met de scope{' '}
                  <code className="text-amber-300">photospicker.mediaitems.readonly</code>? Plak deze hier voor direct testen:
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="ya29.a0..."
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500"
                  />
                  <button
                    type="submit"
                    disabled={isSaving || !manualToken.trim()}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium"
                  >
                    Koppelen
                  </button>
                </div>
              </form>
            </details>
          </div>

          {/* Local import reminder */}
          <div className="bg-zinc-800/30 border border-zinc-800 p-3.5 rounded-xl text-xs text-zinc-400 flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Tip:</strong> Zonder Google Cloud project kun je altijd foto’s en video’s vanaf je apparaat importeren. Alle tijdlijn-, Ken Burns-, muziek- en slideshowfuncties werken direct!
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 flex justify-end">
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
