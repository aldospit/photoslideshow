import React, { useState, useRef } from 'react';
import { X, Video, Download, CheckCircle2, AlertTriangle, RefreshCw, Sparkles, Film } from 'lucide-react';
import { Project } from '../types';

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export const VideoExportModal: React.FC<VideoExportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordedMime, setRecordedMime] = useState<string>('video/webm');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    if (project.items.length === 0) {
      setError('Er zijn geen foto’s of video’s in dit project om te exporteren.');
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setError(null);
    setDownloadUrl(null);

    const canvas = canvasRef.current;
    if (!canvas) {
      setError('Canvas element is niet beschikbaar in deze browser.');
      setIsExporting(false);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('2D Canvas context niet ondersteund.');
      setIsExporting(false);
      return;
    }

    // Set resolution (1920x1080)
    canvas.width = 1920;
    canvas.height = 1080;

    try {
      // Determine supported MIME type
      let mimeType = 'video/webm;codecs=vp9';
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      }
      setRecordedMime(mimeType);

      const stream = canvas.captureStream(30); // 30 fps
      const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6000000 });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setIsExporting(false);
        setProgress(100);
      };

      mediaRecorder.start();

      // Render each slide sequentially to canvas
      const totalSlides = project.items.length;
      for (let i = 0; i < totalSlides; i++) {
        const item = project.items[i];
        setProgress(Math.round(((i + 0.2) / totalSlides) * 100));

        // Load image or video frame
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // Draw background (letterbox)
            ctx.fillStyle = '#09090b';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Calculate aspect fit
            const hRatio = canvas.width / img.width;
            const vRatio = canvas.height / img.height;
            const ratio = Math.min(hRatio, vRatio);
            const centerShiftX = (canvas.width - img.width * ratio) / 2;
            const centerShiftY = (canvas.height - img.height * ratio) / 2;

            ctx.drawImage(
              img,
              0,
              0,
              img.width,
              img.height,
              centerShiftX,
              centerShiftY,
              img.width * ratio,
              img.height * ratio
            );

            // Draw caption if exists
            if (project.settings.showCaptions && item.caption) {
              ctx.font = 'bold 32px sans-serif';
              ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
              const textWidth = ctx.measureText(item.caption).width;
              ctx.fillRect(
                (canvas.width - textWidth - 40) / 2,
                canvas.height - 120,
                textWidth + 40,
                60
              );
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.fillText(item.caption, canvas.width / 2, canvas.height - 80);
            }

            resolve();
          };
          img.onerror = () => {
            // Fallback: draw placeholder slide if external image blocks CORS
            ctx.fillStyle = '#18181b';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f43f5e';
            ctx.font = '36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(item.filename, canvas.width / 2, canvas.height / 2);
            resolve();
          };
          img.src = item.url;
        });

        // Hold frame for export duration (simulate 1.2s per slide in fast-export mode)
        await new Promise((r) => setTimeout(r, 1200));
        setProgress(Math.round(((i + 1) / totalSlides) * 100));
      }

      mediaRecorder.stop();
    } catch (err: any) {
      console.error('Export error:', err);
      setError('Fout bij exporteren: ' + err.message);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
        {/* Hidden canvas for video generation */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Video Exporteren</h2>
              <p className="text-xs text-zinc-400">Genereer een downloadbaar videobestand</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm text-zinc-300">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Summary */}
          <div className="bg-zinc-950/60 border border-zinc-800 p-4 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Project:</span>
              <span className="font-semibold text-white">{project.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Aantal slides:</span>
              <span className="text-white">{project.items.length} items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Resolutie:</span>
              <span className="text-white">Full HD 1080p (1920 × 1080)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Audio:</span>
              <span className="text-white">
                {project.audio ? project.audio.filename : 'Geen achtergrondmuziek'}
              </span>
            </div>
          </div>

          {/* Honest Technical Status */}
          <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-400 space-y-1.5 leading-relaxed">
            <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Browser-native rendering</span>
            </div>
            <p>
              Video-export rendert de slideshow rechtstreeks in jouw browser via de MediaRecorder &amp; Canvas API.
              Het resulterende bestand ({recordedMime.includes('mp4') ? 'MP4' : 'WebM'}) kan direct worden gedownload
              en afgespeeld op elke computer, telefoon of smart-tv.
            </p>
          </div>

          {/* Exporting Progress */}
          {isExporting && (
            <div className="bg-zinc-950 border border-amber-500/30 p-4 rounded-xl space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-2 text-amber-300">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Beelden frame voor frame renderen...</span>
                </span>
                <span className="font-bold text-amber-400">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Download ready button */}
          {downloadUrl && (
            <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-xl space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-emerald-300 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Videobestand is succesvol gegenereerd!</span>
              </div>
              <a
                href={downloadUrl}
                download={`${project.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${
                  recordedMime.includes('mp4') ? 'mp4' : 'webm'
                }`}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Videobestand Nu</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
          >
            Sluiten
          </button>

          {!downloadUrl && (
            <button
              onClick={handleStartExport}
              disabled={isExporting || project.items.length === 0}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Exporteren...</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>Start Video-export</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
