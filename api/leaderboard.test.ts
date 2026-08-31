import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import leaderboardHandler from './leaderboard';

const playerId = '8d9447e4-d81f-4f69-93e5-59b95e8901fa';
const originalUrl = process.env.SUPABASE_URL;
const originalSecretKey = process.env.SUPABASE_SECRET_KEY;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function request(method: string, url: string, body?: unknown) {
  return { method, url, body } as unknown as IncomingMessage & { body?: unknown };
}

function responseCapture() {
  const capture = {
    statusCode: 200,
    headers: new Map<string, string | number | readonly string[]>(),
    body: '',
    setHeader(name: string, value: string | number | readonly string[]) {
      capture.headers.set(name, value);
      return capture as unknown as ServerResponse;
    },
    end(value?: unknown) {
      capture.body = value === undefined ? '' : String(value);
      return capture as unknown as ServerResponse;
    },
  };
  return capture;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('/api/leaderboard', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-secret';
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalSecretKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalSecretKey;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it('validates before writing and returns a server-ranked submission result', async () => {
    const stored = {
      map_id: 'parallax',
      anonymous_player_id: playerId,
      player_name: 'Greiner',
      time_ms: 41_281,
      updated_at: '2026-08-30T12:00:00.000Z',
      outcome: 'created',
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([stored]))
      .mockResolvedValueOnce(jsonResponse([stored]))
      .mockResolvedValueOnce(jsonResponse([stored]));
    vi.stubGlobal('fetch', fetchMock);
    const response = responseCapture();

    await leaderboardHandler(request('POST', '/api/leaderboard', {
      mapId: 'parallax',
      anonymousPlayerId: playerId,
      playerName: '  Greiner  ',
      timeMs: 41_281,
      rank: 1,
    }), response as unknown as ServerResponse);

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.outcome).toBe('created');
    expect(payload.entries[0].playerName).toBe('Greiner');
    const rpcBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(rpcBody).not.toHaveProperty('rank');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('rejects malformed input without contacting storage', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = responseCapture();
    await leaderboardHandler(request('POST', '/api/leaderboard', {
      mapId: 'parallax',
      anonymousPlayerId: playerId,
      playerName: '<script>',
      timeMs: 150,
    }), response as unknown as ServerResponse);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error.code).toBe('invalid_request');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a graceful unavailable response when server secrets are absent', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const response = responseCapture();
    await leaderboardHandler(
      request('GET', `/api/leaderboard?mapId=parallax&anonymousPlayerId=${playerId}`),
      response as unknown as ServerResponse,
    );
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body).error.code).toBe('leaderboard_unavailable');
  });
});
