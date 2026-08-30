import React, { useState, useEffect } from 'react';
import { ScoreboardData } from '../types';
import { saveBoard, broadcastTriggerSound } from '../utils/storage';
import { initRealtimeSync, publishBoardUpdate } from '../utils/realtimeSync';
import { playSound } from '../utils/audio';
import {
  Target,
  Plus,
  Minus,
  ChevronLeft,
  Copy,
  Check,
  Tv,
  Sparkles
} from 'lucide-react';
import { ConfettiEffect } from './ConfettiEffect';

interface GoalControllerProps {
  board: ScoreboardData;
  onBack: () => void;
  onOpenObsHelp: () => void;
}

export const GoalController: React.FC<GoalControllerProps> = ({
  board: initialBoard,
  onBack,
  onOpenObsHelp,
}) => {
  const [board, setBoard] = useState<ScoreboardData>(initialBoard);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Cloud Realtime sync
  useEffect(() => {
    publishBoardUpdate(board);
    const cleanup = initRealtimeSync(board.id, undefined, undefined, true);
    return () => cleanup();
  }, [board.id]);

  const goal = board.goalConfig || {
    current: 0,
    target: 100,
    title: 'Meta de Stream',
    unit: 'subs',
    showPercentage: true,
  };

  const updateBoard = (updater: (prev: ScoreboardData) => ScoreboardData) => {
    setBoard((prev) => {
      const next = updater(prev);
      saveBoard(next);
      return next;
    });
  };

  const adjustGoal = (delta: number) => {
    updateBoard((prev) => {
      const g = prev.goalConfig || { current: 0, target: 100, title: 'Meta', unit: 'subs', showPercentage: true };
      const newCurrent = Math.max(0, g.current + delta);
      if (newCurrent >= g.target && g.current < g.target) {
        setShowConfetti(true);
        playSound('fanfare', 0.7);
        broadcastTriggerSound('fanfare', 0.7);
      } else if (delta > 0) {
        playSound('point', 0.5);
      }
      return {
        ...prev,
        goalConfig: {
          ...g,
          current: newCurrent,
        },
      };
    });
  };

  const overlayUrl = `${window.location.origin}/?mode=overlay&id=${board.id}`;

  const copyObsUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const percentage = Math.min(100, Math.round((goal.current / goal.target) * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-16">
      <ConfettiEffect trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

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
                  GOAL LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">Barra de Metas de Suscriptores / Donaciones // OBS Studio</p>
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
        {/* Progress Bento Box */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">PROGRESO ACTUAL</span>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">{goal.title}</h2>
            </div>
            <div className="text-right">
              <span className="font-mono text-3xl font-black text-indigo-400">
                {goal.current} <span className="text-slate-500 text-lg">/ {goal.target}</span>
              </span>
              <span className="text-xs font-mono uppercase text-slate-400 block tracking-wider">{goal.unit}</span>
            </div>
          </div>

          {/* Big Progress Bar */}
          <div className="relative z-10 h-8 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800 p-1">
            <div
              className="h-full rounded-full bg-indigo-600 shadow-lg shadow-indigo-600/50 transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${percentage}%` }}
            >
              {percentage > 12 && (
                <span className="text-[10px] font-mono font-black text-white">{percentage}%</span>
              )}
            </div>
          </div>

          <div className="relative z-10 flex justify-between text-xs font-mono text-slate-400">
            <span>0 {goal.unit}</span>
            <span className="text-emerald-400 font-bold">{percentage}% COMPLETADO</span>
            <span>{goal.target} {goal.unit}</span>
          </div>

          {/* Quick Increment Buttons */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-800/80">
            <button
              onClick={() => adjustGoal(1)}
              className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 py-3 font-bold text-white shadow-lg shadow-indigo-900/30 text-base active:scale-95 transition-all"
            >
              +1
            </button>
            <button
              onClick={() => adjustGoal(5)}
              className="rounded-2xl bg-indigo-700 hover:bg-indigo-600 py-3 font-bold text-white shadow-lg shadow-indigo-900/30 text-base active:scale-95 transition-all"
            >
              +5
            </button>
            <button
              onClick={() => adjustGoal(10)}
              className="rounded-2xl bg-indigo-800 hover:bg-indigo-700 py-3 font-bold text-white shadow-lg shadow-indigo-900/30 text-base active:scale-95 transition-all"
            >
              +10
            </button>
            <button
              onClick={() => adjustGoal(-1)}
              className="rounded-2xl border border-rose-800/40 bg-rose-950/40 hover:bg-rose-900 py-3 font-bold text-rose-300 text-base active:scale-95 transition-all"
            >
              -1
            </button>
            <button
              onClick={() => {
                setShowConfetti(true);
                playSound('fanfare', 0.7);
                broadcastTriggerSound('fanfare', 0.7);
              }}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 py-3 font-bold text-amber-300 text-xs active:scale-95 transition-all"
            >
              <Sparkles className="h-4 w-4" /> Meta Completa
            </button>
          </div>
        </div>

        {/* Goal Settings Form Bento Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-indigo-400" /> Configuración de la Meta
            </h3>
            <span className="text-[11px] font-mono text-slate-500">PARÁMETROS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Título de la Meta</label>
              <input
                type="text"
                value={goal.title}
                onChange={(e) =>
                  updateBoard((p) => ({
                    ...p,
                    goalConfig: { ...goal, title: e.target.value },
                  }))
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Meta Objetivo (Target)</label>
              <input
                type="number"
                value={goal.target}
                onChange={(e) =>
                  updateBoard((p) => ({
                    ...p,
                    goalConfig: { ...goal, target: Math.max(1, parseInt(e.target.value) || 1) },
                  }))
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-mono text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Unidad (subs, followers, €)</label>
              <input
                type="text"
                value={goal.unit}
                onChange={(e) =>
                  updateBoard((p) => ({
                    ...p,
                    goalConfig: { ...goal, unit: e.target.value },
                  }))
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
