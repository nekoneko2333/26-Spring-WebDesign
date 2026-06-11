import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_FILE = path.resolve(process.env.LANDMARK_DATA_FILE ?? path.join(ROOT, 'public', 'data', 'live-landmarks.json'));

const CITY_BOXES = [
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

const CATEGORY_RULES = [
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

const CATEGORY_LABELS = {
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

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function localized(en = null, zh = null) {
  return { en: en || null, zh: zh || null };
}

function findCity(lat, lon) {
  return CITY_BOXES.find((box) => (
    lat >= box.latMin && lat <= box.latMax && lon >= box.lonMin && lon <= box.lonMax
  ));
}

function broadRegion(lat) {
  if (lat > 44.2) return localized('Northern Italy', '意大利北部');
  if (lat > 41.0) return localized('Central Italy', '意大利中部');
  if (lat > 39.0) return localized('Southern Italy', '意大利南部');
  return localized('Islands', '意大利岛屿');
}

function classify(item) {
  const haystack = [
    item.category,
    item.name?.en,
    item.name?.zh,
    item.wikipedia?.en?.title,
    item.wikipedia?.zh?.title,
    ...(item.wikidata?.instanceLabels ?? []),
    ...(item.search?.tags?.en ?? []),
    ...(item.search?.tags?.zh ?? []),
  ].map(text).join(' ');
  const match = CATEGORY_RULES.find(([, pattern]) => pattern.test(haystack));
  return match?.[0] ?? item.category ?? 'monument';
}

function unique(values) {
  return [...new Set(values.map(text).filter(Boolean))];
}

const payload = JSON.parse(await readFile(DATA_FILE, 'utf8'));
let cityCount = 0;
let categoryCount = 0;

payload.items = (payload.items ?? []).map((item) => {
  const lat = Number(item.coordinates?.lat);
  const lon = Number(item.coordinates?.lon);
  const location = item.location ?? {};
  const city = Number.isFinite(lat) && Number.isFinite(lon) ? findCity(lat, lon) : null;
  const category = classify(item);
  const labels = CATEGORY_LABELS[category] ?? CATEGORY_LABELS.monument;
  const nextLocation = {
    ...location,
    country: location.country ?? localized('Italy', '意大利'),
    region: city ? localized(city.regionEn, city.regionZh) : (location.region ?? broadRegion(lat)),
    province: city ? localized(city.provinceEn, city.provinceZh) : (location.province ?? localized(null, null)),
    city: city ? localized(city.en, city.zh) : (location.city ?? localized(null, null)),
  };
  if (city) cityCount += 1;
  if (category !== item.category) categoryCount += 1;
  return {
    ...item,
    category,
    location: nextLocation,
    search: {
      ...(item.search ?? {}),
      aliases: item.search?.aliases ?? { en: unique([item.name?.en]), zh: unique([item.name?.zh]) },
      tags: {
        en: unique([...(item.search?.tags?.en ?? []), labels[0], city?.en, city?.provinceEn, city?.regionEn, 'Italy']),
        zh: unique([...(item.search?.tags?.zh ?? []), labels[1], city?.zh, city?.provinceZh, city?.regionZh, '意大利']),
      },
    },
  };
});

payload.catalog = {
  ...(payload.catalog ?? {}),
  metadataPolicy: 'City and category tags are deterministic cleanup from coordinates, sourced titles, and existing categories; unknown visitor fields remain null.',
};

await writeFile(DATA_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Enriched ${payload.items.length} landmarks; city matches=${cityCount}; category updates=${categoryCount}; file=${DATA_FILE}`);
