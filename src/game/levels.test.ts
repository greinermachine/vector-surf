import { describe, expect, it } from 'vitest';
import { SURF_TUNING } from './config';
import {
  primaryRouteRamp,
  rampRouteGroups,
  rampRouteLinks,
  routeTransferDistance,
} from './course';
import { SURF_LEVELS } from './levels';
import {
  getRampBasis,
  heightOnRamp,
  rampHeading,
  rampSurfacePoint,
} from './ramp';
import { SURF_RAMP_PROFILES } from './rampProfiles';
import { sampleRampSurface } from './physics';
import {
  SCRAPYARD_BRANCH_IDS,
  SCRAPYARD_ROUTES,
  SWITCHYARD_MAP,
} from '../levels/maps/switchyard/config';
import type { RampDefinition } from './types';

const trainingLevels = SURF_LEVELS.filter((level) => level.format !== 'full-map');
const fullMaps = SURF_LEVELS.filter((level) => level.format === 'full-map');
const alpineFlow = fullMaps.find((level) => level.id === 'alpine-flow')!;
const route = (level: (typeof SURF_LEVELS)[number]) => rampRouteGroups(level);
const banks = (index: number) => route(trainingLevels[index])
  .map((group) => primaryRouteRamp(group))
  .filter((ramp) => ramp.kind === 'bank');
const effectiveWidth = (ramp: RampDefinition) => ramp.dual?.totalWidth ?? ramp.width;

type Point2 = readonly [x: number, z: number];

function footprint(ramp: RampDefinition): readonly Point2[] {
  const basis = getRampBasis(ramp);
  const halfWidth = ramp.width / 2;
  return [
    [ramp.start[0] - basis.rightX * halfWidth, ramp.start[1] - basis.rightZ * halfWidth],
    [ramp.start[0] + basis.rightX * halfWidth, ramp.start[1] + basis.rightZ * halfWidth],
    [ramp.end[0] + basis.rightX * halfWidth, ramp.end[1] + basis.rightZ * halfWidth],
    [ramp.end[0] - basis.rightX * halfWidth, ramp.end[1] - basis.rightZ * halfWidth],
  ];
}

function footprintsOverlapWithArea(a: RampDefinition, b: RampDefinition) {
  const axes = [a, b].flatMap((ramp) => {
    const basis = getRampBasis(ramp);
    return [
      [basis.forwardX, basis.forwardZ] as const,
      [basis.rightX, basis.rightZ] as const,
    ];
  });
  const polygons = [footprint(a), footprint(b)];
  return axes.every(([axisX, axisZ]) => {
    const projections = polygons.map((polygon) => polygon.map(
      ([x, z]) => x * axisX + z * axisZ,
    ));
    const aMin = Math.min(...projections[0]);
    const aMax = Math.max(...projections[0]);
    const bMin = Math.min(...projections[1]);
    const bMax = Math.max(...projections[1]);
    return Math.min(aMax, bMax) - Math.max(aMin, bMin) > 0.02;
  });
}

describe('authored level campaign', () => {
  it('contains six sequential, increasingly long lines', () => {
    expect(SURF_LEVELS.map((level) => level.number)).toEqual(
      SURF_LEVELS.map((_level, index) => index + 1),
    );
    expect(trainingLevels.map((level) => level.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(trainingLevels.map((_level, index) => banks(index).length)).toEqual([2, 3, 4, 5, 6, 7]);
    const lengths = trainingLevels.map((level) => (
      route(level).reduce((sum, group) => sum + getRampBasis(primaryRouteRamp(group)).length, 0)
    ));
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
    expect(fullMaps).toHaveLength(5);
    expect(fullMaps.map((level) => level.mapNumber)).toEqual([1, 2, 3, 4, 5]);
    for (const fullMap of fullMaps) {
      const fullMapLength = route(fullMap).reduce(
        (sum, group) => sum + getRampBasis(primaryRouteRamp(group)).length,
        0,
      );
      expect(fullMapLength).toBeGreaterThan(lengths.at(-1)! * 1.9);
    }
    expect(SURF_LEVELS.every((level) => level.spawn.speed === 0)).toBe(true);
  });

  it('defines exactly one start and one finish with no intermediate checkpoints', () => {
    for (const level of trainingLevels) {
      expect(level.ramps.filter((ramp) => ramp.kind === 'start')).toHaveLength(1);
      expect(level.ramps.filter((ramp) => ramp.kind === 'landing')).toHaveLength(1);
      expect('checkpoints' in level).toBe(false);
    }
  });

  it('gives every surf map one continuous start-to-finish route without checkpoints', () => {
    for (const fullMap of fullMaps) {
      expect(fullMap.ramps.filter((ramp) => ramp.kind === 'start')).toHaveLength(1);
      expect(fullMap.ramps.filter((ramp) => ramp.kind === 'landing')).toHaveLength(1);
      expect(route(fullMap).filter((group) => primaryRouteRamp(group).kind === 'bank').length)
        .toBeGreaterThanOrEqual(14);
      expect('checkpoints' in fullMap).toBe(false);
      expect(fullMap.routeLabel).toBeTruthy();
      expect(fullMap.resetLabel).toBeTruthy();
    }
    expect(fullMaps.map((level) => level.world?.kind)).toEqual([
      'alpine-map',
      'parallax-map',
      'canyon-signal-map',
      'dynamo-rise-map',
      'switchyard-map',
    ]);
  });

  it.each(SURF_LEVELS.map((level) => [level.id, level] as const))(
    '%s starts on a separate flat launch deck',
    (_id, level) => {
      const launch = level.ramps[0];
      const firstBank = level.ramps[1];
      expect(launch.kind).toBe('start');
      expect(firstBank.kind).toBe('bank');
      expect(launch.bankRadians).toBe(0);
      expect(launch.startY).toBe(launch.endY);
      const spawnSurface = sampleRampSurface(
        launch,
        level.spawn.position.x,
        level.spawn.position.z,
      );
      expect(spawnSurface).not.toBeNull();
      expect(level.spawn.position.y).toBeCloseTo(
        spawnSurface!.height + SURF_TUNING.playerHeight,
      );
      expect(sampleRampSurface(firstBank, level.spawn.position.x, level.spawn.position.z)).toBeNull();
      const spawnIntersections = level.ramps.filter((ramp) => (
        sampleRampSurface(ramp, level.spawn.position.x, level.spawn.position.z) !== null
      ));
      expect(spawnIntersections.map((ramp) => ramp.id)).toEqual([launch.id]);
    },
  );

  it.each(SURF_LEVELS.map((level) => [level.id, level] as const))(
    '%s has separated collision footprints outside intentional dual ridges',
    (_id, level) => {
      const overlaps: string[] = [];
      const linkedPairs = new Set(rampRouteLinks(level).map((link) => (
        [link.from.id, link.to.id].sort().join('|')
      )));
      for (let left = 0; left < level.ramps.length; left += 1) {
        for (let right = left + 1; right < level.ramps.length; right += 1) {
          const a = level.ramps[left];
          const b = level.ramps[right];
          if (a.dual?.id && a.dual.id === b.dual?.id) continue;
          const groupPair = [a.dual?.id ?? a.id, b.dual?.id ?? b.id].sort().join('|');
          if (linkedPairs.has(groupPair)) continue;
          if (footprintsOverlapWithArea(a, b)) overlaps.push(`${a.id} / ${b.id}`);
        }
      }
      expect(overlaps).toEqual([]);
      for (const link of rampRouteLinks(level)) {
        expect(routeTransferDistance(link.from, link.to)).toBeGreaterThan(2);
      }
    },
  );

  it.each(SURF_LEVELS.map((level) => [level.id, level] as const))(
    '%s keeps every sampled collider point on its rendered profile envelope and rejects points outside it',
    (_id, level) => {
      for (const ramp of level.ramps) {
        expect(ramp.scaleProfile).toBeDefined();
        const profile = SURF_RAMP_PROFILES[ramp.scaleProfile!];
        // Critical branch catches may widen or shallow the base profile while
        // retaining its shared visual shell depth and material treatment.
        expect(ramp.width).toBeGreaterThanOrEqual(profile.width * 0.85);
        const maximumWidthMultiplier = [
          'map05-control-lift',
          'map05-final-transfer',
        ].includes(ramp.id) ? 1.7 : 1.55;
        expect(ramp.width).toBeLessThanOrEqual(profile.width * maximumWidthMultiplier);
        if (ramp.kind === 'bank') {
          expect(Math.abs(ramp.bankRadians)).toBeGreaterThanOrEqual(profile.bankRadians * 0.78);
          const maximumBankMultiplier = [
            'map05-processing-drop',
            'map05-control-lift',
          ].includes(ramp.id) ? 1.35 : 1.2;
          expect(Math.abs(ramp.bankRadians)).toBeLessThanOrEqual(
            profile.bankRadians * maximumBankMultiplier,
          );
        } else {
          expect(ramp.bankRadians).toBe(0);
        }
        const basis = getRampBasis(ramp);
        for (const lateralFraction of [-0.49, -0.25, 0, 0.25, 0.49]) {
          for (const distanceFraction of [0.001, 0.25, 0.5, 0.75, 0.999]) {
            const point = rampSurfacePoint(
              ramp,
              ramp.width * lateralFraction,
              basis.length * distanceFraction,
            );
            const sample = sampleRampSurface(ramp, point.x, point.z);
            expect(sample, `${ramp.id} @ ${lateralFraction},${distanceFraction}`).not.toBeNull();
            expect(sample!.height).toBeCloseTo(point.y, 7);
            expect(sample!.height).toBeCloseTo(heightOnRamp(ramp, point.x, point.z), 7);
            expect(sample!.normal.length()).toBeCloseTo(1, 7);
          }
        }
        for (const [lateral, distance] of [
          [ramp.width / 2 + 0.02, basis.length / 2],
          [-ramp.width / 2 - 0.02, basis.length / 2],
          [0, -0.02],
          [0, basis.length + 0.02],
        ] as const) {
          const point = rampSurfacePoint(ramp, lateral, distance);
          expect(sampleRampSurface(ramp, point.x, point.z)).toBeNull();
        }
      }
    },
  );

  it.each(SURF_LEVELS.map((level) => [level.id, level] as const))(
    '%s uses its entire final flat landing as the finish platform',
    (_id, level) => {
      const landing = level.ramps.at(-1)!;
      expect(landing.kind).toBe('landing');
      expect(landing.id).toBe(level.goal.rampId);
      expect(landing.bankRadians).toBe(0);
      expect(landing.startY).toBe(landing.endY);
      const length = getRampBasis(landing).length;
      for (const lateral of [-landing.width * 0.45, 0, landing.width * 0.45]) {
        for (const distance of [1, length / 2, length - 1]) {
          const point = rampSurfacePoint(landing, lateral, distance);
          expect(sampleRampSurface(landing, point.x, point.z)).not.toBeNull();
        }
      }
    },
  );

  it('keeps the first five routes straight and makes the sixth a broad turn', () => {
    for (const level of trainingLevels.slice(0, 5)) {
      for (const group of route(level)) expect(rampHeading(primaryRouteRamp(group))).toBeCloseTo(0);
    }
    const headings = route(trainingLevels[5]).map((group) => rampHeading(primaryRouteRamp(group)));
    expect(Math.max(...headings) - Math.min(...headings)).toBeGreaterThan(Math.PI * 0.9);
    for (const fullMap of fullMaps) {
      expect(new Set(route(fullMap).map((group) => (
        rampHeading(primaryRouteRamp(group)).toFixed(2)
      ))).size).toBeGreaterThan(10);
    }
  });

  it('uses progressively larger transfers—not precision-width catches—to raise difficulty', () => {
    const averageTransfers = trainingLevels.map((level) => {
      const groups = route(level);
      const distances = groups.slice(1).map((group, index) => (
        routeTransferDistance(groups[index], group)
      ));
      return distances.reduce((sum, distance) => sum + distance, 0) / distances.length;
    });
    expect(averageTransfers.slice(0, 5)).toEqual(
      [...averageTransfers.slice(0, 5)].sort((a, b) => a - b),
    );
    expect(averageTransfers[5]).toBeGreaterThan(averageTransfers[0] * 2);
    for (const fullMap of fullMaps) {
      const transfers = route(fullMap).slice(1).map((group, index) => (
        routeTransferDistance(route(fullMap)[index], group)
      ));
      expect(Math.max(...transfers)).toBeGreaterThan(60);
    }
    const alpineGroups = route(alpineFlow);
    const alpineTransfers = alpineGroups.slice(1).map((group, index) => (
      routeTransferDistance(alpineGroups[index], group)
    ));
    expect(Math.max(...alpineTransfers)).toBeGreaterThan(90);
    const transferTo = (idFragment: string) => {
      const targetIndex = alpineGroups.findIndex((group) => (
        group.ramps.some((ramp) => ramp.id.includes(idFragment))
      ));
      return routeTransferDistance(
        alpineGroups[targetIndex - 1],
        alpineGroups[targetIndex],
      );
    };
    // The signature still asks for a major transfer, while the former
    // 110-unit closing gap is intentionally compressed into a readable catch.
    expect(transferTo('signature-wedge')).toBeGreaterThan(60);
    expect(transferTo('map01-s3-e')).toBeGreaterThan(60);
    expect(transferTo('map01-s3-e')).toBeLessThan(75);
  });

  it('keeps every authored catch wide and introduces dual wedges in later routes', () => {
    for (let index = 0; index < trainingLevels.length; index += 1) {
      expect(banks(index).every((ramp) => effectiveWidth(ramp) >= 32)).toBe(true);
    }
    expect(trainingLevels.slice(0, 2).every((level) => (
      route(level).every((group) => group.ramps.length === 1)
    ))).toBe(true);
    expect(trainingLevels.slice(2).map((level) => (
      route(level).filter((group) => group.ramps.length === 2).length
    ))).toEqual([1, 2, 3, 3]);
    expect(route(alpineFlow).filter((group) => group.ramps.length === 2)).toHaveLength(8);
    for (const fullMap of fullMaps) {
      const dualCount = route(fullMap).filter((group) => group.ramps.length === 2).length;
      expect(dualCount).toBeGreaterThanOrEqual(fullMap.id === 'switchyard' ? 0 : 3);
    }
    for (const fullMap of fullMaps) {
      expect(route(fullMap)
        .map((group) => primaryRouteRamp(group))
        .filter((ramp) => ramp.kind === 'bank')
        .every((ramp) => effectiveWidth(ramp) >= 34)).toBe(true);
    }
  });

  it('defines two substantial Scrapyard Junctions routes through one authored fork and rejoin', () => {
    expect(SWITCHYARD_MAP.id).toBe('switchyard');
    expect(SWITCHYARD_MAP.name).toBe('Scrapyard Junctions');
    expect(SWITCHYARD_MAP.world?.kind).toBe('switchyard-map');
    expect(SWITCHYARD_MAP.ramps.every((ramp) => (
      !['#fff', '#ffffff', 'white'].includes(ramp.color.toLowerCase())
      && !['#fff', '#ffffff', 'white'].includes(ramp.edgeColor.toLowerCase())
    ))).toBe(true);
    expect(SCRAPYARD_ROUTES.map((routeOption) => [
      routeOption.id,
      routeOption.identity,
    ])).toEqual([
      ['A', 'upper-yard'],
      ['B', 'lower-works'],
    ]);
    const rampById = new Map(SWITCHYARD_MAP.ramps.map((ramp) => [ramp.id, ramp]));
    const links = new Set(
      SWITCHYARD_MAP.routeLinks?.map((link) => `${link.from}->${link.to}`) ?? [],
    );

    for (const routeOption of SCRAPYARD_ROUTES) {
      const groupIds = routeOption.rampIds.map((rampId) => {
        const ramp = rampById.get(rampId);
        expect(ramp, `${routeOption.id} references ${rampId}`).toBeDefined();
        return ramp!.dual?.id ?? ramp!.id;
      });
      expect(groupIds[0]).toBe('map05-start-platform');
      expect(groupIds.at(-1)).toBe('map05-finish-control-platform');
      for (let index = 1; index < groupIds.length; index += 1) {
        expect(
          links.has(`${groupIds[index - 1]}->${groupIds[index]}`),
          `${routeOption.id} is missing ${groupIds[index - 1]} -> ${groupIds[index]}`,
        ).toBe(true);
      }
    }

    const branchLength = (ids: readonly string[]) => ids.reduce((sum, id) => (
      sum + getRampBasis(rampById.get(id)!).length
    ), 0);
    const upperLength = branchLength(SCRAPYARD_BRANCH_IDS.upper);
    const lowerLength = branchLength(SCRAPYARD_BRANCH_IDS.lower);
    expect(upperLength / lowerLength).toBeGreaterThan(0.9);
    expect(upperLength / lowerLength).toBeLessThan(1.1);

    for (const id of SCRAPYARD_BRANCH_IDS.upper) {
      const ramp = rampById.get(id)!;
      expect((ramp.start[0] + ramp.end[0]) / 2).toBeLessThan(-40);
    }
    for (const id of SCRAPYARD_BRANCH_IDS.lower) {
      const ramp = rampById.get(id)!;
      expect((ramp.start[0] + ramp.end[0]) / 2).toBeGreaterThan(40);
    }
  });
});
