import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  InstancedMesh,
  Object3D,
} from 'three';
import type { SurfLevel } from '../../../game/types';
import {
  buildParallaxEnvironment,
  type ParallaxMaterial,
  type ParallaxTransform,
} from './environment';

function useInstanceTransforms(
  ref: React.RefObject<InstancedMesh | null>,
  transforms: readonly ParallaxTransform[],
) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    transforms.forEach((transform, index) => {
      dummy.position.set(...transform.position);
      dummy.scale.set(...transform.scale);
      dummy.rotation.set(...transform.rotation);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, transforms]);
}

const MATERIALS: Record<ParallaxMaterial, {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  metalness: number;
}> = {
  concrete: {
    color: '#d8d6cd', emissive: '#c5c8c4', emissiveIntensity: 0.035,
    roughness: 0.86, metalness: 0.04,
  },
  shadow: {
    color: '#69777d', emissive: '#56666c', emissiveIntensity: 0.05,
    roughness: 0.82, metalness: 0.08,
  },
  orange: {
    color: '#ff7657', emissive: '#ff5838', emissiveIntensity: 0.42,
    roughness: 0.52, metalness: 0.12,
  },
  blue: {
    color: '#75d7ff', emissive: '#51cfff', emissiveIntensity: 0.44,
    roughness: 0.48, metalness: 0.14,
  },
};

function ArchitectureField({
  transforms,
  material,
}: {
  transforms: readonly ParallaxTransform[];
  material: ParallaxMaterial;
}) {
  const instances = useMemo(
    () => transforms.filter((transform) => transform.material === material),
    [material, transforms],
  );
  const ref = useRef<InstancedMesh>(null);
  useInstanceTransforms(ref, instances);
  const appearance = MATERIALS[material];
  if (instances.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, instances.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial {...appearance} />
    </instancedMesh>
  );
}

export function ParallaxMap({ level }: { level: SurfLevel }) {
  const transforms = useMemo(() => buildParallaxEnvironment(level), [level]);
  return (
    <group>
      <ArchitectureField transforms={transforms} material="concrete" />
      <ArchitectureField transforms={transforms} material="shadow" />
      <ArchitectureField transforms={transforms} material="orange" />
      <ArchitectureField transforms={transforms} material="blue" />
      <mesh position={[-410, 565, 180]}>
        <sphereGeometry args={[31, 20, 12]} />
        <meshBasicMaterial color="#fff2c7" fog={false} />
      </mesh>
    </group>
  );
}
