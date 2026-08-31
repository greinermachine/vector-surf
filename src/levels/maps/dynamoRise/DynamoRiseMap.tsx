import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  type MeshStandardMaterialParameters,
} from 'three';
import type { SurfLevel } from '../../../game/types';
import {
  buildDynamoRiseEnvironment,
  type DynamoMaterial,
  type DynamoTransform,
} from './environment';

const MATERIALS: Record<DynamoMaterial, MeshStandardMaterialParameters> = {
  concrete: {
    color: '#455660', emissive: '#263a45', emissiveIntensity: 0.08,
    roughness: 0.88, metalness: 0.14,
  },
  glass: {
    color: '#214b5d', emissive: '#163f50', emissiveIntensity: 0.2,
    roughness: 0.32, metalness: 0.38,
  },
  shadow: {
    color: '#14242d', emissive: '#0c1c24', emissiveIntensity: 0.12,
    roughness: 0.94, metalness: 0.08,
  },
  cyan: {
    color: '#75f3ed', emissive: '#4ce8e2', emissiveIntensity: 1.1,
    roughness: 0.42, metalness: 0.14,
  },
  amber: {
    color: '#ffbf69', emissive: '#ff9f43', emissiveIntensity: 1.2,
    roughness: 0.46, metalness: 0.12,
  },
};

const FIELDS: readonly DynamoMaterial[] = ['concrete', 'glass', 'shadow', 'cyan', 'amber'];

function useInstanceTransforms(
  ref: React.RefObject<InstancedMesh | null>,
  transforms: readonly DynamoTransform[],
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

function CityField({
  transforms,
  materialKind,
  geometry,
  material,
}: {
  transforms: readonly DynamoTransform[];
  materialKind: DynamoMaterial;
  geometry: BoxGeometry;
  material: MeshStandardMaterial;
}) {
  const instances = useMemo(
    () => transforms.filter((transform) => transform.material === materialKind),
    [materialKind, transforms],
  );
  const ref = useRef<InstancedMesh>(null);
  useInstanceTransforms(ref, instances);
  if (instances.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, material, instances.length]} frustumCulled />
  );
}

export function DynamoRiseMap({ level }: { level: SurfLevel }) {
  const transforms = useMemo(() => buildDynamoRiseEnvironment(level), [level]);
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const materials = useMemo<Record<DynamoMaterial, MeshStandardMaterial>>(() => ({
    concrete: new MeshStandardMaterial(MATERIALS.concrete),
    glass: new MeshStandardMaterial(MATERIALS.glass),
    shadow: new MeshStandardMaterial(MATERIALS.shadow),
    cyan: new MeshStandardMaterial(MATERIALS.cyan),
    amber: new MeshStandardMaterial(MATERIALS.amber),
  }), []);

  useEffect(() => () => {
    geometry.dispose();
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometry, materials]);

  return (
    <group>
      {FIELDS.map((materialKind) => (
        <CityField
          key={materialKind}
          transforms={transforms}
          materialKind={materialKind}
          geometry={geometry}
          material={materials[materialKind]}
        />
      ))}
      <mesh position={[-260, 470, 760]}>
        <sphereGeometry args={[26, 12, 8]} />
        <meshBasicMaterial color="#d8f5ff" fog={false} />
      </mesh>
    </group>
  );
}
