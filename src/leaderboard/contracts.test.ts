import { describe, expect, it } from 'vitest';
import { FULL_SURF_MAPS } from '../game/levels';
import {
  formatLeaderboardTime,
  LEADERBOARD_MAP_IDS,
  normalizePlayerName,
  validateScoreSubmission,
} from './contracts';

const validSubmission = {
  mapId: 'parallax',
  anonymousPlayerId: '8d9447e4-d81f-4f69-93e5-59b95e8901fa',
  playerName: 'Greiner',
  timeMs: 41_281,
};

describe('leaderboard contracts', () => {
  it('keeps every complete map in the server-safe leaderboard allowlist', () => {
    expect(FULL_SURF_MAPS.map((level) => level.id)).toEqual(LEADERBOARD_MAP_IDS);
  });

  it('normalizes safe display names and rejects malformed names', () => {
    expect(normalizePlayerName('  Greiner  ')).toBe('Greiner');
    expect(normalizePlayerName('')).toBeNull();
    expect(normalizePlayerName('    ')).toBeNull();
    expect(normalizePlayerName('x'.repeat(21))).toBeNull();
    expect(normalizePlayerName('<script>alert(1)</script>')).toBeNull();
    expect(normalizePlayerName('line\nbreak')).toBeNull();
  });

  it.each([0, 150, Number.NaN, Number.POSITIVE_INFINITY, 86_400_001, 41_281.5, '41281'])(
    'rejects malformed or implausible time %s',
    (timeMs) => {
      expect(validateScoreSubmission({ ...validSubmission, timeMs }).ok).toBe(false);
    },
  );

  it('rejects unknown maps and malformed anonymous IDs', () => {
    expect(validateScoreSubmission({ ...validSubmission, mapId: 'first-cut' }).ok).toBe(false);
    expect(validateScoreSubmission({ ...validSubmission, anonymousPlayerId: 'player-one' }).ok).toBe(false);
  });

  it('returns a trimmed, integer-millisecond submission', () => {
    expect(validateScoreSubmission({ ...validSubmission, playerName: '  Greiner  ' })).toEqual({
      ok: true,
      value: validSubmission,
    });
  });

  it('formats stored milliseconds without floating-point drift', () => {
    expect(formatLeaderboardTime(38_421)).toBe('00:38.421');
    expect(formatLeaderboardTime(123_004)).toBe('02:03.004');
  });
});
