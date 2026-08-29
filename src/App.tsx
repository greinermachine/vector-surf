import { useState } from 'react';
import { SurfGame } from './components/SurfGame';
import { SURF_LEVELS } from './game/levels';
import {
  formatTime,
  parseProgress,
  PROGRESS_KEY,
  recordResult,
  type SurfProgress,
} from './game/progress';
import type { RunResult } from './game/types';
import styles from './App.module.css';

type Screen =
  | { name: 'menu' }
  | { name: 'levels' }
  | { name: 'playing'; levelIndex: number }
  | {
    name: 'complete';
    levelIndex: number;
    result: RunResult;
    bestTime: number;
  };

function readProgress() {
  if (typeof window === 'undefined') return parseProgress(null, SURF_LEVELS.length);
  try {
    const parsed = parseProgress(
      window.localStorage.getItem(PROGRESS_KEY),
      SURF_LEVELS.length,
    );
    if (parsed.bestTimes['last-light'] !== undefined && parsed.unlockedLevels < 7) {
      return { ...parsed, unlockedLevels: Math.min(7, SURF_LEVELS.length) };
    }
    return parsed;
  } catch {
    return parseProgress(null, SURF_LEVELS.length);
  }
}

function saveProgress(progress: SurfProgress) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // The campaign remains playable when storage is blocked.
  }
}

function Brand() {
  return (
    <div className={styles.brand} aria-label="Vector Surf">
      <span className={styles.brandGlyph}>V</span>
      <span>VECTOR<span className={styles.brandSlash}>//</span>SURF</span>
    </div>
  );
}

function Difficulty({ value }: { value: number }) {
  return (
    <span className={styles.difficulty} aria-label={`Difficulty ${value} of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <i key={index} data-active={index < value} />
      ))}
    </span>
  );
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });
  const [progress, setProgress] = useState<SurfProgress>(readProgress);

  const startLevel = (levelIndex: number) => {
    const safeIndex = Math.max(0, Math.min(progress.unlockedLevels - 1, levelIndex));
    setScreen({ name: 'playing', levelIndex: safeIndex });
  };

  const finishLevel = (result: RunResult) => {
    const level = SURF_LEVELS[result.levelIndex];
    const nextProgress = recordResult(progress, level.id, result, SURF_LEVELS.length);
    setProgress(nextProgress);
    saveProgress(nextProgress);
    const nextLevelIndex = result.levelIndex + 1;
    if (nextLevelIndex < SURF_LEVELS.length) {
      setScreen({ name: 'playing', levelIndex: nextLevelIndex });
      return;
    }
    setScreen({
      name: 'complete',
      levelIndex: result.levelIndex,
      result,
      bestTime: nextProgress.bestTimes[level.id],
    });
  };

  if (screen.name === 'playing') {
    return (
      <SurfGame
        key={SURF_LEVELS[screen.levelIndex].format === 'full-map' ? 'full-map' : 'training'}
        levelIndex={screen.levelIndex}
        onComplete={finishLevel}
        onExit={() => setScreen({ name: 'levels' })}
      />
    );
  }

  if (screen.name === 'complete') {
    const level = SURF_LEVELS[screen.levelIndex];
    return (
      <main className={styles.page} data-screen="complete">
        <header className={styles.topbar}>
          <Brand />
          <span className={styles.build}>SURF MAP 01 / COMPLETE</span>
        </header>

        <section className={styles.completeSection} aria-labelledby="complete-heading">
          <p className={styles.eyebrow}>Map complete / summit to lake</p>
          <h1 className={styles.completeTitle} id="complete-heading">
            {level.name}
          </h1>
          <div className={styles.resultTime}>
            <span>FINAL TIME</span>
            <strong>{formatTime(screen.result.elapsed)}</strong>
          </div>
          <div className={styles.resultMeta}>
            <span>BEST <b>{formatTime(screen.bestTime)}</b></span>
            <span>PEAK <b>{screen.result.peakSpeed.toFixed(1)} u/s</b></span>
            <span>RESETS <b>{String(screen.result.resets).padStart(2, '0')}</b></span>
          </div>
          <div className={styles.menuActions}>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => setScreen({ name: 'playing', levelIndex: screen.levelIndex })}
            >
              Retry <span>↻</span>
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => setScreen({ name: 'levels' })}
            >
              Continue
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (screen.name === 'levels') {
    return (
      <main className={styles.page} data-screen="levels">
        <header className={styles.topbar}>
          <Brand />
          <button className={styles.textButton} type="button" onClick={() => setScreen({ name: 'menu' })}>
            Back
          </button>
        </header>

        <section className={styles.levelSection} aria-labelledby="level-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p>Campaign / {progress.unlockedLevels} of {SURF_LEVELS.length} unlocked</p>
              <h1 id="level-heading">Select a line</h1>
            </div>
            <span>Completion unlocks the next level.</span>
          </div>

          <div className={styles.levelGrid}>
            {SURF_LEVELS.map((level, index) => {
              const unlocked = index < progress.unlockedLevels;
              return (
                <button
                  className={styles.levelCard}
                  key={level.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => startLevel(index)}
                  style={{ '--level-accent': level.palette.accent } as React.CSSProperties}
                >
                  <span className={styles.levelNumber}>{String(level.number).padStart(2, '0')}</span>
                  <span className={styles.levelLock}>
                    {unlocked ? level.format === 'full-map' ? 'SURF MAP' : 'AVAILABLE' : 'LOCKED'}
                  </span>
                  <span className={styles.levelName}>{level.name}</span>
                  <span className={styles.levelSubtitle}>{level.subtitle}</span>
                  <span className={styles.cardDivider} />
                  <span className={styles.levelMeta}>
                    <span>BEST <b>{formatTime(progress.bestTimes[level.id])}</b></span>
                    <span>PEAK <b>{progress.peakSpeeds[level.id]?.toFixed(1) ?? '--.-'} u/s</b></span>
                  </span>
                  <Difficulty value={level.difficulty} />
                </button>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  const continueIndex = Math.max(0, Math.min(SURF_LEVELS.length - 1, progress.unlockedLevels - 1));
  const continueLevel = SURF_LEVELS[continueIndex];
  return (
    <main className={styles.page} data-screen="menu">
      <header className={styles.topbar}>
        <Brand />
        <span className={styles.build}>STANDALONE BUILD / 01</span>
      </header>

      <div className={styles.menuField} aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>First-person momentum trial</p>
        <h1><span>VECTOR</span><span>SURF</span></h1>
        <p className={styles.heroCopy}>
          Learn the line through six focused trials, then carry your velocity into the first full surf map.
        </p>
        <div className={styles.menuActions}>
          <button className={styles.primaryButton} type="button" onClick={() => startLevel(continueIndex)}>
            Enter / {continueLevel.name} <span>→</span>
          </button>
          <button className={styles.secondaryButton} type="button" onClick={() => setScreen({ name: 'levels' })}>
            Level grid
          </button>
        </div>
      </section>

      <aside className={styles.controlDeck} aria-label="Controls">
        <p>CONTROL CONTRACT</p>
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>Move on platforms</span></div>
        <div><kbd>SPACE</kbd><span>Jump from platforms</span></div>
        <div><kbd>A</kbd><kbd>D</kbd><span>Press into ramps / air strafe</span></div>
        <div><kbd>F</kbd><span>Inspect knife</span></div>
        <div><kbd>R</kbd><span>Restart run / return to start</span></div>
      </aside>

      <footer className={styles.menuFooter}>
        <span>{progress.unlockedLevels}/{SURF_LEVELS.length} LINES OPEN</span>
        <span>MOUSE LOOK · ESC PAUSE</span>
      </footer>
    </main>
  );
}
