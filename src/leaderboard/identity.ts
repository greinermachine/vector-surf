import { isAnonymousPlayerId, normalizePlayerName } from './contracts';

export const ANONYMOUS_PLAYER_ID_KEY = 'vector-surf:leaderboard-player-id:v1';
export const PLAYER_NAME_KEY = 'vector-surf:leaderboard-player-name:v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function fallbackUuid(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function createAnonymousPlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return fallbackUuid();
}

export function getOrCreateAnonymousPlayerId(
  storage: StorageLike | null | undefined = undefined,
  createId: () => string = createAnonymousPlayerId,
): string {
  const targetStorage = storage === undefined ? getBrowserStorage() : storage;
  if (targetStorage) {
    try {
      const stored = targetStorage.getItem(ANONYMOUS_PLAYER_ID_KEY);
      if (isAnonymousPlayerId(stored)) return stored;
    } catch {
      // A session-only ID still allows play when browser storage is blocked.
    }
  }

  const playerId = createId();
  if (targetStorage) {
    try {
      targetStorage.setItem(ANONYMOUS_PLAYER_ID_KEY, playerId);
    } catch {
      // The current page can keep using the generated ID without persistence.
    }
  }
  return playerId;
}

export function readRememberedPlayerName(
  storage: StorageLike | null | undefined = undefined,
): string {
  const targetStorage = storage === undefined ? getBrowserStorage() : storage;
  if (!targetStorage) return '';
  try {
    return normalizePlayerName(targetStorage.getItem(PLAYER_NAME_KEY)) ?? '';
  } catch {
    return '';
  }
}

export function rememberPlayerName(
  playerName: string,
  storage: StorageLike | null | undefined = undefined,
): string | null {
  const normalized = normalizePlayerName(playerName);
  if (!normalized) return null;
  const targetStorage = storage === undefined ? getBrowserStorage() : storage;
  if (targetStorage) {
    try {
      targetStorage.setItem(PLAYER_NAME_KEY, normalized);
    } catch {
      // Remembering a name is optional and must never block submission.
    }
  }
  return normalized;
}
