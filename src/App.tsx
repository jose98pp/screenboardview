/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScoreboardData, ActiveView } from './types';
import { loadAllBoards, getBoardById } from './utils/storage';
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

  // Initialize & parse query params (for OBS browser source)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const isOverlay = mode === 'overlay' || params.get('overlay') === 'true';
    const idFromUrl = params.get('id');

    if (isOverlay) {
      setIsOverlayMode(true);
      if (idFromUrl) {
        setSelectedBoardId(idFromUrl);
      }
    } else {
      const all = loadAllBoards();
      setBoards(all);
      if (idFromUrl) {
        const found = all.find((b) => b.id === idFromUrl);
        if (found) setSelectedBoardId(idFromUrl);
      }
    }
  }, []);

  const refreshBoards = () => {
    const all = loadAllBoards();
    setBoards(all);
  };

  const handleSelectBoard = (board: ScoreboardData) => {
    setSelectedBoardId(board.id);
  };

  const handleBackToDashboard = () => {
    setSelectedBoardId(null);
    refreshBoards();
  };

  const handleOpenObsHelp = (boardId?: string) => {
    setHelpBoardId(boardId || selectedBoardId || (boards[0]?.id));
    setObsHelpModalOpen(true);
  };

  // IF IN OBS OVERLAY MODE (Browser Source in OBS Studio)
  if (isOverlayMode) {
    return <OBSOverlayView boardId={selectedBoardId || undefined} />;
  }

  // Current active board if selected
  const activeBoard = selectedBoardId ? boards.find((b) => b.id === selectedBoardId) || null : null;

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
          board={activeBoard}
          onBack={handleBackToDashboard}
          onOpenObsHelp={() => handleOpenObsHelp(activeBoard.id)}
        />
      ) : activeBoard.type === 'tally_counter' ? (
        <TallyController
          board={activeBoard}
          onBack={handleBackToDashboard}
          onOpenObsHelp={() => handleOpenObsHelp(activeBoard.id)}
        />
      ) : activeBoard.type === 'stream_goal' ? (
        <GoalController
          board={activeBoard}
          onBack={handleBackToDashboard}
          onOpenObsHelp={() => handleOpenObsHelp(activeBoard.id)}
        />
      ) : (
        <BoardController
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
