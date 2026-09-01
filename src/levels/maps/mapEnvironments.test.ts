import { Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SURF_TUNING } from '../../game/config';
import { primaryRouteRamp, rampRouteGroups } from '../../game/course';
import { getRampBasis, rampSurfacePoint } from '../../game/ramp';
import { CANYON_SIGNAL_MAP } from './canyonSignal/config';
import { buildCanyonEnvironment } from './canyonSignal/environment';
import { DYNAMO_RISE_MAP } from './dynamoRise/config';
import {
  buildDynamoRiseEnvironment,
  DYNAMO_RISE_MAJOR_MASS_COUNT,
} from './dynamoRise/environment';
import { PARALLAX_MAP } from './parallax/config';
import { buildParallaxEnvironment } from './parallax/environment';
import { SWITCHYARD_MAP } from './switchyard/config';
import {
  buildScrapyardEnvironment,
  SCRAPYARD_ENVIRONMENT_BUDGET,
} from './switchyard/environment';

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

function containsPlayerEye(
  transform: {
    position: readonly [number, number, number];
    scale: readonly [number, number, number];
    rotation: readonly [number, number, number];
  },
  point: Vector3,
) {
  const object = new Object3D();
  object.position.set(...transform.position);
  object.scale.set(...transform.scale);
  object.rotation.set(...transform.rotation);
  object.updateMatrix();
  const local = point.clone().applyMatrix4(object.matrix.clone().invert());
  const padding = 0.2;
  return (
    Math.abs(local.x) <= 0.5 + padding / transform.scale[0]
    && Math.abs(local.y) <= 0.5 + padding / transform.scale[1]
    && Math.abs(local.z) <= 0.5 + padding / transform.scale[2]
  );
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
    expect(transforms).toHaveLength(66);
    expect(transforms.length).toBeLessThanOrEqual(72);
    expect(transforms.length / 114).toBeLessThan(0.6);
    expect(new Set(transforms.map((transform) => transform.material))).toEqual(
      new Set(['concrete', 'structure', 'glass', 'orange', 'blue']),
    );
    expect(new Set(transforms.map((transform) => transform.zone))).toEqual(
      new Set([
        'entry-atrium',
        'long-gallery',
        'vertical-shaft',
        'bridge-void',
        'final-hall',
      ]),
    );
    expect(new Set(transforms.map((transform) => transform.role))).toEqual(
      new Set([
        'wall',
        'foundation',
        'ceiling',
        'support',
        'bridge',
        'window',
        'accent',
        'plinth',
      ]),
    );
    expectFiniteTransforms(transforms);
    for (const zone of [
      'entry-atrium',
      'long-gallery',
      'vertical-shaft',
      'bridge-void',
      'final-hall',
    ] as const) {
      const zoneTransforms = transforms.filter((transform) => transform.zone === zone);
      expect(zoneTransforms.some((transform) => transform.role === 'wall')).toBe(true);
      expect(zoneTransforms.some((transform) => (
        transform.role === 'support'
        || transform.role === 'foundation'
        || transform.role === 'bridge'
      ))).toBe(true);
    }
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
    expect(transforms).toHaveLength(100);
    expect(transforms.length).toBeLessThanOrEqual(100);
    expect(new Set(transforms.map((transform) => transform.geometry))).toEqual(
      new Set(['rock', 'slab', 'mesa']),
    );
    expect(new Set(transforms.map((transform) => transform.material))).toEqual(
      new Set(['sandstone', 'sunlit', 'cave', 'cyan', 'sunbeam']),
    );
    expect(new Set(transforms.map((transform) => transform.zone))).toEqual(
      new Set(['overlook-ravine', 'cavern', 'daylight-basin', 'horizon']),
    );
    expect(new Set(transforms.map((transform) => transform.role))).toEqual(
      new Set([
        'cliff',
        'ledge',
        'joint',
        'cave-wall',
        'cave-ceiling',
        'arch',
        'beacon',
        'sunbeam',
        'plateau',
        'mesa',
      ]),
    );
    expect(Object.fromEntries(
      [...new Set(transforms.map((transform) => transform.role))]
        .map((role) => [
          role,
          transforms.filter((transform) => transform.role === role).length,
        ]),
    )).toEqual({
      cliff: 24,
      ledge: 24,
      joint: 12,
      'cave-wall': 12,
      'cave-ceiling': 6,
      arch: 12,
      beacon: 2,
      sunbeam: 2,
      plateau: 2,
      mesa: 4,
    });
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

  it('builds Dynamo Rise from twenty instanced city masses with render-only details', () => {
    const rampIds = DYNAMO_RISE_MAP.ramps.map((ramp) => ramp.id);
    const transforms = buildDynamoRiseEnvironment(DYNAMO_RISE_MAP);
    const towers = transforms.filter((transform) => transform.role === 'tower');

    expect(transforms).toHaveLength(52);
    expect(transforms.length).toBeLessThanOrEqual(56);
    expect(DYNAMO_RISE_MAJOR_MASS_COUNT).toBe(20);
    expect(towers).toHaveLength(DYNAMO_RISE_MAJOR_MASS_COUNT);
    expect(new Set(transforms.map((transform) => transform.material))).toEqual(
      new Set(['concrete', 'glass', 'shadow', 'cyan', 'amber']),
    );
    expect(new Set(transforms.map((transform) => transform.zone))).toEqual(
      new Set(['opening', 'street-canyon', 'signature-gap', 'crown']),
    );
    expect(new Set(transforms.map((transform) => transform.role))).toEqual(
      new Set(['tower', 'window-band', 'roof-crown', 'antenna', 'skybridge']),
    );
    expect(transforms.some((transform) => (
      transform.zone === 'crown'
      && transform.role === 'roof-crown'
      && transform.material === 'amber'
    ))).toBe(false);
    expectFiniteTransforms(transforms);
    for (const tower of towers) {
      expect(tower.position[1] - tower.scale[1] / 2).toBeCloseTo(-92, 7);
    }

    // The skyline is presentation only; collision remains exactly the shared
    // authored ramp array consumed by the surf simulation.
    expect(DYNAMO_RISE_MAP.ramps.map((ramp) => ramp.id)).toEqual(rampIds);
  });

  it('batches Scrapyard Junctions into industrial macro masses and instanced repeats', () => {
    const rampIds = SWITCHYARD_MAP.ramps.map((ramp) => ramp.id);
    const transforms = buildScrapyardEnvironment();
    const macroMasses = transforms.filter((transform) => transform.composition === 'macro');
    const repeats = transforms.filter((transform) => transform.composition === 'repeat');

    expect(transforms).toHaveLength(48);
    expect(transforms.length).toBeLessThanOrEqual(SCRAPYARD_ENVIRONMENT_BUDGET);
    expect(transforms.length / 89).toBeLessThan(0.6);
    expect(macroMasses).toHaveLength(20);
    expect(repeats).toHaveLength(28);
    expect(new Set(transforms.map((transform) => transform.geometry))).toEqual(
      new Set(['box', 'cylinder']),
    );
    expect(new Set(transforms.map((transform) => transform.material))).toEqual(
      new Set([
        'dark-iron', 'rust', 'weathered-steel',
        'industrial-green', 'safety-yellow', 'warning-red',
      ]),
    );
    expect(new Set(transforms.map((transform) => transform.zone))).toEqual(
      new Set([
        'fork-yard', 'upper-yard', 'lower-works',
        'processing-hall', 'control-platform',
      ]),
    );
    expect(new Set(transforms.map((transform) => transform.role))).toEqual(
      new Set([
        'separator', 'warehouse', 'container', 'scrap-stack', 'crane',
        'tunnel', 'pipe', 'crusher', 'hall', 'gantry', 'control-room',
        'warning-light',
      ]),
    );
    expectFiniteTransforms(transforms);

    const forkSeparators = transforms.filter((transform) => transform.role === 'separator');
    expect(forkSeparators).toHaveLength(3);
    expect(forkSeparators.every((transform) => (
      Math.abs(transform.position[0]) - transform.scale[0] / 2 >= 150
    ))).toBe(true);
    expect(transforms.some((transform) => (
      transform.zone === 'upper-yard' && transform.role === 'crane'
    ))).toBe(true);
    expect(transforms.some((transform) => (
      transform.zone === 'lower-works' && transform.role === 'crusher'
    ))).toBe(true);
    expect(transforms.some((transform) => (
      transform.zone === 'processing-hall' && transform.role === 'hall'
    ))).toBe(true);

    // Dressing stays render-only and cannot add collider seams or mutate the
    // authored ramp list used by the surf and underside collision passes.
    expect(SWITCHYARD_MAP.ramps.map((ramp) => ramp.id)).toEqual(rampIds);
  });

  it('keeps every Scrapyard route corridor clear of decorative macro geometry', () => {
    const transforms = buildScrapyardEnvironment();
    const obstructions: string[] = [];
    for (const ramp of SWITCHYARD_MAP.ramps) {
      const basis = getRampBasis(ramp);
      for (const lateralFraction of [-0.3, 0, 0.3]) {
        for (const distanceFraction of [0.08, 0.25, 0.5, 0.75, 0.92]) {
          const eye = rampSurfacePoint(
            ramp,
            ramp.width * lateralFraction,
            basis.length * distanceFraction,
          );
          eye.y += SURF_TUNING.playerHeight;
          transforms.forEach((transform, index) => {
            if (containsPlayerEye(transform, eye)) {
              obstructions.push(
                `${ramp.id}@${lateralFraction},${distanceFraction}`
                + ` -> ${transform.zone}/${transform.role}#${index}`,
              );
            }
          });
        }
      }
    }
    expect(obstructions).toEqual([]);
  });
});
