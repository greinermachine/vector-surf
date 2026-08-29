export type InstanceTransform = {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotation?: readonly [number, number, number];
};

function groundedCone(
  x: number,
  z: number,
  baseY: number,
  radius: number,
  height: number,
): InstanceTransform {
  return {
    position: [x, baseY + height / 2, z],
    scale: [radius, height, radius],
  };
}

export const MOUNTAINS: readonly InstanceTransform[] = [
  groundedCone(-720, 80, -88, 135, 430),
  groundedCone(-735, 470, -88, 155, 510),
  groundedCone(-720, 880, -88, 165, 540),
  groundedCone(640, 90, -88, 150, 470),
  groundedCone(660, 500, -88, 175, 560),
  groundedCone(625, 900, -88, 155, 500),
  groundedCone(-440, 1_300, -88, 175, 560),
  groundedCone(0, 1_330, -88, 190, 620),
  groundedCone(440, 1_300, -88, 170, 545),
  groundedCone(-360, -350, -88, 160, 520),
  groundedCone(90, -380, -88, 175, 570),
  groundedCone(480, -330, -88, 145, 460),
] as const;

export const ROCK_MASSES: readonly InstanceTransform[] = [
  { position: [132, 290, 434], scale: [38, 82, 48], rotation: [0.1, 0.25, -0.08] },
  { position: [322, 282, 452], scale: [42, 88, 46], rotation: [-0.08, 0.4, 0.08] },
  { position: [126, 246, 548], scale: [44, 84, 45], rotation: [0.12, -0.2, 0.05] },
  { position: [300, 242, 570], scale: [46, 90, 42], rotation: [-0.08, 0.25, -0.12] },
  { position: [142, 205, 668], scale: [45, 82, 44], rotation: [0.07, -0.38, 0.08] },
  { position: [316, 198, 704], scale: [48, 92, 48], rotation: [-0.1, 0.16, -0.07] },
  { position: [42, 146, 792], scale: [52, 90, 54], rotation: [0.08, -0.28, 0.08] },
  { position: [214, 132, 900], scale: [48, 82, 50], rotation: [-0.12, 0.22, 0.05] },
] as const;

type TreeZone = {
  center: readonly [number, number, number];
  count: number;
  spreadX: number;
  spreadZ: number;
};

const TREE_ZONES: readonly TreeZone[] = [
  { center: [-105, 420, 20], count: 12, spreadX: 72, spreadZ: 105 },
  { center: [188, 330, 255], count: 11, spreadX: 62, spreadZ: 105 },
  { center: [348, 215, 650], count: 10, spreadX: 58, spreadZ: 118 },
  { center: [-505, -52, 555], count: 10, spreadX: 72, spreadZ: 105 },
];

export const PINES: readonly InstanceTransform[] = TREE_ZONES.flatMap((zone, zoneIndex) => (
  Array.from({ length: zone.count }, (_, index) => {
    const phase = index * 2.399 + zoneIndex * 0.73;
    const radius = 0.28 + ((index * 37 + zoneIndex * 11) % 71) / 100;
    const x = zone.center[0] + Math.cos(phase) * zone.spreadX * radius;
    const z = zone.center[2] + Math.sin(phase) * zone.spreadZ * radius;
    const height = 10 + ((index * 13 + zoneIndex * 5) % 9);
    return groundedCone(x, z, zone.center[1], 3.2 + (index % 4) * 0.45, height);
  })
));

type CaveFrame = {
  center: readonly [number, number, number];
  yaw: number;
  width: number;
  height: number;
};

const CAVE_FRAMES: readonly CaveFrame[] = [
  { center: [208, 272, 535], yaw: 0.1, width: 150, height: 108 },
  { center: [243, 238, 648], yaw: -0.35, width: 116, height: 108 },
  { center: [169, 207, 720], yaw: -0.8, width: 154, height: 112 },
  { center: [108, 158, 847], yaw: -1.2, width: 170, height: 122 },
];

export const CAVE_PIECES: readonly InstanceTransform[] = CAVE_FRAMES.flatMap((frame) => {
  const rightX = Math.cos(frame.yaw);
  const rightZ = -Math.sin(frame.yaw);
  const postOffset = frame.width / 2;
  const rotation = [0, frame.yaw, 0] as const;
  return [
    {
      position: [
        frame.center[0] - rightX * postOffset,
        frame.center[1] + frame.height / 2,
        frame.center[2] - rightZ * postOffset,
      ],
      scale: [5, frame.height, 8],
      rotation,
    },
    {
      position: [
        frame.center[0] + rightX * postOffset,
        frame.center[1] + frame.height / 2,
        frame.center[2] + rightZ * postOffset,
      ],
      scale: [5, frame.height, 8],
      rotation,
    },
    {
      position: [
        frame.center[0],
        frame.center[1] + frame.height,
        frame.center[2],
      ],
      scale: [frame.width + 8, 5, 8],
      rotation,
    },
  ] as InstanceTransform[];
});
