import { useLayoutEffect, useRef } from 'react';
import {
  DoubleSide,
  InstancedMesh,
  Object3D,
} from 'three';
import type { SurfLevel } from '../../../game/types';
import {
  CAVE_PIECES,
  MOUNTAINS,
  PINES,
  ROCK_MASSES,
  type InstanceTransform,
} from './environment';

function useInstanceTransforms(
  ref: React.RefObject<InstancedMesh | null>,
  transforms: readonly InstanceTransform[],
) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    transforms.forEach((transform, index) => {
      dummy.position.set(...transform.position);
      dummy.scale.set(...transform.scale);
      dummy.rotation.set(...(transform.rotation ?? [0, 0, 0]));
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, transforms]);
}

function MountainField({ level }: { level: SurfLevel }) {
  const mountains = useRef<InstancedMesh>(null);
  useInstanceTransforms(mountains, MOUNTAINS);
  return (
    <instancedMesh ref={mountains} args={[undefined, undefined, MOUNTAINS.length]} receiveShadow>
      <coneGeometry args={[1, 1, 6]} />
      <meshStandardMaterial
        color={level.palette.structure}
        emissive={level.palette.structure}
        emissiveIntensity={0.025}
        roughness={1}
        flatShading
      />
    </instancedMesh>
  );
}

function PineField() {
  const foliage = useRef<InstancedMesh>(null);
  const trunks = useRef<InstancedMesh>(null);
  const trunkTransforms = PINES.map((pine) => ({
    position: [
      pine.position[0],
      pine.position[1] - pine.scale[1] * 0.4,
      pine.position[2],
    ] as const,
    scale: [0.7, pine.scale[1] * 0.28, 0.7] as const,
  }));
  useInstanceTransforms(foliage, PINES);
  useInstanceTransforms(trunks, trunkTransforms);
  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, trunkTransforms.length]}>
        <cylinderGeometry args={[1, 1, 1, 5]} />
        <meshStandardMaterial color="#4e5145" roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={foliage} args={[undefined, undefined, PINES.length]}>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial color="#294f4b" roughness={1} flatShading />
      </instancedMesh>
    </group>
  );
}

function RavineAndCave({ level }: { level: SurfLevel }) {
  const rocks = useRef<InstancedMesh>(null);
  const cave = useRef<InstancedMesh>(null);
  useInstanceTransforms(rocks, ROCK_MASSES);
  useInstanceTransforms(cave, CAVE_PIECES);
  return (
    <group>
      <instancedMesh ref={rocks} args={[undefined, undefined, ROCK_MASSES.length]} receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#52615d" roughness={0.98} flatShading />
      </instancedMesh>
      <instancedMesh ref={cave} args={[undefined, undefined, CAVE_PIECES.length]} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#3b4948"
          emissive={level.palette.structure}
          emissiveIntensity={0.035}
          roughness={0.94}
        />
      </instancedMesh>
    </group>
  );
}

function WaterAndFalls({ level }: { level: SurfLevel }) {
  const waterY = level.world?.waterY ?? -88;
  return (
    <group>
      <mesh position={[-80, waterY, 470]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1_850, 1_850, 1, 1]} />
        <meshStandardMaterial
          color="#3c8290"
          emissive="#2a6170"
          emissiveIntensity={0.13}
          roughness={0.28}
          metalness={0.12}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh position={[-245, -35, 335]} rotation={[0, 0.48, 0]}>
        <planeGeometry args={[13, 105, 1, 10]} />
        <meshBasicMaterial
          color="#d9fbff"
          transparent
          opacity={0.42}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-245, waterY + 0.2, 335]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[24, 32]} />
        <meshBasicMaterial color="#d9fbff" transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function FirstSurfMap({ level }: { level: SurfLevel }) {
  return (
    <group>
      <WaterAndFalls level={level} />
      <MountainField level={level} />
      <PineField />
      <RavineAndCave level={level} />
      <mesh position={[310, 325, -380]}>
        <sphereGeometry args={[34, 24, 12]} />
        <meshBasicMaterial color="#fff5c6" fog={false} />
      </mesh>
    </group>
  );
}
