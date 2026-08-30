import React, { useState } from 'react';
import { Copy, Check, Tv, ExternalLink, X, Monitor, ShieldCheck, Zap } from 'lucide-react';

interface OBSHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId?: string;
}

export const OBSHelpModal: React.FC<OBSHelpModalProps> = ({ isOpen, onClose, boardId }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const overlayUrl = boardId
    ? `${currentOrigin}/?mode=overlay&id=${boardId}`
    : `${currentOrigin}/?mode=overlay`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const sampleCss = `/* Opcional: fondo transparente garantizado y nitidez */
body {
  background-color: rgba(0, 0, 0, 0) !important;
  margin: 0px auto;
  overflow: hidden;
}`;

  const handleCopyCss = () => {
    navigator.clipboard.writeText(sampleCss);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2500);
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
              <h2 className="text-lg font-bold text-white">Guía de Conexión a OBS Studio</h2>
              <p className="text-xs text-slate-400">Cómo añadir el marcador como fuente de navegador (Browser Source)</p>
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
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          {/* Quick URL Box */}
          <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/30 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-indigo-300 block mb-2">
              URL del Marcador para OBS (Fondo Transparente)
            </label>
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
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" /> Pasos en OBS Studio / Streamlabs
            </h3>

            <div className="grid gap-3 text-xs">
              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 font-bold text-indigo-400">
                  1
                </span>
                <div>
                  <strong className="text-white block font-medium">Añadir Fuente de Navegador</strong>
                  <span className="text-slate-400">
                    En OBS, en el panel <strong>Fuentes (Sources)</strong>, pulsa <strong>+</strong> y selecciona <strong>Navegador (Browser)</strong>.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 font-bold text-indigo-400">
                  2
                </span>
                <div>
                  <strong className="text-white block font-medium">Pegar la URL y Dimensiones</strong>
                  <div className="mt-1 text-slate-400 space-y-1">
                    <p>• Pega la <strong>URL del Marcador</strong> copiada arriba.</p>
                    <p>• Ancho (Width): <strong className="text-slate-200">1920</strong> | Alto (Height): <strong className="text-slate-200">1080</strong> (o la resolución de tu lienzo).</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 font-bold text-indigo-400">
                  3
                </span>
                <div>
                  <strong className="text-white block font-medium">Opciones recomendadas</strong>
                  <p className="mt-1 text-slate-400">
                    Marca la casilla <strong className="text-emerald-400">"Desactivar cuando no sea visible"</strong> y <strong className="text-emerald-400">"Actualizar el navegador cuando la escena se active"</strong> si deseas reiniciar vistas.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 font-bold text-indigo-400">
                  4
                </span>
                <div>
                  <strong className="text-white block font-medium">¡Control en tiempo real!</strong>
                  <p className="mt-1 text-slate-400">
                    Abre el panel de control en tu navegador o móvil. Cualquier cambio en los puntos, reloj o nombres se actualizará <strong>instantáneamente en tu directo sin recargar OBS</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Test Link */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-xs font-semibold text-white">Probar Overlay en una nueva ventana</p>
                <p className="text-[11px] text-slate-400">Abre la vista limpia y transparente idéntica a cómo la verá OBS</p>
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-6 py-4">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <ShieldCheck className="h-4 w-4" /> Compatible con OBS Studio, Streamlabs, Twitch Studio & vMix
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
