import { describe, expect, it } from 'vitest';
import { createDualSurfRamp } from './dualRamp';
import {
  createSurfRamp,
  DEFAULT_DUAL_SURF_RAMP,
  rampShellThickness,
  SURF_RAMP_PROFILES,
} from './rampProfiles';

describe('global surf ramp scale profiles', () => {
  it('makes normal ramps compact while retaining distinct large and catch scales', () => {
    expect(SURF_RAMP_PROFILES.normal.width).toBe(34);
    expect(SURF_RAMP_PROFILES.normal.bankRadians).toBe(0.41);
    expect(SURF_RAMP_PROFILES['small-launch'].width).toBeLessThan(
      SURF_RAMP_PROFILES.normal.width,
    );
    expect(SURF_RAMP_PROFILES.large.width).toBeGreaterThan(
      SURF_RAMP_PROFILES.normal.width,
    );
    expect(SURF_RAMP_PROFILES['wide-catch'].width).toBeGreaterThan(
      SURF_RAMP_PROFILES.large.width,
    );
    expect(SURF_RAMP_PROFILES.signature.bankRadians).toBeGreaterThan(
      SURF_RAMP_PROFILES.normal.bankRadians,
    );
    expect(SURF_RAMP_PROFILES['wide-catch'].bankRadians).toBeLessThan(
      SURF_RAMP_PROFILES.normal.bankRadians,
    );
    expect(Math.max(...Object.values(SURF_RAMP_PROFILES).map(
      (profile) => profile.shellThickness,
    ))).toBeLessThanOrEqual(0.84);
  });

  it('increases usable vertical range while trimming each surf footprint', () => {
    const previous = {
      beginner: { width: 34, angle: 0.33 },
      normal: { width: 36, angle: 0.37 },
      large: { width: 42, angle: 0.39 },
      'wide-catch': { width: 64, angle: 0.32 },
      signature: { width: 44, angle: 0.42 },
    } as const;
    for (const name of Object.keys(previous) as (keyof typeof previous)[]) {
      const profile = SURF_RAMP_PROFILES[name];
      const old = previous[name];
      expect(profile.width).toBeLessThan(old.width);
      expect(profile.bankRadians).toBeGreaterThan(old.angle);
      expect(Math.tan(profile.bankRadians) * profile.width).toBeGreaterThan(
        Math.tan(old.angle) * old.width,
      );
    }
  });

  it('creates a sensible normal bank when no dimensions are overridden', () => {
    const ramp = createSurfRamp({
      id: 'default-bank',
      kind: 'bank',
      start: [0, 0],
      end: [0, 72],
      startY: 24,
      endY: 10,
      bankDirection: -1,
      color: '#334455',
      edgeColor: '#ffffff',
    });
    expect(ramp.width).toBe(SURF_RAMP_PROFILES.normal.width);
    expect(ramp.bankRadians).toBe(-SURF_RAMP_PROFILES.normal.bankRadians);
    expect(ramp.scaleProfile).toBe('normal');
    expect(rampShellThickness(ramp)).toBe(SURF_RAMP_PROFILES.normal.shellThickness);
  });

  it('gives future dual ramps a compact, proportionate default', () => {
    const dual = createDualSurfRamp({
      id: 'default-dual',
      start: [0, 0],
      heading: 0,
      length: 80,
      ridgeStartY: 30,
      ridgeEndY: 16,
      leftColor: '#334455',
      edgeColor: '#ffffff',
    });
    expect(dual.left.width + dual.right.width).toBe(
      DEFAULT_DUAL_SURF_RAMP.totalWidth,
    );
    expect(dual.left.bankRadians).toBeCloseTo(DEFAULT_DUAL_SURF_RAMP.bankRadians);
    expect(dual.right.bankRadians).toBeCloseTo(-DEFAULT_DUAL_SURF_RAMP.bankRadians);
    expect(dual.left.dual?.sideHeight).toBeCloseTo(
      Math.tan(DEFAULT_DUAL_SURF_RAMP.bankRadians) * dual.left.width,
    );
  });
});
