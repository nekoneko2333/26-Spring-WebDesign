import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../state/useAppStore.js';
import { landmarks } from '../../data/landmarks.js';
import { currentRoute, routeSegments } from '../../data/routes.js';
import { travelGuide, travelLandmarkMeta } from '../../data/travelGuide.js';
import { reviewLocales } from '../../data/reviewLocales.js';
import { useRouteMetrics } from '../../hooks/useRouteMetrics.js';
import { useWeatherForLandmark } from '../../hooks/useWeather.js';
import { useWikipediaSummary } from '../../hooks/useWikipediaSummary.js';
import { useLiveLandmarkIndex } from '../../hooks/useLiveLandmarkData.js';

const homeCopy = {
  en: {
    brand: { eyebrow: 'Web3D', title: 'Italy Drive' },
    languageLabels: { en: 'English', zh: 'Chinese' },
    nav: [
      { id: 'destinations', label: 'Destinations' },
      { id: 'planner', label: 'Route Planner' },
      { id: 'reviews', label: 'Reviews' },
      { id: 'drive', label: '3D Drive' },
    ],
    search: {
      title: 'Search & plan',
      placeholder: 'Search route stops, cities, or landmarks',
      clear: 'Clear',
    },
    filters: {
      title: 'Filters',
      region: 'Region',
      type: 'Type',
      season: 'Best season',
      any: 'Any',
    },
    sort: {
      title: 'Sort',
      featured: 'Featured',
      rating: 'Rating',
      city: 'City',
    },
    actions: {
      open3d: 'Open 3D Drive',
      openV2: 'Open V2 Map',
      openV3: 'Open V3 Sketch',
      openAmsterdam: 'Open Amsterdam VR Lab',
      continue3d: 'Continue',
      export: 'Export',
      compare: 'Compare',
      favorites: 'Favorites',
      addToRoute: 'Add to route',
      optimizeRoute: 'Optimize route',
      showMore: 'Show more',
      remove: 'Remove',
      generate: 'Generate itinerary',
      resetRoute: 'Reset route',
      lock: 'Lock',
      unlock: 'Unlock',
    },
    pages: {
      destinations: {
        eyebrow: 'Destinations',
        title: 'Browse stops and build a route',
        body: 'Search, filter, compare, favorite, and add stops to your route before entering the 3D guide.',
      },
      planner: {
        eyebrow: 'Route planner',
        title: 'Edit the route, then generate a schedule',
        body: 'Reorder stops, lock must-see landmarks, and generate a day-by-day itinerary with a single click.',
      },
      reviews: {
        eyebrow: 'Reviews',
        title: 'Wikipedia summaries first, full context one click away',
        body: 'Each destination uses the Wikipedia summary API for readable background notes and source links.',
      },
      drive: {
        eyebrow: '3D drive',
        title: 'Enter the immersive drive when you are ready',
        body: 'Use the 3D explorer to preview scale, focus landmarks, and open model overlays.',
      },
    },
    destinationCta: 'Open in 3D',
    ratingLabel: 'Source score',
    routeSource: 'Planned route',
    distanceUnit: 'km',
    durationUnit: 'h',
    speedUnit: 'km/h',
    coordinateLabels: { lat: 'LAT', lon: 'LON' },
    highlights: [],
    trafficLabels: {
      free: 'Free flow',
      normal: 'Normal traffic',
      slow: 'Slow traffic',
      traffic_jam: 'Traffic jam',
    },
    segmentTypes: {
      city: 'City streets',
      motorway: 'Autostrada',
      scenic: 'Scenic road',
      mountain: 'Mountain pass',
      bridge: 'Lagoon bridge',
      tunnel: 'Mountain tunnel',
      ringRoad: 'Rome ring road',
    },
    segmentDescriptions: {
      milan_city: 'dense historic arrival',
      a4_lombardy: 'long northern autostrada corridor',
      venice_lagoon: 'lagoon approach on an elevated deck',
      veneto_emilia: 'flat motorway between Veneto and Emilia',
      apennine_crossing: 'broad mountain-grade climb',
      apennine_tunnel: 'simplified tunnel descent toward Florence',
      tuscany_west: 'rolling Tuscan primary road',
      tuscany_to_rome: 'long scenic countryside transfer',
      rome_arrival: 'busy metropolitan approach',
      a1_campania: 'southbound motorway run',
      pompeii_arrival: 'urban arrival near the ruins',
    },
    routeLabels: {
      source: 'Source',
      distance: 'Distance',
      duration: 'Duration',
      points: 'Route points',
      speed: 'Speed',
      traffic: 'Traffic',
      layer: 'Layer',
      roadType: 'Road type',
    },
    itinerary: {
      days: 'Days',
      pace: 'Pace',
      relaxed: 'Relaxed',
      standard: 'Standard',
      fast: 'Fast',
    },
  },
  zh: {
    brand: { eyebrow: 'Web3D', title: '意大利行车导览' },
    languageLabels: { en: '英文', zh: '中文' },
    nav: [
      { id: 'destinations', label: '目的地' },
      { id: 'planner', label: '路线规划' },
      { id: 'reviews', label: '评价' },
      { id: 'drive', label: '3D 导览' },
    ],
    search: {
      title: '搜索与规划',
      placeholder: '搜索当前路线、城市或地标',
      clear: '清空',
    },
    filters: {
      title: '筛选',
      region: '区域',
      type: '类型',
      season: '最佳时间',
      any: '不限',
    },
    sort: {
      title: '排序',
      featured: '推荐',
      rating: '评分',
      city: '城市',
    },
    actions: {
      open3d: '进入 3D 导览',
      openV2: '打开 V2 地图',
      openV3: '打开 V3 示意',
      continue3d: '继续导览',
      export: '导出',
      compare: '对比',
      favorites: '收藏',
      addToRoute: '加入路线',
      optimizeRoute: '优化路线',
      showMore: '查看更多',
      remove: '移除',
      generate: '生成行程',
      resetRoute: '重置路线',
      lock: '锁定',
      unlock: '解锁',
    },
    pages: {
      destinations: {
        eyebrow: '目的地',
        title: '浏览景点并构建路线',
        body: '搜索、筛选、对比、收藏，并把景点加入路线后再进入 3D 导览。',
      },
      planner: {
        eyebrow: '路线规划',
        title: '编辑路线，一键生成每日行程',
        body: '调整顺序、锁定必去点，并按天数与强度生成一个清晰的行程方案。',
      },
      reviews: {
        eyebrow: '评价',
        title: '先看 Wikipedia 摘要，再看来源页面',
        body: '每个目的地都读取 Wikipedia 摘要接口，展示可追溯的背景资料与来源链接。',
      },
      drive: {
        eyebrow: '3D 导览',
        title: '准备好就进入沉浸式驾驶',
        body: '用 3D 探索器预览空间尺度、聚焦地标，并打开模型详情。',
      },
    },
    destinationCta: '进入 3D',
    ratingLabel: '来源评分',
    routeSource: '规划路线',
    distanceUnit: 'km',
    durationUnit: 'h',
    speedUnit: 'km/h',
    coordinateLabels: { lat: '纬度', lon: '经度' },
    highlights: [],
    trafficLabels: {
      free: '畅通',
      normal: '正常',
      slow: '缓行',
      traffic_jam: '拥堵',
    },
    segmentTypes: {
      city: '城市街道',
      motorway: '高速公路',
      scenic: '风景道路',
      mountain: '山地路段',
      bridge: '泻湖桥梁',
      tunnel: '山地隧道',
      ringRoad: '罗马环路',
    },
    segmentDescriptions: {
      milan_city: '进入历史城区的密集街道',
      a4_lombardy: '北部主高速走廊',
      venice_lagoon: '接近泻湖区域的桥面路段',
      veneto_emilia: '威尼托与艾米利亚之间的平直高速',
      apennine_crossing: '跨越亚平宁山脉的爬坡路段',
      apennine_tunnel: '向佛罗伦萨方向的隧道与下坡',
      tuscany_west: '托斯卡纳起伏的主干道',
      tuscany_to_rome: '穿过乡野景观的长距离转场',
      rome_arrival: '繁忙的都会抵达段',
      a1_campania: '向南的高速通行',
      pompeii_arrival: '靠近遗址的城市抵达段',
    },
    routeLabels: {
      source: '来源',
      distance: '距离',
      duration: '时长',
      points: '路线点',
      speed: '限速',
      traffic: '交通',
      layer: '图层',
      roadType: '道路类型',
    },
    itinerary: {
      days: '天数',
      pace: '强度',
      relaxed: '轻松',
      standard: '标准',
      fast: '特种兵',
    },
  },
};

function getLandmarkDisplayName(landmark, language) {
  const meta = travelLandmarkMeta[landmark.id];
  return meta?.name?.[language] ?? landmark.name;
}

function getLiveSummary(liveLandmark, language) {
  return liveLandmark?.wikipedia?.[language]?.extract || (language === 'en' ? liveLandmark?.wikipedia?.en?.extract : '') || '';
}

function getLiveImage(liveLandmark, language) {
  return liveLandmark?.wikipedia?.[language]?.thumbnail || liveLandmark?.wikipedia?.en?.thumbnail || liveLandmark?.wikidata?.image || '';
}

function getLivePageUrl(liveLandmark, language) {
  return liveLandmark?.wikipedia?.[language]?.pageUrl || liveLandmark?.wikipedia?.en?.pageUrl || liveLandmark?.wikidata?.source || '';
}

function getSegmentDisplay(segment, pageCopy) {
  return {
    type: pageCopy.segmentTypes[segment.type] ?? segment.profile.label,
    traffic: pageCopy.trafficLabels[segment.trafficState] ?? segment.trafficState,
    description: pageCopy.segmentDescriptions[segment.id] ?? segment.description,
  };
}

function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore persistence failures
    }
  }, [key, state]);

  return [state, setState];
}

function buildKeywordTags(text, language) {
  const stopWordsEn = new Set(['the', 'a', 'an', 'and', 'to', 'of', 'in', 'for', 'with', 'is', 'are', 'as', 'at', 'on', 'it', 'this', 'that']);
  const normalized = String(text ?? '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff\s]/g, ' ');
  if (language === 'zh') {
    const candidates = normalized.replace(/\s+/g, '').split('');
    const freq = new Map();
    for (const char of candidates) {
      if (!/[\u4e00-\u9fff]/.test(char)) continue;
      freq.set(char, (freq.get(char) ?? 0) + 1);
    }
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  }

  const words = normalized.split(/\s+/g).filter(Boolean).filter((w) => w.length >= 4 && !stopWordsEn.has(w));
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const c = 2 * Math.asin(Math.sqrt((sinDLat ** 2) + Math.cos(lat1) * Math.cos(lat2) * (sinDLon ** 2)));
  return R * c;
}

const ROUTE_MAP_BOUNDS = {
  lonMin: 6.2,
  lonMax: 18.8,
  latMin: 36.4,
  latMax: 46.5,
};

const ITALY_TRANSPORT_NETWORK = [
  [[9.19, 45.46], [10.99, 45.44], [11.88, 45.41], [12.23, 45.49]],
  [[10.99, 45.44], [11.34, 44.49], [11.25, 43.77], [12.48, 41.91], [14.33, 41.07], [14.49, 40.75]],
  [[11.25, 43.77], [10.40, 43.72], [9.71, 44.15]],
  [[14.49, 40.75], [15.01, 40.42], [16.61, 40.67], [17.24, 40.78]],
  [[14.49, 40.75], [14.60, 40.63], [14.35, 40.81], [14.33, 41.07]],
  [[13.36, 38.11], [13.59, 37.29], [15.00, 37.75]],
  [[7.69, 45.07], [9.19, 45.46], [9.26, 45.99]],
];

const ITALY_MAINLAND_POLYGON = [
  [7.5, 44.1], [7.7, 45.1], [8.6, 45.7], [10.2, 46.2], [12.2, 46.0], [13.6, 45.7], [13.9, 44.8],
  [13.2, 43.9], [13.0, 43.1], [13.8, 42.6], [14.5, 42.0], [15.0, 41.2], [16.2, 41.9], [18.2, 40.7],
  [18.5, 39.9], [17.5, 40.1], [16.8, 39.5], [17.2, 38.9], [16.6, 38.7], [16.0, 39.2], [15.6, 40.0],
  [14.8, 40.6], [14.1, 40.9], [13.4, 41.3], [12.6, 41.7], [12.0, 42.5], [11.3, 43.4], [10.3, 43.9],
  [9.3, 44.2], [8.5, 44.4], [7.8, 44.5],
];
const SARDINIA_POLYGON = [
  [8.2, 41.2], [9.0, 41.2], [9.6, 40.6], [9.7, 39.7], [9.4, 38.9], [8.7, 38.6], [8.2, 39.1], [8.0, 40.0],
];
const SICILY_POLYGON = [
  [12.4, 38.1], [13.4, 38.2], [15.1, 37.9], [15.7, 37.3], [14.8, 36.8], [13.4, 37.0], [12.5, 37.5],
];

function lngLatToMapPoint(lon, lat) {
  const x = ((lon - ROUTE_MAP_BOUNDS.lonMin) / (ROUTE_MAP_BOUNDS.lonMax - ROUTE_MAP_BOUNDS.lonMin)) * 100;
  const y = (1 - ((lat - ROUTE_MAP_BOUNDS.latMin) / (ROUTE_MAP_BOUNDS.latMax - ROUTE_MAP_BOUNDS.latMin))) * 100;
  return {
    x: Math.min(96, Math.max(4, x)),
    y: Math.min(96, Math.max(4, y)),
  };
}

function lngLatToSvgPoint(lon, lat) {
  const point = lngLatToMapPoint(lon, lat);
  return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
}

function polygonToSvgPath(points) {
  return points
    .map(([lon, lat], index) => {
      const point = lngLatToMapPoint(lon, lat);
      return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(' ')
    .concat(' Z');
}

function optimizeRouteOrder(routeIds, lockedIds) {
  const locked = new Set(lockedIds);
  const next = [...routeIds];
  let chunkStart = 0;

  while (chunkStart < next.length) {
    while (chunkStart < next.length && locked.has(next[chunkStart])) chunkStart += 1;
    let chunkEnd = chunkStart;
    while (chunkEnd < next.length && !locked.has(next[chunkEnd])) chunkEnd += 1;
    if (chunkEnd - chunkStart > 2) {
      const before = next[chunkStart - 1] ?? null;
      const optimized = nearestNeighborChunk(next.slice(chunkStart, chunkEnd), before);
      next.splice(chunkStart, optimized.length, ...optimized);
    }
    chunkStart = chunkEnd + 1;
  }

  return next;
}

function nearestNeighborChunk(ids, startId = null) {
  const remaining = new Set(ids);
  const out = [];
  let cursor = startId && travelLandmarkMeta[startId] ? startId : ids[0];
  if (remaining.has(cursor)) {
    out.push(cursor);
    remaining.delete(cursor);
  }

  while (remaining.size > 0) {
    const from = travelLandmarkMeta[cursor] ?? travelLandmarkMeta[out[out.length - 1]];
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const id of remaining) {
      const to = travelLandmarkMeta[id];
      if (!from || !to) continue;
      const distance = haversineKm(from, to);
      if (distance < bestDistance) {
        best = id;
        bestDistance = distance;
      }
    }
    const nextId = best ?? remaining.values().next().value;
    out.push(nextId);
    remaining.delete(nextId);
    cursor = nextId;
  }
  return out;
}

function formatDistanceKm(value) {
  if (!Number.isFinite(value)) return '0';
  return value >= 100 ? Math.round(value).toLocaleString('en-US') : value.toFixed(1);
}

function formatDurationHours(value, language) {
  if (!Number.isFinite(value)) return language === 'zh' ? '0 小时' : '0 h';
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  if (language === 'zh') return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
}

function buildLiveHighlightCards({ language, routeIds, routeMetrics, itineraryStats }) {
  const selectedStops = routeIds
    .map((id) => landmarks.find((landmark) => landmark.id === id))
    .filter(Boolean);
  const selectedMeta = selectedStops.map((landmark) => travelLandmarkMeta[landmark.id]).filter(Boolean);
  const cities = selectedMeta.map((meta) => meta.city[language]).filter(Boolean);
  const firstCity = cities[0] ?? '-';
  const lastCity = cities[cities.length - 1] ?? '-';
  const distanceKm = routeMetrics?.distanceKm ?? itineraryStats.totalKm ?? currentRoute.distanceKm;
  const durationHours = routeMetrics?.durationHours ?? currentRoute.durationHours;
  const modelCount = selectedStops.filter((landmark) => Boolean(landmark.modelPath)).length;
  const routePointCount = currentRoute.points.length;
  const scenicSegments = routeSegments.filter((segment) => ['scenic', 'mountain', 'bridge', 'tunnel'].includes(segment.type)).length;

  if (language === 'zh') {
    return [
      {
        label: '实时路线',
        value: `${formatDistanceKm(distanceKm)} km`,
        detail: `OSRM 返回约 ${formatDurationHours(durationHours, language)}；当前路线从 ${firstCity} 到 ${lastCity}，共 ${selectedStops.length} 个停靠点。`,
      },
      {
        label: '路线结构',
        value: `${routePointCount} 个路径点`,
        detail: `路线数据包含 ${routeSegments.length} 个语义路段，其中 ${scenicSegments} 段为风景、桥梁、隧道或山地体验。`,
      },
      {
        label: '3D 资产',
        value: `${modelCount}/${selectedStops.length} 个 GLB`,
        detail: `已导入 ${modelCount} 个真实 GLB 模型；其余地标使用坐标、类型和程序化几何在场景中定位。`,
      },
    ];
  }

  return [
    {
      label: 'Live route',
      value: `${formatDistanceKm(distanceKm)} km`,
      detail: `OSRM returns about ${formatDurationHours(durationHours, language)} from ${firstCity} to ${lastCity} across ${selectedStops.length} selected stops.`,
    },
    {
      label: 'Route geometry',
      value: `${routePointCount} path points`,
      detail: `The route contains ${routeSegments.length} semantic road segments, including ${scenicSegments} scenic, bridge, tunnel, or mountain sections.`,
    },
    {
      label: '3D assets',
      value: `${modelCount}/${selectedStops.length} GLB`,
      detail: `${modelCount} imported GLB models are available; remaining landmarks are placed from coordinates, type, and procedural geometry.`,
    },
  ];
}

function makeItinerary(routeIds, days, pace) {
  const ids = routeIds.filter(Boolean);
  if (ids.length === 0) return [];
  const dayCount = Math.max(1, Math.min(7, Math.floor(days || 1)));
  const paceFactor = pace === 'fast' ? 1.4 : pace === 'relaxed' ? 0.8 : 1;

  const chunks = Array.from({ length: dayCount }, () => []);
  let index = 0;
  for (const id of ids) {
    chunks[index % dayCount].push(id);
    index += 1;
  }

  // Pull towards earlier days for fast itineraries
  if (paceFactor > 1.2) {
    for (let i = dayCount - 1; i >= 1; i -= 1) {
      if (chunks[i].length <= 1) continue;
      chunks[i - 1].push(chunks[i].shift());
    }
  }

  return chunks
    .filter((dayStops) => dayStops.length > 0)
    .map((stops, dayIndex) => ({ dayIndex: dayIndex + 1, stops }));
}

function exportTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function HomePage({ onOpenDrive, onOpenAmsterdam }) {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setActiveRouteIds = useAppStore((state) => state.setActiveRouteIds);
  const setActiveRouteGeometry = useAppStore((state) => state.setActiveRouteGeometry);
  const copy = homeCopy[language] ?? homeCopy.en;
  const guideCopy = travelGuide[language] ?? travelGuide.en;
  const reviewsCopy = reviewLocales[language] ?? reviewLocales.en;

  const [activePage, setActivePage] = useState('destinations');
  const [query, setQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState('any');
  const [filterType, setFilterType] = useState('any');
  const [filterSeason, setFilterSeason] = useState('any');
  const [sortMode, setSortMode] = useState('featured');
  const [favorites, setFavorites] = useLocalStorageState('web3d.favorites', []);
  const [routeIds, setRouteIds] = useLocalStorageState('web3d.route', currentRoute.points.map((p) => p.landmarkId).filter(Boolean));
  const [lockedIds, setLockedIds] = useLocalStorageState('web3d.routeLocks', []);
  const [compareIds, setCompareIds] = useState([]);
  const [itineraryDays, setItineraryDays] = useState(3);
  const [itineraryPace, setItineraryPace] = useState('standard');
  const [showCompare, setShowCompare] = useState(false);
  const [destinationVisibleCount, setDestinationVisibleCount] = useState(12);
  const [routeQuery, setRouteQuery] = useState('');

  const routeMetrics = useRouteMetrics(routeIds);
  const liveData = useLiveLandmarkIndex();
  const leadStopId = routeIds[0] ?? null;
  const leadWeather = useWeatherForLandmark(leadStopId);

  useEffect(() => {
    setActiveRouteIds(routeIds);
  }, [routeIds, setActiveRouteIds]);

  useEffect(() => {
    setActiveRouteGeometry({
      coordinates: routeMetrics.data?.geometryCoordinates ?? [],
      distanceKm: routeMetrics.data?.distanceKm ?? null,
    });
  }, [routeMetrics.data, setActiveRouteGeometry]);

  useEffect(() => {
    // Make navigation feel like an actual page switch.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activePage]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const lockedSet = useMemo(() => new Set(lockedIds), [lockedIds]);
  const compareSet = useMemo(() => new Set(compareIds), [compareIds]);

  const regions = useMemo(() => {
    const out = new Set();
    for (const landmark of landmarks) out.add(travelLandmarkMeta[landmark.id]?.region?.[language] ?? '');
    return [...out].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [language]);

  const types = useMemo(() => {
    const out = new Set();
    for (const landmark of landmarks) out.add(travelLandmarkMeta[landmark.id]?.type?.[language] ?? '');
    return [...out].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [language]);

  const seasons = useMemo(() => {
    const out = new Set();
    for (const landmark of landmarks) out.add(travelLandmarkMeta[landmark.id]?.season?.[language] ?? '');
    return [...out].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [language]);

  const ratings = useMemo(() => {
    const out = new Map();
    for (const landmark of landmarks) {
      const localeReviews = reviewsCopy.landmarks[landmark.id] ?? [];
      const avg = localeReviews.length
        ? (localeReviews.map((r) => Number(r.score)).filter(Number.isFinite).reduce((s, v) => s + v, 0) / localeReviews.length)
        : 4.7;
      out.set(landmark.id, Number(avg.toFixed(2)));
    }
    return out;
  }, [reviewsCopy]);

  const filteredLandmarks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const results = landmarks.filter((landmark) => {
      const meta = travelLandmarkMeta[landmark.id];
      const name = getLandmarkDisplayName(landmark, language);
      const city = meta?.city?.[language] ?? '';
      const region = meta?.region?.[language] ?? '';
      const type = meta?.type?.[language] ?? '';
      const season = meta?.season?.[language] ?? '';

      const matchesQuery = q.length === 0
        || name.toLowerCase().includes(q)
        || city.toLowerCase().includes(q)
        || region.toLowerCase().includes(q);
      const matchesRegion = filterRegion === 'any' || region === filterRegion;
      const matchesType = filterType === 'any' || type === filterType;
      const matchesSeason = filterSeason === 'any' || season === filterSeason;
      return matchesQuery && matchesRegion && matchesType && matchesSeason;
    });

    const sorted = [...results];
    if (sortMode === 'rating') {
      sorted.sort((a, b) => (ratings.get(b.id) ?? 0) - (ratings.get(a.id) ?? 0));
    } else if (sortMode === 'city') {
      sorted.sort((a, b) => {
        const ac = travelLandmarkMeta[a.id]?.city?.[language] ?? a.name;
        const bc = travelLandmarkMeta[b.id]?.city?.[language] ?? b.name;
        return ac.localeCompare(bc);
      });
    }
    return sorted;
  }, [filterRegion, filterSeason, filterType, language, query, ratings, sortMode]);

  const hasActiveDestinationSearch = query.trim().length > 0
    || filterRegion !== 'any'
    || filterType !== 'any'
    || filterSeason !== 'any';

  useEffect(() => {
    setDestinationVisibleCount(12);
  }, [filterRegion, filterSeason, filterType, query, sortMode]);

  const visibleLandmarks = useMemo(() => (
    hasActiveDestinationSearch ? filteredLandmarks : filteredLandmarks.slice(0, destinationVisibleCount)
  ), [destinationVisibleCount, filteredLandmarks, hasActiveDestinationSearch]);

  const routeSearchResults = useMemo(() => {
    const q = routeQuery.trim().toLowerCase();
    if (!q) return landmarks.filter((landmark) => !routeIds.includes(landmark.id)).slice(0, 8);
    return landmarks
      .filter((landmark) => {
        if (routeIds.includes(landmark.id)) return false;
        const meta = travelLandmarkMeta[landmark.id];
        const name = getLandmarkDisplayName(landmark, language);
        return name.toLowerCase().includes(q)
          || (meta?.city?.[language] ?? '').toLowerCase().includes(q)
          || (meta?.region?.[language] ?? '').toLowerCase().includes(q)
          || (meta?.type?.[language] ?? '').toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [language, routeIds, routeQuery]);

  const toggleFavorite = useCallback((id) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, [setFavorites]);

  const addToRoute = useCallback((id) => {
    setRouteIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, [setRouteIds]);

  const removeFromRoute = useCallback((id) => {
    setRouteIds((prev) => prev.filter((x) => x !== id));
    setLockedIds((prev) => prev.filter((x) => x !== id));
  }, [setLockedIds, setRouteIds]);

  const moveRoute = useCallback((id, direction) => {
    setRouteIds((prev) => {
      const index = prev.indexOf(id);
      if (index === -1) return prev;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;

      // Do not move across locked stops (keeps must-see anchored).
      if (lockedSet.has(id)) return prev;
      if (lockedSet.has(prev[nextIndex])) return prev;

      const next = [...prev];
      next.splice(index, 1);
      next.splice(nextIndex, 0, id);
      return next;
    });
  }, [lockedSet, setRouteIds]);

  const optimizeRoute = useCallback(() => {
    setRouteIds((prev) => optimizeRouteOrder(prev, lockedIds));
  }, [lockedIds, setRouteIds]);

  const toggleLock = useCallback((id) => {
    setLockedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, [setLockedIds]);

  const toggleCompare = useCallback((id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }, []);

  const itinerary = useMemo(() => makeItinerary(routeIds, itineraryDays, itineraryPace), [itineraryDays, itineraryPace, routeIds]);

  const itineraryStats = useMemo(() => {
    if (routeIds.length < 2) return { totalKm: 0, legs: [] };
    const legs = [];
    let total = 0;
    for (let i = 0; i < routeIds.length - 1; i += 1) {
      const a = travelLandmarkMeta[routeIds[i]];
      const b = travelLandmarkMeta[routeIds[i + 1]];
      if (!a || !b) continue;
      const dist = haversineKm(a, b);
      legs.push(dist);
      total += dist;
    }
    const totalKm = routeMetrics.data?.distanceKm ?? Number(total.toFixed(1));
    return { totalKm, legs };
  }, [routeIds, routeMetrics.data?.distanceKm]);

  const liveHighlights = useMemo(() => buildLiveHighlightCards({
    language,
    routeIds,
    routeMetrics: routeMetrics.data,
    itineraryStats,
  }), [itineraryStats, language, routeIds, routeMetrics.data]);

  const routeSearchPlaceholder = useMemo(() => {
    const cities = routeIds
      .map((id) => travelLandmarkMeta[id]?.city?.[language])
      .filter(Boolean);
    if (cities.length === 0) return copy.search.placeholder;
    const routeLabel = cities.slice(0, 4).join(' -> ');
    return language === 'zh' ? `当前路线：${routeLabel}` : `Current route: ${routeLabel}`;
  }, [copy.search.placeholder, language, routeIds]);

  const exportItinerary = useCallback(() => {
    const rows = [];
    rows.push(language === 'zh' ? '行程' : 'Itinerary');
    rows.push('');
    itinerary.forEach((day) => {
      rows.push(`${language === 'zh' ? '第' : 'Day '}${day.dayIndex}${language === 'zh' ? '天' : ''}`);
      day.stops.forEach((id) => {
        const landmark = landmarks.find((l) => l.id === id);
        if (!landmark) return;
        const meta = travelLandmarkMeta[id];
        rows.push(`- ${getLandmarkDisplayName(landmark, language)} (${meta.city[language]})`);
      });
      rows.push('');
    });
    rows.push(`${language === 'zh' ? '估算总里程' : 'Estimated total'}: ${itineraryStats.totalKm} km`);
    exportTextFile('itinerary.txt', rows.join('\n'));
  }, [itinerary, itineraryStats.totalKm, language]);

  const resetRoute = useCallback(() => {
    setRouteIds(currentRoute.points.map((p) => p.landmarkId).filter(Boolean));
    setLockedIds([]);
  }, [setLockedIds, setRouteIds]);

  const openDriveFromRoute = useCallback(() => {
    const first = routeIds[0] ?? null;
    onOpenDrive(first);
  }, [onOpenDrive, routeIds]);

  const CompareModal = CompareModalV2;
  const DestinationGrid = DestinationGridV2;

  return (
    <div className="travel-home">
      <HomeWebGLBackdrop />
      <div className="travel-ambient travel-ambient--grid" aria-hidden="true" />
      <div className="travel-ambient travel-ambient--beam" aria-hidden="true" />
      <div className="travel-ambient travel-ambient--scan" aria-hidden="true" />

      <SiteNav
        copy={copy}
        activePage={activePage}
        setActivePage={setActivePage}
        language={language}
        setLanguage={setLanguage}
        guideCopy={guideCopy}
        favoritesCount={favoriteSet.size}
        compareCount={compareSet.size}
        routeCount={routeIds.length}
        onOpenDrive={openDriveFromRoute}
        onOpenAmsterdam={onOpenAmsterdam}
      />

      {activePage === 'destinations' && (
        <header className="travel-hero">
          <div className="travel-hero__copy">
            <p className="travel-kicker">{guideCopy.hero.kicker}</p>
            <h1 className="travel-title">{guideCopy.hero.title}</h1>
            <p className="travel-summary">{guideCopy.hero.summary}</p>

            <div className="travel-hero__actions">
              <button className="travel-btn travel-btn--primary" type="button" onClick={openDriveFromRoute}>{copy.actions.open3d}</button>
              <button className="travel-btn travel-btn--ghost" type="button" onClick={() => { window.location.hash = '#/v2'; }}>{copy.actions.openV2}</button>
              <button className="travel-btn travel-btn--ghost" type="button" onClick={() => { window.location.hash = '#/v3'; }}>{copy.actions.openV3}</button>
              <button className="travel-btn travel-btn--ghost" type="button" onClick={() => setActivePage('planner')}>{guideCopy.hero.secondaryCta}</button>
              <button className="travel-btn travel-btn--ghost" type="button" onClick={onOpenAmsterdam}>{copy.actions.openAmsterdam ?? 'Amsterdam VR'}</button>
            </div>
          </div>

          <div className="travel-hero__aside">
            <SearchPanel
              copy={copy}
              query={query}
              setQuery={setQuery}
              filterRegion={filterRegion}
              setFilterRegion={setFilterRegion}
              filterType={filterType}
              setFilterType={setFilterType}
              filterSeason={filterSeason}
              setFilterSeason={setFilterSeason}
              sortMode={sortMode}
              setSortMode={setSortMode}
              regions={regions}
              types={types}
              seasons={seasons}
              placeholder={routeSearchPlaceholder}
            />
            <HighlightsPanel cards={liveHighlights} />
            {leadStopId && leadWeather.data && (
              <section className="travel-panel travel-panel--weather" aria-label="Weather">
                <p className="travel-panel__eyebrow">{language === 'zh' ? '实时天气' : 'Live weather'}</p>
                <h2>{language === 'zh' ? '下一站' : 'Next stop'}</h2>
                <p>
                  {getLandmarkDisplayName(landmarks.find((l) => l.id === leadStopId), language)}
                  {leadWeather.data.temperatureC != null ? ` · ${Math.round(leadWeather.data.temperatureC)}°C` : ''}
                  {leadWeather.data.windKph != null ? ` · ${Math.round(leadWeather.data.windKph)} km/h` : ''}
                </p>
              </section>
            )}
          </div>
        </header>
      )}

      {activePage === 'destinations' && (
        <section className="travel-page travel-page--destinations">
          <PageHeading pageCopy={copy.pages.destinations} />
            <DestinationGrid
              language={language}
              pageCopy={copy}
              reviewsCopy={reviewsCopy}
              liveIndex={liveData.index}
              landmarks={visibleLandmarks}
              favorites={favoriteSet}
              compare={compareSet}
            onToggleFavorite={toggleFavorite}
            onToggleCompare={toggleCompare}
            onAddToRoute={addToRoute}
            onOpenDrive={onOpenDrive}
          />
          <div className="travel-actions-row">
            {!hasActiveDestinationSearch && destinationVisibleCount < filteredLandmarks.length && (
              <button className="travel-btn travel-btn--ghost" type="button" onClick={() => setDestinationVisibleCount((count) => count + 12)}>
                {copy.actions.showMore} ({visibleLandmarks.length}/{filteredLandmarks.length})
              </button>
            )}
            <button className="travel-btn travel-btn--ghost" type="button" disabled={compareIds.length < 2} onClick={() => setShowCompare(true)}>
              {copy.actions.compare} ({compareIds.length}/4)
            </button>
            <button className="travel-btn travel-btn--ghost" type="button" onClick={() => { setQuery(''); setFilterRegion('any'); setFilterType('any'); setFilterSeason('any'); }}>
              {copy.search.clear}
            </button>
          </div>
        </section>
      )}

      {activePage === 'planner' && (
        <section key="planner" className="travel-page travel-page--planner">
          <PageHeading pageCopy={copy.pages.planner} />
          <div className="travel-planner__grid">
            <RouteEditor
              language={language}
              copy={copy}
              routeIds={routeIds}
              locked={lockedSet}
              routeQuery={routeQuery}
              setRouteQuery={setRouteQuery}
              routeSearchResults={routeSearchResults}
              onMove={moveRoute}
              onRemove={removeFromRoute}
              onAdd={addToRoute}
              onLock={toggleLock}
              onReset={resetRoute}
              onOptimize={optimizeRoute}
              onOpenDrive={openDriveFromRoute}
              onExport={exportItinerary}
            />
            <RoutePreview language={language} copy={copy} routeIds={routeIds} routeMetrics={routeMetrics} />
          </div>

          <div className="travel-planner__grid travel-planner__grid--secondary">
            <ItineraryBuilder
              copy={copy}
              days={itineraryDays}
              setDays={setItineraryDays}
              pace={itineraryPace}
              setPace={setItineraryPace}
              itinerary={itinerary}
              language={language}
            />
            <RouteSchemaPanel copy={guideCopy} pageCopy={copy} routeMetrics={routeMetrics.data} routeStopCount={routeIds.length} />
          </div>
        </section>
      )}

      {activePage === 'reviews' && (
        <section key="reviews" className="travel-page travel-page--reviews">
          <PageHeading pageCopy={copy.pages.reviews} />
          <ReviewsPanel
            language={language}
            pageCopy={copy}
            liveIndex={liveData.index}
            favorites={favoriteSet}
            onToggleFavorite={toggleFavorite}
            onOpenDrive={onOpenDrive}
          />
        </section>
      )}

      {activePage === 'drive' && (
        <section key="drive" className="travel-page travel-page--drive">
          <PageHeading pageCopy={copy.pages.drive} />
          <div className="travel-drive-grid">
            <div className="travel-drive-cta">
              <div>
                <h2>{guideCopy.featurePanel.title}</h2>
                <p>{guideCopy.featurePanel.body}</p>
              </div>
              <div className="travel-drive-cta__actions">
                <button className="travel-btn travel-btn--primary" type="button" onClick={openDriveFromRoute}>{copy.actions.open3d}</button>
                <button className="travel-btn travel-btn--ghost" type="button" onClick={() => setActivePage('destinations')}>{copy.nav[0].label}</button>
                <button className="travel-btn travel-btn--ghost" type="button" onClick={() => { window.location.hash = '#/v2'; }}>V2 Topology</button>
                <button className="travel-btn travel-btn--ghost" type="button" onClick={() => { window.location.hash = '#/v3'; }}>V3 Abstract</button>
              </div>
            </div>
            <AmsterdamLabGateway language={language} onOpenAmsterdam={onOpenAmsterdam} />
          </div>
        </section>
      )}

      {showCompare && (
        <CompareModal
          language={language}
          copy={copy}
          reviewsCopy={reviewsCopy}
          compareIds={compareIds}
          onClose={() => setShowCompare(false)}
          onOpenDrive={onOpenDrive}
        />
      )}
    </div>
  );
}

function SiteNav({
  copy,
  activePage,
  setActivePage,
  language,
  setLanguage,
  guideCopy,
  favoritesCount,
  compareCount,
  routeCount,
  onOpenDrive,
  onOpenAmsterdam,
}) {
  const navIndex = Math.max(0, copy.nav.findIndex((item) => item.id === activePage));

  return (
    <aside className="travel-site-nav">
      <button className="travel-brand" type="button" onClick={() => setActivePage('destinations')} aria-label="Web3D Italy Drive home">
        <span>{copy.brand.eyebrow}</span>
        <strong>{copy.brand.title}</strong>
      </button>

      <div className="travel-nav-links" style={{ ['--nav-count']: copy.nav.length, ['--nav-index']: navIndex }}>
        <span className="travel-nav-links__indicator" aria-hidden="true" />
        {copy.nav.map((item) => (
          <button key={item.id} type="button" className={item.id === activePage ? 'is-active' : ''} onClick={() => setActivePage(item.id)}>{item.label}</button>
        ))}
      </div>

      <div className="travel-sidebar-brief">
        <div className="travel-sidebar-brief__row">
          <span>{copy.actions.favorites}</span>
          <strong>{favoritesCount}</strong>
        </div>
        <div className="travel-sidebar-brief__row">
          <span>{copy.actions.compare}</span>
          <strong>{compareCount}</strong>
        </div>
        <div className="travel-sidebar-brief__row">
          <span>{copy.nav[1].label}</span>
          <strong>{routeCount}</strong>
        </div>
        <button className="travel-btn travel-btn--primary travel-btn--wide" type="button" onClick={onOpenDrive}>
          {guideCopy.hero.primaryCta}
        </button>
        <button className="travel-btn travel-btn--ghost travel-btn--wide" type="button" onClick={() => { window.location.hash = '#/v2'; }}>
          V2 Map
        </button>
        <button className="travel-btn travel-btn--ghost travel-btn--wide" type="button" onClick={() => { window.location.hash = '#/v3'; }}>
          V3 Sketch
        </button>
        <button className="travel-btn travel-btn--ghost travel-btn--wide travel-btn--lab" type="button" onClick={onOpenAmsterdam}>
          Amsterdam VR
        </button>
      </div>

      <div className="travel-lang-toggle" role="group" aria-label="Language toggle">
        <button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>{copy.languageLabels.en}</button>
        <button type="button" className={language === 'zh' ? 'is-active' : ''} onClick={() => setLanguage('zh')}>{copy.languageLabels.zh}</button>
      </div>
    </aside>
  );
}

function PageHeading({ pageCopy }) {
  return (
    <div className="travel-section-heading">
      <div>
        <p className="travel-section-heading__eyebrow">{pageCopy.eyebrow}</p>
        <h2 className="travel-section-heading__title">{pageCopy.title}</h2>
      </div>
      <p className="travel-section-heading__body">{pageCopy.body}</p>
    </div>
  );
}

function AmsterdamLabGateway({ language, onOpenAmsterdam }) {
  const isZh = language === 'zh';

  return (
    <article className="travel-lab-gateway">
      <p className="travel-panel__eyebrow">{isZh ? '城市实验' : 'City lab'}</p>
      <h2>Amsterdam Museumplein VR Lab</h2>
      <p>
        {isZh
          ? '进入独立的阿姆斯特丹本地城市数据场景，包含 Museumplein 建筑瓦片、POI、路线与地面图层。'
          : 'Open the standalone Amsterdam scene with local Museumplein building tiles, POIs, route data, and ground layers.'}
      </p>
      <dl>
        <div><dt>{isZh ? '数据模式' : 'Data mode'}</dt><dd>{isZh ? '本地优先' : 'Local-first'}</dd></div>
        <div><dt>{isZh ? '场景' : 'Scene'}</dt><dd>WebGL city VR</dd></div>
      </dl>
      <button className="travel-btn travel-btn--primary" type="button" onClick={onOpenAmsterdam}>
        {isZh ? '打开阿姆斯特丹页面' : 'Open Amsterdam Page'}
      </button>
    </article>
  );
}

function SearchPanel({
  copy,
  query,
  setQuery,
  filterRegion,
  setFilterRegion,
  filterType,
  setFilterType,
  filterSeason,
  setFilterSeason,
  sortMode,
  setSortMode,
  regions,
  types,
  seasons,
  placeholder,
}) {
  const regionOptions = useMemo(() => (
    [{ value: 'any', label: copy.filters.any }, ...regions.map((item) => ({ value: item, label: item }))]
  ), [copy.filters.any, regions]);

  const typeOptions = useMemo(() => (
    [{ value: 'any', label: copy.filters.any }, ...types.map((item) => ({ value: item, label: item }))]
  ), [copy.filters.any, types]);

  const seasonOptions = useMemo(() => (
    [{ value: 'any', label: copy.filters.any }, ...seasons.map((item) => ({ value: item, label: item }))]
  ), [copy.filters.any, seasons]);

  const sortOptions = useMemo(() => ([
    { value: 'featured', label: copy.sort.featured },
    { value: 'rating', label: copy.sort.rating },
    { value: 'city', label: copy.sort.city },
  ]), [copy.sort.city, copy.sort.featured, copy.sort.rating]);

  return (
    <section className="travel-panel travel-panel--search">
      <p className="travel-panel__eyebrow">{copy.search.title}</p>
      <input
        className="travel-search-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        aria-label={copy.search.placeholder}
      />

      <div className="travel-search-grid">
        <TravelSelect label={copy.filters.region} value={filterRegion} onChange={setFilterRegion} options={regionOptions} />
        <TravelSelect label={copy.filters.type} value={filterType} onChange={setFilterType} options={typeOptions} />
        <TravelSelect label={copy.filters.season} value={filterSeason} onChange={setFilterSeason} options={seasonOptions} />
        <TravelSelect label={copy.sort.title} value={sortMode} onChange={setSortMode} options={sortOptions} />
      </div>
    </section>
  );
}

function TravelSelect({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const activeLabel = useMemo(() => {
    const match = options.find((item) => item.value === value);
    return match ? match.label : (options[0]?.label ?? '');
  }, [options, value]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target)) return;
      setOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`travel-select ${open ? 'is-open' : ''}`}>
      <span>{label}</span>
      <button
        className="travel-select__trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="travel-select__value">{activeLabel}</span>
        <span className="travel-select__chev" aria-hidden="true" />
      </button>
      {open && (
        <div className="travel-select__menu" role="listbox" aria-label={label}>
          {options.map((item) => (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={item.value === value}
              className={`travel-select__option ${item.value === value ? 'is-active' : ''}`}
              onClick={() => { onChange(item.value); setOpen(false); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HighlightsPanel({ cards }) {
  return (
    <section className="travel-panel travel-panel--highlights">
      <p className="travel-panel__eyebrow">Highlights</p>
      <div className="travel-highlights">
        {cards.map((item) => (
          <article key={item.label} className="travel-highlight">
            <h3>{item.label}</h3>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DestinationGrid({
  language,
  pageCopy,
  reviewsCopy,
  landmarks: landmarkList,
  favorites,
  compare,
  onToggleFavorite,
  onToggleCompare,
  onAddToRoute,
  onOpenDrive,
}) {
  return (
    <section className="travel-showcase">
      {landmarkList.map((landmark, index) => {
        const meta = travelLandmarkMeta[landmark.id];
        const tags = buildKeywordTags(meta?.blurb?.[language] ?? '', language);
        return (
          <article key={landmark.id} className={`travel-destination-card travel-destination-card--${landmark.id}`}>
            <div className="travel-destination-card__media">
              <span>{meta.city[language]}</span>
              <div className="travel-card-tools">
                <button type="button" className={`travel-icon-btn ${favorites.has(landmark.id) ? 'is-on' : ''}`} onClick={() => onToggleFavorite(landmark.id)} aria-label={pageCopy.actions.favorites}>
                  ★
                </button>
                <button type="button" className={`travel-icon-btn ${compare.has(landmark.id) ? 'is-on' : ''}`} onClick={() => onToggleCompare(landmark.id)} aria-label={pageCopy.actions.compare}>
                  ≡
                </button>
              </div>
            </div>
            <div className="travel-destination-card__body">
              <div className="travel-destination-card__head">
                <p>{meta.region[language]}</p><span>{meta.type[language]}</span>
              </div>
              <h2>{getLandmarkDisplayName(landmark, language)}</h2>
              <p>{meta.blurb[language]}</p>
              <div className="travel-tag-row">
                {tags.map((tag) => <span key={tag} className="travel-tag">{tag}</span>)}
              </div>
              <div className="travel-destination-card__meta">
                <span>{language === 'zh' ? '资料来源: Wikipedia' : 'Source: Wikipedia'}</span>
                <div className="travel-btn-row">
                  <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onAddToRoute(landmark.id)}>{pageCopy.actions.addToRoute}</button>
                  <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onOpenDrive(landmark.id)}>{pageCopy.destinationCta}</button>
                </div>
              </div>
            </div>
            <span className="travel-destination-card__number">0{index + 1}</span>
          </article>
        );
      })}
    </section>
  );
}

function RouteEditor({
  language,
  copy,
  routeIds,
  locked,
  routeQuery,
  setRouteQuery,
  routeSearchResults,
  onMove,
  onRemove,
  onAdd,
  onLock,
  onReset,
  onOptimize,
  onOpenDrive,
  onExport,
}) {
  return (
    <article className="travel-panel travel-panel--route-editor">
      <p className="travel-panel__eyebrow">{copy.pages.planner.eyebrow}</p>
      <h2>{copy.pages.planner.title}</h2>
      <p>{copy.pages.planner.body}</p>
      <div className="travel-route-search">
        <input
          className="travel-search-input"
          value={routeQuery}
          onChange={(event) => setRouteQuery(event.target.value)}
          placeholder={language === 'zh' ? '搜索景点、城市、区域并加入路线' : 'Search landmarks, cities, or regions to add stops'}
          aria-label={language === 'zh' ? '搜索路线景点' : 'Search route stops'}
        />
        <div className="travel-route-search__results">
          {routeSearchResults.map((landmark) => {
            const meta = travelLandmarkMeta[landmark.id];
            return (
              <button key={landmark.id} type="button" onClick={() => onAdd(landmark.id)}>
                <strong>{getLandmarkDisplayName(landmark, language)}</strong>
                <span>{meta?.city?.[language]} / {meta?.region?.[language]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="travel-route-editor">
        {routeIds.length === 0 && (
          <p className="travel-route-empty">
            {language === 'zh' ? '还没有停靠点。先在“目的地”里把景点加入路线。' : 'No stops yet. Add destinations from the list first.'}
          </p>
        )}
        {routeIds.map((id, index) => {
          const landmark = landmarks.find((l) => l.id === id);
          if (!landmark) return null;
          const meta = travelLandmarkMeta[id];
          return (
            <div key={`${id}-${index}`} className="travel-route-row">
              <div>
                <strong>{getLandmarkDisplayName(landmark, language)}</strong>
                <span>{meta.city[language]} · {meta.region[language]}</span>
              </div>
              <div className="travel-route-row__tools">
                <button type="button" className="travel-mini-btn" onClick={() => onMove(id, 'up')} aria-label="Up">↑</button>
                <button type="button" className="travel-mini-btn" onClick={() => onMove(id, 'down')} aria-label="Down">↓</button>
                <button type="button" className={`travel-mini-btn ${locked.has(id) ? 'is-on' : ''}`} onClick={() => onLock(id)} aria-label={locked.has(id) ? copy.actions.unlock : copy.actions.lock}>
                  {locked.has(id) ? '🔒' : '⚑'}
                </button>
                <button type="button" className="travel-mini-btn" onClick={() => onRemove(id)} aria-label={copy.actions.remove}>×</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="travel-actions-row">
        <button className="travel-btn travel-btn--ghost" type="button" onClick={onReset}>{copy.actions.resetRoute}</button>
        <button className="travel-btn travel-btn--ghost" type="button" onClick={onOptimize}>{copy.actions.optimizeRoute}</button>
        <button className="travel-btn travel-btn--ghost" type="button" onClick={onExport}>{copy.actions.export}</button>
        <button className="travel-btn travel-btn--primary" type="button" onClick={onOpenDrive}>{copy.actions.open3d}</button>
      </div>
    </article>
  );
}

function RoutePreview({ language, copy, routeIds, routeMetrics }) {
  const points = routeIds
    .map((id) => {
      const meta = travelLandmarkMeta[id];
      if (!meta) return null;
      return { id, point: lngLatToMapPoint(meta.lon, meta.lat), label: meta.city?.[language] ?? meta.name?.[language] ?? id };
    })
    .filter((p) => Boolean(p.point));

  const routeData = routeMetrics?.data;
  const routeGeometry = routeData?.geometryCoordinates?.length
    ? routeData.geometryCoordinates.map(([lon, lat]) => lngLatToSvgPoint(lon, lat)).join(' ')
    : '';
  const networkLines = ITALY_TRANSPORT_NETWORK.map((line) => line.map(([lon, lat]) => lngLatToSvgPoint(lon, lat)).join(' '));
  const mainlandPath = polygonToSvgPath(ITALY_MAINLAND_POLYGON);
  const sardiniaPath = polygonToSvgPath(SARDINIA_POLYGON);
  const sicilyPath = polygonToSvgPath(SICILY_POLYGON);
  const routeState = routeIds.length < 2
    ? (language === 'zh' ? '至少选择 2 个景点开始规划。' : 'Choose at least 2 stops to calculate a road route.')
    : routeMetrics?.isFetching
      ? (language === 'zh' ? '正在调用 OSRM 计算真实道路路线...' : 'Calculating real road route with OSRM...')
      : routeGeometry
        ? (language === 'zh' ? '已使用 OSRM 真实道路几何绘制路线。' : 'Route drawn from OSRM road geometry.')
        : (language === 'zh' ? '道路服务暂不可用，保留景点坐标和交通走廊。' : 'Road service unavailable; showing stop coordinates and transport corridors.');

  return (
    <article className="travel-panel travel-panel--map">
      <p className="travel-panel__eyebrow">{copy.routeSource}</p>
      <h2>{language === 'zh' ? '路线预览' : 'Route preview'}</h2>
      <div className="travel-map travel-map--mini">
        <span className="travel-map__sea travel-map__sea--a" aria-hidden="true" />
        <span className="travel-map__sea travel-map__sea--b" aria-hidden="true" />
        <svg viewBox="0 0 100 100" className="travel-map__svg" aria-hidden="true">
          <path className="travel-map__land" d={mainlandPath} />
          <path className="travel-map__land travel-map__land--island" d={sardiniaPath} />
          <path className="travel-map__land travel-map__land--island" d={sicilyPath} />
          {networkLines.map((line, index) => (
            <polyline key={index} className="travel-map__network" fill="none" points={line} />
          ))}
          {routeGeometry && <polyline className="travel-map__real-route" fill="none" points={routeGeometry} />}
          {points.map((p, index) => (
            <g key={p.id} className="travel-map__pin-svg" transform={`translate(${p.point.x.toFixed(2)} ${p.point.y.toFixed(2)})`}>
              <circle className="travel-map__pin-halo" r="2.55" />
              <circle className="travel-map__pin-core" r="1.15" />
              <text x="2.4" y={index % 2 === 0 ? -2.2 : 4.4}>{p.label}</text>
            </g>
          ))}
        </svg>
      </div>
      <p className="travel-map__note">
        {false && language === 'zh'
          ? `共 ${routeIds.length} 站，可在“路线规划”里调整顺序并生成行程。`
          : routeState}
      </p>
    </article>
  );
}

function ItineraryBuilder({ copy, days, setDays, pace, setPace, itinerary, language }) {
  const paceCopy = copy.itinerary;

  return (
    <article className="travel-panel travel-panel--itinerary">
      <p className="travel-panel__eyebrow">{copy.pages.planner.eyebrow}</p>
      <h2>{language === 'zh' ? '行程生成器' : 'Itinerary generator'}</h2>
      <div className="travel-itinerary-controls">
        <label className="travel-range">
          <span>{paceCopy.days}: {days}</span>
          <TravelSlider min={1} max={7} value={days} onChange={setDays} ariaLabel={paceCopy.days} />
        </label>
        <div className="travel-segmented" role="group" aria-label={paceCopy.pace}>
          <button type="button" className={pace === 'relaxed' ? 'is-active' : ''} onClick={() => setPace('relaxed')}>{paceCopy.relaxed}</button>
          <button type="button" className={pace === 'standard' ? 'is-active' : ''} onClick={() => setPace('standard')}>{paceCopy.standard}</button>
          <button type="button" className={pace === 'fast' ? 'is-active' : ''} onClick={() => setPace('fast')}>{paceCopy.fast}</button>
        </div>
      </div>

      <div className="travel-itinerary-days">
        {itinerary.map((day) => (
          <article key={day.dayIndex} className="travel-itinerary-day">
            <h3>{language === 'zh' ? `第 ${day.dayIndex} 天` : `Day ${day.dayIndex}`}</h3>
            <ul>
              {day.stops.map((id) => {
                const landmark = landmarks.find((l) => l.id === id);
                if (!landmark) return null;
                const meta = travelLandmarkMeta[id];
                return (
                  <li key={`${day.dayIndex}-${id}`}>{getLandmarkDisplayName(landmark, language)} <span>{meta.city[language]}</span></li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </article>
  );
}

function TravelSlider({ min, max, value, onChange, ariaLabel }) {
  const trackRef = useRef(null);
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  const setFromClientX = useCallback((clientX) => {
    const node = trackRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const t = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    const clamped = Math.min(1, Math.max(0, t));
    const next = Math.round(min + clamped * (max - min));
    onChange(next);
  }, [max, min, onChange]);

  const onPointerDown = useCallback((event) => {
    event.preventDefault();
    setFromClientX(event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [setFromClientX]);

  const onPointerMove = useCallback((event) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setFromClientX(event.clientX);
  }, [setFromClientX]);

  const onKeyDown = useCallback((event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(Math.max(min, value - 1));
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(Math.min(max, value + 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onChange(min);
    } else if (event.key === 'End') {
      event.preventDefault();
      onChange(max);
    }
  }, [max, min, onChange, value]);

  return (
    <div
      className="travel-slider"
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      <div ref={trackRef} className="travel-slider__track">
        <div className="travel-slider__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="travel-slider__thumb" style={{ left: `${pct}%` }} aria-hidden="true" />
    </div>
  );
}

function ReviewBrief({ landmarkId, language, liveLandmark }) {
  const wiki = useWikipediaSummary(landmarkId, language);
  const liveDescription = getLiveSummary(liveLandmark, language);
  const sourceUrl = getLivePageUrl(liveLandmark, language);
  if (liveDescription) {
    return (
      <article className="travel-review-card">
        <p>{liveDescription}</p>
        {sourceUrl
          ? <small><a href={sourceUrl} target="_blank" rel="noreferrer">Wikipedia / Wikidata</a></small>
          : <small>Wikipedia / Wikidata</small>}
      </article>
    );
  }
  if (wiki.isLoading) return <article className="travel-review-card"><p>Loading…</p><small>Wikipedia</small></article>;
  if (!wiki.data?.extract) return <article className="travel-review-card"><p>-</p><small>Wikipedia</small></article>;
  return (
    <article className="travel-review-card">
      <p>{wiki.data.extract}</p>
      <small>Wikipedia</small>
    </article>
  );
}

function DestinationGridV2({
  language,
  pageCopy,
  liveIndex,
  landmarks: landmarkList,
  favorites,
  compare,
  onToggleFavorite,
  onToggleCompare,
  onAddToRoute,
  onOpenDrive,
}) {
  return (
    <section className="travel-showcase">
      {landmarkList.map((landmark, index) => (
        <DestinationCardV2
          key={landmark.id}
          landmark={landmark}
          index={index}
          language={language}
          pageCopy={pageCopy}
          liveLandmark={liveIndex?.get(landmark.id)}
          favorites={favorites}
          compare={compare}
          onToggleFavorite={onToggleFavorite}
          onToggleCompare={onToggleCompare}
          onAddToRoute={onAddToRoute}
          onOpenDrive={onOpenDrive}
        />
      ))}
    </section>
  );
}

function DestinationCardV2({
  landmark,
  index,
  language,
  pageCopy,
  liveLandmark,
  favorites,
  compare,
  onToggleFavorite,
  onToggleCompare,
  onAddToRoute,
  onOpenDrive,
}) {
  const meta = travelLandmarkMeta[landmark.id];
  const wiki = useWikipediaSummary(landmark.id, language);
  const liveDescription = getLiveSummary(liveLandmark, language);
  const description = liveDescription || ((wiki.data?.extract && wiki.data.extract.trim()) ? wiki.data.extract : meta.blurb[language]);
  const imageUrl = getLiveImage(liveLandmark, language);
  const sourceUrl = getLivePageUrl(liveLandmark, language);
  const tags = buildKeywordTags(description, language);

  return (
    <article className={`travel-destination-card travel-destination-card--${landmark.id}`}>
      <div className="travel-destination-card__media">
        {imageUrl && <img src={imageUrl} alt="" loading="lazy" />}
        <span>{meta.city[language]}</span>
        <div className="travel-card-tools">
          <button type="button" className={`travel-icon-btn ${favorites.has(landmark.id) ? 'is-on' : ''}`} onClick={() => onToggleFavorite(landmark.id)} aria-label={pageCopy.actions.favorites}>♥</button>
          <button type="button" className={`travel-icon-btn ${compare.has(landmark.id) ? 'is-on' : ''}`} onClick={() => onToggleCompare(landmark.id)} aria-label={pageCopy.actions.compare}>≈</button>
        </div>
      </div>
      <div className="travel-destination-card__body">
        <div className="travel-destination-card__head">
          <p>{meta.region[language]}</p><span>{meta.type[language]}</span>
        </div>
        <h2>{getLandmarkDisplayName(landmark, language)}</h2>
        <p>{description}</p>
        <div className="travel-tag-row">
          {tags.map((tag) => <span key={tag} className="travel-tag">{tag}</span>)}
        </div>
        <div className="travel-destination-card__meta">
          {sourceUrl
            ? <a href={sourceUrl} target="_blank" rel="noreferrer">Source: Wikipedia / Wikidata</a>
            : <span>{language === 'zh' ? '资料来源: Wikipedia' : 'Source: Wikipedia'}</span>}
          <div className="travel-btn-row">
            <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onAddToRoute(landmark.id)}>{pageCopy.actions.addToRoute}</button>
            <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onOpenDrive(landmark.id)}>{pageCopy.destinationCta}</button>
          </div>
        </div>
      </div>
      <span className="travel-destination-card__number">0{index + 1}</span>
    </article>
  );
}

function ReviewsPanel({ language, pageCopy, liveIndex, favorites, onToggleFavorite, onOpenDrive }) {
  return (
    <div className="travel-reviews-grid">
      {landmarks.map((landmark) => {
        const meta = travelLandmarkMeta[landmark.id];
        const liveLandmark = liveIndex?.get(landmark.id);
        const liveDescription = getLiveSummary(liveLandmark, language);
        const tags = buildKeywordTags(liveDescription || `${meta?.blurb?.[language] ?? ''}`, language);
        return (
          <article key={landmark.id} className="travel-reviews-block">
            <div className="travel-reviews-block__head">
              <div>
                <h3>{getLandmarkDisplayName(landmark, language)}</h3>
                <p className="travel-reviews-block__sub">{meta.city[language]} · {meta.type[language]}</p>
              </div>
              <div className="travel-btn-row">
                <button type="button" className={`travel-icon-btn ${favorites.has(landmark.id) ? 'is-on' : ''}`} onClick={() => onToggleFavorite(landmark.id)} aria-label={pageCopy.actions.favorites}>★</button>
                <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onOpenDrive(landmark.id)}>{pageCopy.destinationCta}</button>
              </div>
            </div>
            <div className="travel-tag-row">
              {tags.map((tag) => <span key={`${landmark.id}-${tag}`} className="travel-tag">{tag}</span>)}
            </div>
            <div className="travel-reviews-block__list">
              <ReviewBrief landmarkId={landmark.id} language={language} liveLandmark={liveLandmark} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function CompareCol({ landmark, meta, language, copy, onOpenDrive }) {
  const wiki = useWikipediaSummary(landmark.id, language);
  return (
    <article className="travel-compare__col">
      <h3>{getLandmarkDisplayName(landmark, language)}</h3>
      <p>{meta.city[language]} · {meta.region[language]}</p>
      <dl>
        <div><dt>{language === 'zh' ? '类型' : 'Type'}</dt><dd>{meta.type[language]}</dd></div>
        <div><dt>{language === 'zh' ? '最佳时间' : 'Season'}</dt><dd>{meta.season[language]}</dd></div>
        <div><dt>{language === 'zh' ? '简介' : 'Summary'}</dt><dd>{wiki.data?.extract ? `${wiki.data.extract.slice(0, 90)}…` : '-'}</dd></div>
      </dl>
      <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onOpenDrive(landmark.id)}>
        {copy.destinationCta}
      </button>
    </article>
  );
}

function CompareModalV2({ language, copy, compareIds, onClose, onOpenDrive }) {
  const selected = compareIds.map((id) => landmarks.find((l) => l.id === id)).filter(Boolean);
  const columns = selected.map((landmark) => ({
    landmark,
    meta: travelLandmarkMeta[landmark.id],
  }));

  return (
    <div className="travel-modal" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="travel-modal__dialog">
        <div className="travel-modal__head">
          <div>
            <p className="travel-modal__eyebrow">{copy.actions.compare}</p>
            <h2>{language === 'zh' ? '目的地对比' : 'Compare destinations'}</h2>
          </div>
          <button className="travel-modal__close" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="travel-compare">
          <div className="travel-compare__grid" style={{ ['--cols']: columns.length }}>
            {columns.map(({ landmark, meta }) => (
              <CompareCol key={landmark.id} landmark={landmark} meta={meta} language={language} copy={copy} onOpenDrive={onOpenDrive} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareModal({ language, copy, compareIds, onClose, onOpenDrive }) {
  const selected = compareIds.map((id) => landmarks.find((l) => l.id === id)).filter(Boolean);
  const columns = selected.map((landmark) => ({
    landmark,
    meta: travelLandmarkMeta[landmark.id],
  }));

  return (
    <div className="travel-modal" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="travel-modal__dialog">
        <div className="travel-modal__head">
          <div>
            <p className="travel-modal__eyebrow">{copy.actions.compare}</p>
            <h2>{language === 'zh' ? '景点对比' : 'Compare destinations'}</h2>
          </div>
          <button className="travel-modal__close" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="travel-compare">
          <div className="travel-compare__grid" style={{ ['--cols']: columns.length }}>
            {columns.map(({ landmark, meta, review }) => (
              <article key={landmark.id} className="travel-compare__col">
                <h3>{getLandmarkDisplayName(landmark, language)}</h3>
                <p>{meta.city[language]} · {meta.region[language]}</p>
                <dl>
                  <div><dt>{language === 'zh' ? '类型' : 'Type'}</dt><dd>{meta.type[language]}</dd></div>
                  <div><dt>{language === 'zh' ? '最佳时间' : 'Season'}</dt><dd>{meta.season[language]}</dd></div>
                  <div><dt>{copy.ratingLabel}</dt><dd>{review?.score ?? '4.8'}</dd></div>
                </dl>
                <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onOpenDrive(landmark.id)}>
                  {copy.destinationCta}
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteSchemaPanel({ copy, pageCopy, routeMetrics, routeStopCount }) {
  const labels = pageCopy.routeLabels;
  const distanceKm = routeMetrics?.distanceKm ?? currentRoute.distanceKm;
  const durationHours = routeMetrics?.durationHours ?? currentRoute.durationHours;
  return (
    <article className="travel-panel travel-panel--route">
      <p className="travel-panel__eyebrow">{copy.routePanel.eyebrow}</p>
      <h2>{copy.routePanel.title}</h2>
      <p>{copy.routePanel.body}</p>
      <div className="travel-route-summary">
        <span>{labels.source}: {pageCopy.routeSource}</span>
        <span>{labels.distance}: {distanceKm} {pageCopy.distanceUnit}</span>
        <span>{labels.duration}: {durationHours} {pageCopy.durationUnit}</span>
        <span>{labels.points}: {routeStopCount ?? currentRoute.points.length}</span>
      </div>
      <div className="travel-itinerary">
        {routeSegments.map((segment) => {
          const segmentCopy = getSegmentDisplay(segment, pageCopy);
          return (
            <div key={segment.id} className="travel-itinerary__item">
              <span>{segmentCopy.traffic}</span>
              <div>
                <h3>{segmentCopy.type}</h3>
                <p>{labels.roadType}: {segmentCopy.type} / {labels.speed}: {segment.speedLimit} {pageCopy.speedUnit} / {segmentCopy.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function HomeWebGLBackdrop() {
  return (
    <div className="travel-webgl" aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 8], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.65} />
        <pointLight position={[4, 5, 6]} intensity={2.2} color="#f2c480" />
        <pointLight position={[-5, -2, 4]} intensity={1.5} color="#78b7d3" />
        <LusionField />
      </Canvas>
    </div>
  );
}

function LusionField() {
  const group = useRef(null);
  const particles = useRef(null);
  const microParticles = useRef(null);
  const streamGroup = useRef(null);
  const graph = useRef(null);
  const magnet = useRef(null);
  const rotor = useRef(null);
  const sparks = useRef([]);

  const points = useMemo(() => {
    const positions = new Float32Array(520 * 3);
    for (let i = 0; i < 520; i += 1) {
      const radius = 2.1 + Math.random() * 3.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius * 0.62;
      positions[i * 3 + 2] = Math.cos(phi) * radius;
    }
    return positions;
  }, []);

  const microPoints = useMemo(() => {
    const positions = new Float32Array(320 * 3);
    for (let i = 0; i < 320; i += 1) {
      const x = -4.8 + Math.random() * 9.6;
      const y = -2.9 + Math.random() * 5.8;
      const z = -2.8 + Math.random() * 4.2;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    return positions;
  }, []);

  const streamGeometries = useMemo(() => {
    return [0, 1].map((index) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.7 + index * 0.18, -1.9 + index * 0.28, -0.6),
        new THREE.Vector3(-1.5, -0.6 + index * 0.16, 0.35),
        new THREE.Vector3(0.45, 0.4 - index * 0.2, -0.15),
        new THREE.Vector3(2.8 - index * 0.2, 1.65 - index * 0.18, 0.45),
      ]);
      return new THREE.TubeGeometry(curve, 96, 0.008 + index * 0.002, 8, false);
    });
  }, []);

  const cityGraph = useMemo(() => {
    const nodes = [
      [-2.3, 1.05, 0.35],
      [-1.1, 1.28, -0.05],
      [-0.5, 0.2, 0.2],
      [0.42, 0.0, -0.18],
      [1.1, -0.86, 0.12],
      [2.05, -1.1, 0.36],
    ];
    const linePositions = new Float32Array((nodes.length - 1) * 6);
    for (let i = 0; i < nodes.length - 1; i += 1) {
      linePositions.set(nodes[i], i * 6);
      linePositions.set(nodes[i + 1], i * 6 + 3);
    }
    return { nodes, linePositions };
  }, []);

  useEffect(() => {
    sparks.current = new Array(7).fill(0).map(() => ({
      offset: Math.random() * Math.PI * 2,
      speed: 0.2 + Math.random() * 0.35,
    }));
  }, []);

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();
    if (group.current) group.current.rotation.y = t * 0.06;
    if (particles.current) particles.current.rotation.x = Math.sin(t * 0.3) * 0.08;
    if (microParticles.current) microParticles.current.rotation.y = -t * 0.08;
    if (streamGroup.current) streamGroup.current.rotation.z = Math.sin(t * 0.22) * 0.12;
    if (magnet.current) magnet.current.position.set(pointer.x * 1.6, pointer.y * 1.1, 0);
    if (graph.current) graph.current.material.opacity = 0.26 + Math.sin(t * 0.6) * 0.08;
    if (rotor.current) rotor.current.rotation.z = -t * 0.18;
  });

  return (
    <group ref={group}>
      <Float floatIntensity={0.15} rotationIntensity={0.08}>
        <points ref={particles}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[points, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.018} color="#d9b06f" transparent opacity={0.62} depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      </Float>

      <points ref={microParticles}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[microPoints, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.01} color="#8bc8dc" transparent opacity={0.52} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      <group ref={streamGroup}>
        {streamGeometries.map((geo, index) => (
          <mesh key={index} geometry={geo}>
            <meshBasicMaterial color={index % 2 ? '#fff1bd' : '#78bdd0'} transparent opacity={0.42} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>

      <Float speed={1.4} rotationIntensity={0.28} floatIntensity={0.4}>
        <mesh ref={rotor} position={[0.42, 0.08, 0]} rotation={[0.7, -0.52, 0.2]}>
          <torusKnotGeometry args={[1.05, 0.14, 180, 18]} />
          <meshStandardMaterial color="#c6d8dc" roughness={0.32} metalness={0.42} transparent opacity={0.18} wireframe />
        </mesh>
      </Float>
      {[0, 1, 2].map((index) => (
        <mesh key={`ring-${index}`} rotation={[Math.PI / 2.4, index * 0.72, index * 0.2]} scale={1.2 + index * 0.36}>
          <torusGeometry args={[1.42, 0.006, 12, 180]} />
          <meshBasicMaterial color={index === 1 ? '#88bac9' : '#b98152'} transparent opacity={0.18 - index * 0.04} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}

      <lineSegments ref={graph}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[cityGraph.linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#f1bd70" transparent opacity={0.42} blending={THREE.AdditiveBlending} />
      </lineSegments>

      <group ref={magnet}>
        {sparks.current.map((spark, index) => (
          <mesh key={index} position={[Math.sin(spark.offset) * 0.4, Math.cos(spark.offset) * 0.26, 0]}>
            <sphereGeometry args={[0.045, 12, 10]} />
            <meshBasicMaterial color={index % 2 ? '#d7a55e' : '#78bdd0'} transparent opacity={0.34} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
