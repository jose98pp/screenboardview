import { ScoreboardData } from '../types';
import { createNewBoard } from './presets';
import { publishBoardUpdate, publishSound } from './realtimeSync';

const STORAGE_KEY = 'scoreboard_studio_boards_v1';
const SINGLE_BOARD_PREFIX = 'scoreboard_board_';
const SYNC_CHANNEL_NAME = 'scoreboard_studio_sync_channel';
const DB_NAME = 'ScoreboardStudioDB_v1';
const DB_STORE = 'scoreboards';

// Broadcast channel for instantaneous cross-tab and local OBS browser-source communication
let syncChannel: BroadcastChannel | null = null;

export function getSyncChannel(): BroadcastChannel | null {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    if (!syncChannel) {
      try {
        syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      } catch (e) {
        console.warn('BroadcastChannel initialization error:', e);
      }
    }
    return syncChannel;
  }
  return null;
}

// --------------------------------------------------------------------------
// IndexedDB Engine for Unlimited, Indestructible Local Persistence
// --------------------------------------------------------------------------
let dbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function persistToIndexedDB(board: ScoreboardData): Promise<void> {
  try {
    const db = await getIDB();
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    store.put(board);
  } catch (e) {
    // Non-fatal, localStorage handles primary synchronous reads
  }
}

async function removeFromIndexedDB(id: string): Promise<void> {
  try {
    const db = await getIDB();
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    store.delete(id);
  } catch (e) {
    // Non-fatal
  }
}

// --------------------------------------------------------------------------
// Broadcast & Cloud Relay
// --------------------------------------------------------------------------
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
    publishSound('global', soundType, volume);
  } catch (err) {
    console.warn('Cloud sync sound error:', err);
  }
}

// --------------------------------------------------------------------------
// Primary Data Access (Synchronous LocalStorage + IndexedDB Safety)
// --------------------------------------------------------------------------

export function loadAllBoards(): ScoreboardData[] {
  if (typeof window === 'undefined') return [];
  try {
    let boardsList: ScoreboardData[] = [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          boardsList = parsed;
        }
      } catch (e) {
        console.warn('Error parsing master boards array:', e);
      }
    }

    // Scan all isolated single-board keys to guarantee latest changes (like layout design) are never lost
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(SINGLE_BOARD_PREFIX)) {
          try {
            const singleRaw = localStorage.getItem(key);
            if (singleRaw) {
              const singleBoard = JSON.parse(singleRaw) as ScoreboardData;
              if (singleBoard && singleBoard.id) {
                const existingIdx = boardsList.findIndex((b) => b.id === singleBoard.id);
                if (existingIdx >= 0) {
                  if (
                    !boardsList[existingIdx].updatedAt ||
                    (singleBoard.updatedAt && singleBoard.updatedAt >= boardsList[existingIdx].updatedAt)
                  ) {
                    boardsList[existingIdx] = singleBoard;
                  }
                } else {
                  boardsList.push(singleBoard);
                }
              }
            }
          } catch (itemErr) {
            // Ignore single malformed entry
          }
        }
      }
    } catch (scanErr) {
      console.warn('LocalStorage key scan warning:', scanErr);
    }

    if (boardsList.length > 0) {
      return boardsList;
    }

    // Seed default boards on first visit
    const defaultBoards: ScoreboardData[] = [
      createNewBoard('sports_match', 'soccer', 'Fútbol: Real Madrid vs Barcelona'),
      createNewBoard('sports_match', 'basketball', 'NBA Final: Lakers vs Celtics'),
      createNewBoard('esports_bo', 'esports', 'Esports Champions (BO5)'),
      createNewBoard('leaderboard', 'generic', 'Torneo de Trivia en Vivo'),
      createNewBoard('tally_counter', 'generic', 'Contador de Stream / Kills & Wins'),
    ];
    saveAllBoards(defaultBoards);
    return defaultBoards;
  } catch (e) {
    console.error('Error loading boards from localStorage:', e);
  }
  return [];
}

export function saveAllBoards(boards: ScoreboardData[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
    // Also save individual board entries & IndexedDB for maximum isolation
    boards.forEach((b) => {
      try {
        localStorage.setItem(`${SINGLE_BOARD_PREFIX}${b.id}`, JSON.stringify(b));
      } catch (err) {
        // Individual item Quota limit handled
      }
      persistToIndexedDB(b);
    });
  } catch (e) {
    console.error('Error saving boards to localStorage:', e);
    // If master list hits quota due to uploaded images, try storing boards stripped or in IndexedDB
    try {
      boards.forEach((b) => persistToIndexedDB(b));
    } catch (dbErr) {
      console.error('IndexedDB backup failed:', dbErr);
    }
  }
}

export function getBoardById(id: string): ScoreboardData | null {
  if (typeof window === 'undefined' || !id) return null;

  // 1. Check isolated single-board key first (prevents stale list clobbering)
  try {
    const single = localStorage.getItem(`${SINGLE_BOARD_PREFIX}${id}`);
    if (single) {
      const parsed = JSON.parse(single);
      if (parsed && parsed.id === id) {
        return parsed as ScoreboardData;
      }
    }
  } catch (e) {
    // Continue to list
  }

  // 2. Check full collection
  const boards = loadAllBoards();
  return boards.find((b) => b.id === id) || null;
}

/**
 * Saves or updates a single board in localStorage and IndexedDB.
 * Guarantees that saving one board NEVER modifies or corrupts other boards.
 */
export function saveBoard(
  board: ScoreboardData,
  options: { skipBroadcast?: boolean } = {}
): ScoreboardData {
  if (typeof window === 'undefined') return board;

  const updatedBoard: ScoreboardData = {
    ...board,
    updatedAt: Date.now(),
  };

  // 1. Save isolated single-board storage key
  try {
    localStorage.setItem(
      `${SINGLE_BOARD_PREFIX}${updatedBoard.id}`,
      JSON.stringify(updatedBoard)
    );
  } catch (e) {
    console.warn('Single board localStorage write error:', e);
  }

  // 2. Safely merge into master boards list
  try {
    let currentBoards = loadAllBoards();
    const index = currentBoards.findIndex((b) => b.id === updatedBoard.id);

    if (index >= 0) {
      currentBoards[index] = updatedBoard;
    } else {
      currentBoards.unshift(updatedBoard);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentBoards));
  } catch (e) {
    console.warn('Master list update error:', e);
  }

  // 3. Persist to IndexedDB permanently
  persistToIndexedDB(updatedBoard);

  // 4. Broadcast live updates to OBS Browser Source and local tabs
  if (!options.skipBroadcast) {
    broadcastBoardUpdate(updatedBoard);
  }

  return updatedBoard;
}

export function deleteBoard(id: string): ScoreboardData[] {
  // Remove single key
  try {
    localStorage.removeItem(`${SINGLE_BOARD_PREFIX}${id}`);
  } catch (e) {}

  removeFromIndexedDB(id);

  const boards = loadAllBoards().filter((b) => b.id !== id);
  saveAllBoards(boards);
  return boards;
}

export function duplicateBoard(id: string): ScoreboardData | null {
  const original = getBoardById(id);
  if (!original) return null;

  const now = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const newId = `sb_${now.toString(36)}_${randomSuffix}`;

  const duplicated: ScoreboardData = {
    ...JSON.parse(JSON.stringify(original)),
    id: newId,
    title: `${original.title} (Copia)`,
    createdAt: now,
    updatedAt: now,
  };

  saveBoard(duplicated);
  return duplicated;
}

export function exportBoardsToJson(): string {
  const boards = loadAllBoards();
  return JSON.stringify(boards, null, 2);
}

export function exportSingleBoardToJson(board: ScoreboardData): string {
  return JSON.stringify(board, null, 2);
}

export function importBoardsFromJson(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed) && parsed.length > 0) {
      saveAllBoards(parsed);
      return true;
    } else if (parsed && typeof parsed === 'object' && parsed.id && parsed.title) {
      // Single board import
      saveBoard(parsed as ScoreboardData);
      return true;
    }
  } catch (e) {
    console.error('Invalid JSON for scoreboard import', e);
  }
  return false;
}
