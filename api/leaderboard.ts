import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createLeaderboardRepositoryFromEnvironment,
  LeaderboardConfigurationError,
  LeaderboardRateLimitError,
  LeaderboardUpstreamError,
} from '../server/leaderboardRepository.js';
import {
  getLeaderboardSnapshot,
  LeaderboardValidationError,
  submitScore,
} from '../server/leaderboardService.js';

type VercelRequest = IncomingMessage & { body?: unknown };

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request: VercelRequest): Promise<unknown> {
  if (request.body !== undefined) {
    if (typeof request.body === 'string') {
      if (Buffer.byteLength(request.body, 'utf8') > 8_192) {
        throw new LeaderboardValidationError('Submission body is too large.');
      }
      return JSON.parse(request.body);
    }
    if (Buffer.isBuffer(request.body)) {
      if (request.body.length > 8_192) {
        throw new LeaderboardValidationError('Submission body is too large.');
      }
      return JSON.parse(request.body.toString('utf8'));
    }
    if (Buffer.byteLength(JSON.stringify(request.body), 'utf8') > 8_192) {
      throw new LeaderboardValidationError('Submission body is too large.');
    }
    return request.body;
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 8_192) throw new LeaderboardValidationError('Submission body is too large.');
    chunks.push(buffer);
  }
  if (chunks.length === 0) throw new LeaderboardValidationError('Submission body is required.');
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new LeaderboardValidationError('Submission must contain valid JSON.');
  }
}

export default async function leaderboardHandler(
  request: VercelRequest,
  response: ServerResponse,
) {
  if (request.method === 'OPTIONS') {
    response.setHeader('Allow', 'GET, POST, OPTIONS');
    response.statusCode = 204;
    response.end();
    return;
  }

  try {
    const repository = createLeaderboardRepositoryFromEnvironment();
    if (request.method === 'GET') {
      const url = new URL(request.url ?? '/api/leaderboard', 'http://leaderboard.local');
      const mapId = url.searchParams.get('mapId');
      const anonymousPlayerId = url.searchParams.get('anonymousPlayerId') ?? undefined;
      const snapshot = await getLeaderboardSnapshot(mapId, anonymousPlayerId, repository);
      sendJson(response, 200, snapshot);
      return;
    }

    if (request.method === 'POST') {
      const result = await submitScore(await readJsonBody(request), repository);
      sendJson(response, 200, result);
      return;
    }

    response.setHeader('Allow', 'GET, POST, OPTIONS');
    sendJson(response, 405, {
      error: { code: 'method_not_allowed', message: 'Only GET and POST are supported.' },
    });
  } catch (error) {
    if (error instanceof LeaderboardValidationError || error instanceof SyntaxError) {
      sendJson(response, 400, {
        error: { code: 'invalid_request', message: error.message || 'Request is invalid.' },
      });
      return;
    }
    if (error instanceof LeaderboardRateLimitError) {
      response.setHeader('Retry-After', '2');
      sendJson(response, 429, {
        error: { code: 'rate_limited', message: 'Wait a moment before submitting again.' },
      });
      return;
    }
    if (error instanceof LeaderboardConfigurationError) {
      sendJson(response, 503, {
        error: { code: 'leaderboard_unavailable', message: 'Leaderboard is not configured.' },
      });
      return;
    }
    if (error instanceof LeaderboardUpstreamError) {
      sendJson(response, 502, {
        error: { code: 'storage_unavailable', message: 'Leaderboard storage is unavailable.' },
      });
      return;
    }
    sendJson(response, 500, {
      error: { code: 'internal_error', message: 'Leaderboard request failed.' },
    });
  }
}
