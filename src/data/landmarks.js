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

export function lngLatToWorld(lon, lat) {
  const tx = (lon - LON_MIN) / (LON_MAX - LON_MIN);
  const tz = 1 - (mercY(lat) - MERC_Y_MIN) / (MERC_Y_MAX - MERC_Y_MIN);
  return [(tx - 0.5) * WORLD_SIZE, 0, (tz - 0.5) * WORLD_SIZE];
}

export const landmarks = [
  {
    id: 'colosseum',
    name: 'Colosseum / 罗马斗兽场',
    description: '古罗马时期最具代表性的圆形竞技场之一，也是罗马城市记忆和帝国建筑尺度的象征。',
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
    name: 'Leaning Tower of Pisa / 比萨斜塔',
    description: '始建于 1173 年的中世纪钟楼，以独特的倾斜结构和广场空间闻名。',
    modelPath: '/models/leaning_tower_of_pisa.glb',
    lon: 10.3963,
    lat: 43.723,
    position: lngLatToWorld(10.3963, 43.723),
    rotation: [0, -Math.PI * 0.2, 0],
    scale: 7.2,
    triggerRadius: 15,
    modelKind: 'tower',
  },
  {
    id: 'florence_duomo',
    name: 'Florence Duomo / 佛罗伦萨圣母百花大教堂',
    description: '佛罗伦萨城市天际线的核心，由红色穹顶、钟楼与文艺复兴街区共同构成强烈的城市记忆。',
    modelPath: null,
    lon: 11.2558,
    lat: 43.7731,
    position: lngLatToWorld(11.2558, 43.7731),
    rotation: [0, Math.PI * 0.08, 0],
    scale: 6.8,
    triggerRadius: 14,
    modelKind: 'dome',
  },
  {
    id: 'venice_rialto',
    name: 'Rialto Bridge / 威尼斯里亚托桥',
    description: '横跨大运河的经典桥梁节点，适合观察水上交通、窄巷和商业街区的空间关系。',
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
    name: 'Milan Cathedral / 米兰大教堂',
    description: '哥特式立面、尖塔群与广场尺度共同构成米兰最具识别度的城市中心。',
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
    name: 'Pompeii Archaeological Park / 庞贝古城遗址',
    description: '保存完整的古城街道、住宅与公共空间，适合作为理解古罗马日常城市结构的沉浸式停靠点。',
    modelPath: null,
    lon: 14.487,
    lat: 40.748,
    position: lngLatToWorld(14.487, 40.748),
    rotation: [0, -Math.PI * 0.18, 0],
    scale: 6.4,
    triggerRadius: 15,
    modelKind: 'ruins',
  },
];

export const WORLD_SIZE_UNITS = WORLD_SIZE;
