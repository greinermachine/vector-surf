export const LEADERBOARD_MAP_IDS = [
  'alpine-flow',
  'parallax',
  'canyon-signal',
  'dynamo-rise',
  'switchyard',
] as const;

export const PLAYER_NAME_MAX_LENGTH = 20;
export const MIN_COMPLETION_TIME_MS = 1_000;
export const MAX_COMPLETION_TIME_MS = 24 * 60 * 60 * 1_000;

export type LeaderboardMapId = (typeof LEADERBOARD_MAP_IDS)[number];

export type LeaderboardEntry = {
  mapId: LeaderboardMapId;
  anonymousPlayerId: string;
  playerName: string;
  timeMs: number;
  submittedAt: string;
};

export type LeaderboardSnapshot = {
  entries: LeaderboardEntry[];
  playerBest: LeaderboardEntry | null;
};

export type ScoreSubmission = {
  mapId: LeaderboardMapId;
  anonymousPlayerId: string;
  playerName: string;
  timeMs: number;
};

export type ScoreSubmissionOutcome = 'created' | 'improved' | 'kept';

export type ScoreSubmissionResult = LeaderboardSnapshot & {
  entry: LeaderboardEntry;
  outcome: ScoreSubmissionOutcome;
};

export type SubmissionValidationResult =
  | { ok: true; value: ScoreSubmission }
  | { ok: false; message: string };

const anonymousPlayerIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLeaderboardMapId(value: unknown): value is LeaderboardMapId {
  return typeof value === 'string' && LEADERBOARD_MAP_IDS.includes(value as LeaderboardMapId);
}

export function normalizePlayerName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  const length = Array.from(normalized).length;
  if (length < 1 || length > PLAYER_NAME_MAX_LENGTH) return null;
  if (Array.from(normalized).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return character === '<' || character === '>' || codePoint <= 31 || codePoint === 127;
  })) return null;
  return normalized;
}

export function isAnonymousPlayerId(value: unknown): value is string {
  return typeof value === 'string' && anonymousPlayerIdPattern.test(value);
}

export function validateScoreSubmission(value: unknown): SubmissionValidationResult {
  if (!value || typeof value !== 'object') {
    return { ok: false, message: 'Submission must be a JSON object.' };
  }

  const candidate = value as Record<string, unknown>;
  if (!isLeaderboardMapId(candidate.mapId)) {
    return { ok: false, message: 'Map is not leaderboard-enabled.' };
  }

  if (!isAnonymousPlayerId(candidate.anonymousPlayerId)) {
    return { ok: false, message: 'Anonymous player ID is invalid.' };
  }

  const playerName = normalizePlayerName(candidate.playerName);
  if (!playerName) {
    return {
      ok: false,
      message: `Display name must be 1-${PLAYER_NAME_MAX_LENGTH} characters and cannot contain HTML tags or control characters.`,
    };
  }

  const timeMs = candidate.timeMs;
  if (
    typeof timeMs !== 'number'
    || !Number.isFinite(timeMs)
    || !Number.isInteger(timeMs)
    || timeMs < MIN_COMPLETION_TIME_MS
    || timeMs > MAX_COMPLETION_TIME_MS
  ) {
    return { ok: false, message: 'Completion time is outside the accepted range.' };
  }

  return {
    ok: true,
    value: {
      mapId: candidate.mapId,
      anonymousPlayerId: candidate.anonymousPlayerId,
      playerName,
      timeMs,
    },
  };
}

export function formatLeaderboardTime(timeMs: number): string {
  const safeTime = Math.max(0, Math.round(timeMs));
  const minutes = Math.floor(safeTime / 60_000);
  const seconds = Math.floor((safeTime % 60_000) / 1_000);
  const milliseconds = safeTime % 1_000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}
