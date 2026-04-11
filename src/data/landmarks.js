import * as THREE from 'three';

const LON_MIN = 6.6;
const LON_MAX = 18.5;
const LAT_MIN = 36.6;
const LAT_MAX = 47.1;
const WORLD_SIZE = 170;

function mercY(lat) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

const MERC_Y_MIN = mercY(LAT_MIN);
const MERC_Y_MAX = mercY(LAT_MAX);

function lngLatToWorld(lon, lat) {
  const tx = (lon - LON_MIN) / (LON_MAX - LON_MIN);
  const tz = 1 - (mercY(lat) - MERC_Y_MIN) / (MERC_Y_MAX - MERC_Y_MIN);
  return [(tx - 0.5) * WORLD_SIZE, 0, (tz - 0.5) * WORLD_SIZE];
}

export const landmarks = [
  {
    id: 'colosseum',
    name: 'Colosseum · 罗马斗兽场',
    description: '古罗马时代最宏伟的圆形竞技场之一，是罗马文明象征。',
    modelPath: '/models/colosseum.glb',
    position: lngLatToWorld(12.4922, 41.8902),
    rotation: [0, Math.PI * 0.15, 0],
    scale: 6.4,
    triggerRadius: 18,
  },
  {
    id: 'pisa',
    name: 'Leaning Tower of Pisa · 比萨斜塔',
    description: '始建于 1173 年，以独特倾斜结构闻名世界。',
    modelPath: '/models/leaning_tower_of_pisa.glb',
    position: lngLatToWorld(10.3963, 43.723),
    rotation: [0, -Math.PI * 0.2, 0],
    scale: 7.2,
    triggerRadius: 16,
  },
];

export const mockRoutePoints = [
  [-52, 0, 46],
  [-34, 0, 34],
  [landmarks[0].position[0] - 10, 0, landmarks[0].position[2] + 18],
  [landmarks[0].position[0], 0, landmarks[0].position[2] + 2],
  [-8, 0, 0],
  [landmarks[1].position[0] + 10, 0, landmarks[1].position[2] + 12],
  [landmarks[1].position[0], 0, landmarks[1].position[2] + 1],
  [-42, 0, -36],
];

export const roadPoints = mockRoutePoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));
export const roadCurve = new THREE.CatmullRomCurve3(roadPoints, false, 'catmullrom', 0.2);
export const WORLD_SIZE_UNITS = WORLD_SIZE;
