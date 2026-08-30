import React, { useState, useEffect } from 'react';
import { ScoreboardData, TallyItem } from '../types';
import { saveBoard } from '../utils/storage';
import { initRealtimeSync, publishBoardUpdate } from '../utils/realtimeSync';
import { playSound } from '../utils/audio';
import {
  Hash,
  Plus,
  Minus,
  Trash2,
  ChevronLeft,
  Copy,
  Check,
  Tv,
  RotateCcw
} from 'lucide-react';

interface TallyControllerProps {
  board: ScoreboardData;
  onBack: () => void;
  onOpenObsHelp: () => void;
}

export const TallyController: React.FC<TallyControllerProps> = ({
  board: initialBoard,
  onBack,
  onOpenObsHelp,
}) => {
  const [board, setBoard] = useState<ScoreboardData>(initialBoard);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  // Cloud Realtime sync
  useEffect(() => {
    publishBoardUpdate(board);
    const cleanup = initRealtimeSync(board.id, undefined, undefined, true);
    return () => cleanup();
  }, [board.id]);

  const updateBoard = (updater: (prev: ScoreboardData) => ScoreboardData) => {
    setBoard((prev) => {
      const next = updater(prev);
      saveBoard(next);
      return next;
    });
  };

  const adjustTally = (id: string, delta: number) => {
    updateBoard((prev) => ({
      ...prev,
      tallies: prev.tallies.map((t) =>
        t.id === id ? { ...t, count: Math.max(0, t.count + delta) } : t
      ),
    }));
    playSound('point', 0.4);
  };

  const addTally = () => {
    if (!newLabel.trim()) return;
    const colors = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
    const newT: TallyItem = {
      id: 't_' + Math.random().toString(36).substring(2, 8),
      label: newLabel.trim(),
      count: 0,
      step: 1,
      color: colors[board.tallies.length % colors.length],
    };
    updateBoard((prev) => ({
      ...prev,
      tallies: [...prev.tallies, newT],
    }));
    setNewLabel('');
    playSound('click', 0.4);
  };

  const removeTally = (id: string) => {
    updateBoard((prev) => ({
      ...prev,
      tallies: prev.tallies.filter((t) => t.id !== id),
    }));
  };

  const overlayUrl = `${window.location.origin}/?mode=overlay&id=${board.id}`;

  const copyObsUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-16">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 py-3.5 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" /> Dashboard
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white tracking-tight uppercase">{board.title}</h1>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-[10px] font-bold tracking-wider flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  TALLY LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">Contador Múltiple // OBS Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={copyObsUrl}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-900/30 hover:bg-indigo-500 transition-all active:scale-95"
            >
              {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedUrl ? '¡URL Copiada!' : 'Copiar URL OBS'}
            </button>
            <button
              onClick={onOpenObsHelp}
              className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Tv className="h-4 w-4 text-indigo-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
        {/* Add Tally Bento Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Hash className="h-3.5 w-3.5 text-indigo-400" /> Añadir Nuevo Contador
            </h2>
            <span className="text-[11px] font-mono text-slate-500">TALLY MANAGER</span>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTally()}
              placeholder="Etiqueta del contador (ej: Victorias, Intentos de Boss, Caídas)..."
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
            <button
              onClick={addTally}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-900/30 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" /> Añadir Contador
            </button>
          </div>
        </div>

        {/* Tallies Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {board.tallies.map((tally) => (
            <div
              key={tally.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-xl relative overflow-hidden"
              style={{ borderTop: `4px solid ${tally.color}` }}
            >
              <div
                className="absolute top-0 right-0 w-48 h-48 blur-[70px] rounded-full -mr-16 -mt-16 pointer-events-none opacity-20"
                style={{ backgroundColor: tally.color }}
              />

              <div className="relative z-10 flex items-center justify-between">
                <h3 className="font-black text-base text-white uppercase tracking-tight">{tally.label}</h3>
                <button
                  onClick={() => removeTally(tally.id)}
                  className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="relative z-10 my-6 text-center bg-slate-950 border border-slate-800 rounded-2xl py-6">
                <span className="font-mono text-6xl sm:text-7xl font-black text-white leading-none tracking-tighter">
                  {tally.count}
                </span>
              </div>

              <div className="relative z-10 grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => adjustTally(tally.id, -1)}
                  className="rounded-2xl border border-rose-800/40 bg-rose-950/40 hover:bg-rose-900 py-3 font-mono font-bold text-rose-300 text-lg active:scale-95 transition-all"
                >
                  -1
                </button>
                <button
                  onClick={() => adjustTally(tally.id, 1)}
                  className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 py-3 font-mono font-bold text-white text-lg shadow-lg shadow-indigo-900/30 active:scale-95 transition-all"
                >
                  +1
                </button>
                <button
                  onClick={() => adjustTally(tally.id, 5)}
                  className="rounded-2xl bg-slate-800/90 hover:bg-slate-700 py-3 font-mono font-bold text-slate-200 text-lg border border-slate-700 active:scale-95 transition-all"
                >
                  +5
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
