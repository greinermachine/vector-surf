import type {
  LeaderboardMapId,
  LeaderboardSnapshot,
  ScoreSubmission,
  ScoreSubmissionResult,
} from './contracts';

type ErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class LeaderboardRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 0, code = 'network_error') {
    super(message);
    this.name = 'LeaderboardRequestError';
    this.status = status;
    this.code = code;
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new LeaderboardRequestError('Leaderboard returned an invalid response.', response.status);
  }

  if (!response.ok) {
    const error = payload as ErrorPayload;
    throw new LeaderboardRequestError(
      error.error?.message ?? 'Leaderboard request failed.',
      response.status,
      error.error?.code ?? 'request_failed',
    );
  }
  return payload as T;
}

export async function fetchLeaderboard(
  mapId: LeaderboardMapId,
  anonymousPlayerId: string,
  signal?: AbortSignal,
): Promise<LeaderboardSnapshot> {
  const query = new URLSearchParams({ mapId, anonymousPlayerId });
  const response = await fetch(`/api/leaderboard?${query}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  return readResponse<LeaderboardSnapshot>(response);
}

export async function submitLeaderboardScore(
  submission: ScoreSubmission,
): Promise<ScoreSubmissionResult> {
  const response = await fetch('/api/leaderboard', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submission),
  });
  return readResponse<ScoreSubmissionResult>(response);
}
