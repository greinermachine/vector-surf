import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LeaderboardPanel } from './LeaderboardPanel';
import type { LeaderboardEntry } from './contracts';

const currentPlayerId = '8d9447e4-d81f-4f69-93e5-59b95e8901fa';
const otherPlayerId = 'ffb69dd3-4ec9-4ba8-af49-22188b4a7d06';

const entry = (
  anonymousPlayerId: string,
  playerName: string,
  timeMs: number,
  submittedAt = '2026-08-30T12:00:00.000Z',
): LeaderboardEntry => ({
  mapId: 'parallax',
  anonymousPlayerId,
  playerName,
  timeMs,
  submittedAt,
});

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('leaderboard panel', () => {
  it('shows loading, then the empty leaderboard state', async () => {
    let resolveFetch!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    })));
    render(<LeaderboardPanel mapId="parallax" anonymousPlayerId={currentPlayerId} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    resolveFetch(jsonResponse({ entries: [], playerBest: null }));
    expect(await screen.findByText('NO TIMES YET')).toBeInTheDocument();
    expect(screen.getByText('Be the first to submit a run.')).toBeInTheDocument();
  });

  it('renders server order and highlights the current browser row', async () => {
    const entries = [
      entry(otherPlayerId, 'velocity', 38_921),
      entry(currentPlayerId, 'Greiner', 41_281),
    ];
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ entries, playerBest: entries[1] })));
    render(<LeaderboardPanel mapId="parallax" anonymousPlayerId={currentPlayerId} />);
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('velocity');
    expect(rows[0]).toHaveTextContent('00:38.921');
    expect(rows[1]).toHaveTextContent('Greiner');
    expect(rows[1]).toHaveTextContent('YOU');
    expect(rows[1]).toHaveAttribute('data-current-player', 'true');
  });

  it('submits a trimmed name without a client rank and renders the returned ranking', async () => {
    const submitted = entry(currentPlayerId, 'Greiner', 41_281);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ entries: [], playerBest: null }))
      .mockResolvedValueOnce(jsonResponse({
        entries: [submitted],
        playerBest: submitted,
        entry: submitted,
        outcome: 'created',
      }));
    vi.stubGlobal('fetch', fetchMock);
    const remember = vi.fn();
    const user = userEvent.setup();
    render(
      <LeaderboardPanel
        mapId="parallax"
        anonymousPlayerId={currentPlayerId}
        runTimeMs={41_281}
        onRememberPlayerName={remember}
      />,
    );
    await screen.findByText('NO TIMES YET');
    await user.type(screen.getByLabelText('Display name'), '  Greiner  ');
    await user.click(screen.getByRole('button', { name: 'Submit to leaderboard' }));
    expect(await screen.findByText('Score submitted.')).toBeInTheDocument();
    const request = fetchMock.mock.calls[1];
    expect(request[0]).toBe('/api/leaderboard');
    const body = JSON.parse((request[1] as RequestInit).body as string);
    expect(body).toEqual({
      mapId: 'parallax',
      anonymousPlayerId: currentPlayerId,
      playerName: 'Greiner',
      timeMs: 41_281,
    });
    expect(body).not.toHaveProperty('rank');
    expect(remember).toHaveBeenCalledWith('Greiner');
    expect(screen.getByRole('row', { name: /Greiner/ })).toHaveTextContent('YOU');
  });

  it('communicates when a slower run keeps the existing leaderboard best', async () => {
    const best = entry(currentPlayerId, 'Greiner', 41_281);
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ entries: [best], playerBest: best }))
      .mockResolvedValueOnce(jsonResponse({
        entries: [best],
        playerBest: best,
        entry: best,
        outcome: 'kept',
      })));
    const user = userEvent.setup();
    render(
      <LeaderboardPanel
        mapId="parallax"
        anonymousPlayerId={currentPlayerId}
        runTimeMs={44_120}
        rememberedPlayerName="Greiner"
      />,
    );
    await screen.findByRole('table');
    expect(screen.getByText('00:44.120')).toBeInTheDocument();
    expect(screen.getAllByText('00:41.281').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Submit to leaderboard' }));
    expect(await screen.findByText('Faster leaderboard best kept: 00:41.281.')).toBeInTheDocument();
  });

  it('keeps the game-facing UI recoverable across fetch and submission failures', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(jsonResponse({ entries: [], playerBest: null }))
      .mockRejectedValueOnce(new Error('offline again'));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <LeaderboardPanel
        mapId="parallax"
        anonymousPlayerId={currentPlayerId}
        runTimeMs={41_281}
        rememberedPlayerName="Greiner"
      />,
    );
    expect(await screen.findByText('Leaderboard unavailable.')).toBeInTheDocument();
    expect(screen.getByText('Your local times are still saved.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('NO TIMES YET')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit to leaderboard' }));
    expect(await screen.findByText('Could not submit score. Try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit to leaderboard' })).toBeEnabled();
  });
});
