import {
  isAnonymousPlayerId,
  isLeaderboardMapId,
  validateScoreSubmission,
  type LeaderboardSnapshot,
  type ScoreSubmissionResult,
} from '../src/leaderboard/contracts.js';
import type { LeaderboardRepository } from './leaderboardRepository.js';

export class LeaderboardValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeaderboardValidationError';
  }
}

export async function getLeaderboardSnapshot(
  mapId: unknown,
  anonymousPlayerId: unknown,
  repository: LeaderboardRepository,
): Promise<LeaderboardSnapshot> {
  if (!isLeaderboardMapId(mapId)) {
    throw new LeaderboardValidationError('Map is not leaderboard-enabled.');
  }
  if (anonymousPlayerId !== undefined && !isAnonymousPlayerId(anonymousPlayerId)) {
    throw new LeaderboardValidationError('Anonymous player ID is invalid.');
  }
  return repository.getLeaderboard(mapId, anonymousPlayerId);
}

export async function submitScore(
  input: unknown,
  repository: LeaderboardRepository,
): Promise<ScoreSubmissionResult> {
  const validation = validateScoreSubmission(input);
  if (!validation.ok) throw new LeaderboardValidationError(validation.message);
  return repository.submitScore(validation.value);
}
