import liveLandmarksData from '../../public/data/live-landmarks.json';

export const MAP_BOUNDS = {
  lonMin: 6.6,
  lonMax: 18.5,
  latMin: 36.6,
  latMax: 47.1,
  worldWidth: 132,
  worldSize: 170,
};

// The Italy map spans roughly 1,200 km north-to-south and 990 km east-to-west.
// A single scene unit therefore represents about 7.1 km on the ground.
export const WORLD_METERS_PER_UNIT = 7100;

export function worldUnitsFromMeters(meters) {
  return meters / WORLD_METERS_PER_UNIT;
}

function mercY(lat) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

const MERC_Y_MIN = mercY(MAP_BOUNDS.latMin);
const MERC_Y_MAX = mercY(MAP_BOUNDS.latMax);

export function lngLatToWorld(lon, lat) {
  const tx = (lon - MAP_BOUNDS.lonMin) / (MAP_BOUNDS.lonMax - MAP_BOUNDS.lonMin);
  const tz = 1 - (mercY(lat) - MERC_Y_MIN) / (MERC_Y_MAX - MERC_Y_MIN);
  return [(tx - 0.5) * MAP_BOUNDS.worldWidth, 0, (tz - 0.5) * MAP_BOUNDS.worldSize];
}

export function worldToLngLat(worldX, worldZ) {
  const tx = worldX / MAP_BOUNDS.worldWidth + 0.5;
  const tz = worldZ / MAP_BOUNDS.worldSize + 0.5;
  const lon = MAP_BOUNDS.lonMin + tx * (MAP_BOUNDS.lonMax - MAP_BOUNDS.lonMin);
  const merc = MERC_Y_MIN + (1 - tz) * (MERC_Y_MAX - MERC_Y_MIN);
  const lat = (Math.atan(Math.sinh(merc)) * 180) / Math.PI;
  return { lon, lat };
}

function makeLandmark({
  id,
  name,
  description,
  lon,
  lat,
  modelKind = 'monument',
  scale = 5.8,
  triggerRadius = 13,
  rotationY = 0,
}) {
  return {
    id,
    name,
    description,
    modelPath: null,
    lon,
    lat,
    position: lngLatToWorld(lon, lat),
    rotation: [0, rotationY, 0],
    scale,
    triggerRadius,
    modelKind,
  };
}

const baseLandmarks = [
  {
    id: 'colosseum',
    name: 'Colosseum',
    description: 'Ancient Roman amphitheatre in the center of Rome.',
    modelPath: '/models/romes_colosseum.glb',
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
    modelPath: '/models/pisas_tower.glb',
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
  makeLandmark({
    id: 'pantheon_rome',
    name: 'Pantheon',
    description: 'Ancient Roman temple and domed church in central Rome.',
    lon: 12.4768,
    lat: 41.8986,
    modelKind: 'dome',
    scale: 6.4,
  }),
  makeLandmark({
    id: 'trevi_fountain',
    name: 'Trevi Fountain',
    description: 'Baroque fountain and urban landmark in Rome.',
    lon: 12.4833,
    lat: 41.9009,
    modelKind: 'fountain',
    scale: 5.5,
  }),
  makeLandmark({
    id: 'roman_forum',
    name: 'Roman Forum',
    description: 'Archaeological area at the center of ancient Rome.',
    lon: 12.4853,
    lat: 41.8925,
    modelKind: 'ruins',
    scale: 6.2,
  }),
  makeLandmark({
    id: 'uffizi_gallery',
    name: 'Uffizi Gallery',
    description: 'Major Renaissance art museum in Florence.',
    lon: 11.2553,
    lat: 43.7687,
    modelKind: 'palace',
    scale: 5.8,
  }),
  makeLandmark({
    id: 'siena_cathedral',
    name: 'Siena Cathedral',
    description: 'Medieval cathedral with marble facade and striped interior.',
    lon: 11.3287,
    lat: 43.3177,
    modelKind: 'cathedral',
    scale: 6.2,
  }),
  makeLandmark({
    id: 'verona_arena',
    name: 'Verona Arena',
    description: 'Roman amphitheatre still used for performances.',
    lon: 10.9944,
    lat: 45.4386,
    modelKind: 'arena',
    scale: 6.2,
  }),
  makeLandmark({
    id: 'st_marks_basilica',
    name: "St Mark's Basilica",
    description: 'Byzantine and Gothic basilica on Piazza San Marco in Venice.',
    lon: 12.3397,
    lat: 45.4345,
    modelKind: 'cathedral',
    scale: 6.5,
  }),
  makeLandmark({
    id: 'doges_palace',
    name: "Doge's Palace",
    description: 'Gothic palace and former seat of Venetian government.',
    lon: 12.3404,
    lat: 45.4337,
    modelKind: 'palace',
    scale: 6,
  }),
  makeLandmark({
    id: 'cinque_terre',
    name: 'Cinque Terre',
    description: 'Coastal villages and terraced landscape on the Ligurian coast.',
    lon: 9.7089,
    lat: 44.1461,
    modelKind: 'coast',
    scale: 5.8,
  }),
  makeLandmark({
    id: 'lake_como',
    name: 'Lake Como',
    description: 'Alpine lake landscape with historic villas and towns.',
    lon: 9.2572,
    lat: 45.9871,
    modelKind: 'lake',
    scale: 6,
  }),
  makeLandmark({
    id: 'mole_antonelliana',
    name: 'Mole Antonelliana',
    description: 'Tall historic tower and landmark of Turin.',
    lon: 7.6931,
    lat: 45.0691,
    modelKind: 'tower',
    scale: 6.8,
  }),
  makeLandmark({
    id: 'san_vitale_ravenna',
    name: 'Basilica of San Vitale',
    description: 'Ravenna basilica known for Byzantine mosaics.',
    lon: 12.1964,
    lat: 44.4208,
    modelKind: 'dome',
    scale: 5.8,
  }),
  makeLandmark({
    id: 'assisi_basilica',
    name: 'Basilica of Saint Francis of Assisi',
    description: 'Franciscan basilica and pilgrimage landmark in Umbria.',
    lon: 12.6264,
    lat: 43.0747,
    modelKind: 'cathedral',
    scale: 6.1,
  }),
  makeLandmark({
    id: 'caserta_palace',
    name: 'Royal Palace of Caserta',
    description: 'Large Bourbon royal palace and garden complex near Naples.',
    lon: 14.3275,
    lat: 41.0731,
    modelKind: 'palace',
    scale: 6.4,
  }),
  makeLandmark({
    id: 'herculaneum',
    name: 'Herculaneum',
    description: 'Ancient Roman town preserved by the eruption of Mount Vesuvius.',
    lon: 14.3487,
    lat: 40.8059,
    modelKind: 'ruins',
    scale: 5.9,
  }),
  makeLandmark({
    id: 'paestum',
    name: 'Paestum',
    description: 'Greek temples and archaeological site in Campania.',
    lon: 15.0059,
    lat: 40.4197,
    modelKind: 'temple',
    scale: 6.1,
  }),
  makeLandmark({
    id: 'matera_sassi',
    name: 'Sassi di Matera',
    description: 'Historic cave dwellings and stone urban landscape in Matera.',
    lon: 16.6106,
    lat: 40.6664,
    modelKind: 'ruins',
    scale: 5.8,
  }),
  makeLandmark({
    id: 'alberobello_trulli',
    name: 'Trulli of Alberobello',
    description: 'Dry-stone conical-roof houses in Apulia.',
    lon: 17.2365,
    lat: 40.7829,
    modelKind: 'village',
    scale: 5.7,
  }),
  makeLandmark({
    id: 'castel_del_monte',
    name: 'Castel del Monte',
    description: 'Octagonal medieval castle in Apulia.',
    lon: 16.2707,
    lat: 41.0847,
    modelKind: 'castle',
    scale: 6.1,
  }),
  makeLandmark({
    id: 'amalfi_coast',
    name: 'Amalfi Coast',
    description: 'Cliffside coastal landscape and historic towns in Campania.',
    lon: 14.6027,
    lat: 40.634,
    modelKind: 'coast',
    scale: 5.8,
  }),
  makeLandmark({
    id: 'valley_of_temples',
    name: 'Valley of the Temples',
    description: 'Ancient Greek temple landscape in Agrigento, Sicily.',
    lon: 13.5933,
    lat: 37.2894,
    modelKind: 'temple',
    scale: 6.2,
  }),
  makeLandmark({
    id: 'mount_etna',
    name: 'Mount Etna',
    description: 'Active volcano and mountain landscape in eastern Sicily.',
    lon: 14.9958,
    lat: 37.751,
    modelKind: 'mountain',
    scale: 6.6,
  }),
  makeLandmark({
    id: 'palermo_cathedral',
    name: 'Palermo Cathedral',
    description: 'Cathedral complex combining Norman, Gothic, and later styles.',
    lon: 13.3564,
    lat: 38.1144,
    modelKind: 'cathedral',
    scale: 6,
  }),
  makeLandmark({
    id: 'nuraghe_su_nuraxi',
    name: 'Su Nuraxi di Barumini',
    description: 'Bronze Age nuragic archaeological site in Sardinia.',
    lon: 8.9918,
    lat: 39.7056,
    modelKind: 'ruins',
    scale: 5.8,
  }),
];

const baseLandmarkIndex = new Map(baseLandmarks.map((landmark) => [landmark.id, landmark]));
const liveLandmarkIds = new Set((liveLandmarksData.items ?? []).map((item) => item.id));

const cityBoxes = [
  { en: 'Rome', zh: '罗马', provinceEn: 'Lazio', provinceZh: '拉齐奥', regionEn: 'Central Italy', regionZh: '意大利中部', latMin: 41.75, latMax: 42.05, lonMin: 12.30, lonMax: 12.70 },
  { en: 'Milan', zh: '米兰', provinceEn: 'Lombardy', provinceZh: '伦巴第', regionEn: 'Northern Italy', regionZh: '意大利北部', latMin: 45.35, latMax: 45.58, lonMin: 9.05, lonMax: 9.35 },
  { en: 'Venice', zh: '威尼斯', provinceEn: 'Veneto', provinceZh: '威尼托', regionEn: 'Northern Italy', regionZh: '意大利北部', latMin: 45.34, latMax: 45.55, lonMin: 12.20, lonMax: 12.45 },
  { en: 'Florence', zh: '佛罗伦萨', provinceEn: 'Tuscany', provinceZh: '托斯卡纳', regionEn: 'Central Italy', regionZh: '意大利中部', latMin: 43.68, latMax: 43.86, lonMin: 11.15, lonMax: 11.35 },
  { en: 'Naples', zh: '那不勒斯', provinceEn: 'Campania', provinceZh: '坎帕尼亚', regionEn: 'Southern Italy', regionZh: '意大利南部', latMin: 40.75, latMax: 40.95, lonMin: 14.15, lonMax: 14.35 },
  { en: 'Turin', zh: '都灵', provinceEn: 'Piedmont', provinceZh: '皮埃蒙特', regionEn: 'Northern Italy', regionZh: '意大利北部', latMin: 45.00, latMax: 45.15, lonMin: 7.55, lonMax: 7.80 },
  { en: 'Bologna', zh: '博洛尼亚', provinceEn: 'Emilia-Romagna', provinceZh: '艾米利亚-罗马涅', regionEn: 'Northern Italy', regionZh: '意大利北部', latMin: 44.42, latMax: 44.57, lonMin: 11.25, lonMax: 11.45 },
  { en: 'Verona', zh: '维罗纳', provinceEn: 'Veneto', provinceZh: '威尼托', regionEn: 'Northern Italy', regionZh: '意大利北部', latMin: 45.37, latMax: 45.50, lonMin: 10.88, lonMax: 11.08 },
  { en: 'Pisa', zh: '比萨', provinceEn: 'Tuscany', provinceZh: '托斯卡纳', regionEn: 'Central Italy', regionZh: '意大利中部', latMin: 43.65, latMax: 43.76, lonMin: 10.32, lonMax: 10.47 },
  { en: 'Siena', zh: '锡耶纳', provinceEn: 'Tuscany', provinceZh: '托斯卡纳', regionEn: 'Central Italy', regionZh: '意大利中部', latMin: 43.25, latMax: 43.36, lonMin: 11.25, lonMax: 11.40 },
  { en: 'Palermo', zh: '巴勒莫', provinceEn: 'Sicily', provinceZh: '西西里', regionEn: 'Islands', regionZh: '意大利岛屿', latMin: 38.05, latMax: 38.20, lonMin: 13.25, lonMax: 13.45 },
  { en: 'Genoa', zh: '热那亚', provinceEn: 'Liguria', provinceZh: '利古里亚', regionEn: 'Northern Italy', regionZh: '意大利北部', latMin: 44.35, latMax: 44.48, lonMin: 8.80, lonMax: 9.05 },
  { en: 'Pompeii', zh: '庞贝', provinceEn: 'Campania', provinceZh: '坎帕尼亚', regionEn: 'Southern Italy', regionZh: '意大利南部', latMin: 40.70, latMax: 40.78, lonMin: 14.43, lonMax: 14.55 },
];

const categoryRules = [
  ['cathedral', /cathedral|duomo|basilica|church|abbey|chapel|主教座堂|大教堂|圣殿|教堂/iu],
  ['museum', /museum|gallery|galleria|pinacoteca|museo|博物馆|美术馆|画廊/iu],
  ['palace', /palace|palazzo|villa|宫|宫殿|别墅/iu],
  ['castle', /castle|fortress|castello|fort|城堡|要塞/iu],
  ['ruins', /archaeological|ruins|forum|pompeii|scavi|遗址|古迹|考古/iu],
  ['arena', /arena|amphitheatre|amphitheater|colosseum|竞技场|斗兽场/iu],
  ['bridge', /bridge|ponte|桥/iu],
  ['fountain', /fountain|fontana|喷泉/iu],
  ['tower', /tower|campanile|torre|塔|钟楼/iu],
  ['park', /park|garden|giardino|公园|花园/iu],
  ['mountain', /mount|mountain|etna|vesuvius|山|火山/iu],
  ['lake', /lake|lago|湖/iu],
  ['coast', /coast|island|beach|capri|amalfi|海岸|岛|海滩/iu],
  ['theatre', /theatre|theater|teatro|剧院/iu],
  ['monument', /monument|memorial|arch|statue|纪念|拱门|雕像/iu],
];

const categoryLabels = {
  arena: ['Arena', '竞技场'],
  bridge: ['Bridge', '桥梁'],
  castle: ['Castle', '城堡'],
  cathedral: ['Cathedral', '教堂'],
  coast: ['Coast', '海岸'],
  fountain: ['Fountain', '喷泉'],
  lake: ['Lake', '湖泊'],
  monument: ['Monument', '纪念地标'],
  mountain: ['Mountain', '山岳'],
  museum: ['Museum', '博物馆'],
  palace: ['Palace', '宫殿'],
  park: ['Park', '公园'],
  ruins: ['Archaeological site', '考古遗址'],
  theatre: ['Theatre', '剧院'],
  tower: ['Tower', '塔楼'],
};

function localized(en = null, zh = null) {
  return { en: en || null, zh: zh || null };
}

function uniqueText(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()))];
}

function cityFor(lat, lon) {
  return cityBoxes.find((box) => lat >= box.latMin && lat <= box.latMax && lon >= box.lonMin && lon <= box.lonMax);
}

function broadRegionFor(lat) {
  if (lat > 44.2) return localized('Northern Italy', '意大利北部');
  if (lat > 41.0) return localized('Central Italy', '意大利中部');
  if (lat > 39.0) return localized('Southern Italy', '意大利南部');
  return localized('Islands', '意大利岛屿');
}

function categoryFor(item) {
  const haystack = [
    item.category,
    item.name?.en,
    item.name?.zh,
    item.wikipedia?.en?.title,
    item.wikipedia?.zh?.title,
    ...(item.wikidata?.instanceLabels ?? []),
    ...(item.search?.tags?.en ?? []),
    ...(item.search?.tags?.zh ?? []),
  ].filter(Boolean).join(' ');
  return categoryRules.find(([, pattern]) => pattern.test(haystack))?.[0] ?? item.category ?? 'monument';
}

function enrichLiveItem(item, lon, lat) {
  const city = cityFor(lat, lon);
  const category = categoryFor(item);
  const labels = categoryLabels[category] ?? categoryLabels.monument;
  const location = item.location ?? {};
  return {
    category,
    location: {
      ...location,
      country: location.country ?? localized('Italy', '意大利'),
      region: city ? localized(city.regionEn, city.regionZh) : (location.region ?? broadRegionFor(lat)),
      province: city ? localized(city.provinceEn, city.provinceZh) : (location.province ?? localized(null, null)),
      city: city ? localized(city.en, city.zh) : (location.city ?? localized(null, null)),
    },
    search: {
      ...(item.search ?? {}),
      tags: {
        en: uniqueText([...(item.search?.tags?.en ?? []), labels[0], city?.en, city?.provinceEn, city?.regionEn, 'Italy']),
        zh: uniqueText([...(item.search?.tags?.zh ?? []), labels[1], city?.zh, city?.provinceZh, city?.regionZh, '意大利']),
      },
    },
  };
}

export const landmarks = [
  ...(liveLandmarksData.items ?? []).map((item) => {
    const existing = baseLandmarkIndex.get(item.id);
    const lon = item.coordinates.lon;
    const lat = item.coordinates.lat;
    const enriched = enrichLiveItem(item, lon, lat);

    if (existing) {
      return {
        ...existing,
        name: item.name?.en ?? existing.name,
        description: item.wikipedia?.en?.extract ?? existing.description,
        localizedNames: item.name ?? null,
        localizedDescriptions: {
          en: item.wikipedia?.en?.extract ?? existing.description,
          zh: item.wikipedia?.zh?.extract ?? item.wikipedia?.en?.extract ?? existing.description,
        },
        location: enriched.location,
        searchMeta: enriched.search,
        visitorInfo: item.visitorInfo ?? null,
        lon,
        lat,
        position: lngLatToWorld(lon, lat),
        modelKind: enriched.category ?? existing.modelKind,
      };
    }

    return {
      ...makeLandmark({
        id: item.id,
        name: item.name?.en ?? item.id,
        description: item.wikipedia?.en?.extract ?? '',
        lon,
        lat,
        modelKind: enriched.category ?? 'monument',
      }),
      localizedNames: item.name ?? null,
      localizedDescriptions: {
        en: item.wikipedia?.en?.extract ?? '',
        zh: item.wikipedia?.zh?.extract ?? item.wikipedia?.en?.extract ?? '',
      },
      location: enriched.location,
      searchMeta: enriched.search,
      visitorInfo: item.visitorInfo ?? null,
    };
  }),
  ...baseLandmarks.filter((landmark) => !liveLandmarkIds.has(landmark.id)),
];

export const WORLD_SIZE_UNITS = MAP_BOUNDS.worldSize;
