import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  InstancedMesh,
  Object3D,
} from 'three';
import { getRampBasis, rampSurfacePoint } from '../../../game/ramp';
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
  dark: {
    color: '#3e3532', emissive: '#292528', emissiveIntensity: 0.035,
    roughness: 1, metalness: 0,
  },
  deep: {
    color: '#252a2d', emissive: '#172328', emissiveIntensity: 0.04,
    roughness: 1, metalness: 0,
  },
  cyan: {
    color: '#55ecff', emissive: '#35dff4', emissiveIntensity: 0.85,
    roughness: 0.46, metalness: 0.12,
  },
};

const FIELDS: readonly [CanyonGeometry, CanyonMaterial][] = [
  ['rock', 'sandstone'], ['rock', 'sunlit'], ['rock', 'dark'], ['rock', 'deep'],
  ['slab', 'sunlit'], ['slab', 'sandstone'], ['slab', 'dark'], ['slab', 'deep'],
  ['slab', 'cyan'], ['mesa', 'sandstone'], ['mesa', 'sunlit'],
];

function CanyonField({
  transforms,
  geometry,
  material,
}: {
  transforms: readonly CanyonTransform[];
  geometry: CanyonGeometry;
  material: CanyonMaterial;
}) {
  const instances = useMemo(() => transforms.filter((transform) => (
    transform.geometry === geometry && transform.material === material
  )), [geometry, material, transforms]);
  const ref = useRef<InstancedMesh>(null);
  useInstanceTransforms(ref, instances);
  if (instances.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, instances.length]} receiveShadow>
      {geometry === 'rock' && <dodecahedronGeometry args={[1, 0]} />}
      {geometry === 'slab' && <boxGeometry args={[1, 1, 1]} />}
      {geometry === 'mesa' && <cylinderGeometry args={[0.72, 1, 1, 7]} />}
      <meshStandardMaterial {...MATERIALS[material]} flatShading={geometry !== 'slab'} />
    </instancedMesh>
  );
}

export function CanyonSignalMap({ level }: { level: SurfLevel }) {
  const transforms = useMemo(() => buildCanyonEnvironment(level), [level]);
  const lights = useMemo(() => {
    const pointFor = (id: string, fraction: number, lift: number) => {
      const ramp = level.ramps.find((candidate) => candidate.id === id)!;
      const point = rampSurfacePoint(ramp, 0, getRampBasis(ramp).length * fraction);
      point.y += lift;
      return point;
    };
    return {
      cavern: pointFor('map03-cavern-drop', 0.52, 32),
      daylight: pointFor('map03-daylight-approach', 0.9, 48),
    };
  }, [level]);

  return (
    <group>
      {FIELDS.map(([geometry, material]) => (
        <CanyonField
          key={`${geometry}-${material}`}
          transforms={transforms}
          geometry={geometry}
          material={material}
        />
      ))}
      <pointLight position={lights.cavern} intensity={10} distance={175} color="#55ecff" />
      <pointLight position={lights.daylight} intensity={13} distance={210} color="#ffd7a2" />
      <mesh position={[520, 735, -410]}>
        <sphereGeometry args={[38, 22, 12]} />
        <meshBasicMaterial color="#fff1c7" fog={false} />
      </mesh>
    </group>
  );
}
