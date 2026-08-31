import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  formatLeaderboardTime,
  normalizePlayerName,
  PLAYER_NAME_MAX_LENGTH,
  type LeaderboardEntry,
  type LeaderboardMapId,
} from './contracts';
import {
  fetchLeaderboard,
  LeaderboardRequestError,
  submitLeaderboardScore,
} from './api';
import styles from './LeaderboardPanel.module.css';

type LeaderboardPanelProps = {
  mapId: LeaderboardMapId;
  anonymousPlayerId: string;
  runTimeMs?: number;
  rememberedPlayerName?: string;
  onRememberPlayerName?: (playerName: string) => void;
};

type LoadState = 'loading' | 'ready' | 'error';

function LeaderboardTable({
  entries,
  anonymousPlayerId,
}: {
  entries: LeaderboardEntry[];
  anonymousPlayerId: string;
}) {
  if (entries.length === 0) {
    return (
      <div className={styles.emptyState}>
        <strong>NO TIMES YET</strong>
        <span>Be the first to submit a run.</span>
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr><th>#</th><th>Player</th><th>Time</th></tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const isCurrentPlayer = entry.anonymousPlayerId === anonymousPlayerId;
            return (
              <tr key={`${entry.mapId}:${entry.anonymousPlayerId}`} data-current-player={isCurrentPlayer}>
                <td>{index + 1}</td>
                <td>
                  <span>{entry.playerName}</span>
                  {isCurrentPlayer && <b>YOU</b>}
                </td>
                <td>{formatLeaderboardTime(entry.timeMs)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LeaderboardPanel({
  mapId,
  anonymousPlayerId,
  runTimeMs,
  rememberedPlayerName = '',
  onRememberPlayerName,
}: LeaderboardPanelProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [playerBest, setPlayerBest] = useState<LeaderboardEntry | null>(null);
  const [playerName, setPlayerName] = useState(rememberedPlayerName);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const snapshot = await fetchLeaderboard(mapId, anonymousPlayerId, signal);
      setEntries(snapshot.entries);
      setPlayerBest(snapshot.playerBest);
      setLoadState('ready');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setLoadState('error');
    }
  }, [anonymousPlayerId, mapId]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchLeaderboard(mapId, anonymousPlayerId, controller.signal)
      .then((snapshot) => {
        setEntries(snapshot.entries);
        setPlayerBest(snapshot.playerBest);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLoadState('error');
      });
    return () => controller.abort();
  }, [anonymousPlayerId, mapId]);

  const reload = () => {
    setLoadState('loading');
    void load();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (runTimeMs === undefined) return;
    const normalizedName = normalizePlayerName(playerName);
    if (!normalizedName) {
      setFormMessage(`Enter a 1-${PLAYER_NAME_MAX_LENGTH} character name without HTML tags.`);
      return;
    }

    onRememberPlayerName?.(normalizedName);
    setPlayerName(normalizedName);
    setSubmitting(true);
    setFormMessage(null);
    try {
      const result = await submitLeaderboardScore({
        mapId,
        anonymousPlayerId,
        playerName: normalizedName,
        timeMs: runTimeMs,
      });
      setEntries(result.entries);
      setPlayerBest(result.entry);
      setLoadState('ready');
      if (result.outcome === 'created') setFormMessage('Score submitted.');
      if (result.outcome === 'improved') setFormMessage('Leaderboard best improved.');
      if (result.outcome === 'kept') {
        setFormMessage(`Faster leaderboard best kept: ${formatLeaderboardTime(result.entry.timeMs)}.`);
      }
    } catch (error) {
      if (error instanceof LeaderboardRequestError && error.status === 429) {
        setFormMessage('Too many submissions. Wait a moment, then try again.');
      } else {
        setFormMessage('Could not submit score. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.panel} aria-label="Online leaderboard">
      {runTimeMs !== undefined && (
        <div className={styles.submissionBlock}>
          <div className={styles.scoreComparison}>
            <span>RUN <b>{formatLeaderboardTime(runTimeMs)}</b></span>
            <span>
              LEADERBOARD BEST <b>{playerBest ? formatLeaderboardTime(playerBest.timeMs) : '--:--.---'}</b>
            </span>
          </div>
          <form className={styles.form} onSubmit={submit}>
            <label htmlFor={`leaderboard-name-${mapId}`}>Display name</label>
            <div>
              <input
                id={`leaderboard-name-${mapId}`}
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                minLength={1}
                maxLength={PLAYER_NAME_MAX_LENGTH}
                autoComplete="nickname"
                placeholder="Greiner"
                disabled={submitting}
              />
              <button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit to leaderboard'}
              </button>
            </div>
            {formMessage && <p role="status">{formMessage}</p>}
          </form>
        </div>
      )}

      <div className={styles.headingRow}>
        <div><span>ONLINE LEADERBOARD</span><strong>TOP 20</strong></div>
        {loadState === 'ready' && (
          <button type="button" onClick={reload} disabled={submitting}>Refresh</button>
        )}
      </div>

      {loadState === 'loading' && <p className={styles.status}>Loading…</p>}
      {loadState === 'error' && (
        <div className={styles.errorState}>
          <strong>Leaderboard unavailable.</strong>
          <span>Your local times are still saved.</span>
          <button type="button" onClick={reload}>Try again</button>
        </div>
      )}
      {loadState === 'ready' && (
        <LeaderboardTable entries={entries} anonymousPlayerId={anonymousPlayerId} />
      )}
    </section>
  );
}
