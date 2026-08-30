import mqtt, { MqttClient } from 'mqtt';
import LZString from 'lz-string';
import { ScoreboardData } from '../types';
import { getBoardById, saveBoard } from './storage';

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

interface BoardSubscriber {
  updateCallbacks: Set<(board: ScoreboardData) => void>;
  soundCallbacks: Set<(soundType: string, volume: number) => void>;
  isController: boolean;
}

let mqttClient: MqttClient | null = null;
const boardSubscribers = new Map<string, BoardSubscriber>();
const subscribedTopics = new Set<string>();

export function getMqttTopic(boardId: string): string {
  // Safe alphanumeric topic uniquely scoped per board ID
  const cleanId = (boardId || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
  return `scoreboard_v2_sync/${cleanId}`;
}

function ensureMqttClient(): MqttClient | null {
  if (typeof window === 'undefined') return null;
  if (mqttClient) return mqttClient;

  try {
    const clientId = `scb_${Math.random().toString(36).substring(2, 10)}`;
    mqttClient = mqtt.connect(BROKERS[0], {
      clientId,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 3000,
    });

    mqttClient.on('connect', () => {
      console.log('[RealtimeSync] Conectado al broker de sincronización en la nube');
      // Resubscribe to all active topics
      boardSubscribers.forEach((_, boardId) => {
        const topic = getMqttTopic(boardId);
        mqttClient?.subscribe(topic, { qos: 0 });
        subscribedTopics.add(topic);
      });
    });

    mqttClient.on('message', (receivedTopic, payload) => {
      try {
        const msg = JSON.parse(payload.toString());
        const targetBoardId = msg.boardId || msg.board?.id;

        if (msg.type === 'BOARD_UPDATED' && msg.board && targetBoardId) {
          const incomingBoard = msg.board as ScoreboardData;
          // Store locally in this browser window / OBS CEF
          saveBoard(incomingBoard, { skipBroadcast: true });

          // STRICT ISOLATION: Only notify listeners registered specifically for this boardId
          const subscriber = boardSubscribers.get(targetBoardId);
          if (subscriber) {
            subscriber.updateCallbacks.forEach((cb) => {
              try {
                cb(incomingBoard);
              } catch (e) {
                console.error('[RealtimeSync] Callback error:', e);
              }
            });
          }
        } else if (msg.type === 'REQUEST_STATE' && targetBoardId) {
          const subscriber = boardSubscribers.get(targetBoardId);
          if (subscriber && subscriber.isController) {
            // Reply with the latest state for this specific board
            const current = getBoardById(targetBoardId);
            if (current) {
              publishBoardUpdate(current);
            }
          }
        } else if (msg.type === 'PLAY_SOUND') {
          if (targetBoardId) {
            const subscriber = boardSubscribers.get(targetBoardId);
            if (subscriber) {
              subscriber.soundCallbacks.forEach((cb) => {
                try {
                  cb(msg.soundType, msg.volume || 0.7);
                } catch (e) {
                  console.error('[RealtimeSync] Sound callback error:', e);
                }
              });
            }
          } else {
            // Global sound
            boardSubscribers.forEach((sub) => {
              sub.soundCallbacks.forEach((cb) => cb(msg.soundType, msg.volume || 0.7));
            });
          }
        }
      } catch (err) {
        console.warn('[RealtimeSync] Error parsing message:', err);
      }
    });

    mqttClient.on('error', (err) => {
      console.warn('[RealtimeSync] MQTT error:', err);
    });
  } catch (e) {
    console.error('[RealtimeSync] Failed to initialize MQTT:', e);
  }

  return mqttClient;
}

export function initRealtimeSync(
  boardId: string,
  onBoardUpdate?: (board: ScoreboardData) => void,
  onSound?: (soundType: string, volume: number) => void,
  isController: boolean = false
): () => void {
  if (!boardId) return () => {};

  const client = ensureMqttClient();
  const topic = getMqttTopic(boardId);

  // Register subscribers strictly scoped to this boardId
  let sub = boardSubscribers.get(boardId);
  if (!sub) {
    sub = {
      updateCallbacks: new Set(),
      soundCallbacks: new Set(),
      isController,
    };
    boardSubscribers.set(boardId, sub);
  } else {
    if (isController) sub.isController = true;
  }

  if (onBoardUpdate) sub.updateCallbacks.add(onBoardUpdate);
  if (onSound) sub.soundCallbacks.add(onSound);

  // Subscribe to topic if client is already connected
  if (client && client.connected && !subscribedTopics.has(topic)) {
    client.subscribe(topic, { qos: 0 });
    subscribedTopics.add(topic);
  }

  // If we are an OBS overlay listener, request current board state immediately
  if (!isController) {
    publishMessage(boardId, {
      type: 'REQUEST_STATE',
      boardId,
      timestamp: Date.now(),
    });
  }

  // Return cleanup function for this specific listener
  return () => {
    const currentSub = boardSubscribers.get(boardId);
    if (currentSub) {
      if (onBoardUpdate) currentSub.updateCallbacks.delete(onBoardUpdate);
      if (onSound) currentSub.soundCallbacks.delete(onSound);

      // If no listeners left for this board, clean up
      if (currentSub.updateCallbacks.size === 0 && currentSub.soundCallbacks.size === 0) {
        boardSubscribers.delete(boardId);
        if (client && client.connected && subscribedTopics.has(topic)) {
          client.unsubscribe(topic);
          subscribedTopics.delete(topic);
        }
      }
    }
  };
}

export function publishMessage(boardId: string, data: Record<string, unknown>) {
  if (!boardId) return;
  const client = ensureMqttClient();
  const topic = getMqttTopic(boardId);
  if (client && client.connected) {
    client.publish(topic, JSON.stringify(data), { qos: 0 });
  }
}

export function publishBoardUpdate(board: ScoreboardData) {
  if (!board || !board.id) return;
  publishMessage(board.id, {
    type: 'BOARD_UPDATED',
    boardId: board.id,
    board,
    timestamp: Date.now(),
  });
}

export function publishSound(boardId: string, soundType: string, volume: number = 0.7) {
  if (!boardId) return;
  publishMessage(boardId, {
    type: 'PLAY_SOUND',
    boardId,
    soundType,
    volume,
    timestamp: Date.now(),
  });
}

/**
 * Encodes board state into a compressed URL hash or query string
 */
export function encodeBoardToUrlParam(board: ScoreboardData): string {
  try {
    return LZString.compressToEncodedURIComponent(JSON.stringify(board));
  } catch (e) {
    console.error('Error compressing board:', e);
    return '';
  }
}

/**
 * Decodes board state from compressed URL param
 */
export function decodeBoardFromUrlParam(compressed: string): ScoreboardData | null {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    if (decompressed) {
      return JSON.parse(decompressed) as ScoreboardData;
    }
  } catch (e) {
    console.error('Error decompressing board:', e);
  }
  return null;
}
