import React, { useState, useEffect } from 'react';
import { Copy, Check, Tv, ExternalLink, X, Monitor, ShieldCheck, Zap, Wifi, Layers } from 'lucide-react';
import { getBoardById, loadAllBoards } from '../utils/storage';
import { encodeBoardToUrlParam } from '../utils/realtimeSync';
import { getOverlayUrl } from '../utils/urlHelper';
import { ScoreboardData } from '../types';

interface OBSHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId?: string;
}

export const OBSHelpModal: React.FC<OBSHelpModalProps> = ({ isOpen, onClose, boardId: initialBoardId }) => {
  const [selectedId, setSelectedId] = useState<string | undefined>(initialBoardId);
  const [allBoards, setAllBoards] = useState<ScoreboardData[]>([]);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedDataUrl, setCopiedDataUrl] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const boards = loadAllBoards();
      setAllBoards(boards);
      if (initialBoardId) {
        setSelectedId(initialBoardId);
      } else if (boards.length > 0) {
        setSelectedId(boards[0].id);
      }
    }
  }, [isOpen, initialBoardId]);

  if (!isOpen) return null;

  const currentBoard = selectedId ? getBoardById(selectedId) || allBoards.find(b => b.id === selectedId) : null;
  const overlayUrl = selectedId ? getOverlayUrl(selectedId) : '';
  const compressedData = currentBoard ? encodeBoardToUrlParam(currentBoard) : '';
  const instantDataUrl = selectedId && compressedData
    ? `${overlayUrl}&data=${compressedData}`
    : overlayUrl;

  const handleCopyUrl = () => {
    if (!overlayUrl) return;
    navigator.clipboard.writeText(overlayUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyDataUrl = () => {
    if (!instantDataUrl) return;
    navigator.clipboard.writeText(instantDataUrl);
    setCopiedDataUrl(true);
    setTimeout(() => setCopiedDataUrl(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Guía de URLs para OBS Studio</h2>
              <p className="text-xs text-slate-400">Cada marcador creado posee una URL única e independiente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {/* Board Selector */}
          {allBoards.length > 1 && (
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-400" /> Seleccionar Marcador para obtener su URL:
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {allBoards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} (ID: {b.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick URL Box */}
          <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Wifi className="h-3.5 w-3.5 text-emerald-400 animate-pulse" /> URL Única para este Overlay
              </label>
              {selectedId && (
                <span className="text-[10px] text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-mono">
                  ID: {selectedId}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={overlayUrl}
                className="w-full rounded-lg border border-indigo-900/60 bg-slate-950 px-3 py-2 text-xs font-mono text-indigo-200 selection:bg-indigo-600 select-all"
              />
              <button
                onClick={handleCopyUrl}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all active:scale-95"
              >
                {copiedUrl ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                {copiedUrl ? '¡Copiado!' : 'Copiar URL'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Esta URL apunta exclusivamente al marcador <span className="text-white font-semibold">"{currentBoard?.title || 'Seleccionado'}"</span>. No interferirá con otros overlays en tu OBS.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" /> Pasos en OBS Studio / Streamlabs
            </h3>

            <div className="grid gap-3 text-xs">
              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 font-bold text-indigo-400">
                  1
                </span>
                <div>
                  <strong className="text-white block font-medium">Añadir Fuente de Navegador (Browser Source)</strong>
                  <span className="text-slate-400">
                    En OBS Studio, en el panel de <strong>Fuentes</strong>, pulsa <strong>+</strong> y selecciona <strong>Navegador</strong>.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 font-bold text-indigo-400">
                  2
                </span>
                <div>
                  <strong className="text-white block font-medium">Pegar la URL exclusiva</strong>
                  <div className="mt-1 text-slate-400 space-y-1">
                    <p>• Pega la <strong>URL Única</strong> de arriba en la casilla URL.</p>
                    <p>• Ancho (Width): <strong className="text-slate-200">1920</strong> | Alto (Height): <strong className="text-slate-200">1080</strong> (o la resolución de tu lienzo).</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 font-bold text-indigo-400">
                  3
                </span>
                <div>
                  <strong className="text-white block font-medium">Control en tiempo real e instantáneo</strong>
                  <p className="mt-1 text-slate-400">
                    Cualquier cambio de puntos, diseño o cronómetro en el panel de control se refleja en OBS de inmediato y de forma completamente aislada.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Test Link */}
          {overlayUrl && (
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-xs font-semibold text-white">Vista previa del Overlay limpio</p>
                  <p className="text-[11px] text-slate-400">Comprueba cómo se ve con fondo transparente para OBS</p>
                </div>
              </div>
              <a
                href={overlayUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir Overlay
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-6 py-4">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <ShieldCheck className="h-4 w-4" /> Compatible con OBS Studio, Streamlabs, Twitch Studio & vMix
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
