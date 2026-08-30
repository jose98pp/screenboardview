import { ScoreboardData } from '../types';
import { createNewBoard } from './presets';
import { publishBoardUpdate, publishSound } from './realtimeSync';

const STORAGE_KEY = 'scoreboard_studio_boards_v1';
const SYNC_CHANNEL_NAME = 'scoreboard_studio_sync_channel';

// Broadcast channel for instantaneous cross-tab and OBS browser-source communication
let syncChannel: BroadcastChannel | null = null;

export function getSyncChannel(): BroadcastChannel | null {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    if (!syncChannel) {
      syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    }
    return syncChannel;
  }
  return null;
}

export function broadcastBoardUpdate(board: ScoreboardData) {
  try {
    const channel = getSyncChannel();
    if (channel) {
      channel.postMessage({
        type: 'BOARD_UPDATED',
        boardId: board.id,
        board,
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    console.warn('BroadcastChannel postMessage error:', err);
  }

  // Also broadcast via Cloud Realtime Relay (WebSockets/MQTT) for OBS Browser Source
  try {
    publishBoardUpdate(board);
  } catch (err) {
    console.warn('Cloud sync broadcast error:', err);
  }
}

export function broadcastTriggerSound(soundType: string, volume: number = 0.7) {
  try {
    const channel = getSyncChannel();
    if (channel) {
      channel.postMessage({
        type: 'PLAY_SOUND',
        soundType,
        volume,
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    console.warn('BroadcastChannel sound error:', err);
  }

  // Also broadcast sound to cloud listeners (OBS)
  try {
    // We can broadcast to all active boards or generic
    publishSound('global', soundType, volume);
  } catch (err) {
    console.warn('Cloud sync sound error:', err);
  }
}

export function loadAllBoards(): ScoreboardData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed default boards (Fútbol, Baloncesto, Esports, Trivia Leaderboard)
      const defaultBoards: ScoreboardData[] = [
        createNewBoard('sports_match', 'soccer', 'Fútbol: Real Madrid vs Barcelona'),
        createNewBoard('sports_match', 'basketball', 'NBA Final: Lakers vs Celtics'),
        createNewBoard('esports_bo', 'esports', 'Esports Champions (BO5)'),
        createNewBoard('leaderboard', 'generic', 'Torneo de Trivia en Vivo'),
        createNewBoard('tally_counter', 'generic', 'Contador de Stream / Kills & Wins'),
      ];
      saveAllBoards(defaultBoards);
      return defaultBoards;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Error loading boards from localStorage:', e);
  }
  return [];
}

export function saveAllBoards(boards: ScoreboardData[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  } catch (e) {
    console.error('Error saving boards to localStorage:', e);
  }
}

export function getBoardById(id: string): ScoreboardData | null {
  const boards = loadAllBoards();
  return boards.find((b) => b.id === id) || null;
}

export function saveBoard(board: ScoreboardData) {
  const boards = loadAllBoards();
  const index = boards.findIndex((b) => b.id === board.id);
  const updatedBoard = { ...board, updatedAt: Date.now() };

  if (index >= 0) {
    boards[index] = updatedBoard;
  } else {
    boards.unshift(updatedBoard);
  }

  saveAllBoards(boards);
  broadcastBoardUpdate(updatedBoard);
  return updatedBoard;
}

export function deleteBoard(id: string): ScoreboardData[] {
  const boards = loadAllBoards().filter((b) => b.id !== id);
  saveAllBoards(boards);
  return boards;
}

export function duplicateBoard(id: string): ScoreboardData | null {
  const original = getBoardById(id);
  if (!original) return null;

  const duplicated: ScoreboardData = {
    ...JSON.parse(JSON.stringify(original)),
    id: 'sb_' + Math.random().toString(36).substring(2, 9),
    title: `${original.title} (Copia)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saveBoard(duplicated);
  return duplicated;
}

export function exportBoardsToJson(): string {
  const boards = loadAllBoards();
  return JSON.stringify(boards, null, 2);
}

export function importBoardsFromJson(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed) && parsed.length > 0) {
      saveAllBoards(parsed);
      return true;
    }
  } catch (e) {
    console.error('Invalid JSON for scoreboard import', e);
  }
  return false;
}
