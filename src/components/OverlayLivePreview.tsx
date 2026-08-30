import React from 'react';
import { ScoreboardData, OverlayLayout } from '../types';

interface OverlayLivePreviewProps {
  board: ScoreboardData;
}

export const OverlayLivePreview: React.FC<OverlayLivePreviewProps> = ({ board }) => {
  const { overlay, homeTeam, awayTeam, timer } = board;
  const layout: OverlayLayout = overlay.layout || 'tv_broadcast_timer_below';
  const fontFamily = overlay.fontFamily || 'Chakra Petch';

  const minutes = Math.floor(timer.seconds / 60);
  const remainingSeconds = timer.seconds % 60;
  const formattedTimer = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

  const renderTeamCrest = (team: typeof homeTeam, sizeClass = 'h-6 w-6', fallbackEmoji = '🛡️') => {
    if (!overlay.showLogos) return null;
    if (team.logoUrl) {
      return (
        <img
          src={team.logoUrl}
          alt={team.name}
          className={`${sizeClass} object-contain flex-shrink-0 drop-shadow`}
          crossOrigin="anonymous"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
    return <span className="text-base flex-shrink-0 leading-none">{team.logoEmoji || fallbackEmoji}</span>;
  };

  const renderLeagueBadge = () => {
    if (overlay.leagueLogoUrl) {
      return (
        <img
          src={overlay.leagueLogoUrl}
          alt="League Logo"
          className="h-6 max-w-[65px] object-contain drop-shadow"
          crossOrigin="anonymous"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
    return (
      <span className="font-black text-[10px] tracking-tight text-white uppercase text-center leading-none px-1">
        {overlay.leagueName || 'LALIGA'}
      </span>
    );
  };

  return (
    <div
      style={{ fontFamily: `"${fontFamily}", sans-serif` }}
      className="w-full flex items-center justify-center p-4 select-none min-h-[140px]"
    >
      {/* 1. TV BROADCAST, TIMER BELOW (LaLiga Style) */}
      {layout === 'tv_broadcast_timer_below' && (
        <div className="flex items-stretch overflow-hidden rounded-md shadow-2xl border border-black/40 bg-black text-black scale-95 sm:scale-100">
          {/* COLUMN 1: League (Top) + Match Timer (Bottom) */}
          <div className="flex flex-col w-[76px] border-r border-black/60 flex-shrink-0">
            <div
              className="h-[38px] flex items-center justify-center px-1 transition-colors"
              style={{ backgroundColor: overlay.leagueColor || '#ff2b42' }}
            >
              {renderLeagueBadge()}
            </div>
            <div className="h-[38px] bg-[#f1f5f9] flex flex-col items-center justify-center px-1 border-t border-slate-300">
              {overlay.showTimer && (
                <span className="font-mono text-[14px] font-black text-slate-950 tracking-tight leading-none">
                  {formattedTimer}
                </span>
              )}
              {overlay.showPeriod && (
                <span className="text-[8px] font-black tracking-widest text-slate-600 uppercase mt-0.5 leading-none">
                  {timer.periodLabel || '1T'}
                </span>
              )}
            </div>
          </div>

          {/* COLUMN 2: Stacked Crests */}
          <div className="flex flex-col w-[56px] bg-black border-r border-black/80 flex-shrink-0">
            <div className="h-[38px] flex items-center justify-center p-1 border-b border-zinc-800">
              {renderTeamCrest(homeTeam, 'h-6 w-6', '🛡️')}
            </div>
            <div className="h-[38px] flex items-center justify-center p-1">
              {renderTeamCrest(awayTeam, 'h-6 w-6', '⚔️')}
            </div>
          </div>

          {/* COLUMN 3: Stacked Scores */}
          <div className="flex flex-col w-[56px] bg-[#f8fafc] flex-shrink-0">
            <div className="relative h-[38px] flex items-center justify-center border-b border-slate-300 pl-1.5">
              <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: homeTeam.color }} />
              <span className="font-mono text-xl font-black text-slate-950">{homeTeam.score}</span>
            </div>
            <div className="relative h-[38px] flex items-center justify-center pl-1.5">
              <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: awayTeam.color }} />
              <span className="font-mono text-xl font-black text-slate-950">{awayTeam.score}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. SCOREBUG NARROW */}
      {(layout === 'scorebug_narrow' || layout === 'top_scorebug') && (
        <div className="flex items-stretch overflow-hidden rounded-xl bg-slate-950 border border-slate-800 shadow-2xl scale-95 sm:scale-100">
          <div className="flex items-center">
            <div
              className="flex h-full min-w-[90px] items-center gap-1.5 px-3 py-2"
              style={{ backgroundColor: homeTeam.color }}
            >
              {renderTeamCrest(homeTeam, 'h-5 w-5')}
              <span className="font-black text-xs tracking-wider text-white uppercase drop-shadow">
                {homeTeam.shortName || homeTeam.name}
              </span>
            </div>
            <div className="flex min-w-[36px] items-center justify-center bg-slate-900 px-2.5 py-1.5 text-center font-mono text-xl font-black text-white">
              {homeTeam.score}
            </div>
          </div>

          {overlay.showTimer && (
            <div className="flex flex-col items-center justify-center border-x border-slate-800 bg-slate-950 px-3 py-1">
              <span className="font-mono text-xs font-black tracking-wider text-white">{formattedTimer}</span>
              {overlay.showPeriod && (
                <span className="text-[8px] font-bold tracking-widest text-indigo-400 uppercase">
                  {timer.periodLabel || '1T'}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center">
            <div className="flex min-w-[36px] items-center justify-center bg-slate-900 px-2.5 py-1.5 text-center font-mono text-xl font-black text-white">
              {awayTeam.score}
            </div>
            <div
              className="flex h-full min-w-[90px] items-center justify-end gap-1.5 px-3 py-2 text-right"
              style={{ backgroundColor: awayTeam.color }}
            >
              <span className="font-black text-xs tracking-wider text-white uppercase drop-shadow">
                {awayTeam.shortName || awayTeam.name}
              </span>
              {renderTeamCrest(awayTeam, 'h-5 w-5')}
            </div>
          </div>
        </div>
      )}

      {/* 3. SCOREBUG WIDE */}
      {layout === 'scorebug_wide' && (
        <div className="flex w-full max-w-xl items-center justify-between rounded-xl bg-slate-950 border border-slate-800 p-2 shadow-2xl scale-95 sm:scale-100">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: homeTeam.color }} />
            {renderTeamCrest(homeTeam, 'h-6 w-6')}
            <span className="font-black text-xs text-white uppercase">{homeTeam.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-black text-white">{homeTeam.score}</span>
            <div className="flex flex-col items-center px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              <span className="font-mono text-xs font-bold text-amber-400">{formattedTimer}</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase">{timer.periodLabel || '1T'}</span>
            </div>
            <span className="font-mono text-2xl font-black text-white">{awayTeam.score}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-black text-xs text-white uppercase">{awayTeam.name}</span>
            {renderTeamCrest(awayTeam, 'h-6 w-6')}
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: awayTeam.color }} />
          </div>
        </div>
      )}

      {/* 4. SCOREBUG NARROW LOGOS LEFT */}
      {layout === 'scorebug_narrow_logos_left' && (
        <div className="flex items-stretch overflow-hidden rounded-xl bg-slate-950 border border-slate-800 shadow-2xl scale-95 sm:scale-100">
          <div className="flex items-center">
            <div
              className="flex h-full min-w-[90px] items-center gap-1.5 px-3 py-2"
              style={{ backgroundColor: homeTeam.color }}
            >
              {renderTeamCrest(homeTeam, 'h-5 w-5')}
              <span className="font-black text-xs tracking-wider text-white uppercase">
                {homeTeam.shortName || homeTeam.name}
              </span>
            </div>
            <div className="flex min-w-[36px] items-center justify-center bg-slate-900 px-2.5 py-1.5 text-center font-mono text-xl font-black text-white">
              {homeTeam.score}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center border-x border-slate-800 bg-slate-950 px-3 py-1">
            <span className="font-mono text-xs font-black text-white">{formattedTimer}</span>
          </div>

          <div className="flex items-center">
            <div
              className="flex h-full min-w-[90px] items-center gap-1.5 px-3 py-2"
              style={{ backgroundColor: awayTeam.color }}
            >
              {renderTeamCrest(awayTeam, 'h-5 w-5')}
              <span className="font-black text-xs tracking-wider text-white uppercase">
                {awayTeam.shortName || awayTeam.name}
              </span>
            </div>
            <div className="flex min-w-[36px] items-center justify-center bg-slate-900 px-2.5 py-1.5 text-center font-mono text-xl font-black text-white">
              {awayTeam.score}
            </div>
          </div>
        </div>
      )}

      {/* 5. SCOREBUG WIDE LOGOS LEFT */}
      {layout === 'scorebug_wide_logos_left' && (
        <div className="flex w-full max-w-xl items-center justify-between rounded-xl bg-slate-950 border border-slate-800 p-2 shadow-2xl scale-95 sm:scale-100">
          <div className="flex items-center gap-2">
            {renderTeamCrest(homeTeam, 'h-6 w-6')}
            <span className="font-black text-xs text-white uppercase">{homeTeam.name}</span>
            <span className="font-mono text-xl font-black text-white ml-2">{homeTeam.score}</span>
          </div>

          <div className="flex flex-col items-center px-3 py-1 rounded bg-slate-900 border border-slate-800">
            <span className="font-mono text-xs font-bold text-amber-400">{formattedTimer}</span>
            <span className="text-[8px] text-slate-400 font-bold uppercase">{timer.periodLabel || '1T'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-black text-white mr-2">{awayTeam.score}</span>
            {renderTeamCrest(awayTeam, 'h-6 w-6')}
            <span className="font-black text-xs text-white uppercase">{awayTeam.name}</span>
          </div>
        </div>
      )}

      {/* 6. TEAMS STACKED */}
      {layout === 'teams_stacked' && (
        <div className="flex flex-col rounded-xl bg-slate-950 border border-slate-800 p-3 shadow-2xl min-w-[200px] scale-95 sm:scale-100">
          <div className="flex items-center justify-between py-1 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: homeTeam.color }} />
              {renderTeamCrest(homeTeam, 'h-5 w-5')}
              <span className="font-bold text-xs text-white">{homeTeam.name}</span>
            </div>
            <span className="font-mono text-lg font-black text-white">{homeTeam.score}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: awayTeam.color }} />
              {renderTeamCrest(awayTeam, 'h-5 w-5')}
              <span className="font-bold text-xs text-white">{awayTeam.name}</span>
            </div>
            <span className="font-mono text-lg font-black text-white">{awayTeam.score}</span>
          </div>

          <div className="mt-2 pt-1 border-t border-slate-800/80 flex justify-between text-[9px] font-mono text-slate-400">
            <span>{timer.periodLabel || '1T'}</span>
            <span className="text-amber-400 font-bold">{formattedTimer}</span>
          </div>
        </div>
      )}

      {/* 7. FULLSCREEN BROADCAST */}
      {(layout === 'fullscreen_broadcast' || layout === 'fullscreen_card') && (
        <div className="w-full max-w-lg rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-2xl text-center scale-95 sm:scale-100">
          <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-widest mb-3">
            {overlay.leagueName || 'PARTIDO EN DIRECTO'} • {timer.periodLabel || '1T'} • {formattedTimer}
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <div className="flex flex-col items-center">
              {renderTeamCrest(homeTeam, 'h-10 w-10')}
              <span className="font-black text-sm text-white mt-1 uppercase">{homeTeam.name}</span>
            </div>
            <div className="flex items-center justify-center gap-2 font-mono text-3xl font-black text-white">
              <span>{homeTeam.score}</span>
              <span className="text-slate-600">:</span>
              <span>{awayTeam.score}</span>
            </div>
            <div className="flex flex-col items-center">
              {renderTeamCrest(awayTeam, 'h-10 w-10')}
              <span className="font-black text-sm text-white mt-1 uppercase">{awayTeam.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* 8. LOWER THIRD */}
      {layout === 'lower_third' && (
        <div className="w-full max-w-lg rounded-xl bg-slate-950/95 border-b-2 border-indigo-500 p-2.5 shadow-2xl flex items-center justify-between scale-95 sm:scale-100">
          <div className="flex items-center gap-2">
            {renderTeamCrest(homeTeam, 'h-6 w-6')}
            <span className="font-black text-xs text-white uppercase">{homeTeam.shortName || homeTeam.name}</span>
            <span className="font-mono text-lg font-black text-indigo-400">{homeTeam.score}</span>
          </div>

          <div className="px-2 py-0.5 rounded bg-slate-900 text-[10px] font-mono font-bold text-amber-400">
            {formattedTimer}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-black text-indigo-400">{awayTeam.score}</span>
            <span className="font-black text-xs text-white uppercase">{awayTeam.shortName || awayTeam.name}</span>
            {renderTeamCrest(awayTeam, 'h-6 w-6')}
          </div>
        </div>
      )}

      {/* 9. CORNER BOX */}
      {layout === 'corner_box' && (
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 shadow-2xl min-w-[160px] scale-95 sm:scale-100">
          <div className="flex justify-between items-center text-xs font-bold text-white mb-1">
            <span>{homeTeam.shortName || homeTeam.name}</span>
            <span className="font-mono text-emerald-400">{homeTeam.score}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-white mb-1">
            <span>{awayTeam.shortName || awayTeam.name}</span>
            <span className="font-mono text-emerald-400">{awayTeam.score}</span>
          </div>
          <div className="text-[9px] font-mono text-slate-400 text-right pt-1 border-t border-slate-800">
            {formattedTimer}
          </div>
        </div>
      )}

      {/* 10. MINIMAL TICKER */}
      {layout === 'minimal_ticker' && (
        <div className="rounded-full bg-slate-950/90 border border-slate-800 px-4 py-1.5 shadow-2xl flex items-center gap-3 text-xs font-bold text-white scale-95 sm:scale-100">
          <span style={{ color: homeTeam.color }}>{homeTeam.shortName || homeTeam.name}</span>
          <span className="font-mono text-amber-400">{homeTeam.score} - {awayTeam.score}</span>
          <span style={{ color: awayTeam.color }}>{awayTeam.shortName || awayTeam.name}</span>
          <span className="text-slate-400 font-mono text-[10px]">({formattedTimer})</span>
        </div>
      )}
    </div>
  );
};
