import { describe, expect, it, vi } from 'vitest';
import {
  ANONYMOUS_PLAYER_ID_KEY,
  getOrCreateAnonymousPlayerId,
  PLAYER_NAME_KEY,
  readRememberedPlayerName,
  rememberPlayerName,
} from './identity';

const playerId = '8d9447e4-d81f-4f69-93e5-59b95e8901fa';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
}

describe('anonymous leaderboard identity', () => {
  it('generates once and preserves the anonymous ID across reloads', () => {
    const storage = memoryStorage();
    const createId = vi.fn(() => playerId);
    expect(getOrCreateAnonymousPlayerId(storage, createId)).toBe(playerId);
    expect(getOrCreateAnonymousPlayerId(storage, createId)).toBe(playerId);
    expect(createId).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(ANONYMOUS_PLAYER_ID_KEY, playerId);
  });

  it('replaces malformed persisted identity data', () => {
    const storage = memoryStorage({ [ANONYMOUS_PLAYER_ID_KEY]: 'not-a-uuid' });
    expect(getOrCreateAnonymousPlayerId(storage, () => playerId)).toBe(playerId);
  });

  it('trims and preserves the remembered name across reloads', () => {
    const storage = memoryStorage();
    expect(rememberPlayerName('  Greiner  ', storage)).toBe('Greiner');
    expect(storage.setItem).toHaveBeenCalledWith(PLAYER_NAME_KEY, 'Greiner');
    expect(readRememberedPlayerName(storage)).toBe('Greiner');
  });

  it('does not persist malformed names', () => {
    const storage = memoryStorage();
    expect(rememberPlayerName('   ', storage)).toBeNull();
    expect(rememberPlayerName('<script>', storage)).toBeNull();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
