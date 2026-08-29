import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  Euler,
  ExtrudeGeometry,
  Group,
  Quaternion,
  Shape,
  Vector3,
} from 'three';
import type { SurfLevel } from '../game/types';

const INSPECT_DURATION = 1.55;

function smoothstep(start: number, end: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return x * x * (3 - 2 * x);
}

export function KnifeViewmodel({
  level,
  running,
  speed,
  onInspect,
}: {
  level: SurfLevel;
  running: boolean;
  speed: number;
  onInspect: (active: boolean) => void;
}) {
  const group = useRef<Group>(null);
  const inspecting = useRef(false);
  const inspectElapsed = useRef(0);
  const { camera } = useThree();
  const localOffset = useRef(new Vector3());
  const worldOffset = useRef(new Vector3());
  const localRotation = useRef(new Quaternion());
  const euler = useRef(new Euler());

  const bladeGeometry = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-1.08, -0.13);
    shape.lineTo(-0.88, 0.02);
    shape.lineTo(-0.28, 0.18);
    shape.lineTo(0.08, 0.1);
    shape.lineTo(0.08, -0.1);
    shape.lineTo(-0.72, -0.18);
    shape.closePath();
    const geometry = new ExtrudeGeometry(shape, {
      depth: 0.055,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.018,
      bevelThickness: 0.012,
    });
    geometry.center();
    return geometry;
  }, []);

  useEffect(() => () => bladeGeometry.dispose(), [bladeGeometry]);

  useEffect(() => {
    const inspect = (event: KeyboardEvent) => {
      if (!running || event.code !== 'KeyF' || event.repeat) return;
      event.preventDefault();
      inspecting.current = true;
      inspectElapsed.current = 0;
      onInspect(true);
    };
    window.addEventListener('keydown', inspect);
    return () => window.removeEventListener('keydown', inspect);
  }, [onInspect, running]);

  useEffect(() => {
    if (running || !inspecting.current) return;
    inspecting.current = false;
    onInspect(false);
  }, [onInspect, running]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    let inspect = 0;
    let spin = 0;
    if (inspecting.current) {
      inspectElapsed.current += delta;
      const progress = Math.min(1, inspectElapsed.current / INSPECT_DURATION);
      inspect = Math.sin(progress * Math.PI);
      spin = smoothstep(0.08, 0.68, progress) * Math.PI * 2;
      if (progress >= 1) {
        inspecting.current = false;
        onInspect(false);
      }
    }

    const bob = running ? Math.sin(clock.elapsedTime * 5.4) * Math.min(0.018, speed * 0.0006) : 0;
    localOffset.current.set(
      0.64 - inspect * 0.48,
      -0.52 + inspect * 0.25 + bob,
      -0.94 + inspect * 0.08,
    );
    worldOffset.current.copy(localOffset.current).applyQuaternion(camera.quaternion);
    group.current.position.copy(camera.position).add(worldOffset.current);

    euler.current.set(
      -0.2 + inspect * 0.42,
      -0.5 + inspect * 0.92,
      -0.32 + spin,
      'XYZ',
    );
    localRotation.current.setFromEuler(euler.current);
    group.current.quaternion.copy(camera.quaternion).multiply(localRotation.current);
  });

  return (
    <group ref={group} scale={0.68} renderOrder={1000}>
      <group rotation={[0, 0, -0.04]}>
        <mesh geometry={bladeGeometry} position={[-0.5, 0.02, 0]} renderOrder={1002}>
          <meshStandardMaterial
            color="#d8dedb"
            emissive="#8fa39c"
            emissiveIntensity={0.17}
            metalness={0.92}
            roughness={0.19}
            depthTest={false}
            depthWrite={false}
            fog={false}
          />
        </mesh>
        <mesh position={[0.1, 0, 0]} scale={[0.12, 0.48, 0.12]} renderOrder={1003}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={level.palette.accent}
            emissive={level.palette.accent}
            emissiveIntensity={0.55}
            metalness={0.5}
            roughness={0.35}
            depthTest={false}
            depthWrite={false}
            fog={false}
          />
        </mesh>
        <mesh position={[0.48, 0, 0]} scale={[0.7, 0.25, 0.21]} renderOrder={1001}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#111615"
            emissive="#060807"
            metalness={0.62}
            roughness={0.5}
            depthTest={false}
            depthWrite={false}
            fog={false}
          />
        </mesh>
        {[0.25, 0.48, 0.71].map((x) => (
          <mesh key={x} position={[x, 0, 0.125]} rotation={[Math.PI / 2, 0, 0]} renderOrder={1004}>
            <cylinderGeometry args={[0.035, 0.035, 0.03, 12]} />
            <meshBasicMaterial color={level.palette.accentHot} depthTest={false} depthWrite={false} fog={false} />
          </mesh>
        ))}
        <mesh position={[0.86, 0, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={1001}>
          <torusGeometry args={[0.17, 0.055, 8, 24]} />
          <meshStandardMaterial
            color="#151c1a"
            metalness={0.78}
            roughness={0.34}
            depthTest={false}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      </group>
    </group>
  );
}
