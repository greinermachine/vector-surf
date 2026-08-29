import { describe, expect, it } from 'vitest';
import { freshProgress, parseProgress, recordResult } from './progress';

describe('campaign progress', () => {
  it('starts with only the first line unlocked', () => {
    expect(freshProgress()).toMatchObject({ version: 1, unlockedLevels: 1 });
  });

  it('unlocks one next level and keeps the best run values', () => {
    const first = recordResult(
      freshProgress(),
      'first-cut',
      { levelIndex: 0, elapsed: 12, peakSpeed: 28, resets: 1 },
      6,
    );
    const second = recordResult(
      first,
      'first-cut',
      { levelIndex: 0, elapsed: 13, peakSpeed: 31, resets: 0 },
      6,
    );
    expect(second.unlockedLevels).toBe(2);
    expect(second.bestTimes['first-cut']).toBe(12);
    expect(second.peakSpeeds['first-cut']).toBe(31);
  });

  it('fails safely on corrupt or over-wide storage', () => {
    expect(parseProgress('{broken', 6)).toEqual(freshProgress());
    expect(parseProgress(JSON.stringify({ version: 1, unlockedLevels: 999 }), 6).unlockedLevels).toBe(6);
  });
});
