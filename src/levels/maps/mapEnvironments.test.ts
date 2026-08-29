import { describe, expect, it } from 'vitest';
import { CANYON_SIGNAL_MAP } from './canyonSignal/config';
import { buildCanyonEnvironment } from './canyonSignal/environment';
import { PARALLAX_MAP } from './parallax/config';
import { buildParallaxEnvironment } from './parallax/environment';

function expectFiniteTransforms(transforms: readonly {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotation: readonly [number, number, number];
}[]) {
  for (const transform of transforms) {
    expect(transform.position.every(Number.isFinite)).toBe(true);
    expect(transform.rotation.every(Number.isFinite)).toBe(true);
    expect(transform.scale.every((value) => Number.isFinite(value) && value > 0)).toBe(true);
  }
}

describe('full-map decorative environments', () => {
  it('batches the Parallax architecture into a modest transform budget', () => {
    const rampIds = PARALLAX_MAP.ramps.map((ramp) => ramp.id);
    const transforms = buildParallaxEnvironment(PARALLAX_MAP);
    expect(transforms).toHaveLength(122);
    expect(new Set(transforms.map((transform) => transform.material))).toEqual(
      new Set(['concrete', 'shadow', 'orange', 'blue']),
    );
    expectFiniteTransforms(transforms);
    expect(PARALLAX_MAP.ramps.map((ramp) => ramp.id)).toEqual(rampIds);
  });

  it('batches the Canyon Signal terrain without adding collision surfaces', () => {
    const rampIds = CANYON_SIGNAL_MAP.ramps.map((ramp) => ramp.id);
    const transforms = buildCanyonEnvironment(CANYON_SIGNAL_MAP);
    expect(transforms).toHaveLength(129);
    expect(new Set(transforms.map((transform) => transform.geometry))).toEqual(
      new Set(['rock', 'slab', 'mesa']),
    );
    expect(new Set(transforms.map((transform) => transform.material))).toEqual(
      new Set(['sandstone', 'sunlit', 'dark', 'deep', 'cyan']),
    );
    expectFiniteTransforms(transforms);
    // Environment transforms are render-only. The authoritative collision list
    // remains the authored ramp array consumed by the shared surf simulation.
    expect(CANYON_SIGNAL_MAP.ramps.map((ramp) => ramp.id)).toEqual(rampIds);
  });
});
