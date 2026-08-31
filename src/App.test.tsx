import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

function emptyLeaderboardResponse() {
  return new Response(JSON.stringify({ entries: [], playerBest: null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

vi.mock('./components/SurfGame', () => ({
  SurfGame: ({
    levelIndex,
    onComplete,
  }: {
    levelIndex: number;
    onComplete: (result: {
      levelIndex: number;
      elapsed: number;
      peakSpeed: number;
      resets: number;
    }) => void;
  }) => (
    <button
      data-testid="surf-game"
      type="button"
      onClick={() => onComplete({ levelIndex, elapsed: 8, peakSpeed: 42, resets: 0 })}
    >
      level {levelIndex + 1}
    </button>
  ),
}));

describe('standalone campaign shell', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => emptyLeaderboardResponse()));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('presents the start-to-finish movement contract', () => {
    render(<App />);
    expect(screen.queryByText('Kill velocity')).not.toBeInTheDocument();
    expect(screen.getByText('Move on platforms')).toBeInTheDocument();
    expect(screen.getByText('Jump from platforms')).toBeInTheDocument();
    expect(screen.getByText('Press into ramps / air strafe')).toBeInTheDocument();
    expect(screen.getByText('Restart run / return to start')).toBeInTheDocument();
    expect(screen.getByText('Inspect knife')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enter \/ First Cut/i })).toBeEnabled();
  });

  it('starts with a level-based lock progression', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Map select/i }));
    expect(screen.getByRole('heading', { name: 'Tutorial' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Surf maps' })).toBeInTheDocument();
    const first = screen.getByRole('button', { name: /First Cut/i });
    const second = screen.getByRole('button', { name: /Crossfade/i });
    const alpine = screen.getByRole('button', { name: /^Play Alpine Flow/i });
    expect(first).toBeEnabled();
    expect(second).toBeDisabled();
    expect(alpine).toBeDisabled();
    await user.click(first);
    expect(screen.getByTestId('surf-game')).toHaveTextContent('level 1');
  });

  it('moves directly into the next level when a run completes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Enter \/ First Cut/i }));
    await user.click(screen.getByTestId('surf-game'));
    expect(screen.getByTestId('surf-game')).toHaveTextContent('level 2');
    expect(screen.queryByText(/Level 01 complete/i)).not.toBeInTheDocument();
  });

  it('hands completed training directly into the first full surf map', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('vector-surf:progress:v1', JSON.stringify({
      version: 1,
      unlockedLevels: 6,
      bestTimes: {},
      peakSpeeds: {},
    }));
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Enter \/ Last Light/i }));
    expect(screen.getByTestId('surf-game')).toHaveTextContent('level 6');
    await user.click(screen.getByTestId('surf-game'));
    expect(screen.getByTestId('surf-game')).toHaveTextContent('level 7');
  });

  it('shows replay results and stores a local best after the full map', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('vector-surf:progress:v1', JSON.stringify({
      version: 1,
      unlockedLevels: 7,
      bestTimes: {},
      peakSpeeds: {},
    }));
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Map select/i }));
    await user.click(screen.getByRole('button', { name: /^Play Alpine Flow/i }));
    await user.click(screen.getByTestId('surf-game'));

    expect(screen.getByRole('heading', { name: 'Alpine Flow' })).toBeInTheDocument();
    expect(screen.getAllByText('00:08.000').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('NEW PERSONAL BEST')).toBeInTheDocument();
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Map select/i })).toBeEnabled();
    expect(JSON.parse(window.localStorage.getItem('vector-surf:progress:v1')!).bestTimes['alpine-flow']).toBe(8);

    await user.click(screen.getByRole('button', { name: /Retry/i }));
    expect(screen.getByTestId('surf-game')).toHaveTextContent('level 7');
  });

  it('keeps all five surf-map results separate and returns to map select', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('vector-surf:progress:v1', JSON.stringify({
      version: 1,
      unlockedLevels: 11,
      bestTimes: {},
      peakSpeeds: {},
    }));
    render(<App />);

    for (const [name, levelNumber] of [
      ['Alpine Flow', 7],
      ['Parallax', 8],
      ['Canyon Signal', 9],
      ['Dynamo Rise', 10],
      ['Scrapyard Junctions', 11],
    ] as const) {
      await user.click(screen.getByRole('button', { name: /Map select/i }));
      await user.click(screen.getByRole('button', { name: new RegExp(`^Play ${name}`, 'i') }));
      expect(screen.getByTestId('surf-game')).toHaveTextContent(`level ${levelNumber}`);
      await user.click(screen.getByTestId('surf-game'));
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }

    expect(JSON.parse(window.localStorage.getItem('vector-surf:progress:v1')!).bestTimes).toEqual({
      'alpine-flow': 8,
      parallax: 8,
      'canyon-signal': 8,
      'dynamo-rise': 8,
      switchyard: 8,
    });
  });

  it('opens a public leaderboard from map select, including for a locked map', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Map select/i }));
    const lockedPlay = screen.getByRole('button', { name: /^Play Parallax/i });
    expect(lockedPlay).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Leaderboard \/ Parallax/i }));
    expect(screen.getByRole('heading', { name: 'Parallax' })).toBeInTheDocument();
    expect(await screen.findByText('NO TIMES YET')).toBeInTheDocument();
  });

  it('does not fetch leaderboard data while a surf run is active', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('vector-surf:progress:v1', JSON.stringify({
      version: 1,
      unlockedLevels: 7,
      bestTimes: {},
      peakSpeeds: {},
    }));
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Map select/i }));
    await user.click(screen.getByRole('button', { name: /^Play Alpine Flow/i }));
    expect(screen.getByTestId('surf-game')).toHaveTextContent('level 7');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps the local personal best and retry controls when the network is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline');
    }));
    const user = userEvent.setup();
    window.localStorage.setItem('vector-surf:progress:v1', JSON.stringify({
      version: 1,
      unlockedLevels: 7,
      bestTimes: {},
      peakSpeeds: {},
    }));
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Map select/i }));
    await user.click(screen.getByRole('button', { name: /^Play Alpine Flow/i }));
    await user.click(screen.getByTestId('surf-game'));
    expect(await screen.findByText('Leaderboard unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeEnabled();
    expect(JSON.parse(window.localStorage.getItem('vector-surf:progress:v1')!).bestTimes['alpine-flow'])
      .toBe(8);
  });

  it('prefills the remembered display name after a page reload', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('vector-surf:leaderboard-player-name:v1', 'Greiner');
    window.localStorage.setItem('vector-surf:progress:v1', JSON.stringify({
      version: 1,
      unlockedLevels: 7,
      bestTimes: {},
      peakSpeeds: {},
    }));
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Map select/i }));
    await user.click(screen.getByRole('button', { name: /^Play Alpine Flow/i }));
    await user.click(screen.getByTestId('surf-game'));
    expect(screen.getByLabelText('Display name')).toHaveValue('Greiner');
  });
});
