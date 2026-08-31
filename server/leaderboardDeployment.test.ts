import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const deployedRuntimeSources = [
  'api/leaderboard.ts',
  'server/leaderboardRepository.ts',
  'server/leaderboardService.ts',
];

describe('leaderboard deployment structure', () => {
  it('uses explicit JavaScript extensions for relative production imports', () => {
    for (const sourcePath of deployedRuntimeSources) {
      const source = readFileSync(resolve(process.cwd(), sourcePath), 'utf8');
      const relativeImports = [...source.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/gu)];

      for (const [, specifier] of relativeImports) {
        expect(specifier, `${sourcePath}: ${specifier}`).toMatch(/\.js$/u);
      }
    }
  });

  it('does not expose test files as Vercel API functions', () => {
    const apiTests = readdirSync(resolve(process.cwd(), 'api'))
      .filter((name) => /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(name));

    expect(apiTests).toEqual([]);
  });
});
