import React, { useState, useEffect, useRef } from 'react';
import { ScoreboardData, OverlayLayout, FontFamilyChoice, OverlayBackground } from '../types';
import { saveBoard, broadcastTriggerSound, duplicateBoard, exportSingleBoardToJson } from '../utils/storage';
import { initRealtimeSync, publishBoardUpdate, encodeBoardToUrlParam } from '../utils/realtimeSync';
import { getOverlayUrl } from '../utils/urlHelper';
import { playSound } from '../utils/audio';
import { compressImageFile } from '../utils/imageCompressor';
import { POPULAR_TEAMS_PRESETS, COMPETITION_PRESETS } from '../data/teamPresets';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Settings,
  Tv,
  Copy,
  Check,
  ExternalLink,
  Volume2,
  VolumeX,
  Keyboard,
  Sparkles,
  Layers,
  Palette,
  Type,
  Flag,
  Radio,
  Share2,
  ChevronLeft,
  Flame,
  Clock,
  ArrowRightLeft,
  Upload,
  Image as ImageIcon,
  Shield,
  Trophy,
  Star,
  Save,
  Download,
  Copy as DuplicateIcon,
  CheckCircle2
} from 'lucide-react';
import { ConfettiEffect } from './ConfettiEffect';
import { OverlayLivePreview } from './OverlayLivePreview';

interface BoardControllerProps {
  board: ScoreboardData;
  onBack: () => void;
  onOpenObsHelp: () => void;
}

export const BoardController: React.FC<BoardControllerProps> = ({
  board: initialBoard,
  onBack,
  onOpenObsHelp,
}) => {
  const [board, setBoard] = useState<ScoreboardData>(initialBoard);
  const [activeTab, setActiveTab] = useState<'controls' | 'customization' | 'teams' | 'hotkeys'>('controls');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showHotkeysModal, setShowHotkeysModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [isUploadingLogo, setIsUploadingLogo] = useState<string | null>(null);
  const [layoutSavedNotice, setLayoutSavedNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [titleInputValue, setTitleInputValue] = useState<string>(initialBoard.title);

  // Explicit save action with visual feedback
  const handleExplicitSave = (customMsg?: string) => {
    setIsSaving(true);
    const updated = saveBoard(board);
    setLastSaved(Date.now());
    setTimeout(() => {
      setIsSaving(false);
      setSaveToastMessage(customMsg || '¡Cambios guardados con éxito! Los nombres, escudos y diseño del overlay permanecen guardados permanentemente.');
      setTimeout(() => setSaveToastMessage(null), 3500);
    }, 200);
  };

  const handleTabSwitch = (newTab: 'controls' | 'customization' | 'teams' | 'hotkeys') => {
    // Commit current board state immediately so no changes are lost
    saveBoard(board);
    setLastSaved(Date.now());
    setActiveTab(newTab);
  };

  const handleSafeBack = () => {
    saveBoard(board);
    onBack();
  };

  const handleSaveTitle = () => {
    if (titleInputValue.trim()) {
      updateBoard((p) => ({
        ...p,
        title: titleInputValue.trim(),
      }));
      setIsEditingTitle(false);
      handleExplicitSave(`Título del marcador actualizado a "${titleInputValue.trim()}"`);
    } else {
      setIsEditingTitle(false);
    }
  };

  const handleSelectLayout = (layoutId: OverlayLayout, label: string) => {
    updateBoard((p) => ({
      ...p,
      overlay: { ...p.overlay, layout: layoutId },
    }));
    setLayoutSavedNotice(`Diseño "${label}" guardado`);
    setSaveToastMessage(`Diseño "${label}" guardado y aplicado a OBS.`);
    setTimeout(() => setLayoutSavedNotice(null), 3000);
    setTimeout(() => setSaveToastMessage(null), 3500);
  };

  // Initialize Realtime Cloud Sync (MQTT / WebSockets) so OBS Browser Source syncs from any machine/process
  useEffect(() => {
    // Initial publish
    publishBoardUpdate(board);

    const cleanup = initRealtimeSync(
      board.id,
      undefined,
      undefined,
      true // Is controller: answers REQUEST_STATE pings from OBS!
    );

    // Heartbeat publish every 5 seconds to ensure OBS stays 100% in sync
    const heartbeat = setInterval(() => {
      publishBoardUpdate(board);
    }, 5000);

    return () => {
      cleanup();
      clearInterval(heartbeat);
    };
  }, [board.id]);

  // Sync state changes to storage & BroadcastChannel & Cloud Relay
  const updateBoard = (updater: (prev: ScoreboardData) => ScoreboardData) => {
    setBoard((prev) => {
      const next = updater(prev);
      saveBoard(next);
      setLastSaved(Date.now());
      return next;
    });
  };

  const handleDuplicateCurrent = () => {
    const dup = duplicateBoard(board.id);
    if (dup) {
      alert(`¡Marcador duplicado con éxito como "${dup.title}"! Puedes encontrarlo en el Dashboard.`);
    }
  };

  const handleExportSingle = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(exportSingleBoardToJson(board));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `marcador_${board.id}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Image Upload with Automatic Safe Compression (prevents quota issues & maximizes OBS fps)
  const handleUploadImage = async (file: File, target: 'home' | 'away' | 'league') => {
    try {
      setIsUploadingLogo(target);
      const compressedDataUrl = await compressImageFile(file, target === 'league' ? 400 : 320);
      if (target === 'home') {
        updateBoard((p) => ({
          ...p,
          homeTeam: { ...p.homeTeam, logoUrl: compressedDataUrl },
        }));
      } else if (target === 'away') {
        updateBoard((p) => ({
          ...p,
          awayTeam: { ...p.awayTeam, logoUrl: compressedDataUrl },
        }));
      } else if (target === 'league') {
        updateBoard((p) => ({
          ...p,
          overlay: { ...p.overlay, leagueLogoUrl: compressedDataUrl },
        }));
      }
    } catch (err) {
      console.error('Error compressing image:', err);
      alert('No se pudo procesar la imagen seleccionada.');
    } finally {
      setIsUploadingLogo(null);
    }
  };

  // Timer Tick
  useEffect(() => {
    let interval: number;
    if (board.timer.isRunning) {
      interval = window.setInterval(() => {
        setBoard((prev) => {
          if (!prev.timer.isRunning) return prev;
          const isCountDown = prev.timer.direction === 'countdown';
          const nextSec = isCountDown
            ? Math.max(0, prev.timer.seconds - 1)
            : prev.timer.seconds + 1;

          if (isCountDown && nextSec === 0 && prev.timer.seconds > 0) {
            if (prev.overlay.soundEnabled) {
              playSound('buzzer', prev.overlay.soundVolume);
              broadcastTriggerSound('buzzer', prev.overlay.soundVolume);
            }
          }

          const updated = {
            ...prev,
            timer: {
              ...prev.timer,
              seconds: nextSec,
              isRunning: isCountDown && nextSec === 0 ? false : prev.timer.isRunning,
            },
          };
          saveBoard(updated);
          return updated;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [board.timer.isRunning, board.timer.direction]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'q':
          e.preventDefault();
          adjustScore('home', 1);
          break;
        case 'w':
          e.preventDefault();
          adjustScore('home', -1);
          break;
        case 'o':
          e.preventDefault();
          adjustScore('away', 1);
          break;
        case 'p':
          e.preventDefault();
          adjustScore('away', -1);
          break;
        case ' ':
          e.preventDefault();
          toggleTimer();
          break;
        case 'r':
          e.preventDefault();
          resetTimer();
          break;
        case 'b':
          e.preventDefault();
          triggerSound('buzzer');
          break;
        case 'g':
          e.preventDefault();
          triggerSound('goal');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board]);

  const adjustScore = (team: 'home' | 'away', delta: number) => {
    updateBoard((prev) => {
      const isHome = team === 'home';
      const targetTeam = isHome ? prev.homeTeam : prev.awayTeam;
      const newScore = Math.max(0, targetTeam.score + delta);

      if (delta > 0 && prev.overlay.soundEnabled) {
        playSound('point', prev.overlay.soundVolume);
        broadcastTriggerSound('point', prev.overlay.soundVolume);
      }

      return {
        ...prev,
        [isHome ? 'homeTeam' : 'awayTeam']: {
          ...targetTeam,
          score: newScore,
        },
      };
    });
  };

  const adjustSets = (team: 'home' | 'away', delta: number) => {
    updateBoard((prev) => {
      const isHome = team === 'home';
      const targetTeam = isHome ? prev.homeTeam : prev.awayTeam;
      return {
        ...prev,
        [isHome ? 'homeTeam' : 'awayTeam']: {
          ...targetTeam,
          sets: Math.max(0, targetTeam.sets + delta),
        },
      };
    });
  };

  const toggleTimer = () => {
    updateBoard((prev) => ({
      ...prev,
      timer: {
        ...prev.timer,
        isRunning: !prev.timer.isRunning,
      },
    }));
    playSound('click', 0.4);
  };

  const resetTimer = () => {
    updateBoard((prev) => ({
      ...prev,
      timer: {
        ...prev.timer,
        seconds: prev.timer.initialSeconds,
        isRunning: false,
      },
    }));
    playSound('click', 0.4);
  };

  const adjustTimerMinutes = (minutes: number) => {
    updateBoard((prev) => ({
      ...prev,
      timer: {
        ...prev.timer,
        seconds: Math.max(0, prev.timer.seconds + minutes * 60),
      },
    }));
  };

  const setTimerDirection = (direction: 'countup' | 'countdown') => {
    updateBoard((prev) => ({
      ...prev,
      timer: {
        ...prev.timer,
        direction,
      },
    }));
  };

  const setPeriod = (period: string) => {
    updateBoard((prev) => ({
      ...prev,
      timer: {
        ...prev.timer,
        periodLabel: period,
      },
    }));
  };

  const togglePossession = () => {
    updateBoard((prev) => ({
      ...prev,
      homeTeam: { ...prev.homeTeam, serving: !prev.homeTeam.serving },
      awayTeam: { ...prev.awayTeam, serving: !prev.awayTeam.serving },
    }));
    playSound('click', 0.4);
  };

  const resetAllScores = () => {
    if (window.confirm('¿Reiniciar el marcador a 0 - 0?')) {
      updateBoard((prev) => ({
        ...prev,
        homeTeam: { ...prev.homeTeam, score: 0, sets: 0, fouls: 0 },
        awayTeam: { ...prev.awayTeam, score: 0, sets: 0, fouls: 0 },
        timer: { ...prev.timer, seconds: prev.timer.initialSeconds, isRunning: false },
      }));
    }
  };

  const isMuted = !board.overlay.soundEnabled || (board.overlay.soundVolume ?? 0.7) === 0;

  const toggleSoundMute = () => {
    const nextState = isMuted; // If currently muted, turn ON; if ON, turn OFF
    updateBoard((prev) => ({
      ...prev,
      overlay: {
        ...prev.overlay,
        soundEnabled: nextState,
        soundVolume: nextState && (prev.overlay.soundVolume || 0) === 0 ? 0.7 : prev.overlay.soundVolume,
      },
    }));
    setSaveToastMessage(nextState ? '🔊 Sonido activado' : '🔇 Sonido silenciado (Mute)');
    setTimeout(() => setSaveToastMessage(null), 2500);
    if (nextState) {
      playSound('click', 0.4);
    }
  };

  const setSoundVolume = (volume: number) => {
    updateBoard((prev) => ({
      ...prev,
      overlay: {
        ...prev.overlay,
        soundVolume: volume,
        soundEnabled: volume > 0,
      },
    }));
  };

  const triggerSound = (type: 'buzzer' | 'whistle' | 'goal' | 'fanfare' | 'point') => {
    if (!isMuted) {
      playSound(type, board.overlay.soundVolume || 0.7);
      broadcastTriggerSound(type, board.overlay.soundVolume || 0.7);
    } else {
      setSaveToastMessage('🔇 El sonido está silenciado (Mute). Actívalo con el botón de sonido.');
      setTimeout(() => setSaveToastMessage(null), 2500);
    }
    if (type === 'goal' || type === 'fanfare') {
      setShowConfetti(true);
    }
  };

  const overlayUrl = getOverlayUrl(board.id);
  const mutedOverlayUrl = getOverlayUrl(board.id, { muted: true });

  const copyObsUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const minutes = Math.floor(board.timer.seconds / 60);
  const seconds = board.timer.seconds % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const periodPresets =
    board.sport === 'basketball'
      ? ['Q1', 'Q2', 'Q3', 'Q4', 'OT', 'FINAL']
      : board.sport === 'soccer'
      ? ['1T', '2T', 'ET1', 'ET2', 'PEN', 'FINAL']
      : board.sport === 'esports'
      ? ['MAPA 1', 'MAPA 2', 'MAPA 3', 'MAPA 4', 'MAPA 5', 'FINAL']
      : ['SET 1', 'SET 2', 'SET 3', 'SET 4', 'SET 5', 'FINAL'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-16">
      <ConfettiEffect trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 py-3.5 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              onClick={handleSafeBack}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" /> Dashboard
            </button>
            <div>
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={titleInputValue}
                      onChange={(e) => setTitleInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle();
                        if (e.key === 'Escape') setIsEditingTitle(false);
                      }}
                      autoFocus
                      className="bg-slate-900 border border-indigo-500 rounded-lg px-2 py-0.5 text-sm font-bold text-white uppercase focus:outline-none"
                    />
                    <button
                      onClick={handleSaveTitle}
                      className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-base font-black text-white tracking-tight uppercase">{board.title}</h1>
                    <button
                      onClick={() => {
                        setTitleInputValue(board.title);
                        setIsEditingTitle(true);
                      }}
                      title="Editar nombre del marcador"
                      className="text-slate-500 hover:text-indigo-400 p-0.5 rounded transition-colors"
                    >
                      <Settings className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-[10px] font-bold tracking-wider flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  LIVE OVERLAY
                </span>
                <span
                  title="Todos tus cambios se guardan instantáneamente en tu navegador y en memoria local protegida"
                  className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900 text-slate-300 rounded-full border border-slate-700/80 text-[10px] font-mono"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Guardado
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">KeepScore Control Room // OBS Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Audio Mute / Sound Toggle Button */}
            <button
              onClick={toggleSoundMute}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                !isMuted
                  ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
                  : 'border-rose-800/60 bg-rose-950/50 text-rose-300 hover:bg-rose-900/60'
              }`}
              title={
                !isMuted
                  ? '🔊 Sonido Activado: Clic para silenciar (Mute)'
                  : '🔇 Sonido Silenciado (Mute): Clic para activar efectos de audio'
              }
            >
              {!isMuted ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Sonido ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Silenciado</span>
                </>
              )}
            </button>

            {/* Explicit Save Changes Button */}
            <button
              onClick={() => handleExplicitSave('¡Todos los cambios se han guardado permanentemente!')}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              title="Guardar todos los cambios de nombres, diseño y ajustes permanentemente"
            >
              <Save className={`h-3.5 w-3.5 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
            </button>

            {/* Duplicate current board button */}
            <button
              onClick={handleDuplicateCurrent}
              title="Duplicar este marcador para crear una nueva versión independiente"
              className="hidden lg:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <DuplicateIcon className="h-3.5 w-3.5" /> Duplicar
            </button>

            {/* Export single board JSON */}
            <button
              onClick={handleExportSingle}
              title="Descargar copia de seguridad de este marcador (.json)"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Copia JSON
            </button>

            {/* Quick OBS Link */}
            <button
              onClick={copyObsUrl}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-900/30 hover:bg-indigo-500 transition-all active:scale-95"
            >
              {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedUrl ? '¡URL Copiada!' : 'Copiar URL OBS'}
            </button>

            {/* Test Overlay */}
            <a
              href={overlayUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Overlay Limpio
            </a>

            {/* OBS Guide */}
            <button
              onClick={onOpenObsHelp}
              className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Guía OBS"
            >
              <Tv className="h-4 w-4 text-indigo-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => handleTabSwitch('controls')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'controls'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Radio className="h-4 w-4" /> Marcador & Reloj
            </button>
            <button
              onClick={() => handleTabSwitch('teams')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'teams'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Flag className="h-4 w-4" /> Equipos & Nombres
            </button>
            <button
              onClick={() => handleTabSwitch('customization')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'customization'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Layers className="h-4 w-4" /> Diseño OBS Overlay
            </button>
          </div>

          <button
            onClick={() => setShowHotkeysModal(!showHotkeysModal)}
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
          >
            <Keyboard className="h-3.5 w-3.5" /> Atajos de Teclado
          </button>
        </div>

        {/* TAB 1: CONTROLS (SCOREKEEPER & TIMER) */}
        {activeTab === 'controls' && (
          <div className="space-y-6">
            {/* MATCH CONTROL GRID */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* HOME TEAM CONTROLLER */}
              <div
                className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between"
                style={{ borderTop: `4px solid ${board.homeTeam.color}` }}
              >
                {/* Bento Ambient Glow */}
                <div
                  className="absolute top-0 right-0 w-48 h-48 blur-[70px] rounded-full -mr-16 -mt-16 pointer-events-none opacity-20"
                  style={{ backgroundColor: board.homeTeam.color }}
                />

                {/* Team Info Header */}
                <div className="relative z-10 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{board.homeTeam.logoEmoji || '🔴'}</span>
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">
                        {board.homeTeam.name}
                      </h2>
                      <span className="text-xs font-mono text-slate-500">
                        {board.homeTeam.shortName || 'LOCAL'}
                      </span>
                    </div>
                  </div>

                  {/* Serving / Possession Toggle */}
                  <button
                    onClick={togglePossession}
                    className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      board.homeTeam.serving
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                        : 'bg-slate-800/80 text-slate-500 hover:text-slate-300 border border-slate-700/50'
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5" /> Saque
                  </button>
                </div>

                {/* Big Score Display */}
                <div className="relative z-10 my-4 flex items-center justify-center rounded-2xl bg-slate-950 border border-slate-800/80 py-8">
                  <span
                    className="font-mono text-7xl sm:text-8xl font-black text-white tracking-tighter leading-none"
                    style={{ textShadow: `0 0 40px ${board.homeTeam.color}35` }}
                  >
                    {board.homeTeam.score}
                  </span>
                </div>

                {/* Score Increment Action Buttons */}
                <div className="relative z-10 grid grid-cols-4 gap-2 mb-4">
                  <button
                    onClick={() => adjustScore('home', 1)}
                    className="flex flex-col items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-500 py-3.5 font-bold text-white shadow-lg shadow-indigo-900/30 active:scale-95 transition-all"
                  >
                    <span className="text-xl font-black">+1</span>
                    <span className="text-[10px] text-indigo-200 uppercase font-medium">Punto</span>
                  </button>
                  <button
                    onClick={() => adjustScore('home', 2)}
                    className="flex flex-col items-center justify-center rounded-2xl bg-slate-800/90 hover:bg-slate-700 py-3.5 font-bold text-white border border-slate-700 active:scale-95 transition-all"
                  >
                    <span className="text-xl font-black">+2</span>
                    <span className="text-[10px] text-slate-400 font-medium">Canasta</span>
                  </button>
                  <button
                    onClick={() => adjustScore('home', 3)}
                    className="flex flex-col items-center justify-center rounded-2xl bg-slate-800/90 hover:bg-slate-700 py-3.5 font-bold text-white border border-slate-700 active:scale-95 transition-all"
                  >
                    <span className="text-xl font-black">+3</span>
                    <span className="text-[10px] text-slate-400 font-medium">Triple</span>
                  </button>
                  <button
                    onClick={() => adjustScore('home', -1)}
                    className="flex flex-col items-center justify-center rounded-2xl bg-rose-950/40 hover:bg-rose-900 border border-rose-800/40 py-3.5 font-bold text-rose-300 active:scale-95 transition-all"
                  >
                    <span className="text-xl font-black">-1</span>
                    <span className="text-[10px] text-rose-400 font-medium">Corregir</span>
                  </button>
                </div>

                {/* Sets / Fouls Section */}
                <div className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">Sets / Mapas:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => adjustSets('home', -1)}
                        className="h-6 w-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-700"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-indigo-400 text-sm px-1.5">
                        {board.homeTeam.sets}
                      </span>
                      <button
                        onClick={() => adjustSets('home', 1)}
                        className="h-6 w-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">Atajos: [Q] +1 | [W] -1</span>
                </div>
              </div>

              {/* CENTER GAME CLOCK & MATCH CONTROLLER */}
              <div className="lg:col-span-2 flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 relative overflow-hidden">
                <div className="text-center">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-2">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" /> Reloj
                  </div>

                  {/* Digital Clock */}
                  <div className="rounded-2xl bg-slate-950 border border-slate-800 py-4 shadow-inner">
                    <span className="font-mono text-3xl sm:text-4xl font-black text-indigo-400 tracking-wider">
                      {formattedTime}
                    </span>
                  </div>
                </div>

                {/* Play / Pause / Reset Buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={toggleTimer}
                    className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold shadow-lg transition-all active:scale-95 ${
                      board.timer.isRunning
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                    }`}
                  >
                    {board.timer.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {board.timer.isRunning ? 'Pausar' : 'Iniciar Reloj'}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => adjustTimerMinutes(1)}
                      className="rounded-xl border border-slate-800 bg-slate-800/80 hover:bg-slate-700 py-2 text-xs font-bold text-slate-300"
                    >
                      +1 Min
                    </button>
                    <button
                      onClick={() => adjustTimerMinutes(-1)}
                      className="rounded-xl border border-slate-800 bg-slate-800/80 hover:bg-slate-700 py-2 text-xs font-bold text-slate-300"
                    >
                      -1 Min
                    </button>
                  </div>

                  <button
                    onClick={resetTimer}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset Reloj
                  </button>
                </div>

                {/* Direction Switcher */}
                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-[11px] font-bold">
                  <button
                    onClick={() => setTimerDirection('countup')}
                    className={`flex-1 rounded-lg py-1 transition-all ${
                      board.timer.direction === 'countup'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Progresivo
                  </button>
                  <button
                    onClick={() => setTimerDirection('countdown')}
                    className={`flex-1 rounded-lg py-1 transition-all ${
                      board.timer.direction === 'countdown'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Regresivo
                  </button>
                </div>

                {/* Period Selector */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5 text-center">
                    Periodo
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {periodPresets.map((period) => (
                      <button
                        key={period}
                        onClick={() => setPeriod(period)}
                        className={`rounded-lg py-1 text-[11px] font-bold transition-all ${
                          board.timer.periodLabel === period
                            ? 'bg-indigo-600 text-white font-black shadow-sm'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* AWAY TEAM CONTROLLER */}
              <div
                className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between"
                style={{ borderTop: `4px solid ${board.awayTeam.color}` }}
              >
                {/* Bento Ambient Glow */}
                <div
                  className="absolute top-0 right-0 w-48 h-48 blur-[70px] rounded-full -mr-16 -mt-16 pointer-events-none opacity-20"
                  style={{ backgroundColor: board.awayTeam.color }}
                />

                {/* Team Info Header */}
                <div className="relative z-10 flex items-center justify-between mb-4">
                  {/* Serving / Possession Toggle */}
                  <button
                    onClick={togglePossession}
                    className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      board.awayTeam.serving
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                        : 'bg-slate-800/80 text-slate-500 hover:text-slate-300 border border-slate-700/50'
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5" /> Saque
                  </button>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">
                        {board.awayTeam.name}
                      </h2>
                      <span className="text-xs font-mono text-slate-500">
                        {board.awayTeam.shortName || 'VISITANTE'}
                      </span>
                    </div>
                    <span className="text-3xl">{board.awayTeam.logoEmoji || '🔵'}</span>
                  </div>
                </div>

                {/* Big Score Display */}
                <div className="relative z-10 my-4 flex items-center justify-center rounded-2xl bg-slate-950 border border-slate-800/80 py-8">
                  <span
                    className="font-mono text-7xl sm:text-8xl font-black text-white tracking-tighter leading-none"
                    style={{ textShadow: `0 0 40px ${board.awayTeam.color}35` }}
                  >
                    {board.awayTeam.score}
                  </span>
                </div>

                {/* Score Increment Action Buttons */}
                <div className="relative z-10 grid grid-cols-4 gap-2 mb-4">
                  <button
                    onClick={() => adjustScore('away', 1)}
                    className="flex flex-col items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-500 py-3.5 font-bold text-white shadow-lg shadow-indigo-900/30 active:scale-95 transition-all"
                  >
                    <span className="text-xl font-black">+1</span>
                    <span className="text-[10px] text-indigo-200 uppercase font-medium">Punto</span>
                  </button>
                  <button
                    onClick={() => adjustScore('away', 2)}
                    className="flex flex-col items-center justify-center rounded-2xl bg-slate-800/90 hover:bg-slate-700 py-3.5 font-bold text-white border border-slate-700 active:scale-95 transition-all"
                  >
                    <span className="text-xl font-black">+2</span>
                    <span className="text-[10px] text-slate-400 font-medium">Canasta</span>
                  </button>
                  <button
                    onClick={() => adjustScore('away', 3)}
                    className="flex flex-col items-center justify-center rounded-2xl bg-slate-800/90 hover:bg-slate-700 py-3.5 font-bold text-white border border-slate-700 active:scale-95 transition-all"
                  >
                    <span className="text-xl font-black">+3</span>
                    <span className="text-[10px] text-slate-400 font-medium">Triple</span>
                  </button>
                  <button
                    onClick={() => adjustScore('away', -1)}
                    className="flex flex-col items-center justify-center rounded-2xl bg-rose-950/40 hover:bg-rose-900 border border-rose-800/40 py-3.5 font-bold text-rose-300 active:scale-95 transition-all"
                  >
                    <span className="text-xl font-black">-1</span>
                    <span className="text-[10px] text-rose-400 font-medium">Corregir</span>
                  </button>
                </div>

                {/* Sets / Fouls Section */}
                <div className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                  <span className="text-[11px] font-mono text-slate-500">Atajos: [O] +1 | [P] -1</span>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">Sets / Mapas:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => adjustSets('away', -1)}
                        className="h-6 w-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-700"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-indigo-400 text-sm px-1.5">
                        {board.awayTeam.sets}
                      </span>
                      <button
                        onClick={() => adjustSets('away', 1)}
                        className="h-6 w-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BENTO ROW: QUICK SOUND EFFECTS & LIVE OBS API */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Sound Effects Bento Block */}
              <div className={`md:col-span-8 border rounded-3xl p-6 flex flex-col justify-between transition-colors ${
                isMuted 
                  ? 'bg-slate-900/40 border-slate-800/60' 
                  : 'bg-slate-800/30 border-slate-800'
              }`}>
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        {isMuted ? (
                          <VolumeX className="h-4 w-4 text-rose-400" />
                        ) : (
                          <Volume2 className="h-4 w-4 text-indigo-400" />
                        )}
                        Botonera de Audio en Vivo
                      </h2>
                      {isMuted && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-800/40 text-[10px] font-bold text-rose-300">
                          SILENCIADO
                        </span>
                      )}
                    </div>

                    {/* Quick Sound Controls Bar */}
                    <div className="flex items-center gap-3">
                      {/* Volume Slider */}
                      <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
                        <span className="text-[10px] font-semibold text-slate-400">Vol:</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : (board.overlay.soundVolume ?? 0.7)}
                          onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                          className="w-20 accent-indigo-500 cursor-pointer h-1.5"
                          title="Ajustar volumen general de efectos de sonido"
                        />
                        <span className="font-mono text-[10px] text-indigo-300 w-7 text-right">
                          {isMuted ? '0%' : `${Math.round((board.overlay.soundVolume ?? 0.7) * 100)}%`}
                        </span>
                      </div>

                      {/* Toggle Mute Switch */}
                      <button
                        onClick={toggleSoundMute}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                          !isMuted
                            ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
                            : 'border-rose-700/50 bg-rose-950/50 text-rose-300 hover:bg-rose-900/60'
                        }`}
                      >
                        {!isMuted ? (
                          <>
                            <Volume2 className="h-3.5 w-3.5" />
                            <span>Silenciar</span>
                          </>
                        ) : (
                          <>
                            <VolumeX className="h-3.5 w-3.5" />
                            <span>Activar Sonido</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => triggerSound('buzzer')}
                      className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold active:scale-95 transition-all ${
                        isMuted 
                          ? 'border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-900' 
                          : 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-amber-300'
                      }`}
                      title={isMuted ? 'Sonido silenciado' : 'Reproducir chicharra electrónica'}
                    >
                      🔊 Chicharra [B]
                    </button>
                    <button
                      onClick={() => triggerSound('whistle')}
                      className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold active:scale-95 transition-all ${
                        isMuted 
                          ? 'border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-900' 
                          : 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-indigo-300'
                      }`}
                      title={isMuted ? 'Sonido silenciado' : 'Reproducir silbato de árbitro'}
                    >
                      📣 Silbato Árbitro
                    </button>
                    <button
                      onClick={() => triggerSound('goal')}
                      className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold active:scale-95 transition-all ${
                        isMuted 
                          ? 'border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-900' 
                          : 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-rose-300'
                      }`}
                      title={isMuted ? 'Sonido silenciado (solo confeti)' : '¡Celebración de gol con bocina y confeti!'}
                    >
                      ⚽ ¡GOL! [G]
                    </button>
                    <button
                      onClick={() => triggerSound('fanfare')}
                      className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold active:scale-95 transition-all ${
                        isMuted 
                          ? 'border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-900' 
                          : 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-emerald-300'
                      }`}
                      title={isMuted ? 'Sonido silenciado (solo confeti)' : 'Fanfarria de victoria y confeti'}
                    >
                      🎉 Fanfarria Victoria
                    </button>
                    <button
                      onClick={resetAllScores}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-900/40 bg-rose-950/20 px-3.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-900/40 transition-colors ml-auto"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reiniciar 0-0
                    </button>
                  </div>
                </div>

                {isMuted && (
                  <p className="mt-3 text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                    <VolumeX className="h-3 w-3 text-rose-400 shrink-0" />
                    Audio silenciado: los overlays y controles no emitirán sonido.
                  </p>
                )}
              </div>

              {/* OBS Overlay Bento Block */}
              <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 text-indigo-400 font-bold text-xs">
                        OBS
                      </div>
                      <div>
                        <div className="text-white font-bold text-sm">URL Única de Overlay</div>
                        <div className="text-xs text-slate-500">Transparencia nativa & 60 FPS</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                      ID: {board.id}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-indigo-300 truncate select-all">
                    {overlayUrl}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={copyObsUrl}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2 px-3 text-xs font-bold text-white transition-all active:scale-95 shadow-md shadow-indigo-900/30"
                  >
                    {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedUrl ? '¡URL Copiada!' : 'Copiar URL para OBS'}
                  </button>
                  <a
                    href={overlayUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Probar en nueva pestaña"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEAMS & NAMES EDIT */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            {/* Action Save Banner Top */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Flag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Nombres, Siglas y Escudos de Equipos</h3>
                  <p className="text-xs text-slate-400">Todos los datos editados aquí permanecen guardados al cambiar al marcador o al reloj.</p>
                </div>
              </div>
              <button
                onClick={() => handleExplicitSave('¡Nombres y configuración de equipos guardados permanentemente!')}
                disabled={isSaving}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-900/30 active:scale-95 transition-all cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Nombres'}</span>
              </button>
            </div>

            {/* Quick Presets Picker Banner */}
            <div className="rounded-3xl border border-indigo-500/30 bg-slate-900/80 p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Escudos y Equipos Predefinidos (LaLiga, Fútbol y Esports)</h3>
                </div>
                <span className="text-[11px] text-slate-400">Haz clic para cargar plantilla rápida</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {POPULAR_TEAMS_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      // Apply to home or away depending on user confirmation or quick toggle
                      updateBoard((p) => ({
                        ...p,
                        homeTeam: {
                          ...p.homeTeam,
                          name: preset.name,
                          shortName: preset.shortName,
                          color: preset.color,
                          logoEmoji: preset.logoEmoji,
                          logoUrl: preset.logoUrl,
                        },
                      }));
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 hover:border-indigo-500 hover:text-white transition-all shadow-sm group"
                  >
                    {preset.logoUrl ? (
                      <img src={preset.logoUrl} alt={preset.name} className="h-4 w-4 object-contain" />
                    ) : (
                      <span>{preset.logoEmoji}</span>
                    )}
                    <span className="font-semibold">{preset.shortName}</span>
                    <span className="text-[10px] text-slate-500 group-hover:text-indigo-400">→ Local</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Home Settings */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    {board.homeTeam.logoUrl ? (
                      <img src={board.homeTeam.logoUrl} alt="Escudo" className="h-9 w-9 object-contain drop-shadow" />
                    ) : (
                      <span className="text-3xl">{board.homeTeam.logoEmoji || '🔴'}</span>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-white">Equipo Local (Home)</h3>
                      <span className="text-xs text-slate-400">Personaliza escudo y colores</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={board.homeTeam.name}
                    onChange={(e) =>
                      updateBoard((p) => ({
                        ...p,
                        homeTeam: { ...p.homeTeam, name: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Siglas (3-5 letras)</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={board.homeTeam.shortName}
                      onChange={(e) =>
                        updateBoard((p) => ({
                          ...p,
                          homeTeam: { ...p.homeTeam, shortName: e.target.value.toUpperCase() },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-mono text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Emoji Alternativo</label>
                    <input
                      type="text"
                      value={board.homeTeam.logoEmoji || ''}
                      onChange={(e) =>
                        updateBoard((p) => ({
                          ...p,
                          homeTeam: { ...p.homeTeam, logoEmoji: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      placeholder="⚽ 🏀 👑 🛡️"
                    />
                  </div>
                </div>

                {/* ESCUDO / LOGO IMAGE (URL & FILE UPLOAD) */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2">
                  <label className="text-xs font-bold text-indigo-300 flex items-center justify-between">
                    <span>Escudo Oficial (Imagen / Logo)</span>
                    <span className="text-[10px] text-slate-500 font-normal">PNG / SVG / WebP</span>
                  </label>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={board.homeTeam.logoUrl || ''}
                      placeholder="https://ejemplo.com/escudo.png"
                      onChange={(e) =>
                        updateBoard((p) => ({
                          ...p,
                          homeTeam: { ...p.homeTeam, logoUrl: e.target.value },
                        }))
                      }
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none font-mono"
                    />
                    <label className="cursor-pointer flex items-center justify-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 border border-slate-700 active:scale-95 transition-all">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploadingLogo === 'home' ? 'Guardando...' : 'Subir'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadImage(file, 'home');
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Color Principal de la Camiseta</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={board.homeTeam.color}
                      onChange={(e) =>
                        updateBoard((p) => ({
                          ...p,
                          homeTeam: { ...p.homeTeam, color: e.target.value },
                        }))
                      }
                      className="h-10 w-16 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                    />
                    <input
                      type="text"
                      value={board.homeTeam.color}
                      onChange={(e) =>
                        updateBoard((p) => ({
                          ...p,
                          homeTeam: { ...p.homeTeam, color: e.target.value },
                        }))
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Team Away Settings */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    {board.awayTeam.logoUrl ? (
                      <img src={board.awayTeam.logoUrl} alt="Escudo" className="h-9 w-9 object-contain drop-shadow" />
                    ) : (
                      <span className="text-3xl">{board.awayTeam.logoEmoji || '🔵'}</span>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-white">Equipo Visitante (Away)</h3>
                      <span className="text-xs text-slate-400">Personaliza escudo y colores</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={board.awayTeam.name}
                    onChange={(e) =>
                      updateBoard((p) => ({
                        ...p,
                        awayTeam: { ...p.awayTeam, name: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Siglas (3-5 letras)</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={board.awayTeam.shortName}
                      onChange={(e) =>
                        updateBoard((p) => ({
                          ...p,
                          awayTeam: { ...p.awayTeam, shortName: e.target.value.toUpperCase() },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-mono text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Emoji Alternativo</label>
                    <input
                      type="text"
                      value={board.awayTeam.logoEmoji || ''}
                      onChange={(e) =>
                        updateBoard((p) => ({
                          ...p,
                          awayTeam: { ...p.awayTeam, logoEmoji: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      placeholder="🔥 ⚡ ⚔️ 🔵"
                    />
                  </div>
                </div>

                {/* ESCUDO / LOGO IMAGE (URL & FILE UPLOAD) */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2">
                  <label className="text-xs font-bold text-indigo-300 flex items-center justify-between">
                    <span>Escudo Oficial (Imagen / Logo)</span>
                    <span className="text-[10px] text-slate-500 font-normal">PNG / SVG / WebP</span>
                  </label>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={board.awayTeam.logoUrl || ''}
                      placeholder="https://ejemplo.com/escudo.png"
                      onChange={(e) =>
                        updateBoard((p) => ({
                          ...p,
                          awayTeam: { ...p.awayTeam, logoUrl: e.target.value },
                        }))
                      }
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none font-mono"
                    />
                    <label className="cursor-pointer flex items-center justify-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 border border-slate-700 active:scale-95 transition-all">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploadingLogo === 'away' ? 'Guardando...' : 'Subir'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadImage(file, 'away');
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Color Principal de la Camiseta</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={board.awayTeam.color}
                      onChange={(e) =>
                        updateBoard((p) => ({
                          ...p,
                          awayTeam: { ...p.awayTeam, color: e.target.value },
                        }))
                      }
                      className="h-10 w-16 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                    />
                    <input
                      type="text"
                      value={board.awayTeam.color}
                      onChange={(e) =>
                        updateBoard((p) => ({
                          ...p,
                          awayTeam: { ...p.awayTeam, color: e.target.value },
                        }))
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Save Bar for Teams */}
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Configuración de Equipos Persistente</h4>
                  <p className="text-xs text-slate-400">Los cambios se guardan localmente y se conservan al cambiar al marcador o al reloj.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleTabSwitch('controls')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 transition-all cursor-pointer"
                >
                  <Radio className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Ir al Marcador</span>
                </button>
                <button
                  onClick={() => handleExplicitSave('¡Equipos y nombres guardados con éxito en memoria permanente!')}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/40 active:scale-95 transition-all cursor-pointer"
                >
                  <Save className={`h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>Guardar Nombres</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: OVERLAY CUSTOMIZATION (OBS LAYOUT, FONTS, BG, COMPETITION) */}
        {activeTab === 'customization' && (
          <div className="space-y-6">
            {/* Top Action banner for Overlay Design */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Diseño, Estilos y Formato de Overlay</h3>
                  <p className="text-xs text-slate-400">El formato seleccionado (TV LaLiga, Scorebug, etc.), colores y tipografía se mantendrán guardados permanentemente.</p>
                </div>
              </div>
              <button
                onClick={() => handleExplicitSave(`¡Diseño "${board.overlay.layout?.replace(/_/g, ' ') || 'Overlay'}" guardado permanentemente!`)}
                disabled={isSaving}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-900/30 active:scale-95 transition-all cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Diseño'}</span>
              </button>
            </div>

            {/* COMPETITION / LEAGUE BRANDING (LaLiga style) */}
            <div className="rounded-3xl border border-red-500/40 bg-slate-900 p-6 space-y-4 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                    LL
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Competición / Liga (Personalización TV)</h3>
                    <p className="text-xs text-slate-400">Personaliza el logo y colores para el formato TV LaLiga de España</p>
                  </div>
                </div>
              </div>

              {/* Competition Presets */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">Plantillas de Torneo</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {COMPETITION_PRESETS.map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() =>
                        updateBoard((p) => ({
                          ...p,
                          overlay: {
                            ...p.overlay,
                            leagueName: comp.name,
                            leagueLogoUrl: comp.logoUrl,
                            leagueColor: comp.color,
                          },
                        }))
                      }
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        board.overlay.leagueName === comp.name
                          ? 'border-red-500 bg-red-950/40 text-white shadow-md'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="h-3 w-3 rounded-full mb-1.5" style={{ backgroundColor: comp.color }} />
                      <span className="truncate w-full text-center">{comp.shortName}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Nombre de la Liga</label>
                  <input
                    type="text"
                    value={board.overlay.leagueName || 'LALIGA EA SPORTS'}
                    onChange={(e) =>
                      updateBoard((p) => ({
                        ...p,
                        overlay: { ...p.overlay, leagueName: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Color del Bloque de Liga</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={board.overlay.leagueColor || '#ff2b42'}
                      onChange={(e) =>
                        updateBoard((p) => ({
                          ...p,
                          overlay: { ...p.overlay, leagueColor: e.target.value },
                        }))
                      }
                      className="h-9 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                    />
                    <input
                      type="text"
                      value={board.overlay.leagueColor || '#ff2b42'}
                      onChange={(e) =>
                        updateBoard((p) => ({
                          ...p,
                          overlay: { ...p.overlay, leagueColor: e.target.value },
                        }))
                      }
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Logo de la Liga (URL / Archivo)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://.../logo.png"
                      value={board.overlay.leagueLogoUrl || ''}
                      onChange={(e) =>
                        updateBoard((p) => ({
                          ...p,
                          overlay: { ...p.overlay, leagueLogoUrl: e.target.value },
                        }))
                      }
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                    />
                    <label className="cursor-pointer flex items-center justify-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 border border-slate-700 active:scale-95 transition-all">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploadingLogo === 'league' ? 'Guardando...' : 'Subir'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadImage(file, 'league');
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Interactive Preview of Active Overlay */}
            <div className="rounded-3xl border border-indigo-500/40 bg-slate-900/90 p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <Tv className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Vista Previa en Vivo del Marcador (OBS Overlay)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {layoutSavedNotice && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-bold animate-pulse">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      {layoutSavedNotice}
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    Diseño: <strong className="text-indigo-300 uppercase">{board.overlay.layout?.replace(/_/g, ' ') || 'TV BROADCAST'}</strong>
                  </span>
                </div>
              </div>

              {/* Stadium / Stream Backdrop */}
              <div
                className={`relative rounded-2xl border border-slate-800/80 overflow-hidden flex items-center justify-center min-h-[160px] ${
                  board.overlay.background === 'green_screen'
                    ? 'bg-[#00ff00]'
                    : board.overlay.background === 'dark_glass'
                    ? 'bg-slate-950/80 backdrop-blur-md'
                    : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black'
                }`}
              >
                {board.overlay.background === 'transparent' && (
                  <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #888 25%, transparent 25%), linear-gradient(-45deg, #888 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #888 75%), linear-gradient(-45deg, transparent 75%, #888 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    }}
                  />
                )}

                <div className="relative z-10 w-full py-3 px-2 flex justify-center">
                  <OverlayLivePreview board={board} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Cambios aplicados y guardados automáticamente en OBS
                </span>
                <button
                  onClick={copyObsUrl}
                  className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar enlace para OBS Browser Source
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Layout & Style Presets */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-400" /> Estilo de Disposición (Layout OBS)
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Selecciona el formato de marcador perfecto para tu transmisión en directo.
                  </p>

                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      {
                        id: 'tv_broadcast_timer_below',
                        label: 'Scoreboard: TV broadcast, timer below teams',
                        badge: '⭐ LA LIGA DE ESPAÑA (NUEVO)',
                        desc: 'Formato oficial de LaLiga EA Sports con escudos apilados, reloj inferior y franjas de color',
                        highlight: true,
                      },
                      {
                        id: 'scorebug_narrow',
                        label: 'Scorebug: narrow',
                        desc: 'Barra horizontal compacta superior para transmisiones ágiles',
                      },
                      {
                        id: 'scorebug_wide',
                        label: 'Scorebug: wide',
                        desc: 'Barra ancha estilo televisión con nombres completos y reloj central',
                      },
                      {
                        id: 'scorebug_narrow_logos_left',
                        label: 'Scorebug: narrow, logos left',
                        badge: 'NEW!',
                        desc: 'Barra compacta con escudos colocados a la izquierda de ambos equipos',
                      },
                      {
                        id: 'scorebug_wide_logos_left',
                        label: 'Scorebug: wide, logos left',
                        badge: 'NEW!',
                        desc: 'Barra ancha con escudos alineados a la izquierda en cada equipo',
                      },
                      {
                        id: 'teams_stacked',
                        label: 'Scoreboard: teams stacked',
                        desc: 'Caja vertical con equipos apilados (Local arriba, Visitante abajo)',
                      },
                      {
                        id: 'fullscreen_broadcast',
                        label: 'Scoreboard: full-screen broadcast',
                        desc: 'Pantalla completa estilo televisión para previas, entretiempos y resultados',
                      },
                      {
                        id: 'lower_third',
                        label: 'Lower Third (Inferior)',
                        desc: 'Banner inferior esports / resumen de partido',
                      },
                      {
                        id: 'corner_box',
                        label: 'Caja en Esquina',
                        desc: 'Flotante para gaming / Twitch y streams personales',
                      },
                      {
                        id: 'minimal_ticker',
                        label: 'Ticker Minimalista',
                        desc: 'Tira ultra-limpia y compacta',
                      },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectLayout(item.id as OverlayLayout, item.label)}
                        className={`flex items-start justify-between rounded-2xl p-3.5 text-left border transition-all ${
                          board.overlay.layout === item.id || (!board.overlay.layout && item.id === 'tv_broadcast_timer_below')
                            ? 'border-indigo-500 bg-indigo-950/50 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500'
                            : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex-1 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-white">{item.label}</span>
                            {item.badge && (
                              <span className="rounded bg-red-600/90 px-1.5 py-0.5 text-[9px] font-black text-white uppercase tracking-wider">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 mt-1 block leading-relaxed">{item.desc}</span>
                        </div>
                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center mt-0.5 ${
                          board.overlay.layout === item.id || (!board.overlay.layout && item.id === 'tv_broadcast_timer_below')
                            ? 'border-indigo-400 bg-indigo-500'
                            : 'border-slate-700'
                        }`}>
                          {(board.overlay.layout === item.id || (!board.overlay.layout && item.id === 'tv_broadcast_timer_below')) && (
                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Mode */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Fondo del Marcador en OBS
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'transparent', label: '100% Transparente', desc: 'Recomendado para OBS' },
                      { id: 'dark_glass', label: 'Cristal Oscuro Blur', desc: 'Semi-transparente' },
                      { id: 'green_screen', label: 'Croma Verde (#00FF00)', desc: 'Filtro croma' },
                    ].map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() =>
                          updateBoard((p) => ({
                            ...p,
                            overlay: { ...p.overlay, background: bg.id as OverlayBackground },
                          }))
                        }
                        className={`rounded-xl p-2.5 text-center border text-xs font-medium transition-all ${
                          board.overlay.background === bg.id
                            ? 'border-indigo-500 bg-indigo-600/20 text-white font-bold'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scale Slider */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Escala / Tamaño en Pantalla</span>
                    <span className="font-mono text-indigo-400">{Math.round((board.overlay.scale || 1) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.5"
                    step="0.05"
                    value={board.overlay.scale || 1}
                    onChange={(e) =>
                      updateBoard((p) => ({
                        ...p,
                        overlay: { ...p.overlay, scale: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

            {/* Typography & Toggles */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-6">
              {/* Font Choice */}
              <div>
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <Type className="h-4 w-4 text-indigo-400" /> Tipografía del Marcador
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Chakra Petch', name: 'Chakra Petch (Modern TV)' },
                    { id: 'Oswald', name: 'Oswald (Deportivo Clásico)' },
                    { id: 'Bebas Neue', name: 'Bebas Neue (Condensado)' },
                    { id: 'Orbitron', name: 'Orbitron (Esports / Sci-Fi)' },
                    { id: 'Montserrat', name: 'Montserrat (Limpio)' },
                    { id: 'Inter', name: 'Inter (Neutral)' },
                    { id: 'Press Start 2P', name: 'Arcade 8-Bit Retro' },
                  ].map((font) => (
                    <button
                      key={font.id}
                      onClick={() =>
                        updateBoard((p) => ({
                          ...p,
                          overlay: { ...p.overlay, fontFamily: font.id as FontFamilyChoice },
                        }))
                      }
                      style={{ fontFamily: font.id }}
                      className={`rounded-xl p-2.5 text-left border text-xs transition-all ${
                        board.overlay.fontFamily === font.id
                          ? 'border-indigo-500 bg-indigo-950/50 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:text-white'
                      }`}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio & Sound Settings */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-indigo-400" />}
                    Configuración de Audio y Sonidos
                  </h4>
                  <button
                    onClick={toggleSoundMute}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                      !isMuted
                        ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
                        : 'border-rose-700/50 bg-rose-950/50 text-rose-300 hover:bg-rose-900/60'
                    }`}
                  >
                    {!isMuted ? '🔊 Audio Activado' : '🔇 Silenciado (Mute)'}
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Master sound toggle */}
                  <label className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 p-2.5 cursor-pointer hover:bg-slate-850">
                    <div>
                      <span className="text-slate-200 font-medium block">Reproducir sonidos al sumar puntos y goles</span>
                      <span className="text-[10px] text-slate-400">Genera efectos Web Audio sin retraso</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={board.overlay.soundEnabled && (board.overlay.soundVolume ?? 0.7) > 0}
                      onChange={(e) =>
                        updateBoard((p) => ({
                          ...p,
                          overlay: {
                            ...p.overlay,
                            soundEnabled: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 accent-indigo-600 rounded cursor-pointer"
                    />
                  </label>

                  {/* Volume Slider */}
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 space-y-1.5">
                    <div className="flex justify-between items-center text-slate-300 font-medium">
                      <span>Volumen de Efectos</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {isMuted ? '0%' : `${Math.round((board.overlay.soundVolume ?? 0.7) * 100)}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : (board.overlay.soundVolume ?? 0.7)}
                      onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer h-1.5"
                    />
                  </div>

                  {/* Copy Muted OBS URL */}
                  <div className="flex items-center justify-between rounded-xl bg-slate-900/60 border border-slate-800/80 p-2.5">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-300">¿Quieres que OBS nunca emita sonido?</p>
                      <p className="text-[10px] text-slate-400">Copia la URL de OBS con parámetro de silencio <span className="font-mono text-indigo-300">&mute=1</span></p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(mutedOverlayUrl);
                        setSaveToastMessage('¡URL de OBS Silenciada copiada al portapapeles!');
                        setTimeout(() => setSaveToastMessage(null), 2500);
                      }}
                      className="flex items-center gap-1 shrink-0 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-[11px] font-bold text-slate-200"
                    >
                      <VolumeX className="h-3 w-3 text-rose-400" /> Copiar URL Muted
                    </button>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                  Elementos Visibles en OBS
                </h4>
                <div className="space-y-2 text-xs">
                  {[
                    { key: 'showTimer', label: 'Mostrar Reloj de Tiempo' },
                    { key: 'showPeriod', label: 'Mostrar Periodo / Cuarto (1T, Q1, etc.)' },
                    { key: 'showLogos', label: 'Mostrar Emojis / Logos de Equipos' },
                    { key: 'showSets', label: 'Mostrar Contador de Sets / Mapas' },
                    { key: 'showPossession', label: 'Indicador de Saque / Posesión' },
                  ].map((toggle) => (
                    <label
                      key={toggle.key}
                      className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800/80 p-2.5 cursor-pointer hover:bg-slate-900"
                    >
                      <span className="text-slate-300 font-medium">{toggle.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(board.overlay[toggle.key as keyof typeof board.overlay])}
                        onChange={(e) =>
                          updateBoard((p) => ({
                            ...p,
                            overlay: {
                              ...p.overlay,
                              [toggle.key]: e.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 accent-indigo-600 rounded cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Sponsor Message Ticker */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Texto de Patrocinador o Mensaje en Vivo
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={board.overlay.sponsorMessage || ''}
                    onChange={(e) =>
                      updateBoard((p) => ({
                        ...p,
                        overlay: {
                          ...p.overlay,
                          sponsorMessage: e.target.value,
                          showSponsorMessage: Boolean(e.target.value),
                        },
                      }))
                    }
                    placeholder="Ej: 🔴 EN VIVO • Twitch.tv/mi_canal"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save Bar for Customization */}
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Diseño Guardado Permanentemente</h4>
                  <p className="text-xs text-slate-400">Al cambiar a la pestaña de Marcador o Reloj, todos tus ajustes de diseño y liga quedan 100% guardados.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleTabSwitch('controls')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 transition-all cursor-pointer"
                >
                  <Radio className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Ir al Marcador</span>
                </button>
                <button
                  onClick={() => handleExplicitSave('¡Diseño y estilos de overlay guardados con éxito!')}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/40 active:scale-95 transition-all cursor-pointer"
                >
                  <Save className={`h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>Guardar Diseño</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>

      {/* Floating Toast Save Alert */}
      {saveToastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-500/50 bg-slate-900/95 px-5 py-3.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-md animate-bounce">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-emerald-300 text-sm">¡Guardado con Éxito!</p>
            <p className="text-[11px] text-slate-300 max-w-xs">{saveToastMessage}</p>
          </div>
        </div>
      )}

      {/* Hotkeys Quick Helper Modal */}
      {showHotkeysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-amber-400" /> Atajos de Teclado (Hotkeys)
              </h3>
              <button
                onClick={() => setShowHotkeysModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5">
                <span className="text-slate-300">Punto Equipo Local (+1 / -1)</span>
                <div className="flex gap-1">
                  <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-amber-300">Q</kbd>
                  <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-rose-300">W</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5">
                <span className="text-slate-300">Punto Equipo Visitante (+1 / -1)</span>
                <div className="flex gap-1">
                  <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-amber-300">O</kbd>
                  <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-rose-300">P</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5">
                <span className="text-slate-300">Iniciar / Pausar Reloj</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-indigo-300">Espacio</kbd>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5">
                <span className="text-slate-300">Reiniciar Reloj</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-slate-300">R</kbd>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5">
                <span className="text-slate-300">Sonido de Chicharra / Buzzer</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-amber-400">B</kbd>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5">
                <span className="text-slate-300">Sonido de Gol / Bocina</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-rose-400">G</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowHotkeysModal(false)}
              className="w-full rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
