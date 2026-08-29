import type { RunResult } from './types';

export const PROGRESS_KEY = 'vector-surf:progress:v1';

export type SurfProgress = {
  version: 1;
  unlockedLevels: number;
  bestTimes: Record<string, number>;
  peakSpeeds: Record<string, number>;
};

export function freshProgress(): SurfProgress {
  return { version: 1, unlockedLevels: 1, bestTimes: {}, peakSpeeds: {} };
}

export function parseProgress(value: string | null, levelCount: number): SurfProgress {
  if (!value) return freshProgress();
  try {
    const parsed = JSON.parse(value) as Partial<SurfProgress>;
    if (parsed.version !== 1) return freshProgress();
    return {
      version: 1,
      unlockedLevels: Math.max(
        1,
        Math.min(levelCount, Math.floor(Number(parsed.unlockedLevels) || 1)),
      ),
      bestTimes: typeof parsed.bestTimes === 'object' && parsed.bestTimes ? parsed.bestTimes : {},
      peakSpeeds:
        typeof parsed.peakSpeeds === 'object' && parsed.peakSpeeds ? parsed.peakSpeeds : {},
    };
  } catch {
    return freshProgress();
  }
}

export function recordResult(
  progress: SurfProgress,
  levelId: string,
  result: RunResult,
  levelCount: number,
): SurfProgress {
  const previousTime = progress.bestTimes[levelId];
  const previousPeak = progress.peakSpeeds[levelId] ?? 0;
  return {
    version: 1,
    unlockedLevels: Math.min(levelCount, Math.max(progress.unlockedLevels, result.levelIndex + 2)),
    bestTimes: {
      ...progress.bestTimes,
      [levelId]: previousTime === undefined ? result.elapsed : Math.min(previousTime, result.elapsed),
    },
    peakSpeeds: {
      ...progress.peakSpeeds,
      [levelId]: Math.max(previousPeak, result.peakSpeed),
    },
  };
}

export function formatTime(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return '--:--.---';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${remainder.toFixed(3).padStart(6, '0')}`;
}
