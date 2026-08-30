import React, { useState, useEffect } from 'react';
import { ScoreboardData, PlayerScore } from '../types';
import { saveBoard, broadcastTriggerSound } from '../utils/storage';
import { initRealtimeSync, publishBoardUpdate } from '../utils/realtimeSync';
import { playSound } from '../utils/audio';
import {
  Trophy,
  Plus,
  Trash2,
  ChevronLeft,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Tv,
  Sparkles,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';
import { ConfettiEffect } from './ConfettiEffect';

interface LeaderboardControllerProps {
  board: ScoreboardData;
  onBack: () => void;
  onOpenObsHelp: () => void;
}

export const LeaderboardController: React.FC<LeaderboardControllerProps> = ({
  board: initialBoard,
  onBack,
  onOpenObsHelp,
}) => {
  const [board, setBoard] = useState<ScoreboardData>(initialBoard);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmoji, setNewPlayerEmoji] = useState('🎮');

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

  const adjustPlayerScore = (playerId: string, delta: number) => {
    updateBoard((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId ? { ...p, score: Math.max(0, p.score + delta) } : p
      ),
    }));
    if (delta > 0) {
      playSound('point', 0.5);
      broadcastTriggerSound('point', 0.5);
    }
  };

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    const newP: PlayerScore = {
      id: 'p_' + Math.random().toString(36).substring(2, 8),
      name: newPlayerName.trim(),
      avatarEmoji: newPlayerEmoji || '👤',
      color: colors[board.players.length % colors.length],
      score: 0,
      streak: 0,
    };
    updateBoard((prev) => ({
      ...prev,
      players: [...prev.players, newP],
    }));
    setNewPlayerName('');
    playSound('click', 0.4);
  };

  const removePlayer = (id: string) => {
    updateBoard((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== id),
    }));
  };

  const resetAllScores = () => {
    if (window.confirm('¿Reiniciar los puntos de todos los jugadores a 0?')) {
      updateBoard((prev) => ({
        ...prev,
        players: prev.players.map((p) => ({ ...p, score: 0, streak: 0 })),
      }));
    }
  };

  const celebrateWinner = () => {
    setShowConfetti(true);
    playSound('fanfare', 0.7);
    broadcastTriggerSound('fanfare', 0.7);
  };

  const overlayUrl = `${window.location.origin}/?mode=overlay&id=${board.id}`;

  const copyObsUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  // Sort players descending for view
  const sortedPlayers = [...board.players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-16">
      <ConfettiEffect trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 py-3.5 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
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
                  LEADERBOARD LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">Tabla de Posiciones & Trivia // OBS Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={celebrateWinner}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" /> Celebrar Ganador
            </button>
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

      {/* Main Content */}
      <main className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
        {/* Quick Add Player Bento Bar */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/5 blur-[60px] rounded-full -mr-16 -mt-16 pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-amber-400" /> Añadir Nuevo Participante / Jugador
            </h2>
            <span className="text-[11px] font-mono text-slate-500">CONTROL EN VIVO</span>
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={newPlayerEmoji}
              onChange={(e) => setNewPlayerEmoji(e.target.value)}
              className="w-14 text-center rounded-xl border border-slate-800 bg-slate-950 py-2.5 text-lg text-white focus:outline-none focus:border-indigo-500"
              placeholder="🎮"
            />
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
              placeholder="Nombre del jugador o equipo..."
              className="flex-1 min-w-[200px] rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
            <button
              onClick={addPlayer}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-900/30 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" /> Añadir Jugador
            </button>
            <button
              onClick={resetAllScores}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-medium text-slate-400 hover:text-rose-400 ml-auto transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Resetear Puntos
            </button>
          </div>
        </div>

        {/* Players List Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest px-2">
            <span>Ranking & Participantes ({sortedPlayers.length})</span>
            <span>Ajuste Rápido de Puntos</span>
          </div>

          {sortedPlayers.map((player, idx) => (
            <div
              key={player.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 sm:p-5 transition-all shadow-xl ${
                idx === 0
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 border border-indigo-400/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-200'
              }`}
            >
              {/* Left Info */}
              <div className="flex items-center gap-3.5">
                <span
                  className={`font-mono font-black italic text-2xl w-10 text-center ${
                    idx === 0 ? 'text-white/60' : 'text-slate-600'
                  }`}
                >
                  {idx < 9 ? `0${idx + 1}` : idx + 1}
                </span>
                <span className="text-3xl">{player.avatarEmoji || '👤'}</span>
                <div>
                  <h3 className="font-black text-base uppercase tracking-tight text-white">
                    {player.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`font-mono text-xs ${idx === 0 ? 'text-indigo-200' : 'text-slate-400'}`}>
                      Posición #{idx + 1}
                    </span>
                    {player.streak && player.streak > 1 && (
                      <span className="flex items-center text-[10px] font-bold text-amber-300 bg-black/30 px-2 py-0.5 rounded-full">
                        <Flame className="h-3 w-3 mr-0.5 text-amber-400" /> Racha {player.streak}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Score & Increment Buttons */}
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-xl px-5 py-2 font-mono text-2xl font-black min-w-[90px] text-center border ${
                    idx === 0
                      ? 'bg-indigo-950/60 border-indigo-400/40 text-white'
                      : 'bg-slate-950 border-slate-800 text-indigo-400'
                  }`}
                >
                  {player.score}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => adjustPlayerScore(player.id, 10)}
                    className={`rounded-xl px-3 py-2 text-xs font-bold transition-all active:scale-95 ${
                      idx === 0
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30'
                    }`}
                  >
                    +10
                  </button>
                  <button
                    onClick={() => adjustPlayerScore(player.id, 50)}
                    className={`rounded-xl px-3 py-2 text-xs font-bold transition-all active:scale-95 ${
                      idx === 0
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-indigo-700 hover:bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                    }`}
                  >
                    +50
                  </button>
                  <button
                    onClick={() => adjustPlayerScore(player.id, 1)}
                    className={`rounded-xl px-2.5 py-2 text-xs font-bold border transition-all active:scale-95 ${
                      idx === 0
                        ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    +1
                  </button>
                  <button
                    onClick={() => adjustPlayerScore(player.id, -10)}
                    className={`rounded-xl px-2.5 py-2 text-xs font-bold border active:scale-95 transition-all ${
                      idx === 0
                        ? 'bg-black/30 border-black/40 text-rose-200 hover:bg-black/50'
                        : 'bg-rose-950/40 border-rose-800/40 text-rose-400 hover:bg-rose-900'
                    }`}
                  >
                    -10
                  </button>

                  <button
                    onClick={() => removePlayer(player.id)}
                    className={`rounded-xl p-2 transition-colors ml-1 ${
                      idx === 0 ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-rose-400'
                    }`}
                    title="Eliminar jugador"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
