import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

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
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

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
    await user.click(screen.getByRole('button', { name: /Level grid/i }));
    const first = screen.getByRole('button', { name: /First Cut/i });
    const second = screen.getByRole('button', { name: /Crossfade/i });
    expect(first).toBeEnabled();
    expect(second).toBeDisabled();
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
    await user.click(screen.getByRole('button', { name: /Level grid/i }));
    await user.click(screen.getByRole('button', { name: /Alpine Flow/i }));
    await user.click(screen.getByTestId('surf-game'));

    expect(screen.getByRole('heading', { name: 'Alpine Flow' })).toBeInTheDocument();
    expect(screen.getAllByText('00:08.000')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Retry/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Continue/i })).toBeEnabled();
    expect(JSON.parse(window.localStorage.getItem('vector-surf:progress:v1')!).bestTimes['alpine-flow']).toBe(8);

    await user.click(screen.getByRole('button', { name: /Retry/i }));
    expect(screen.getByTestId('surf-game')).toHaveTextContent('level 7');
  });
});
