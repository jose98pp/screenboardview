import mqtt, { MqttClient } from 'mqtt';
import LZString from 'lz-string';
import { ScoreboardData } from '../types';
import { getBoardById, saveBoard, loadAllBoards } from './storage';

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

let mqttClient: MqttClient | null = null;
let currentSubscribedTopic: string | null = null;
const listeners = new Set<(board: ScoreboardData) => void>();
const soundListeners = new Set<(soundType: string, volume: number) => void>();

export function getMqttTopic(boardId: string): string {
  // Safe alphanumeric topic
  const cleanId = boardId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `scoreboard_v2_sync/${cleanId}`;
}

export function initRealtimeSync(
  boardId: string,
  onBoardUpdate?: (board: ScoreboardData) => void,
  onSound?: (soundType: string, volume: number) => void,
  isController: boolean = false
): () => void {
  if (onBoardUpdate) listeners.add(onBoardUpdate);
  if (onSound) soundListeners.add(onSound);

  const topic = getMqttTopic(boardId);

  // Initialize MQTT if not created or if disconnected
  if (!mqttClient) {
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
        if (currentSubscribedTopic) {
          mqttClient?.subscribe(currentSubscribedTopic, { qos: 0 });
        }
        // If we are an overlay waiting for state, request it now
        if (!isController) {
          publishMessage(boardId, {
            type: 'REQUEST_STATE',
            boardId,
            timestamp: Date.now(),
          });
        }
      });

      mqttClient.on('message', (receivedTopic, payload) => {
        try {
          const msg = JSON.parse(payload.toString());
          if (msg.type === 'BOARD_UPDATED' && msg.board) {
            const incomingBoard = msg.board as ScoreboardData;
            // Save locally in this browser instance (e.g. inside OBS CEF) without re-broadcasting
            saveBoard(incomingBoard, { skipBroadcast: true });
            listeners.forEach((cb) => cb(incomingBoard));
          } else if (msg.type === 'REQUEST_STATE' && isController) {
            // OBS overlay is asking for the latest board state! Reply with our current board
            const current = getBoardById(boardId);
            if (current) {
              publishBoardUpdate(current);
            }
          } else if (msg.type === 'PLAY_SOUND') {
            soundListeners.forEach((cb) => cb(msg.soundType, msg.volume || 0.7));
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
  }

  // Subscribe to this board's topic
  if (mqttClient && mqttClient.connected) {
    if (currentSubscribedTopic && currentSubscribedTopic !== topic) {
      mqttClient.unsubscribe(currentSubscribedTopic);
    }
    currentSubscribedTopic = topic;
    mqttClient.subscribe(topic, { qos: 0 });

    if (!isController) {
      // Send immediate request for state
      publishMessage(boardId, {
        type: 'REQUEST_STATE',
        boardId,
        timestamp: Date.now(),
      });
    }
  } else {
    currentSubscribedTopic = topic;
  }

  return () => {
    if (onBoardUpdate) listeners.delete(onBoardUpdate);
    if (onSound) soundListeners.delete(onSound);
  };
}

export function publishMessage(boardId: string, data: Record<string, unknown>) {
  const topic = getMqttTopic(boardId);
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(topic, JSON.stringify(data), { qos: 0 });
  }
}

export function publishBoardUpdate(board: ScoreboardData) {
  publishMessage(board.id, {
    type: 'BOARD_UPDATED',
    boardId: board.id,
    board,
    timestamp: Date.now(),
  });
}

export function publishSound(boardId: string, soundType: string, volume: number = 0.7) {
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
