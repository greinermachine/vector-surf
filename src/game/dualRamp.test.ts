import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SURF_TUNING } from './config';
import { createDualSurfRamp, dualizeRamp, preferredDualFace } from './dualRamp';
import {
  createSurfPlayer,
  requiredRampStrafe,
  stepSurfPlayer,
} from './physics';
import {
  getRampBasis,
  isInsideRamp,
  rampHeading,
  rampSurfacePoint,
  sampleRampSurface,
} from './ramp';
import type { RampDefinition, SurfLevel } from './types';

describe('dual-sided surf ramp primitive', () => {
  const dual = createDualSurfRamp({
    id: 'test-dual',
    start: [10, 20],
    heading: Math.PI / 5,
    length: 90,
    width: 64,
    ridgeStartY: 40,
    ridgeEndY: 28,
    sideHeight: 18,
    preferredFace: 'right',
    leftColor: '#445566',
    rightColor: '#334455',
    edgeColor: '#ffffff',
  });

  const testLevel = (): SurfLevel => ({
    id: 'dual-test-level',
    number: 1,
    format: 'training',
    name: 'Dual test',
    subtitle: 'Dual test',
    briefing: 'Dual test',
    cue: 'Dual test',
    difficulty: 1,
    parTime: 30,
    palette: {
      sky: '#000000',
      fog: '#000000',
      void: '#000000',
      structure: '#ffffff',
      accent: '#ffffff',
      accentHot: '#ffffff',
    },
    spawn: {
      position: rampSurfacePoint(dual.left, 0, 5).add(
        new Vector3(0, SURF_TUNING.playerHeight, 0),
      ),
      yaw: rampHeading(dual.left),
      speed: 0,
    },
    ramps: dual.faces,
    goal: {
      rampId: dual.right.id,
    },
  });

  it('builds two independent collision planes that meet exactly at one ridge', () => {
    const leftBasis = getRampBasis(dual.left);
    const rightBasis = getRampBasis(dual.right);
    for (const distance of [0, leftBasis.length * 0.37, leftBasis.length]) {
      const leftRidge = rampSurfacePoint(dual.left, dual.left.width / 2, distance);
      const rightRidge = rampSurfacePoint(dual.right, -dual.right.width / 2, distance);
      expect(leftRidge.distanceTo(rightRidge)).toBeLessThan(1e-8);
    }
    expect(leftBasis.normalX).not.toBeCloseTo(rightBasis.normalX);
    expect(leftBasis.normalZ).not.toBeCloseTo(rightBasis.normalZ);
    expect(requiredRampStrafe(dual.left, new Vector3(
      leftBasis.normalX,
      leftBasis.normalY,
      leftBasis.normalZ,
    ))).toBe('D');
    expect(requiredRampStrafe(dual.right, new Vector3(
      rightBasis.normalX,
      rightBasis.normalY,
      rightBasis.normalZ,
    ))).toBe('A');
  });

  it('does not let collision forgiveness overlap through the center ridge', () => {
    const distance = getRampBasis(dual.left).length / 2;
    const ridge = rampSurfacePoint(dual.left, dual.left.width / 2, distance);
    const rightBasis = getRampBasis(dual.right);
    const pointInsideRight = ridge.clone().add(new Vector3(
      rightBasis.rightX * 0.25,
      0,
      rightBasis.rightZ * 0.25,
    ));
    expect(isInsideRamp(dual.left, pointInsideRight.x, pointInsideRight.z, 0.5)).toBe(false);
    expect(isInsideRamp(dual.right, pointInsideRight.x, pointInsideRight.z, 0.5)).toBe(true);
    expect(isInsideRamp(dual.left, ridge.x, ridge.z, 0.5)).toBe(true);
    expect(isInsideRamp(dual.right, ridge.x, ridge.z, 0.5)).toBe(true);
  });

  it('catches multiple entry lines and speeds on both independent faces', () => {
    const level = testLevel();
    for (const face of dual.faces) {
      const basis = getRampBasis(face);
      const normal = new Vector3(basis.normalX, basis.normalY, basis.normalZ);
      const tangent = new Vector3(
        basis.forwardX,
        basis.forwardSlope,
        basis.forwardZ,
      ).normalize();
      const strafe = face.dual?.face === 'left' ? 1 : -1;
      for (const speed of [18, 42, 72]) {
        for (const entryFraction of [-0.28, 0, 0.28]) {
          const state = createSurfPlayer(level);
          state.position.copy(
            rampSurfacePoint(face, face.width * entryFraction, 24),
          ).add(new Vector3(0, SURF_TUNING.playerHeight + 0.04, 0));
          state.velocity.copy(tangent).multiplyScalar(speed).addScaledVector(normal, -2);
          state.yaw = rampHeading(face);
          state.contactState = 'air';
          state.contactRampId = undefined;
          state.contactGraceRemaining = 0;

          const next = stepSurfPlayer(state, {
            strafe,
            move: 0,
            longitudinalHeld: false,
            jump: false,
            lookDeltaX: 0,
            lookDeltaY: 0,
          }, level, SURF_TUNING.fixedStep);
          const label = `${face.dual?.face} face, ${entryFraction} width, ${speed} speed`;
          expect(next.contactRampId, label).toBe(face.id);
          expect(next.contactState, label).toBe('ramp');
          expect(next.velocity.length(), label).toBeGreaterThan(speed * 0.94);
        }
      }
    }
  });

  it('resolves the shared ridge deterministically to the preferred face', () => {
    const level = testLevel();
    const preferred = preferredDualFace(dual);
    const ridge = rampSurfacePoint(dual.left, dual.left.width / 2, 45);
    const state = createSurfPlayer(level);
    state.position.copy(ridge).add(
      new Vector3(0, SURF_TUNING.playerHeight + 0.02, 0),
    );
    state.velocity.set(0, -4, 0);
    state.contactState = 'air';
    state.contactRampId = undefined;
    state.contactGraceRemaining = 0;

    const next = stepSurfPlayer(state, {
      strafe: 0,
      move: 0,
      longitudinalHeld: false,
      jump: false,
      lookDeltaX: 0,
      lookDeltaY: 0,
    }, level, SURF_TUNING.fixedStep);
    expect(next.contactRampId).toBe(preferred.id);
  });

  it('can promote an existing face without moving its preferred collision plane', () => {
    const source: RampDefinition = {
      id: 'source',
      kind: 'bank',
      start: [4, 8],
      end: [18, 79],
      width: 30,
      startY: 20,
      endY: 4,
      bankRadians: -0.52,
      color: '#123456',
      edgeColor: '#ffffff',
    };
    const promoted = dualizeRamp(source, 'promoted');
    const preferred = preferredDualFace(promoted);
    const sourceBasis = getRampBasis(source);
    for (const lateral of [-source.width / 2, 0, source.width / 2]) {
      for (const distance of [0, sourceBasis.length / 2, sourceBasis.length]) {
        expect(
          rampSurfacePoint(preferred, lateral, distance).distanceTo(
            rampSurfacePoint(source, lateral, distance),
          ),
        ).toBeLessThan(1e-8);
      }
    }
    const sample = sampleRampSurface(
      preferred,
      source.start[0],
      source.start[1],
    );
    expect(sample?.height).toBeCloseTo(source.startY);
  });
});
