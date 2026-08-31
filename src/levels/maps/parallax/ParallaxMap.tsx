import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  type BufferGeometry,
  type MeshStandardMaterialParameters,
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

const MATERIALS: Record<ParallaxMaterial, MeshStandardMaterialParameters> = {
  concrete: {
    color: '#d6d5ce', emissive: '#c4c8c5', emissiveIntensity: 0.035,
    roughness: 0.9, metalness: 0.025,
  },
  structure: {
    color: '#58656a', emissive: '#3f4c52', emissiveIntensity: 0.045,
    roughness: 0.78, metalness: 0.14,
  },
  glass: {
    color: '#9fd9e2', emissive: '#75c6d8', emissiveIntensity: 0.18,
    roughness: 0.22, metalness: 0.2, transparent: true, opacity: 0.3,
    depthWrite: false,
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

const FIELDS: readonly ParallaxMaterial[] = [
  'concrete', 'structure', 'glass', 'orange', 'blue',
];

function ArchitectureField({
  transforms,
  material,
  geometry,
  meshMaterial,
}: {
  transforms: readonly ParallaxTransform[];
  material: ParallaxMaterial;
  geometry: BufferGeometry;
  meshMaterial: MeshStandardMaterial;
}) {
  const instances = useMemo(
    () => transforms.filter((transform) => transform.material === material),
    [material, transforms],
  );
  const ref = useRef<InstancedMesh>(null);
  useInstanceTransforms(ref, instances);
  if (instances.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, meshMaterial, instances.length]}
      frustumCulled
    />
  );
}

export function ParallaxMap({ level }: { level: SurfLevel }) {
  const transforms = useMemo(() => buildParallaxEnvironment(level), [level]);
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const materials = useMemo<Record<ParallaxMaterial, MeshStandardMaterial>>(() => ({
    concrete: new MeshStandardMaterial(MATERIALS.concrete),
    structure: new MeshStandardMaterial(MATERIALS.structure),
    glass: new MeshStandardMaterial(MATERIALS.glass),
    orange: new MeshStandardMaterial(MATERIALS.orange),
    blue: new MeshStandardMaterial(MATERIALS.blue),
  }), []);
  useEffect(() => () => {
    geometry.dispose();
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometry, materials]);
  return (
    <group>
      {FIELDS.map((material) => (
        <ArchitectureField
          key={material}
          transforms={transforms}
          material={material}
          geometry={geometry}
          meshMaterial={materials[material]}
        />
      ))}
      <mesh position={[-410, 565, 180]}>
        <sphereGeometry args={[31, 12, 8]} />
        <meshBasicMaterial color="#fff2c7" fog={false} />
      </mesh>
    </group>
  );
}
