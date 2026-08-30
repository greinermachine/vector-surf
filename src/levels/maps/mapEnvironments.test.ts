import { describe, expect, it } from 'vitest';
import { primaryRouteRamp, rampRouteGroups } from '../../game/course';
import { getRampBasis, rampSurfacePoint } from '../../game/ramp';
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

function expectRouteFacingSupportEdgeIsFlush(
  support: {
    position: readonly [number, number, number];
    scale: readonly [number, number, number];
  },
  ramp: Parameters<typeof getRampBasis>[0],
  edge: 'start' | 'finish',
) {
  const basis = getRampBasis(ramp);
  const centerDistance =
    (support.position[0] - ramp.start[0]) * basis.forwardX
    + (support.position[2] - ramp.start[1]) * basis.forwardZ;
  const rearEdge = centerDistance - support.scale[2] / 2;
  const frontEdge = centerDistance + support.scale[2] / 2;
  if (edge === 'start') {
    expect(frontEdge).toBeCloseTo(basis.length, 7);
  } else {
    expect(rearEdge).toBeCloseTo(0, 7);
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
    const route = rampRouteGroups(PARALLAX_MAP).map((group) => primaryRouteRamp(group));
    const supports = transforms.filter((transform) => (
      transform.scale[0] === 112 && transform.scale[1] === 5.5
    ));
    expect(supports).toHaveLength(2);
    supports.forEach((support, index) => {
      const ramp = route[index === 0 ? 0 : route.length - 1];
      const center = rampSurfacePoint(ramp, 0, getRampBasis(ramp).length * 0.5);
      expect(support.position[1] + support.scale[1] / 2).toBeLessThanOrEqual(center.y - 1.4);
      expectRouteFacingSupportEdgeIsFlush(support, ramp, index === 0 ? 'start' : 'finish');
    });
    expect(PARALLAX_MAP.ramps.map((ramp) => ramp.id)).toEqual(rampIds);
  });

  it('batches the Canyon Signal terrain without adding collision surfaces', () => {
    const rampIds = CANYON_SIGNAL_MAP.ramps.map((ramp) => ramp.id);
    const transforms = buildCanyonEnvironment(CANYON_SIGNAL_MAP);
    expect(transforms).toHaveLength(98);
    expect(transforms.length).toBeLessThanOrEqual(100);
    expect(new Set(transforms.map((transform) => transform.geometry))).toEqual(
      new Set(['rock', 'slab', 'mesa']),
    );
    expect(new Set(transforms.map((transform) => transform.material))).toEqual(
      new Set(['sandstone', 'sunlit', 'cave', 'cyan']),
    );
    expectFiniteTransforms(transforms);
    const route = rampRouteGroups(CANYON_SIGNAL_MAP).map((group) => primaryRouteRamp(group));
    const supports = transforms.filter((transform) => (
      transform.geometry === 'slab' && transform.scale[0] === 132 && transform.scale[1] === 12
    ));
    expect(supports).toHaveLength(2);
    supports.forEach((support, index) => {
      const ramp = route[index === 0 ? 0 : route.length - 1];
      const center = rampSurfacePoint(ramp, 0, getRampBasis(ramp).length * 0.5);
      expect(support.position[1] + support.scale[1] / 2).toBeLessThanOrEqual(center.y - 0.9);
      expectRouteFacingSupportEdgeIsFlush(support, ramp, index === 0 ? 'start' : 'finish');
    });
    // Environment transforms are render-only. The authoritative collision list
    // remains the authored ramp array consumed by the shared surf simulation.
    expect(CANYON_SIGNAL_MAP.ramps.map((ramp) => ramp.id)).toEqual(rampIds);
  });
});
