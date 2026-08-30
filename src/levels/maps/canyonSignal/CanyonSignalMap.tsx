import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  CylinderGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  type BufferGeometry,
} from 'three';
import type { SurfLevel } from '../../../game/types';
import {
  buildCanyonEnvironment,
  type CanyonGeometry,
  type CanyonMaterial,
  type CanyonTransform,
} from './environment';

function useInstanceTransforms(
  ref: React.RefObject<InstancedMesh | null>,
  transforms: readonly CanyonTransform[],
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

const MATERIALS: Record<CanyonMaterial, {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  metalness: number;
}> = {
  sandstone: {
    color: '#8e5338', emissive: '#6b3628', emissiveIntensity: 0.055,
    roughness: 0.98, metalness: 0,
  },
  sunlit: {
    color: '#bd7448', emissive: '#9e5438', emissiveIntensity: 0.09,
    roughness: 0.96, metalness: 0,
  },
  cave: {
    color: '#2f3031', emissive: '#1c2528', emissiveIntensity: 0.04,
    roughness: 1, metalness: 0,
  },
  cyan: {
    color: '#55ecff', emissive: '#35dff4', emissiveIntensity: 0.85,
    roughness: 0.46, metalness: 0.12,
  },
};

const FIELDS: readonly [CanyonGeometry, CanyonMaterial][] = [
  ['rock', 'sandstone'], ['rock', 'sunlit'], ['rock', 'cave'],
  ['slab', 'sunlit'], ['slab', 'sandstone'], ['slab', 'cave'],
  ['slab', 'cyan'], ['mesa', 'sandstone'], ['mesa', 'sunlit'],
];

function CanyonField({
  transforms,
  geometryKind,
  materialKind,
  geometry,
  material,
}: {
  transforms: readonly CanyonTransform[];
  geometryKind: CanyonGeometry;
  materialKind: CanyonMaterial;
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
}) {
  const instances = useMemo(() => transforms.filter((transform) => (
    transform.geometry === geometryKind && transform.material === materialKind
  )), [geometryKind, materialKind, transforms]);
  const ref = useRef<InstancedMesh>(null);
  useInstanceTransforms(ref, instances);
  if (instances.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, instances.length]}
      frustumCulled
    />
  );
}

export function CanyonSignalMap({ level }: { level: SurfLevel }) {
  const transforms = useMemo(() => buildCanyonEnvironment(level), [level]);
  const geometries = useMemo<Record<CanyonGeometry, BufferGeometry>>(() => ({
    rock: new OctahedronGeometry(1, 0),
    slab: new BoxGeometry(1, 1, 1),
    mesa: new CylinderGeometry(0.72, 1, 1, 6),
  }), []);
  const materials = useMemo<Record<CanyonMaterial, MeshStandardMaterial>>(() => ({
    sandstone: new MeshStandardMaterial({ ...MATERIALS.sandstone, flatShading: true }),
    sunlit: new MeshStandardMaterial({ ...MATERIALS.sunlit, flatShading: true }),
    cave: new MeshStandardMaterial({ ...MATERIALS.cave, flatShading: true }),
    cyan: new MeshStandardMaterial({ ...MATERIALS.cyan, flatShading: true }),
  }), []);
  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  return (
    <group>
      {FIELDS.map(([geometryKind, materialKind]) => (
        <CanyonField
          key={`${geometryKind}-${materialKind}`}
          transforms={transforms}
          geometryKind={geometryKind}
          materialKind={materialKind}
          geometry={geometries[geometryKind]}
          material={materials[materialKind]}
        />
      ))}
      <mesh position={[520, 735, -410]}>
        <sphereGeometry args={[38, 12, 8]} />
        <meshBasicMaterial color="#fff1c7" fog={false} />
      </mesh>
    </group>
  );
}
