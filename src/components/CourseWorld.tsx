import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  Vector3,
} from 'three';
import { SURF_TUNING } from '../game/config';
import {
  primaryRouteRamp,
  rampRouteGroups,
  routeGroupPoint,
  type RampRouteGroup,
} from '../game/course';
import { getRampBasis, rampHeading, rampSurfacePoint } from '../game/ramp';
import {
  makeCenterStrip,
  makeDualRidgeGeometry,
  makeMarkGeometry,
  makeRampBoundsGeometry,
  makeRampGeometry,
  makeSkirtGeometry,
  type RampPoint,
} from '../game/rampGeometry';
import type { RampDefinition, SurfLevel } from '../game/types';
import { CanyonSignalMap } from '../levels/maps/canyonSignal/CanyonSignalMap';
import { FirstSurfMap } from '../levels/maps/firstSurfMap/FirstSurfMap';
import { ParallaxMap } from '../levels/maps/parallax/ParallaxMap';

type Point = RampPoint;

function RampMesh({
  ramp,
  debug = false,
  active = false,
  showCenterStrip = true,
}: {
  ramp: RampDefinition;
  debug?: boolean;
  active?: boolean;
  showCenterStrip?: boolean;
}) {
  const top = useMemo(() => makeRampGeometry(ramp), [ramp]);
  const bounds = useMemo(() => makeRampBoundsGeometry(ramp), [ramp]);
  const skirt = useMemo(() => makeSkirtGeometry(ramp), [ramp]);
  const marks = useMemo(() => makeMarkGeometry(ramp), [ramp]);
  const strip = useMemo(() => makeCenterStrip(ramp), [ramp]);
  const underside = useMemo(() => new Color(ramp.color).multiplyScalar(0.48), [ramp.color]);
  const debugNormal = useMemo(() => {
    const basis = getRampBasis(ramp);
    const origin = rampSurfacePoint(ramp, 0, basis.length / 2)
      .addScaledVector(new Vector3(basis.normalX, basis.normalY, basis.normalZ), 0.18);
    const normal = new Vector3(basis.normalX, basis.normalY, basis.normalZ);
    return { origin, normal };
  }, [ramp]);

  useEffect(() => () => {
    top.dispose();
    bounds.dispose();
    skirt.dispose();
    marks.dispose();
    strip.dispose();
  }, [bounds, marks, skirt, strip, top]);

  return (
    <group>
      <mesh geometry={skirt} receiveShadow>
        <meshStandardMaterial color={underside} roughness={0.92} metalness={0.18} side={DoubleSide} />
      </mesh>
      <mesh geometry={top} receiveShadow>
        <meshStandardMaterial
          color={ramp.color}
          emissive={ramp.color}
          emissiveIntensity={0.12}
          roughness={0.68}
          metalness={0.32}
          side={DoubleSide}
        />
      </mesh>
      <lineSegments geometry={marks}>
        <lineBasicMaterial color={ramp.edgeColor} transparent opacity={0.2} />
      </lineSegments>
      {showCenterStrip && (
        <mesh geometry={strip}>
          <meshBasicMaterial
            color={ramp.edgeColor}
            transparent
            opacity={0.9}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            side={DoubleSide}
          />
        </mesh>
      )}
      {debug && (
        <>
          <mesh geometry={top} renderOrder={active ? 12 : 11}>
            <meshBasicMaterial
              color={active ? '#ffffff' : '#55d7ff'}
              wireframe
              transparent
              opacity={active ? 0.96 : 0.62}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
          <lineSegments geometry={bounds} renderOrder={13}>
            <lineBasicMaterial
              color={active ? '#ffffff' : '#ffbd59'}
              transparent
              opacity={active ? 1 : 0.9}
              depthTest={false}
              depthWrite={false}
            />
          </lineSegments>
          <arrowHelper
            args={[
              debugNormal.normal,
              debugNormal.origin,
              active ? 3.6 : 2.7,
              active ? '#ffffff' : '#55d7ff',
              0.55,
              0.32,
            ]}
          />
        </>
      )}
    </group>
  );
}

function DualSurfRampMesh({
  group,
  debug,
  activeRampId,
}: {
  group: RampRouteGroup;
  debug: boolean;
  activeRampId?: string;
}) {
  const left = group.ramps.find((ramp) => ramp.dual?.face === 'left');
  const right = group.ramps.find((ramp) => ramp.dual?.face === 'right');
  const ridge = useMemo(
    () => left && right ? makeDualRidgeGeometry(left, right) : null,
    [left, right],
  );
  useEffect(() => () => ridge?.dispose(), [ridge]);

  if (!left || !right || !ridge) {
    return (
      <>
        {group.ramps.map((ramp) => (
          <RampMesh
            key={ramp.id}
            ramp={ramp}
            debug={debug}
            active={ramp.id === activeRampId}
          />
        ))}
      </>
    );
  }

  return (
    <group>
      <RampMesh
        ramp={left}
        debug={debug}
        active={left.id === activeRampId}
        showCenterStrip={false}
      />
      <RampMesh
        ramp={right}
        debug={debug}
        active={right.id === activeRampId}
        showCenterStrip={false}
      />
      <mesh geometry={ridge} renderOrder={2}>
        <meshBasicMaterial
          color={left.edgeColor}
          transparent
          opacity={0.94}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

function CourseRamps({
  level,
  debug,
  activeRampId,
}: {
  level: SurfLevel;
  debug: boolean;
  activeRampId?: string;
}) {
  const groups = useMemo(() => rampRouteGroups(level), [level]);
  return (
    <group>
      {groups.map((group) => group.ramps[0]?.dual ? (
        <DualSurfRampMesh
          key={group.id}
          group={group}
          debug={debug}
          activeRampId={activeRampId}
        />
      ) : group.ramps.map((ramp) => (
        <RampMesh
          key={ramp.id}
          ramp={ramp}
          debug={debug}
          active={ramp.id === activeRampId}
        />
      )))}
    </group>
  );
}

function RouteConnectors({ level }: { level: SurfLevel }) {
  const geometry = useMemo(() => {
    const groups = rampRouteGroups(level);
    const positions: number[] = [];
    for (let index = 0; index < groups.length - 1; index += 1) {
      const fromPoint = routeGroupPoint(groups[index], true);
      const toPoint = routeGroupPoint(groups[index + 1], false);
      positions.push(
        fromPoint.x, fromPoint.y + 0.08, fromPoint.z,
        toPoint.x, toPoint.y + 0.08, toPoint.z,
      );
    }
    const value = new BufferGeometry();
    value.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return value;
  }, [level]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={level.palette.accent} transparent opacity={0.34} />
    </lineSegments>
  );
}

function Architecture({ level }: { level: SurfLevel }) {
  const pieces = useMemo(() => rampRouteGroups(level).map((group) => primaryRouteRamp(group)).flatMap((ramp, index) => {
    const basis = getRampBasis(ramp);
    const distance = basis.length * (index % 2 === 0 ? 0.28 : 0.72);
    const height = 13 + (index % 3) * 6;
    const offset = ramp.width / 2 + 9 + (index % 2) * 4;
    return [-1, 1].map((side) => {
      const routePoint = rampSurfacePoint(ramp, side * offset, distance);
      return {
        key: `${ramp.id}-${side}`,
        position: [routePoint.x, routePoint.y + height * 0.22, routePoint.z] as Point,
        scale: [1.1 + (index % 2) * 0.5, height, 1.1] as Point,
        hot: side === (index % 2 === 0 ? -1 : 1),
      };
    });
  }), [level]);

  return (
    <group>
      {pieces.map((piece) => (
        <mesh key={piece.key} position={piece.position} scale={piece.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={piece.hot ? level.palette.accent : level.palette.structure}
            emissive={piece.hot ? level.palette.accent : level.palette.structure}
            emissiveIntensity={piece.hot ? 0.2 : 0.05}
            roughness={0.82}
            metalness={0.28}
          />
        </mesh>
      ))}
    </group>
  );
}

function FinishGate({ level }: { level: SurfLevel }) {
  const ramp = level.ramps.find((candidate) => candidate.id === level.goal.rampId)!;
  const inner = useRef<Mesh>(null);
  const outer = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    if (outer.current) outer.current.rotation.z += delta * 0.12;
    if (inner.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.035;
      inner.current.scale.setScalar(pulse);
    }
  });
  return (
    <group position={level.goal.position} rotation={[0, rampHeading(ramp), 0]}>
      <group ref={outer}>
        <mesh>
          <torusGeometry args={[level.goal.radius, 0.18, 8, 72]} />
          <meshBasicMaterial color={level.palette.accent} transparent opacity={0.94} fog={false} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <torusGeometry args={[level.goal.radius + 0.55, 0.04, 6, 4]} />
          <meshBasicMaterial color={level.palette.accentHot} transparent opacity={0.42} fog={false} />
        </mesh>
      </group>
      <mesh ref={inner} position={[0, 0, 0.12]}>
        <circleGeometry args={[level.goal.radius * 0.92, 64]} />
        <meshBasicMaterial color={level.palette.accent} transparent opacity={0.055} depthWrite={false} />
      </mesh>
    </group>
  );
}

function VelocityStreaks({ level }: { level: SurfLevel }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const route = rampRouteGroups(level).map((group) => primaryRouteRamp(group));
    for (const [rampIndex, ramp] of route.entries()) {
      const basis = getRampBasis(ramp);
      for (let index = 0; index < 20; index += 1) {
        const side = index % 2 === 0 ? -1 : 1;
        const distance = basis.length * (((index * 37 + rampIndex * 19) % 97) / 97);
        const lateral = side * (ramp.width / 2 + 7 + ((index * 13) % 22));
        const point = rampSurfacePoint(ramp, lateral, distance);
        const y = point.y + 3 + ((index * 29 + rampIndex * 7) % 32);
        const streak = 0.6 + (index % 5) * 0.32;
        positions.push(
          point.x,
          y,
          point.z,
          point.x + basis.forwardX * streak,
          y + 0.06,
          point.z + basis.forwardZ * streak,
        );
      }
    }
    const value = new BufferGeometry();
    value.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return value;
  }, [level]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={level.palette.accent} transparent opacity={0.22} />
    </lineSegments>
  );
}

function courseBounds(level: SurfLevel) {
  let minimumX = Number.POSITIVE_INFINITY;
  let maximumX = Number.NEGATIVE_INFINITY;
  let minimumZ = Number.POSITIVE_INFINITY;
  let maximumZ = Number.NEGATIVE_INFINITY;
  for (const ramp of level.ramps) {
    const basis = getRampBasis(ramp);
    for (const lateral of [-ramp.width / 2, ramp.width / 2]) {
      for (const distance of [0, basis.length]) {
        const point = rampSurfacePoint(ramp, lateral, distance);
        minimumX = Math.min(minimumX, point.x);
        maximumX = Math.max(maximumX, point.x);
        minimumZ = Math.min(minimumZ, point.z);
        maximumZ = Math.max(maximumZ, point.z);
      }
    }
  }
  return {
    centerX: (minimumX + maximumX) / 2,
    centerZ: (minimumZ + maximumZ) / 2,
    width: Math.max(240, maximumX - minimumX + 180),
    depth: Math.max(240, maximumZ - minimumZ + 180),
  };
}

export function CourseWorld({
  level,
  debug = false,
  activeRampId,
}: {
  level: SurfLevel;
  debug?: boolean;
  activeRampId?: string;
}) {
  const bounds = useMemo(() => courseBounds(level), [level]);
  const environment = (() => {
    switch (level.world?.kind) {
      case 'alpine-map':
        return <FirstSurfMap level={level} />;
      case 'parallax-map':
        return <ParallaxMap level={level} />;
      case 'canyon-signal-map':
        return <CanyonSignalMap level={level} />;
      default:
        return <Architecture level={level} />;
    }
  })();
  return (
    <>
      <CourseRamps level={level} debug={debug} activeRampId={activeRampId} />
      <RouteConnectors level={level} />
      {environment}
      <FinishGate level={level} />
      <VelocityStreaks level={level} />
      <mesh
        position={[bounds.centerX, SURF_TUNING.resetHeight - 2, bounds.centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[bounds.width, bounds.depth, 1, 1]} />
        <meshStandardMaterial color={level.palette.void} roughness={1} metalness={0} />
      </mesh>
    </>
  );
}
