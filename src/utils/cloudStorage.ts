import { ScoreboardData } from '../types';

/**
 * Cloud Storage & Relay Engine for Scoreboard Studio
 * Provides permanent, cross-device, cross-browser persistence for OBS Studio overlays
 */

const KV_BUCKET = 'scb_cloud_v2_prod';
const KV_PRIMARY_ENDPOINT = 'https://kvdb.io/87qR4E9pZ4vM62hT9kLqXw'; // High-speed CORS Key-Value Store

// In-memory cache to avoid duplicate network calls
const memoryCache = new Map<string, { data: ScoreboardData; timestamp: number }>();

/**
 * Uploads a scoreboard state to Cloud Key-Value Storage
 */
export async function syncBoardToCloud(board: ScoreboardData): Promise<boolean> {
  if (!board || !board.id) return false;

  // Update memory cache immediately
  memoryCache.set(board.id, { data: board, timestamp: Date.now() });

  try {
    const payload = JSON.stringify(board);
    const url = `${KV_PRIMARY_ENDPOINT}/${encodeURIComponent(board.id)}`;

    // Fire and forget with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (err) {
    // Non-fatal: local storage + MQTT retain will also handle it
    console.debug('[CloudStorage] Cloud sync notice:', err);
    return false;
  }
}

/**
 * Fetches a scoreboard state from Cloud Key-Value Storage by Board ID
 */
export async function fetchBoardFromCloud(boardId: string): Promise<ScoreboardData | null> {
  if (!boardId) return null;

  // Check fast in-memory cache first
  const cached = memoryCache.get(boardId);
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.data;
  }

  try {
    const url = `${KV_PRIMARY_ENDPOINT}/${encodeURIComponent(boardId)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
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
    console.debug('[CloudStorage] Cloud fetch notice:', err);
  }

  return null;
}
