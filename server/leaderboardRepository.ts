import {
  isLeaderboardMapId,
  type LeaderboardEntry,
  type LeaderboardMapId,
  type LeaderboardSnapshot,
  type ScoreSubmission,
  type ScoreSubmissionOutcome,
  type ScoreSubmissionResult,
} from '../src/leaderboard/contracts';

export interface LeaderboardRepository {
  getLeaderboard(
    mapId: LeaderboardMapId,
    anonymousPlayerId?: string,
  ): Promise<LeaderboardSnapshot>;
  submitScore(submission: ScoreSubmission): Promise<ScoreSubmissionResult>;
}

export class LeaderboardConfigurationError extends Error {
  constructor() {
    super('Leaderboard backend is not configured.');
    this.name = 'LeaderboardConfigurationError';
  }
}

export class LeaderboardRateLimitError extends Error {
  constructor() {
    super('Leaderboard submissions are temporarily rate limited.');
    this.name = 'LeaderboardRateLimitError';
  }
}

export class LeaderboardUpstreamError extends Error {
  constructor(message = 'Leaderboard storage request failed.') {
    super(message);
    this.name = 'LeaderboardUpstreamError';
  }
}

type DatabaseScoreRow = {
  map_id: string;
  anonymous_player_id: string;
  player_name: string;
  time_ms: number;
  updated_at: string;
};

type DatabaseSubmissionRow = DatabaseScoreRow & {
  outcome: ScoreSubmissionOutcome;
};

type SupabaseErrorPayload = {
  code?: string;
  message?: string;
};

function toEntry(row: DatabaseScoreRow): LeaderboardEntry {
  if (!isLeaderboardMapId(row.map_id)) {
    throw new LeaderboardUpstreamError('Leaderboard storage returned an unknown map.');
  }
  return {
    mapId: row.map_id,
    anonymousPlayerId: row.anonymous_player_id,
    playerName: row.player_name,
    timeMs: Number(row.time_ms),
    submittedAt: row.updated_at,
  };
}

export class SupabaseLeaderboardRepository implements LeaderboardRepository {
  private readonly baseUrl: string;
  private readonly serverKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(baseUrl: string, serverKey: string, fetchImpl: typeof fetch = fetch) {
    this.baseUrl = baseUrl.replace(/\/+$/u, '');
    this.serverKey = serverKey;
    this.fetchImpl = fetchImpl;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      const authorization = this.serverKey.startsWith('sb_secret_')
        ? {}
        : { Authorization: `Bearer ${this.serverKey}` };
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          apikey: this.serverKey,
          ...authorization,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
      });
    } catch {
      throw new LeaderboardUpstreamError();
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new LeaderboardUpstreamError('Leaderboard storage returned invalid JSON.');
    }

    if (!response.ok) {
      const error = payload as SupabaseErrorPayload;
      if (error.message?.includes('leaderboard_rate_limited')) {
        throw new LeaderboardRateLimitError();
      }
      throw new LeaderboardUpstreamError(error.message);
    }
    return payload as T;
  }

  private scoreQuery(mapId: LeaderboardMapId, anonymousPlayerId?: string): string {
    const query = new URLSearchParams({
      select: 'map_id,anonymous_player_id,player_name,time_ms,updated_at',
      map_id: `eq.${mapId}`,
      order: 'time_ms.asc,updated_at.asc',
      limit: anonymousPlayerId ? '1' : '20',
    });
    if (anonymousPlayerId) query.set('anonymous_player_id', `eq.${anonymousPlayerId}`);
    return `/rest/v1/leaderboard_scores?${query}`;
  }

  async getLeaderboard(
    mapId: LeaderboardMapId,
    anonymousPlayerId?: string,
  ): Promise<LeaderboardSnapshot> {
    const topScoresPromise = this.request<DatabaseScoreRow[]>(this.scoreQuery(mapId));
    const playerBestPromise = anonymousPlayerId
      ? this.request<DatabaseScoreRow[]>(this.scoreQuery(mapId, anonymousPlayerId))
      : Promise.resolve([]);
    const [topScores, playerScores] = await Promise.all([topScoresPromise, playerBestPromise]);
    return {
      entries: topScores.map(toEntry),
      playerBest: playerScores[0] ? toEntry(playerScores[0]) : null,
    };
  }

  async submitScore(submission: ScoreSubmission): Promise<ScoreSubmissionResult> {
    const rows = await this.request<DatabaseSubmissionRow[]>(
      '/rest/v1/rpc/submit_leaderboard_score',
      {
        method: 'POST',
        body: JSON.stringify({
          p_map_id: submission.mapId,
          p_anonymous_player_id: submission.anonymousPlayerId,
          p_player_name: submission.playerName,
          p_time_ms: submission.timeMs,
        }),
      },
    );
    const stored = rows[0];
    if (!stored || !['created', 'improved', 'kept'].includes(stored.outcome)) {
      throw new LeaderboardUpstreamError('Leaderboard storage returned no score.');
    }
    const entry = toEntry(stored);
    const snapshot = await this.getLeaderboard(submission.mapId, submission.anonymousPlayerId);
    return {
      ...snapshot,
      entry,
      playerBest: entry,
      outcome: stored.outcome,
    };
  }
}

export function createLeaderboardRepositoryFromEnvironment(): LeaderboardRepository {
  const baseUrl = process.env.SUPABASE_URL;
  const serverKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serverKey) throw new LeaderboardConfigurationError();
  return new SupabaseLeaderboardRepository(baseUrl, serverKey);
}
