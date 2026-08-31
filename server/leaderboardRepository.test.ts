import { describe, expect, it, vi } from 'vitest';
import {
  LeaderboardRateLimitError,
  SupabaseLeaderboardRepository,
} from './leaderboardRepository';

const currentPlayerId = '8d9447e4-d81f-4f69-93e5-59b95e8901fa';
const otherPlayerId = 'ffb69dd3-4ec9-4ba8-af49-22188b4a7d06';

const row = (
  anonymousPlayerId: string,
  playerName: string,
  timeMs: number,
  outcome?: 'created' | 'improved' | 'kept',
) => ({
  map_id: 'parallax',
  anonymous_player_id: anonymousPlayerId,
  player_name: playerName,
  time_ms: timeMs,
  updated_at: '2026-08-30T12:00:00.000Z',
  ...(outcome ? { outcome } : {}),
});

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Supabase leaderboard repository', () => {
  it('requests only the map top 20 in numeric/time order plus the current player row', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([
        row(otherPlayerId, 'velocity', 38_921),
        row(currentPlayerId, 'Greiner', 41_281),
      ]))
      .mockResolvedValueOnce(jsonResponse([row(currentPlayerId, 'Greiner', 41_281)]));
    const repository = new SupabaseLeaderboardRepository(
      'https://project.supabase.co/',
      'server-secret',
      fetchMock,
    );

    const snapshot = await repository.getLeaderboard('parallax', currentPlayerId);
    expect(snapshot.entries.map((entry) => entry.playerName)).toEqual(['velocity', 'Greiner']);
    expect(snapshot.playerBest?.timeMs).toBe(41_281);
    const topUrl = String(fetchMock.mock.calls[0][0]);
    const playerUrl = String(fetchMock.mock.calls[1][0]);
    expect(topUrl).toContain('map_id=eq.parallax');
    expect(topUrl).toContain('order=time_ms.asc%2Cupdated_at.asc');
    expect(topUrl).toContain('limit=20');
    expect(playerUrl).toContain(`anonymous_player_id=eq.${currentPlayerId}`);
    expect(playerUrl).toContain('limit=1');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer server-secret');
  });

  it('submits only validated run fields to the atomic RPC and returns server ranking', async () => {
    const stored = row(currentPlayerId, 'Greiner', 40_900, 'improved');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([stored]))
      .mockResolvedValueOnce(jsonResponse([stored]))
      .mockResolvedValueOnce(jsonResponse([stored]));
    const repository = new SupabaseLeaderboardRepository(
      'https://project.supabase.co',
      'server-secret',
      fetchMock,
    );

    const result = await repository.submitScore({
      mapId: 'parallax',
      anonymousPlayerId: currentPlayerId,
      playerName: 'Greiner',
      timeMs: 40_900,
    });
    expect(result.outcome).toBe('improved');
    expect(result.entries).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0][0]).endsWith('/rest/v1/rpc/submit_leaderboard_score')).toBe(true);
    const rpcBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(rpcBody).toEqual({
      p_map_id: 'parallax',
      p_anonymous_player_id: currentPlayerId,
      p_player_name: 'Greiner',
      p_time_ms: 40_900,
    });
    expect(rpcBody).not.toHaveProperty('rank');
  });

  it('uses modern Supabase secret keys only in the apikey header', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void input;
      void init;
      return jsonResponse([]);
    });
    const repository = new SupabaseLeaderboardRepository(
      'https://project.supabase.co',
      'sb_secret_server-only',
      fetchMock,
    );
    await repository.getLeaderboard('parallax');
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.apikey).toBe('sb_secret_server-only');
    expect(headers).not.toHaveProperty('Authorization');
  });

  it('maps the database rate-limit signal to a server-safe error', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      code: 'P0001',
      message: 'leaderboard_rate_limited',
    }, 400));
    const repository = new SupabaseLeaderboardRepository(
      'https://project.supabase.co',
      'server-secret',
      fetchMock,
    );
    await expect(repository.submitScore({
      mapId: 'parallax',
      anonymousPlayerId: currentPlayerId,
      playerName: 'Greiner',
      timeMs: 40_900,
    })).rejects.toBeInstanceOf(LeaderboardRateLimitError);
  });
});
