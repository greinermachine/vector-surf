import { Vector3 } from 'three';
import { getRampBasis, rampSurfacePoint } from './ramp';
import type { RampDefinition, SurfLevel } from './types';

export type RampRouteGroup = {
  id: string;
  ramps: readonly RampDefinition[];
};

export type RampRouteLink = {
  from: RampRouteGroup;
  to: RampRouteGroup;
};

export function rampRouteGroups(level: SurfLevel): readonly RampRouteGroup[] {
  const groups: RampRouteGroup[] = [];
  for (const ramp of level.ramps) {
    const id = ramp.dual?.id ?? ramp.id;
    const previous = groups.at(-1);
    if (previous?.id === id) {
      groups[groups.length - 1] = {
        id,
        ramps: [...previous.ramps, ramp],
      };
    } else {
      groups.push({ id, ramps: [ramp] });
    }
  }
  return groups;
}

export function primaryRouteRamp(group: RampRouteGroup): RampDefinition {
  return group.ramps.find((ramp) => ramp.dual?.preferred) ?? group.ramps[0];
}

export function rampRouteLinks(level: SurfLevel): readonly RampRouteLink[] {
  const groups = rampRouteGroups(level);
  if (!level.routeLinks) {
    return groups.slice(1).map((to, index) => ({ from: groups[index], to }));
  }

  const groupsById = new Map(groups.map((group) => [group.id, group]));
  return level.routeLinks.map((link) => {
    const from = groupsById.get(link.from);
    const to = groupsById.get(link.to);
    if (!from || !to) {
      throw new Error(
        `Level ${level.id} route link ${link.from} -> ${link.to} references an unknown ramp group.`,
      );
    }
    return { from, to };
  });
}

export function routeGroupIndexForRamp(
  groups: readonly RampRouteGroup[],
  rampId: string | undefined,
) {
  if (!rampId) return -1;
  return groups.findIndex((group) => group.ramps.some((ramp) => ramp.id === rampId));
}

export function routeGroupPoint(
  group: RampRouteGroup,
  end: boolean,
  target = new Vector3(),
) {
  const primary = primaryRouteRamp(group);
  if (primary.dual) {
    const point = end ? primary.dual.ridgeEnd : primary.dual.ridgeStart;
    return target.set(
      point[0],
      end ? primary.dual.ridgeEndY : primary.dual.ridgeStartY,
      point[1],
    );
  }
  return rampSurfacePoint(
    primary,
    0,
    end ? getRampBasis(primary).length : 0,
    target,
  );
}

export function routeTransferDistance(
  from: RampRouteGroup,
  to: RampRouteGroup,
) {
  return routeGroupPoint(from, true).distanceTo(routeGroupPoint(to, false));
}

export function finishPlatformRamp(level: SurfLevel): RampDefinition {
  const ramp = level.ramps.find((candidate) => candidate.id === level.goal.rampId);
  if (!ramp || ramp.kind !== 'landing') {
    throw new Error(`Level ${level.id} must name one landing ramp as its finish platform.`);
  }
  return ramp;
}

export function finishPlatformPoint(
  level: SurfLevel,
  target = new Vector3(),
) {
  const ramp = finishPlatformRamp(level);
  return rampSurfacePoint(ramp, 0, getRampBasis(ramp).length * 0.55, target);
}
