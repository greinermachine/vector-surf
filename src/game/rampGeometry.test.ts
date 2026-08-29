import { describe, expect, it } from 'vitest';
import { createDualSurfRamp } from './dualRamp';
import { heightOnRamp, rampSurfacePoint } from './ramp';
import {
  makeDualRidgeGeometry,
  makeRampBoundsGeometry,
  makeRampGeometry,
  makeSkirtGeometry,
  rampCorners,
} from './rampGeometry';
import { rampShellThickness } from './rampProfiles';
import type { RampDefinition } from './types';

function geometryVertices(geometry: ReturnType<typeof makeRampGeometry>) {
  const attribute = geometry.getAttribute('position');
  return Array.from({ length: attribute.count }, (_value, index) => [
    attribute.getX(index),
    attribute.getY(index),
    attribute.getZ(index),
  ] as const);
}

function openTriangleEdges(
  geometries: readonly ReturnType<typeof makeRampGeometry>[],
) {
  const edges = new Map<string, number>();
  const key = (point: readonly number[]) => point
    .map((coordinate) => coordinate.toFixed(3))
    .join(',');
  for (const geometry of geometries) {
    const vertices = geometryVertices(geometry);
    expect(vertices.length % 3).toBe(0);
    for (let index = 0; index < vertices.length; index += 3) {
      const triangle = vertices.slice(index, index + 3);
      for (const [from, to] of [[0, 1], [1, 2], [2, 0]] as const) {
        const endpoints = [key(triangle[from]), key(triangle[to])].sort();
        const edge = endpoints.join('|');
        edges.set(edge, (edges.get(edge) ?? 0) + 1);
      }
    }
  }
  return [...edges.entries()].filter(([, count]) => count !== 2);
}

describe('surf ramp render geometry', () => {
  const ramp: RampDefinition = {
    id: 'visual-collision-agreement',
    kind: 'bank',
    start: [8, -17],
    end: [61, 94],
    width: 37,
    startY: 48,
    endY: 21,
    bankRadians: 0.54,
    color: '#334455',
    edgeColor: '#ffffff',
  };

  it('builds every visible top vertex directly on the analytic collision plane', () => {
    const geometry = makeRampGeometry(ramp);
    const expectedCorners = rampCorners(ramp);
    const vertices = geometryVertices(geometry);

    for (const [x, y, z] of vertices) {
      expect(y).toBeCloseTo(heightOnRamp(ramp, x, z), 4);
      expect(expectedCorners.some((corner) => (
        Math.hypot(corner[0] - x, corner[1] - y, corner[2] - z) < 1e-4
      ))).toBe(true);
    }

    geometry.dispose();
  });

  it('draws debug bounds from the same four analytic surface corners', () => {
    const geometry = makeRampBoundsGeometry(ramp);
    const expectedCorners = rampCorners(ramp);
    const vertices = geometryVertices(geometry);
    expect(vertices).toHaveLength(8);
    for (const [x, y, z] of vertices) {
      expect(expectedCorners.some((corner) => (
        Math.hypot(corner[0] - x, corner[1] + 0.1 - y, corner[2] - z) < 1e-4
      ))).toBe(true);
    }
    geometry.dispose();
  });

  it('closes the front, back, bottom, and outer sides without dual ridge walls', () => {
    const dual = createDualSurfRamp({
      id: 'clean-ridge',
      start: [4, 9],
      heading: 0.38,
      length: 72,
      width: 58,
      ridgeStartY: 60,
      ridgeEndY: 38,
      sideHeight: 16,
      leftColor: '#445566',
      edgeColor: '#ffffff',
    });
    const ordinarySkirt = makeSkirtGeometry(ramp);
    const leftSkirt = makeSkirtGeometry(dual.left);
    const rightSkirt = makeSkirtGeometry(dual.right);

    expect(ordinarySkirt.getAttribute('position').count).toBe(30);
    expect(leftSkirt.getAttribute('position').count).toBe(24);
    expect(rightSkirt.getAttribute('position').count).toBe(24);

    ordinarySkirt.dispose();
    leftSkirt.dispose();
    rightSkirt.dispose();
  });

  it('uses a shallow uniform shell instead of a lowest-corner wedge', () => {
    const geometry = makeSkirtGeometry(ramp);
    const vertices = geometryVertices(geometry);
    const thickness = rampShellThickness(ramp);
    const corners = rampCorners(ramp);

    for (const corner of corners) {
      expect(vertices.some(([x, y, z]) => (
        Math.hypot(
          corner[0] - x,
          corner[1] - thickness - y,
          corner[2] - z,
        ) < 1e-4
      ))).toBe(true);
    }
    expect(thickness).toBeLessThan(1.2);
    geometry.dispose();
  });

  it('forms a watertight ordinary shell with no open triangle boundary', () => {
    const top = makeRampGeometry(ramp);
    const skirt = makeSkirtGeometry(ramp);
    expect(openTriangleEdges([top, skirt])).toEqual([]);
    top.dispose();
    skirt.dispose();
  });

  it('forms one watertight dual shell while leaving out the hidden internal walls', () => {
    const dual = createDualSurfRamp({
      id: 'watertight-dual',
      start: [-8, 12],
      heading: 0.63,
      length: 76,
      width: 68,
      ridgeStartY: 55,
      ridgeEndY: 31,
      sideHeight: 14,
      leftColor: '#334455',
      edgeColor: '#ffffff',
    });
    const geometries = [
      makeRampGeometry(dual.left),
      makeSkirtGeometry(dual.left),
      makeRampGeometry(dual.right),
      makeSkirtGeometry(dual.right),
    ];
    expect(openTriangleEdges(geometries)).toEqual([]);
    for (const geometry of geometries) geometry.dispose();
  });

  it('caps a dual ramp with one narrow ridge derived from both face surfaces', () => {
    const dual = createDualSurfRamp({
      id: 'ridge-cap',
      start: [-12, 3],
      heading: -0.71,
      length: 83,
      width: 66,
      ridgeStartY: 72,
      ridgeEndY: 49,
      sideHeight: 19,
      leftColor: '#334455',
      edgeColor: '#ffffff',
    });
    const geometry = makeDualRidgeGeometry(dual.left, dual.right);
    const vertices = geometryVertices(geometry);
    const inset = Math.min(0.12, dual.left.width * 0.01);
    const expected = [
      rampSurfacePoint(dual.left, dual.left.width / 2 - inset, 0),
      rampSurfacePoint(dual.left, dual.left.width / 2 - inset, 83),
      rampSurfacePoint(dual.right, -dual.right.width / 2 + inset, 0),
      rampSurfacePoint(dual.right, -dual.right.width / 2 + inset, 83),
    ];

    for (const [x, y, z] of vertices) {
      expect(expected.some((point) => (
        Math.hypot(point.x - x, point.y + 0.065 - y, point.z - z) < 1e-4
      ))).toBe(true);
    }

    geometry.dispose();
  });
});
