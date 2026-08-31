import { describe, expect, it, vi } from 'vitest';
import type {
  LeaderboardEntry,
  LeaderboardMapId,
  LeaderboardSnapshot,
  ScoreSubmission,
  ScoreSubmissionResult,
} from '../src/leaderboard/contracts';
import type { LeaderboardRepository } from './leaderboardRepository';
import {
  getLeaderboardSnapshot,
  LeaderboardValidationError,
  submitScore,
} from './leaderboardService';

const firstPlayer = '8d9447e4-d81f-4f69-93e5-59b95e8901fa';
const secondPlayer = 'ffb69dd3-4ec9-4ba8-af49-22188b4a7d06';

class MemoryLeaderboardRepository implements LeaderboardRepository {
  private readonly scores = new Map<string, LeaderboardEntry>();
  private sequence = 0;

  async getLeaderboard(
    mapId: LeaderboardMapId,
    anonymousPlayerId?: string,
  ): Promise<LeaderboardSnapshot> {
    const scores = [...this.scores.values()]
      .filter((entry) => entry.mapId === mapId)
      .sort((left, right) => left.timeMs - right.timeMs
        || left.submittedAt.localeCompare(right.submittedAt));
    return {
      entries: scores.slice(0, 20),
      playerBest: scores.find((entry) => entry.anonymousPlayerId === anonymousPlayerId) ?? null,
    };
  }

  async submitScore(submission: ScoreSubmission): Promise<ScoreSubmissionResult> {
    const key = `${submission.mapId}:${submission.anonymousPlayerId}`;
    const existing = this.scores.get(key);
    const outcome = existing
      ? submission.timeMs < existing.timeMs ? 'improved' : 'kept'
      : 'created';
    const entry = outcome === 'kept'
      ? existing!
      : {
        ...submission,
        submittedAt: new Date(Date.UTC(2026, 7, 30, 12, 0, this.sequence++)).toISOString(),
      };
    this.scores.set(key, entry);
    const snapshot = await this.getLeaderboard(submission.mapId, submission.anonymousPlayerId);
    return { ...snapshot, entry, playerBest: entry, outcome };
  }
}

const score = (
  mapId: LeaderboardMapId,
  anonymousPlayerId: string,
  playerName: string,
  timeMs: number,
) => ({ mapId, anonymousPlayerId, playerName, timeMs });

describe('leaderboard service behavior', () => {
  it('creates, improves, keeps one row, updates a faster-run name, sorts, and isolates maps', async () => {
    const repository = new MemoryLeaderboardRepository();

    expect((await submitScore(score('parallax', firstPlayer, 'Nick', 43_281), repository)).outcome)
      .toBe('created');
    expect((await submitScore(score('parallax', firstPlayer, 'Greiner', 41_902), repository)).outcome)
      .toBe('improved');
    expect((await submitScore(score('parallax', firstPlayer, 'Slower Name', 44_152), repository)).outcome)
      .toBe('kept');
    await submitScore(score('parallax', secondPlayer, 'velocity', 40_100), repository);
    await submitScore(score('alpine-flow', firstPlayer, 'Greiner', 38_421), repository);

    const parallax = await getLeaderboardSnapshot('parallax', firstPlayer, repository);
    expect(parallax.entries).toHaveLength(2);
    expect(parallax.entries.map((entry) => [entry.playerName, entry.timeMs])).toEqual([
      ['velocity', 40_100],
      ['Greiner', 41_902],
    ]);
    expect(parallax.playerBest?.playerName).toBe('Greiner');

    const alpine = await getLeaderboardSnapshot('alpine-flow', firstPlayer, repository);
    expect(alpine.entries.map((entry) => entry.timeMs)).toEqual([38_421]);
  });

  it('rejects malformed submissions before storage is called', async () => {
    const repository: LeaderboardRepository = {
      getLeaderboard: vi.fn(),
      submitScore: vi.fn(),
    };
    await expect(submitScore(score('parallax', firstPlayer, '   ', 41_000), repository))
      .rejects.toBeInstanceOf(LeaderboardValidationError);
    await expect(submitScore(score('parallax', firstPlayer, 'Greiner', 150), repository))
      .rejects.toBeInstanceOf(LeaderboardValidationError);
    expect(repository.submitScore).not.toHaveBeenCalled();
  });

  it('rejects invalid map and player query parameters', async () => {
    const repository = new MemoryLeaderboardRepository();
    await expect(getLeaderboardSnapshot('first-cut', firstPlayer, repository))
      .rejects.toBeInstanceOf(LeaderboardValidationError);
    await expect(getLeaderboardSnapshot('parallax', 'not-a-uuid', repository))
      .rejects.toBeInstanceOf(LeaderboardValidationError);
  });
});
