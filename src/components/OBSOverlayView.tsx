import React, { useEffect, useState, useRef } from 'react';
import { ScoreboardData, OverlayLayout } from '../types';
import { getBoardById, getSyncChannel, saveBoard, loadAllBoards } from '../utils/storage';
import { initRealtimeSync, decodeBoardFromUrlParam } from '../utils/realtimeSync';
import { createNewBoard } from '../utils/presets';
import { playSound } from '../utils/audio';
import { ConfettiEffect } from './ConfettiEffect';
import { Trophy, Clock, Flame, ChevronRight, Shield, Bell, Wifi } from 'lucide-react';

interface OBSOverlayViewProps {
  boardId?: string;
}

export const OBSOverlayView: React.FC<OBSOverlayViewProps> = ({ boardId: propBoardId }) => {
  const [board, setBoard] = useState<ScoreboardData | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastHomeScore, setLastHomeScore] = useState<number | null>(null);
  const [lastAwayScore, setLastAwayScore] = useState<number | null>(null);
  const [homeScoreAnimated, setHomeScoreAnimated] = useState(false);
  const [awayScoreAnimated, setAwayScoreAnimated] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const timerRef = useRef<number | null>(null);

  // Extract ID and data payload from URL
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const boardId = propBoardId || urlParams?.get('id') || undefined;
  const dataParam = urlParams?.get('data');

  // Load board initially (from URL data, localStorage, or fallback)
  useEffect(() => {
    let initialBoard: ScoreboardData | null = null;

    // 1. Try URL encoded data if provided
    if (dataParam) {
      initialBoard = decodeBoardFromUrlParam(dataParam);
    }

    // 2. Try localStorage by ID
    if (!initialBoard && boardId) {
      initialBoard = getBoardById(boardId);
    }

    // 3. Fallback: if not found by specific ID, create a clean in-memory placeholder without altering localStorage
    if (!initialBoard && boardId) {
      initialBoard = createNewBoard('sports_match', 'soccer', 'Marcador en Vivo');
      initialBoard.id = boardId;
      // Do not write to localStorage until received from active controller
    }

    if (initialBoard) {
      setBoard(initialBoard);
      setLastHomeScore(initialBoard.homeTeam.score);
      setLastAwayScore(initialBoard.awayTeam.score);
    }
  }, [boardId, dataParam]);

  // Connect to Realtime Cloud Relay (WebSockets/MQTT) for OBS Browser Source cross-process sync
  useEffect(() => {
    if (!boardId) return;

    const cleanupRealtime = initRealtimeSync(
      boardId,
      (updatedBoard) => {
        setIsConnected(true);
        setBoard(updatedBoard);

        // Detect score changes for animations & sound
        if (lastHomeScore !== null && updatedBoard.homeTeam.score > lastHomeScore) {
          setHomeScoreAnimated(true);
          setTimeout(() => setHomeScoreAnimated(false), 900);
          if (updatedBoard.overlay?.soundEnabled) {
            playSound('point', updatedBoard.overlay.soundVolume || 0.6);
          }
        }
        if (lastAwayScore !== null && updatedBoard.awayTeam.score > lastAwayScore) {
          setAwayScoreAnimated(true);
          setTimeout(() => setAwayScoreAnimated(false), 900);
          if (updatedBoard.overlay?.soundEnabled) {
            playSound('point', updatedBoard.overlay.soundVolume || 0.6);
          }
        }

        setLastHomeScore(updatedBoard.homeTeam.score);
        setLastAwayScore(updatedBoard.awayTeam.score);
      },
      (soundType, volume) => {
        playSound(soundType as any, volume);
        if (soundType === 'fanfare' || soundType === 'goal') {
          setShowConfetti(true);
        }
      },
      false // Is listener / overlay
    );

    return () => {
      cleanupRealtime();
    };
  }, [boardId, lastHomeScore, lastAwayScore]);

  // Also listen to local BroadcastChannel & storage events for same-browser multi-tab previews
  useEffect(() => {
    const channel = getSyncChannel();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BOARD_UPDATED' && event.data.board) {
        if (!boardId || event.data.boardId === boardId) {
          const updated: ScoreboardData = event.data.board;
          setBoard(updated);
          setIsConnected(true);

          if (lastHomeScore !== null && updated.homeTeam.score > lastHomeScore) {
            setHomeScoreAnimated(true);
            setTimeout(() => setHomeScoreAnimated(false), 900);
            if (updated.overlay?.soundEnabled) {
              playSound('point', updated.overlay.soundVolume || 0.6);
            }
          }
          if (lastAwayScore !== null && updated.awayTeam.score > lastAwayScore) {
            setAwayScoreAnimated(true);
            setTimeout(() => setAwayScoreAnimated(false), 900);
            if (updated.overlay?.soundEnabled) {
              playSound('point', updated.overlay.soundVolume || 0.6);
            }
          }

          setLastHomeScore(updated.homeTeam.score);
          setLastAwayScore(updated.awayTeam.score);
        }
      } else if (event.data?.type === 'PLAY_SOUND') {
        playSound(event.data.soundType, event.data.volume || 0.6);
        if (event.data.soundType === 'fanfare' || event.data.soundType === 'goal') {
          setShowConfetti(true);
        }
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'scoreboard_studio_boards_v1' && boardId) {
        const fresh = getBoardById(boardId);
        if (fresh) {
          setBoard(fresh);
          setIsConnected(true);
        }
      }
    };

    if (channel) {
      channel.addEventListener('message', handleMessage);
    }
    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) channel.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [boardId, lastHomeScore, lastAwayScore]);

  // Local timer tick if isRunning is true
  useEffect(() => {
    if (board?.timer?.isRunning) {
      timerRef.current = window.setInterval(() => {
        setBoard((prev) => {
          if (!prev || !prev.timer.isRunning) return prev;
          const isCountDown = prev.timer.direction === 'countdown';
          const newSeconds = isCountDown
            ? Math.max(0, prev.timer.seconds - 1)
            : prev.timer.seconds + 1;

          if (isCountDown && newSeconds === 0 && prev.timer.seconds > 0) {
            // Buzzer when countdown reaches zero!
            if (prev.overlay?.soundEnabled) {
              playSound('buzzer', prev.overlay.soundVolume || 0.7);
            }
          }

          return {
            ...prev,
            timer: {
              ...prev.timer,
              seconds: newSeconds,
              isRunning: isCountDown && newSeconds === 0 ? false : prev.timer.isRunning,
            },
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [board?.timer?.isRunning, board?.timer?.direction]);

  if (!board) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-6 text-center font-sans text-slate-400 bg-transparent">
        <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md max-w-md">
          <p className="text-base font-bold text-white mb-2">Marcador OBS Listo</p>
          <p className="text-xs text-slate-300">
            Esperando conexión con el panel de control o identificador de marcador.
          </p>
        </div>
      </div>
    );
  }

  const { overlay, homeTeam, awayTeam, timer } = board;
  const layout: OverlayLayout = overlay.layout || 'tv_broadcast_timer_below';
  const fontFamily = overlay.fontFamily || 'Chakra Petch';

  // Format timer MM:SS
  const minutes = Math.floor(timer.seconds / 60);
  const remainingSeconds = timer.seconds % 60;
  const formattedTimer = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

  // Helper for rendering team crest / shield / emoji
  const renderTeamCrest = (team: typeof homeTeam, sizeClass = 'h-7 w-7', fallbackEmoji = '🛡️') => {
    if (!overlay.showLogos) return null;
    if (team.logoUrl) {
      return (
        <img
          src={team.logoUrl}
          alt={team.name}
          className={`${sizeClass} object-contain flex-shrink-0 drop-shadow-md`}
          crossOrigin="anonymous"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
    return <span className="text-xl flex-shrink-0 leading-none">{team.logoEmoji || fallbackEmoji}</span>;
  };

  // Helper for rendering league / competition logo or badge
  const renderLeagueBadge = () => {
    if (overlay.leagueLogoUrl) {
      return (
        <img
          src={overlay.leagueLogoUrl}
          alt={overlay.leagueName || 'League'}
          className="max-h-7 max-w-[70px] object-contain drop-shadow"
          crossOrigin="anonymous"
        />
      );
    }
    // Default stylized LaLiga double-L symbol or competition text
    return (
      <div className="flex flex-col items-center justify-center text-white">
        <svg viewBox="0 0 100 100" className="h-6 w-6 fill-current text-white drop-shadow">
          <path d="M24 16 L52 16 L36 52 L64 52 L36 84 L48 56 L24 56 Z" />
        </svg>
      </div>
    );
  };

  // Background style classes
  const getBgClass = () => {
    switch (overlay.background) {
      case 'dark_glass':
        return 'bg-slate-950/80 backdrop-blur-md border border-slate-700/60 shadow-2xl';
      case 'solid_dark':
        return 'bg-slate-950 border border-slate-800 shadow-2xl';
      case 'green_screen':
        return 'bg-[#00ff00]';
      case 'blue_screen':
        return 'bg-[#0000ff]';
      case 'transparent':
      default:
        return 'bg-transparent';
    }
  };

  // Container wrapper style for overlay scale
  const wrapperStyle = {
    fontFamily: `"${fontFamily}", sans-serif`,
    transform: `scale(${overlay.scale || 1})`,
    transformOrigin:
      layout === 'tv_broadcast_timer_below'
        ? 'top left'
        : layout.startsWith('scorebug') || layout === 'top_scorebug'
        ? 'top center'
        : layout === 'corner_box'
        ? 'top right'
        : 'center center',
  };

  return (
    <div
      className={`relative min-h-screen w-screen overflow-hidden select-none p-4 md:p-8 flex ${
        layout === 'tv_broadcast_timer_below'
          ? 'items-start justify-start pt-6 pl-8'
          : layout.startsWith('scorebug') || layout === 'top_scorebug'
          ? 'items-start justify-center pt-6'
          : layout === 'lower_third'
          ? 'items-end justify-center pb-8'
          : layout === 'corner_box'
          ? 'items-start justify-end'
          : layout === 'side_tower'
          ? 'items-center justify-start pl-6'
          : layout === 'fullscreen_card' || layout === 'fullscreen_broadcast'
          ? 'items-center justify-center'
          : 'items-start justify-center'
      } ${getBgClass()}`}
    >
      <ConfettiEffect trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* RENDER ACCORDING TO BOARD TYPE & LAYOUT */}
      {board.type === 'leaderboard' ? (
        // LEADERBOARD OBS VIEW
        <div style={wrapperStyle} className="w-full max-w-md rounded-2xl bg-slate-950/90 border border-slate-700/80 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              <h2 className="text-base font-extrabold tracking-wide text-white uppercase">{board.title}</h2>
            </div>
            {timer.enabled && (
              <span className="rounded-md bg-indigo-950 px-2 py-0.5 text-xs font-mono font-bold text-indigo-300 border border-indigo-500/30">
                {formattedTimer}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {[...board.players]
              .sort((a, b) => b.score - a.score)
              .map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 transition-all ${
                    idx === 0
                      ? 'bg-amber-500/20 border border-amber-500/40 text-white shadow-lg shadow-amber-500/10'
                      : idx === 1
                      ? 'bg-slate-300/15 border border-slate-400/30 text-slate-100'
                      : idx === 2
                      ? 'bg-amber-700/20 border border-amber-700/30 text-slate-200'
                      : 'bg-slate-900/60 border border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                        idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-lg">{player.avatarEmoji || '👤'}</span>
                    <span className="font-bold text-sm tracking-wide">{player.name}</span>
                    {player.streak && player.streak > 1 && (
                      <span className="flex items-center text-[10px] font-extrabold text-orange-400 bg-orange-950/60 px-1.5 py-0.5 rounded border border-orange-500/30">
                        <Flame className="h-3 w-3 mr-0.5" /> x{player.streak}
                      </span>
                    )}
                  </div>
                  <div className="text-right font-mono font-black text-lg text-emerald-400">
                    {player.score} <span className="text-[11px] font-sans font-normal text-slate-400">pts</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : board.type === 'stream_goal' && board.goalConfig ? (
        // STREAM GOAL OBS VIEW
        <div style={wrapperStyle} className="w-full max-w-xl rounded-2xl bg-slate-950/95 border border-purple-500/40 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold uppercase tracking-wider text-purple-300">
              {board.goalConfig.title}
            </span>
            <span className="font-mono text-sm font-black text-white">
              {board.goalConfig.current} / {board.goalConfig.target} {board.goalConfig.unit}
            </span>
          </div>

          <div className="relative h-6 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800 p-0.5 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 shadow-lg shadow-purple-500/50"
              style={{
                width: `${Math.min(100, Math.max(0, (board.goalConfig.current / board.goalConfig.target) * 100))}%`,
              }}
            />
          </div>
          {board.goalConfig.showPercentage && (
            <div className="mt-1.5 text-right font-mono text-xs font-bold text-slate-400">
              {Math.round((board.goalConfig.current / board.goalConfig.target) * 100)}% Completado
            </div>
          )}
        </div>
      ) : board.type === 'tally_counter' ? (
        // TALLY COUNTERS OBS VIEW
        <div style={wrapperStyle} className="flex flex-wrap gap-3 rounded-2xl bg-slate-950/90 border border-slate-800 p-4 shadow-2xl backdrop-blur-xl">
          {board.tallies.map((tally) => (
            <div
              key={tally.id}
              className="flex items-center gap-3 rounded-xl bg-slate-900/90 border border-slate-800 px-4 py-2"
            >
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tally.color }} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{tally.label}</span>
              <span className="font-mono text-xl font-black text-white">{tally.count}</span>
            </div>
          ))}
        </div>
      ) : (
        // SPORTS & ESPORTS MATCH SCOREBOARDS
        <>
          {/* ======================================================== */}
          {/* 1. TV BROADCAST, TIMER BELOW TEAMS (LaLiga EA Sports Style) */}
          {/* ======================================================== */}
          {layout === 'tv_broadcast_timer_below' && (
            <div style={wrapperStyle} className="flex flex-col items-start drop-shadow-2xl">
              <div className="flex items-stretch overflow-hidden rounded-md shadow-2xl border border-black/40 bg-black text-black">
                {/* COLUMN 1: League / Competition Logo (Top) + Match Timer (Bottom) */}
                <div className="flex flex-col w-[84px] sm:w-[94px] border-r border-black/60 flex-shrink-0">
                  {/* Top: Competition Logo Badge */}
                  <div
                    className="h-[46px] flex items-center justify-center px-2 transition-colors"
                    style={{ backgroundColor: overlay.leagueColor || '#ff2b42' }}
                  >
                    {renderLeagueBadge()}
                  </div>

                  {/* Bottom: Timer on clean light background */}
                  <div className="h-[46px] bg-[#f1f5f9] flex flex-col items-center justify-center px-1 border-t border-slate-300/80">
                    {overlay.showTimer && (
                      <span className="font-mono text-[17px] sm:text-[18px] font-black text-slate-950 tracking-tight leading-none">
                        {formattedTimer}
                      </span>
                    )}
                    {overlay.showPeriod && (
                      <span className="text-[9px] font-black tracking-widest text-slate-600 uppercase mt-0.5 leading-none">
                        {timer.periodLabel || '1T'}
                      </span>
                    )}
                  </div>
                </div>

                {/* COLUMN 2: Stacked Team Crests / Escudos on Dark Background */}
                <div className="flex flex-col w-[68px] sm:w-[76px] bg-black border-r border-black/80 flex-shrink-0">
                  {/* Home Crest */}
                  <div className="h-[46px] flex items-center justify-center p-1.5 border-b border-zinc-800">
                    {renderTeamCrest(homeTeam, 'h-8 w-8', '🛡️')}
                  </div>
                  {/* Away Crest */}
                  <div className="h-[46px] flex items-center justify-center p-1.5">
                    {renderTeamCrest(awayTeam, 'h-8 w-8', '⚔️')}
                  </div>
                </div>

                {/* COLUMN 3: Stacked Scores with Team Color Indicator Stripe */}
                <div className="flex flex-col w-[68px] sm:w-[76px] bg-[#f8fafc] flex-shrink-0">
                  {/* Home Score Box */}
                  <div className="relative h-[46px] flex items-center justify-center border-b border-slate-300/80 pl-2">
                    {/* Left color tab */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 sm:w-2.5"
                      style={{ backgroundColor: homeTeam.color }}
                    />
                    <span
                      className={`font-mono text-2xl sm:text-3xl font-black text-slate-950 transition-all ${
                        homeScoreAnimated ? 'scale-125 text-red-600' : ''
                      }`}
                    >
                      {homeTeam.score}
                    </span>
                  </div>

                  {/* Away Score Box */}
                  <div className="relative h-[46px] flex items-center justify-center pl-2">
                    {/* Left color tab */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 sm:w-2.5"
                      style={{ backgroundColor: awayTeam.color }}
                    />
                    <span
                      className={`font-mono text-2xl sm:text-3xl font-black text-slate-950 transition-all ${
                        awayScoreAnimated ? 'scale-125 text-red-600' : ''
                      }`}
                    >
                      {awayTeam.score}
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional live sponsor or extra indicator */}
              {overlay.showSponsorMessage && overlay.sponsorMessage && (
                <div className="mt-1 rounded bg-black/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  {overlay.sponsorMessage}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. SCOREBUG: NARROW (Compact horizontal TV scorebug)     */}
          {/* ======================================================== */}
          {layout === 'scorebug_narrow' && (
            <div style={wrapperStyle} className="flex flex-col items-center">
              <div className="flex items-stretch overflow-hidden rounded-xl bg-slate-950 border border-slate-800 shadow-2xl shadow-black/80">
                {/* Home */}
                <div className="flex items-center">
                  <div
                    className="flex h-full min-w-[100px] sm:min-w-[120px] items-center gap-2 px-3.5 py-2.5"
                    style={{ backgroundColor: homeTeam.color }}
                  >
                    {renderTeamCrest(homeTeam, 'h-5 w-5')}
                    <span className="font-black text-sm tracking-wider text-white uppercase drop-shadow">
                      {homeTeam.shortName || homeTeam.name}
                    </span>
                  </div>
                  <div
                    className={`flex min-w-[44px] items-center justify-center bg-slate-900 px-3 py-2 text-center font-mono text-2xl font-black text-white ${
                      homeScoreAnimated ? 'scale-125 text-amber-400 bg-amber-950' : ''
                    }`}
                  >
                    {homeTeam.score}
                  </div>
                </div>

                {/* Center Timer */}
                {overlay.showTimer && (
                  <div className="flex flex-col items-center justify-center border-x border-slate-800 bg-slate-950 px-3 py-1 min-w-[80px]">
                    {overlay.showPeriod && (
                      <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">
                        {timer.periodLabel || '1T'}
                      </span>
                    )}
                    <span className="font-mono text-sm font-bold text-white tracking-wider">
                      {formattedTimer}
                    </span>
                  </div>
                )}

                {/* Away */}
                <div className="flex items-center">
                  <div
                    className={`flex min-w-[44px] items-center justify-center bg-slate-900 px-3 py-2 text-center font-mono text-2xl font-black text-white ${
                      awayScoreAnimated ? 'scale-125 text-amber-400 bg-amber-950' : ''
                    }`}
                  >
                    {awayTeam.score}
                  </div>
                  <div
                    className="flex h-full min-w-[100px] sm:min-w-[120px] items-center justify-end gap-2 px-3.5 py-2.5"
                    style={{ backgroundColor: awayTeam.color }}
                  >
                    <span className="font-black text-sm tracking-wider text-white uppercase drop-shadow">
                      {awayTeam.shortName || awayTeam.name}
                    </span>
                    {renderTeamCrest(awayTeam, 'h-5 w-5')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. SCOREBUG: WIDE (Wide TV broadcast bar)                */}
          {/* ======================================================== */}
          {layout === 'scorebug_wide' && (
            <div style={wrapperStyle} className="flex flex-col items-center w-full max-w-4xl">
              <div className="flex w-full items-stretch overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl">
                {/* Home Team */}
                <div className="flex-1 flex items-center justify-between px-5 py-3" style={{ backgroundColor: `${homeTeam.color}25`, borderLeft: `6px solid ${homeTeam.color}` }}>
                  <div className="flex items-center gap-3">
                    {renderTeamCrest(homeTeam, 'h-8 w-8')}
                    <div>
                      <div className="font-black text-base text-white uppercase tracking-tight">{homeTeam.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{homeTeam.shortName}</div>
                    </div>
                  </div>
                  <span className={`font-mono text-3xl font-black text-white ${homeScoreAnimated ? 'scale-125 text-amber-400' : ''}`}>
                    {homeTeam.score}
                  </span>
                </div>

                {/* Center Badge */}
                <div className="flex flex-col items-center justify-center bg-slate-900 px-6 py-2 border-x border-slate-800 min-w-[130px]">
                  <span className="text-[11px] font-black tracking-widest text-indigo-400 uppercase">
                    {timer.periodLabel || 'EN VIVO'}
                  </span>
                  {overlay.showTimer && (
                    <span className="font-mono text-xl font-black text-white">
                      {formattedTimer}
                    </span>
                  )}
                </div>

                {/* Away Team */}
                <div className="flex-1 flex items-center justify-between px-5 py-3" style={{ backgroundColor: `${awayTeam.color}25`, borderRight: `6px solid ${awayTeam.color}` }}>
                  <span className={`font-mono text-3xl font-black text-white ${awayScoreAnimated ? 'scale-125 text-amber-400' : ''}`}>
                    {awayTeam.score}
                  </span>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="font-black text-base text-white uppercase tracking-tight">{awayTeam.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{awayTeam.shortName}</div>
                    </div>
                    {renderTeamCrest(awayTeam, 'h-8 w-8')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. SCOREBUG: NARROW, LOGOS LEFT                          */}
          {/* ======================================================== */}
          {layout === 'scorebug_narrow_logos_left' && (
            <div style={wrapperStyle} className="flex flex-col items-center">
              <div className="flex items-stretch overflow-hidden rounded-xl bg-slate-950 border border-slate-800 shadow-2xl">
                {/* Home: Logo -> Name -> Score */}
                <div className="flex items-center">
                  <div
                    className="flex h-full min-w-[110px] sm:min-w-[130px] items-center gap-2 px-3.5 py-2.5"
                    style={{ backgroundColor: homeTeam.color }}
                  >
                    {renderTeamCrest(homeTeam, 'h-6 w-6')}
                    <span className="font-black text-sm tracking-wider text-white uppercase drop-shadow">
                      {homeTeam.shortName || homeTeam.name}
                    </span>
                  </div>
                  <div
                    className={`flex min-w-[46px] items-center justify-center bg-slate-900 px-3 py-2 text-center font-mono text-2xl font-black text-white ${
                      homeScoreAnimated ? 'scale-125 text-amber-400' : ''
                    }`}
                  >
                    {homeTeam.score}
                  </div>
                </div>

                {/* Center Timer */}
                {overlay.showTimer && (
                  <div className="flex flex-col items-center justify-center border-x border-slate-800 bg-slate-950 px-3.5 py-1 min-w-[85px]">
                    <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">
                      {timer.periodLabel || '1T'}
                    </span>
                    <span className="font-mono text-sm font-bold text-white tracking-wider">
                      {formattedTimer}
                    </span>
                  </div>
                )}

                {/* Away: Logo -> Name -> Score (Logos Left for both!) */}
                <div className="flex items-center">
                  <div
                    className="flex h-full min-w-[110px] sm:min-w-[130px] items-center gap-2 px-3.5 py-2.5"
                    style={{ backgroundColor: awayTeam.color }}
                  >
                    {renderTeamCrest(awayTeam, 'h-6 w-6')}
                    <span className="font-black text-sm tracking-wider text-white uppercase drop-shadow">
                      {awayTeam.shortName || awayTeam.name}
                    </span>
                  </div>
                  <div
                    className={`flex min-w-[46px] items-center justify-center bg-slate-900 px-3 py-2 text-center font-mono text-2xl font-black text-white ${
                      awayScoreAnimated ? 'scale-125 text-amber-400' : ''
                    }`}
                  >
                    {awayTeam.score}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. SCOREBUG: WIDE, LOGOS LEFT                            */}
          {/* ======================================================== */}
          {layout === 'scorebug_wide_logos_left' && (
            <div style={wrapperStyle} className="flex flex-col items-center w-full max-w-4xl">
              <div className="flex w-full items-stretch overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl">
                {/* Home: Logo Left -> Name -> Score */}
                <div className="flex-1 flex items-center justify-between px-5 py-3" style={{ backgroundColor: `${homeTeam.color}22`, borderLeft: `6px solid ${homeTeam.color}` }}>
                  <div className="flex items-center gap-3.5">
                    {renderTeamCrest(homeTeam, 'h-8 w-8')}
                    <div>
                      <div className="font-black text-base text-white uppercase tracking-tight">{homeTeam.name}</div>
                      <div className="text-xs font-mono text-slate-400">{homeTeam.shortName}</div>
                    </div>
                  </div>
                  <span className={`font-mono text-3xl font-black text-white ${homeScoreAnimated ? 'scale-125 text-amber-400' : ''}`}>
                    {homeTeam.score}
                  </span>
                </div>

                {/* Center Badge */}
                <div className="flex flex-col items-center justify-center bg-slate-900 px-6 py-2 border-x border-slate-800 min-w-[130px]">
                  <span className="text-[11px] font-black tracking-widest text-indigo-400 uppercase">
                    {timer.periodLabel || 'MATCH'}
                  </span>
                  {overlay.showTimer && (
                    <span className="font-mono text-xl font-black text-white">
                      {formattedTimer}
                    </span>
                  )}
                </div>

                {/* Away: Logo Left -> Name -> Score */}
                <div className="flex-1 flex items-center justify-between px-5 py-3" style={{ backgroundColor: `${awayTeam.color}22`, borderLeft: `6px solid ${awayTeam.color}` }}>
                  <div className="flex items-center gap-3.5">
                    {renderTeamCrest(awayTeam, 'h-8 w-8')}
                    <div>
                      <div className="font-black text-base text-white uppercase tracking-tight">{awayTeam.name}</div>
                      <div className="text-xs font-mono text-slate-400">{awayTeam.shortName}</div>
                    </div>
                  </div>
                  <span className={`font-mono text-3xl font-black text-white ${awayScoreAnimated ? 'scale-125 text-amber-400' : ''}`}>
                    {awayTeam.score}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 6. SCOREBOARD: TEAMS STACKED                             */}
          {/* ======================================================== */}
          {layout === 'teams_stacked' && (
            <div style={wrapperStyle} className="w-[300px] sm:w-[340px] rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl overflow-hidden">
              {/* Header with Title / Timer */}
              <div className="flex items-center justify-between bg-slate-900 px-4 py-2 border-b border-slate-800">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  {board.title || 'PARTIDO'}
                </span>
                {overlay.showTimer && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-amber-400">{timer.periodLabel || '1T'}</span>
                    <span className="font-mono text-xs font-black text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {formattedTimer}
                    </span>
                  </div>
                )}
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-800/80">
                {/* Home Row */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-950/60 relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: homeTeam.color }} />
                  <div className="flex items-center gap-3 pl-1">
                    {renderTeamCrest(homeTeam, 'h-7 w-7')}
                    <div>
                      <span className="font-black text-sm text-white uppercase tracking-tight block leading-tight">{homeTeam.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">{homeTeam.shortName}</span>
                    </div>
                  </div>
                  <span className={`font-mono text-2xl font-black text-white ${homeScoreAnimated ? 'scale-125 text-amber-400' : ''}`}>
                    {homeTeam.score}
                  </span>
                </div>

                {/* Away Row */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-950/60 relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: awayTeam.color }} />
                  <div className="flex items-center gap-3 pl-1">
                    {renderTeamCrest(awayTeam, 'h-7 w-7')}
                    <div>
                      <span className="font-black text-sm text-white uppercase tracking-tight block leading-tight">{awayTeam.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">{awayTeam.shortName}</span>
                    </div>
                  </div>
                  <span className={`font-mono text-2xl font-black text-white ${awayScoreAnimated ? 'scale-125 text-amber-400' : ''}`}>
                    {awayTeam.score}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 7. SCOREBOARD: FULL-SCREEN BROADCAST (Studio Halftime)   */}
          {/* ======================================================== */}
          {(layout === 'fullscreen_broadcast' || layout === 'fullscreen_card') && (
            <div style={wrapperStyle} className="w-full max-w-4xl rounded-3xl bg-slate-950/95 border border-slate-800 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl text-center relative overflow-hidden">
              {/* Ambient Glows */}
              <div className="absolute top-0 left-0 w-64 h-64 blur-[100px] rounded-full pointer-events-none opacity-20" style={{ backgroundColor: homeTeam.color }} />
              <div className="absolute bottom-0 right-0 w-64 h-64 blur-[100px] rounded-full pointer-events-none opacity-20" style={{ backgroundColor: awayTeam.color }} />

              <div className="relative z-10 flex items-center justify-center gap-3 mb-8">
                <span className="rounded-full bg-red-600 px-3 py-1 text-[11px] font-black text-white uppercase tracking-widest shadow-md animate-pulse">
                  🔴 {timer.periodLabel || 'EN DIRECTO'}
                </span>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                  {board.title}
                </span>
              </div>

              <div className="relative z-10 grid grid-cols-3 items-center gap-6 my-6">
                {/* Home */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-28 w-28 items-center justify-center rounded-3xl shadow-2xl p-3 border-2 bg-slate-900/90" style={{ borderColor: homeTeam.color }}>
                    {renderTeamCrest(homeTeam, 'h-20 w-20', '🛡️')}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">{homeTeam.name}</h2>
                  <span className="text-xs font-mono text-slate-400">{homeTeam.shortName}</span>
                </div>

                {/* Center Score & Timer */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl px-6 py-3 shadow-xl">
                    <span className="font-mono text-5xl sm:text-6xl font-black text-white">{homeTeam.score}</span>
                    <span className="text-3xl font-mono text-slate-600 font-black">-</span>
                    <span className="font-mono text-5xl sm:text-6xl font-black text-white">{awayTeam.score}</span>
                  </div>

                  {overlay.showTimer && (
                    <div className="rounded-xl bg-slate-900 border border-slate-800 px-5 py-2">
                      <span className="font-mono text-2xl font-black text-amber-400">{formattedTimer}</span>
                    </div>
                  )}

                  {overlay.showSets && (
                    <div className="font-mono text-xs font-bold text-slate-400">
                      SETS: <span className="text-emerald-400">{homeTeam.sets}</span> - <span className="text-emerald-400">{awayTeam.sets}</span>
                    </div>
                  )}
                </div>

                {/* Away */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-28 w-28 items-center justify-center rounded-3xl shadow-2xl p-3 border-2 bg-slate-900/90" style={{ borderColor: awayTeam.color }}>
                    {renderTeamCrest(awayTeam, 'h-20 w-20', '⚔️')}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">{awayTeam.name}</h2>
                  <span className="text-xs font-mono text-slate-400">{awayTeam.shortName}</span>
                </div>
              </div>

              {overlay.showSponsorMessage && overlay.sponsorMessage && (
                <div className="relative z-10 mt-8 border-t border-slate-800/80 pt-4 text-xs font-bold text-slate-400 tracking-wider">
                  {overlay.sponsorMessage}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 8. LEGACY / FALLBACK LAYOUTS (top_scorebug, etc.)        */}
          {/* ======================================================== */}
          {layout === 'top_scorebug' && (
            <div style={wrapperStyle} className="flex flex-col items-center">
              <div className="flex items-stretch overflow-hidden rounded-xl bg-slate-950 border border-slate-800 shadow-2xl shadow-black/80">
                {/* Home Team */}
                <div className="flex items-center">
                  <div
                    className="flex h-full min-w-[120px] sm:min-w-[140px] items-center gap-2 px-4 py-2.5"
                    style={{ backgroundColor: homeTeam.color }}
                  >
                    {renderTeamCrest(homeTeam, 'h-5 w-5')}
                    <span className="font-extrabold text-sm sm:text-base tracking-wider text-white uppercase drop-shadow-md">
                      {homeTeam.shortName || homeTeam.name}
                    </span>
                  </div>
                  <div
                    className={`flex min-w-[50px] items-center justify-center bg-slate-900 px-3 py-2.5 text-center font-mono text-2xl font-black text-white ${
                      homeScoreAnimated ? 'scale-125 text-amber-400 bg-amber-950/60' : ''
                    }`}
                  >
                    {homeTeam.score}
                  </div>
                </div>

                {/* Center Badge: Period & Game Clock */}
                {overlay.showTimer && (
                  <div className="flex flex-col items-center justify-center border-x border-slate-800 bg-slate-950 px-3.5 py-1 min-w-[85px]">
                    {overlay.showPeriod && (
                      <span className="text-[10px] font-extrabold tracking-widest text-amber-400 uppercase">
                        {timer.periodLabel || '1T'}
                      </span>
                    )}
                    <span className="font-mono text-sm font-bold text-white tracking-wider">
                      {formattedTimer}
                    </span>
                  </div>
                )}

                {/* Away Team */}
                <div className="flex items-center">
                  <div
                    className={`flex min-w-[50px] items-center justify-center bg-slate-900 px-3 py-2.5 text-center font-mono text-2xl font-black text-white ${
                      awayScoreAnimated ? 'scale-125 text-amber-400 bg-amber-950/60' : ''
                    }`}
                  >
                    {awayTeam.score}
                  </div>
                  <div
                    className="flex h-full min-w-[120px] sm:min-w-[140px] items-center justify-end gap-2 px-4 py-2.5"
                    style={{ backgroundColor: awayTeam.color }}
                  >
                    <span className="font-extrabold text-sm sm:text-base tracking-wider text-white uppercase drop-shadow-md">
                      {awayTeam.shortName || awayTeam.name}
                    </span>
                    {renderTeamCrest(awayTeam, 'h-5 w-5')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {layout === 'lower_third' && (
            <div style={wrapperStyle} className="w-full max-w-3xl flex flex-col items-center">
              <div className="flex w-full items-stretch overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl">
                <div className="flex-1 flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: `${homeTeam.color}22`, borderLeft: `6px solid ${homeTeam.color}` }}>
                  <div className="flex items-center gap-3">
                    {renderTeamCrest(homeTeam, 'h-7 w-7')}
                    <h3 className="text-base font-black tracking-wide text-white uppercase">{homeTeam.name}</h3>
                  </div>
                  <span className={`font-mono text-3xl font-black text-white ${homeScoreAnimated ? 'scale-125 text-amber-400' : ''}`}>
                    {homeTeam.score}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center bg-slate-900 px-5 py-2 border-x border-slate-800 min-w-[120px]">
                  <span className="text-xs font-black tracking-widest text-indigo-400 uppercase">
                    {timer.periodLabel || 'VS'}
                  </span>
                  {overlay.showTimer && (
                    <span className="font-mono text-lg font-extrabold text-white">
                      {formattedTimer}
                    </span>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: `${awayTeam.color}22`, borderRight: `6px solid ${awayTeam.color}` }}>
                  <span className={`font-mono text-3xl font-black text-white ${awayScoreAnimated ? 'scale-125 text-amber-400' : ''}`}>
                    {awayTeam.score}
                  </span>
                  <div className="flex items-center gap-3 text-right">
                    <h3 className="text-base font-black tracking-wide text-white uppercase">{awayTeam.name}</h3>
                    {renderTeamCrest(awayTeam, 'h-7 w-7')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {layout === 'corner_box' && (
            <div style={wrapperStyle} className="rounded-2xl bg-slate-950/95 border border-slate-800/90 p-3.5 shadow-2xl backdrop-blur-lg min-w-[240px]">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {board.title}
                </span>
                {overlay.showTimer && (
                  <span className="font-mono text-xs font-bold text-amber-400">
                    {formattedTimer}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-slate-900/80 px-2.5 py-1.5 border-l-4" style={{ borderColor: homeTeam.color }}>
                  <div className="flex items-center gap-2">
                    {renderTeamCrest(homeTeam, 'h-5 w-5')}
                    <span className="font-bold text-sm text-white">{homeTeam.shortName || homeTeam.name}</span>
                  </div>
                  <span className="font-mono text-xl font-black text-white">{homeTeam.score}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-900/80 px-2.5 py-1.5 border-l-4" style={{ borderColor: awayTeam.color }}>
                  <div className="flex items-center gap-2">
                    {renderTeamCrest(awayTeam, 'h-5 w-5')}
                    <span className="font-bold text-sm text-white">{awayTeam.shortName || awayTeam.name}</span>
                  </div>
                  <span className="font-mono text-xl font-black text-white">{awayTeam.score}</span>
                </div>
              </div>
            </div>
          )}

          {layout === 'minimal_ticker' && (
            <div style={wrapperStyle} className="flex items-center gap-4 rounded-full bg-slate-950/90 border border-slate-800 px-5 py-2 shadow-2xl backdrop-blur-md font-mono">
              <span className="font-bold text-white uppercase text-sm">{homeTeam.shortName || homeTeam.name}</span>
              <span className="font-black text-xl text-amber-400">{homeTeam.score}</span>
              <span className="text-slate-600 font-normal">|</span>
              <span className="font-black text-xl text-amber-400">{awayTeam.score}</span>
              <span className="font-bold text-white uppercase text-sm">{awayTeam.shortName || awayTeam.name}</span>
              {overlay.showTimer && (
                <>
                  <span className="text-slate-600 font-normal">|</span>
                  <span className="text-xs font-bold text-indigo-300">{formattedTimer}</span>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
