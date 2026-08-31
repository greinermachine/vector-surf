import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  CylinderGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  type BufferGeometry,
  type MeshStandardMaterialParameters,
} from 'three';
import {
  buildScrapyardEnvironment,
  type ScrapyardGeometry,
  type ScrapyardMaterial,
  type ScrapyardTransform,
} from './environment';

const MATERIALS: Record<ScrapyardMaterial, MeshStandardMaterialParameters> = {
  'dark-iron': {
    color: '#3f3832', emissive: '#27201c', emissiveIntensity: 0.09,
    roughness: 0.94, metalness: 0.38,
  },
  rust: {
    color: '#754332', emissive: '#3d241c', emissiveIntensity: 0.1,
    roughness: 0.9, metalness: 0.3,
  },
  'weathered-steel': {
    color: '#62594f', emissive: '#302c29', emissiveIntensity: 0.07,
    roughness: 0.82, metalness: 0.5,
  },
  'industrial-green': {
    color: '#475149', emissive: '#202923', emissiveIntensity: 0.08,
    roughness: 0.88, metalness: 0.28,
  },
  'safety-yellow': {
    color: '#b98c35', emissive: '#6e4e1e', emissiveIntensity: 0.26,
    roughness: 0.76, metalness: 0.22,
  },
  'warning-red': {
    color: '#9b3e2b', emissive: '#8c281b', emissiveIntensity: 0.72,
    roughness: 0.68, metalness: 0.18,
  },
};

const GEOMETRIES: readonly ScrapyardGeometry[] = ['box', 'cylinder'];
const MATERIAL_KINDS: readonly ScrapyardMaterial[] = [
  'dark-iron', 'rust', 'weathered-steel',
  'industrial-green', 'safety-yellow', 'warning-red',
];

function useInstanceTransforms(
  ref: React.RefObject<InstancedMesh | null>,
  transforms: readonly ScrapyardTransform[],
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

function SalvageField({
  transforms,
  geometryKind,
  materialKind,
  geometry,
  material,
}: {
  transforms: readonly ScrapyardTransform[];
  geometryKind: ScrapyardGeometry;
  materialKind: ScrapyardMaterial;
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
      receiveShadow
    />
  );
}

export function ScrapyardJunctionsMap() {
  const transforms = useMemo(() => buildScrapyardEnvironment(), []);
  const geometries = useMemo<Record<ScrapyardGeometry, BufferGeometry>>(() => ({
    box: new BoxGeometry(1, 1, 1),
    cylinder: new CylinderGeometry(1, 1, 1, 10, 1, false),
  }), []);
  const materials = useMemo<Record<ScrapyardMaterial, MeshStandardMaterial>>(() => ({
    'dark-iron': new MeshStandardMaterial(MATERIALS['dark-iron']),
    rust: new MeshStandardMaterial(MATERIALS.rust),
    'weathered-steel': new MeshStandardMaterial(MATERIALS['weathered-steel']),
    'industrial-green': new MeshStandardMaterial(MATERIALS['industrial-green']),
    'safety-yellow': new MeshStandardMaterial(MATERIALS['safety-yellow']),
    'warning-red': new MeshStandardMaterial(MATERIALS['warning-red']),
  }), []);

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  return (
    <group>
      {GEOMETRIES.flatMap((geometryKind) => MATERIAL_KINDS.map((materialKind) => (
        <SalvageField
          key={`${geometryKind}-${materialKind}`}
          transforms={transforms}
          geometryKind={geometryKind}
          materialKind={materialKind}
          geometry={geometries[geometryKind]}
          material={materials[materialKind]}
        />
      )))}
      <pointLight position={[-24, 92, 946]} intensity={58} distance={300} color="#c26f38" />
      <pointLight position={[322, -10, 1560]} intensity={38} distance={180} color="#a8442f" />
    </group>
  );
}
