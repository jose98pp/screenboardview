/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScoreboardData } from './types';
import { loadAllBoards, getBoardById } from './utils/storage';
import { parseCurrentRoute } from './utils/urlHelper';
import { Navbar } from './components/Navbar';
import { DashboardHome } from './components/DashboardHome';
import { BoardController } from './components/BoardController';
import { LeaderboardController } from './components/LeaderboardController';
import { TallyController } from './components/TallyController';
import { GoalController } from './components/GoalController';
import { OBSOverlayView } from './components/OBSOverlayView';
import { OBSHelpModal } from './components/OBSHelpModal';

export default function App() {
  const [boards, setBoards] = useState<ScoreboardData[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isOverlayMode, setIsOverlayMode] = useState<boolean>(false);
  const [obsHelpModalOpen, setObsHelpModalOpen] = useState<boolean>(false);
  const [helpBoardId, setHelpBoardId] = useState<string | undefined>(undefined);

  // Initialize & parse route (supporting query param ?mode=overlay&id=XYZ, ?overlay=XYZ, #/overlay/XYZ, /overlay/XYZ)
  useEffect(() => {
    const handleRouteCheck = () => {
      const route = parseCurrentRoute();
      if (route.isOverlay) {
        setIsOverlayMode(true);
        if (route.boardId) {
          setSelectedBoardId(route.boardId);
        }
      } else {
        setIsOverlayMode(false);
        const all = loadAllBoards();
        setBoards(all);
        if (route.boardId) {
          const found = all.find((b) => b.id === route.boardId);
          if (found) setSelectedBoardId(route.boardId);
        }
      }
    };

    handleRouteCheck();

    window.addEventListener('popstate', handleRouteCheck);
    window.addEventListener('hashchange', handleRouteCheck);

    return () => {
      window.removeEventListener('popstate', handleRouteCheck);
      window.removeEventListener('hashchange', handleRouteCheck);
    };
  }, []);

  const refreshBoards = () => {
    const all = loadAllBoards();
    setBoards(all);
  };

  const handleSelectBoard = (board: ScoreboardData) => {
    const all = loadAllBoards();
    setBoards(all);
    setSelectedBoardId(board.id);
  };

  const handleBackToDashboard = () => {
    setSelectedBoardId(null);
    refreshBoards();
  };

  const handleOpenObsHelp = (boardId?: string) => {
    setHelpBoardId(boardId || selectedBoardId || boards[0]?.id);
    setObsHelpModalOpen(true);
  };

  // IF IN OBS OVERLAY MODE (Browser Source in OBS Studio)
  if (isOverlayMode) {
    return <OBSOverlayView boardId={selectedBoardId || undefined} />;
  }

  // Current active board retrieved fresh from storage or list
  const activeBoard = selectedBoardId
    ? getBoardById(selectedBoardId) || boards.find((b) => b.id === selectedBoardId) || null
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-600 selection:text-white font-sans">
      <Navbar
        onGoHome={handleBackToDashboard}
        onOpenObsHelp={() => handleOpenObsHelp()}
      />

      {/* RENDER VIEW */}
      {!activeBoard ? (
        <DashboardHome
          boards={boards}
          onSelectBoard={handleSelectBoard}
          onRefreshBoards={refreshBoards}
          onOpenObsHelp={handleOpenObsHelp}
        />
      ) : activeBoard.type === 'leaderboard' ? (
        <LeaderboardController
          key={activeBoard.id}
          board={activeBoard}
          onBack={handleBackToDashboard}
          onOpenObsHelp={() => handleOpenObsHelp(activeBoard.id)}
        />
      ) : activeBoard.type === 'tally_counter' ? (
        <TallyController
          key={activeBoard.id}
          board={activeBoard}
          onBack={handleBackToDashboard}
          onOpenObsHelp={() => handleOpenObsHelp(activeBoard.id)}
        />
      ) : activeBoard.type === 'stream_goal' ? (
        <GoalController
          key={activeBoard.id}
          board={activeBoard}
          onBack={handleBackToDashboard}
          onOpenObsHelp={() => handleOpenObsHelp(activeBoard.id)}
        />
      ) : (
        <BoardController
          key={activeBoard.id}
          board={activeBoard}
          onBack={handleBackToDashboard}
          onOpenObsHelp={() => handleOpenObsHelp(activeBoard.id)}
        />
      )}

      {/* OBS Help / Connection Modal */}
      <OBSHelpModal
        isOpen={obsHelpModalOpen}
        onClose={() => setObsHelpModalOpen(false)}
        boardId={helpBoardId}
      />
    </div>
  );
}
