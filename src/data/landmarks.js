export const MAP_BOUNDS = {
  lonMin: 6.6,
  lonMax: 18.5,
  latMin: 36.6,
  latMax: 47.1,
  worldSize: 170,
};

function mercY(lat) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

const MERC_Y_MIN = mercY(MAP_BOUNDS.latMin);
const MERC_Y_MAX = mercY(MAP_BOUNDS.latMax);

export function lngLatToWorld(lon, lat) {
  const tx = (lon - MAP_BOUNDS.lonMin) / (MAP_BOUNDS.lonMax - MAP_BOUNDS.lonMin);
  const tz = 1 - (mercY(lat) - MERC_Y_MIN) / (MERC_Y_MAX - MERC_Y_MIN);
  return [(tx - 0.5) * MAP_BOUNDS.worldSize, 0, (tz - 0.5) * MAP_BOUNDS.worldSize];
}

export function worldToLngLat(worldX, worldZ) {
  const tx = worldX / MAP_BOUNDS.worldSize + 0.5;
  const tz = worldZ / MAP_BOUNDS.worldSize + 0.5;
  const lon = MAP_BOUNDS.lonMin + tx * (MAP_BOUNDS.lonMax - MAP_BOUNDS.lonMin);
  const merc = MERC_Y_MIN + (1 - tz) * (MERC_Y_MAX - MERC_Y_MIN);
  const lat = (Math.atan(Math.sinh(merc)) * 180) / Math.PI;
  return { lon, lat };
}

export const landmarks = [
  {
    id: 'colosseum',
    name: 'Colosseum',
    description: 'Ancient Roman amphitheatre in the center of Rome.',
    modelPath: '/models/colosseum.glb',
    lon: 12.4922,
    lat: 41.8902,
    position: lngLatToWorld(12.4922, 41.8902),
    rotation: [0, Math.PI * 0.15, 0],
    scale: 6.4,
    triggerRadius: 16,
    modelKind: 'arena',
  },
  {
    id: 'pisa',
    name: 'Leaning Tower of Pisa',
    description: 'Medieval bell tower in Pisa Cathedral Square.',
    modelPath: '/models/leaning_tower_of_pisa.glb',
    lon: 10.3966,
    lat: 43.723,
    position: lngLatToWorld(10.3966, 43.723),
    rotation: [0, -Math.PI * 0.2, 0],
    scale: 7.2,
    triggerRadius: 15,
    modelKind: 'tower',
  },
  {
    id: 'florence_duomo',
    name: 'Florence Duomo',
    description: 'Santa Maria del Fiore and Brunelleschi dome in Florence.',
    modelPath: null,
    lon: 11.256,
    lat: 43.7731,
    position: lngLatToWorld(11.256, 43.7731),
    rotation: [0, Math.PI * 0.08, 0],
    scale: 6.8,
    triggerRadius: 14,
    modelKind: 'dome',
  },
  {
    id: 'venice_rialto',
    name: 'Rialto Bridge',
    description: 'Historic bridge crossing Venice Grand Canal.',
    modelPath: null,
    lon: 12.3359,
    lat: 45.438,
    position: lngLatToWorld(12.3359, 45.438),
    rotation: [0, -Math.PI * 0.1, 0],
    scale: 6.2,
    triggerRadius: 14,
    modelKind: 'bridge',
  },
  {
    id: 'milan_duomo',
    name: 'Milan Cathedral',
    description: 'Gothic cathedral and plaza in central Milan.',
    modelPath: null,
    lon: 9.1919,
    lat: 45.4642,
    position: lngLatToWorld(9.1919, 45.4642),
    rotation: [0, Math.PI * 0.2, 0],
    scale: 7,
    triggerRadius: 15,
    modelKind: 'cathedral',
  },
  {
    id: 'pompeii',
    name: 'Pompeii Archaeological Park',
    description: 'Archaeological park preserving the ancient Roman city of Pompeii.',
    modelPath: null,
    lon: 14.4869,
    lat: 40.7497,
    position: lngLatToWorld(14.4869, 40.7497),
    rotation: [0, -Math.PI * 0.18, 0],
    scale: 6.4,
    triggerRadius: 15,
    modelKind: 'ruins',
  },
];

export const WORLD_SIZE_UNITS = MAP_BOUNDS.worldSize;
