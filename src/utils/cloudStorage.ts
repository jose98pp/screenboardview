import { ScoreboardData } from '../types';
import { auth } from '../lib/firebase';

/**
 * Cloud Storage & Relay Engine for Scoreboard Studio
 * Backed by Cloud SQL (PostgreSQL, us-west1) with dual-redundant cloud fallback.
 */

const KV_PRIMARY_ENDPOINT = 'https://kvdb.io/87qR4E9pZ4vM62hT9kLqXw';

// In-memory cache to avoid redundant network round-trips
const memoryCache = new Map<string, { data: ScoreboardData; timestamp: number }>();

/**
 * Helper to get active Firebase ID token if user is signed in
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      return { Authorization: `Bearer ${token}` };
    }
  } catch (err) {
    // Non-fatal
  }
  return {};
}

/**
 * Uploads a scoreboard state to Cloud SQL (and fallback cloud store)
 */
export async function syncBoardToCloud(board: ScoreboardData): Promise<boolean> {
  if (!board || !board.id) return false;

  // Update memory cache immediately
  memoryCache.set(board.id, { data: board, timestamp: Date.now() });

  let cloudSqlSuccess = false;

  // 1. Primary: Save to Cloud SQL via /api/scoreboards
  try {
    const authHeaders = await getAuthHeader();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('/api/scoreboards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(board),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        cloudSqlSuccess = true;
      }
    }
  } catch (err) {
    // Non-fatal, continue to fallback
  }

  // 2. Secondary: Key-Value fallback for high-speed cross-origin OBS access
  try {
    const payload = JSON.stringify(board);
    const url = `${KV_PRIMARY_ENDPOINT}/${encodeURIComponent(board.id)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err) {
    // Non-fatal
  }

  return cloudSqlSuccess;
}

/**
 * Fetches a scoreboard state from Cloud SQL (with secondary cloud cache fallback)
 */
export async function fetchBoardFromCloud(boardId: string): Promise<ScoreboardData | null> {
  if (!boardId) return null;

  // Check fast in-memory cache first (valid for 30s)
  const cached = memoryCache.get(boardId);
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.data;
  }

  // 1. Primary: Try fetching from Cloud SQL backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`/api/scoreboards/${encodeURIComponent(boardId)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.id === boardId) {
          memoryCache.set(boardId, { data, timestamp: Date.now() });
          return data as ScoreboardData;
        }
      }
    }
  } catch (err) {
    // Fallback to KV
  }

  // 2. Secondary: Fallback to Key-Value Cloud Store
  try {
    const url = `${KV_PRIMARY_ENDPOINT}/${encodeURIComponent(boardId)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.id === boardId) {
        memoryCache.set(boardId, { data, timestamp: Date.now() });
        return data as ScoreboardData;
      }
    }
  } catch (err) {
    // Non-fatal
  }

  return null;
}

/**
 * Lists all scoreboards saved in Cloud SQL
 */
export async function fetchAllBoardsFromCloud(): Promise<ScoreboardData[]> {
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetch('/api/scoreboards', {
      headers: { Accept: 'application/json', ...authHeaders },
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const boards = await res.json();
        if (Array.isArray(boards)) {
          return boards;
        }
      }
    }
  } catch (err) {
    console.debug('[CloudStorage] fetchAllBoards notice:', err);
  }
  return [];
}
