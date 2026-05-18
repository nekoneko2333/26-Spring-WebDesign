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
        title: 'Get the context before you choose a stop',
        body: 'Each destination includes concise background notes so you can compare the character, setting, and travel value of each stop.',
      },
      drive: {
        eyebrow: '3D drive',
        title: 'Enter the immersive drive when you are ready',
        body: 'Use the 3D explorer to preview scale, focus landmarks, and open model overlays.',
      },
    },
    destinationCta: 'Open in 3D',
    ratingLabel: 'Rating',
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
      source: 'Route',
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
        title: '先了解目的地，再决定停靠点',
        body: '每个目的地都提供简洁的背景介绍，方便比较景点气质、所在城市和旅行价值。',
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
      source: '路线',
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

const zhLandmarkOverrides = {
  colosseum: { name: '罗马斗兽场', city: '罗马', region: '拉齐奥', type: '帝国遗迹', season: '最佳光线 / 日落', blurb: '古罗马圆形竞技场，拱廊光影清晰，城市中心能量感强。' },
  pisa: { name: '比萨斜塔', city: '比萨', region: '托斯卡纳', type: '中世纪钟楼', season: '最佳光线 / 清晨', blurb: '大理石纪念广场与标志性倾斜姿态，紧凑而明亮。' },
  florence_duomo: { name: '佛罗伦萨主教座堂', city: '佛罗伦萨', region: '托斯卡纳', type: '文艺复兴教堂', season: '最佳光线 / 下午', blurb: '文艺复兴穹顶与密集街巷构成强烈的步行城市氛围。' },
  venice_rialto: { name: '里亚托桥', city: '威尼斯', region: '威尼托', type: '运河桥梁', season: '最佳光线 / 上午', blurb: '运河跨越节点与层叠步行流线，水城移动体验紧凑清晰。' },
  milan_duomo: { name: '米兰主教座堂', city: '米兰', region: '伦巴第', type: '哥特式教堂', season: '最佳光线 / 蓝调时刻', blurb: '哥特式尖塔与广场尺度，具有强烈的都市抵达感。' },
  pompeii: { name: '庞贝古城遗址', city: '庞贝', region: '坎帕尼亚', type: '考古遗址', season: '最佳光线 / 清晨', blurb: '古代街道与保存良好的住宅，让罗马日常城市生活可以被直接阅读。' },
};

function getLandmarkMeta(landmarkId, language) {
  const meta = travelLandmarkMeta[landmarkId];
  if (language !== 'zh') return meta;
  const override = zhLandmarkOverrides[landmarkId];
  if (!override || !meta) return meta;
  return {
    ...meta,
    name: { ...meta.name, zh: override.name },
    city: { ...meta.city, zh: override.city },
    region: { ...meta.region, zh: override.region },
    type: { ...meta.type, zh: override.type },
    season: { ...meta.season, zh: override.season },
    blurb: { ...meta.blurb, zh: override.blurb },
  };
}

function getLandmarkDisplayName(landmark, language) {
  const meta = getLandmarkMeta(landmark.id, language);
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
        label: '智能路线',
        value: `${formatDistanceKm(distanceKm)} km`,
        detail: `预计约 ${formatDurationHours(durationHours, language)}，当前路线从 ${firstCity} 到 ${lastCity}，共 ${selectedStops.length} 个停靠点。`,
      },
      {
        label: '路线细节',
        value: `${routePointCount} 个关键点`,
        detail: `路线拆分为 ${routeSegments.length} 段行程，其中 ${scenicSegments} 段包含风景、桥梁、隧道或山地体验。`,
      },
      {
        label: '3D 预览',
        value: `${modelCount}/${selectedStops.length} 个地标`,
        detail: `已有 ${modelCount} 个地标支持精细模型；其余地标会以位置、类型和视觉标记呈现在场景中。`,
      },
    ];
  }

  return [
    {
      label: 'Smart route',
      value: `${formatDistanceKm(distanceKm)} km`,
      detail: `Estimated at about ${formatDurationHours(durationHours, language)} from ${firstCity} to ${lastCity} across ${selectedStops.length} selected stops.`,
    },
    {
      label: 'Route detail',
      value: `${routePointCount} key points`,
      detail: `The trip is split into ${routeSegments.length} drive sections, including ${scenicSegments} scenic, bridge, tunnel, or mountain moments.`,
    },
    {
      label: '3D preview',
      value: `${modelCount}/${selectedStops.length} landmarks`,
      detail: `${modelCount} stops include detailed 3D models; the rest appear with location-aware visual markers in the scene.`,
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

const refinedHomeCopy = {
  en: {
    brand: { eyebrow: 'Web3D', title: 'Trip3D Italy' },
    languageLabels: { en: 'EN', zh: '中文' },
    nav: [
      { id: 'destinations', label: 'Destinations' },
      { id: 'planner', label: 'Trips' },
      { id: 'reviews', label: 'Reviews' },
      { id: 'drive', label: '3D Drive' },
    ],
    search: {
      title: 'Find your next stop',
      placeholder: 'Search cities, landmarks, regions, or travel style',
      clear: 'Reset',
    },
    filters: {
      title: 'Filters',
      region: 'Region',
      type: 'Experience',
      season: 'Best time',
      any: 'Any',
    },
    sort: {
      title: 'Sort',
      featured: 'Recommended',
      rating: 'Top rated',
      city: 'City',
    },
    actions: {
      open3d: 'Open 3D Drive',
      openV2: 'Route map',
      openV3: 'Topology view',
      openAmsterdam: 'Amsterdam VR',
      continue3d: 'Continue',
      export: 'Export',
      compare: 'Compare',
      favorites: 'Saved',
      addToRoute: 'Add stop',
      optimizeRoute: 'Optimize',
      showMore: 'Show more',
      remove: 'Remove',
      generate: 'Generate itinerary',
      resetRoute: 'Reset route',
      lock: 'Lock',
      unlock: 'Unlock',
      signIn: 'Sign in',
      signOut: 'Sign out',
    },
    pages: {
      destinations: {
        eyebrow: 'Destinations',
        title: 'Browse landmark stays, day trips, and scenic stops',
        body: 'Filter by region, experience type, season, and saved stops. Add places to a route before opening the 3D drive.',
      },
      planner: {
        eyebrow: 'Trip planner',
        title: 'Build a route, lock must-see stops, then export a day plan',
        body: 'Your route is stored locally and can be optimized against the geographic coordinates already in the project.',
      },
      reviews: {
        eyebrow: 'Reviews',
        title: 'Read quick context before choosing a destination',
        body: 'Background notes and source links help you compare why each stop is worth adding to the itinerary.',
      },
      drive: {
        eyebrow: '3D drive',
        title: 'Preview the journey spatially when the plan is ready',
        body: 'Open the Three.js drive, focus landmarks, and inspect the route as a guided 3D experience.',
      },
    },
    booking: {
      tabs: ['Hotels', 'Attractions', 'Routes', '3D Preview'],
      destination: 'Destination',
      dates: 'Dates',
      guests: 'Travelers',
      destinationValue: 'Italy heritage route',
      datesValue: 'Flexible dates',
      guestsValue: '2 adults',
      submit: 'Search trips',
    },
    account: {
      title: 'Account',
      body: 'Save favorites, route edits, and cache settings on this device.',
      email: 'Email',
      name: 'Name',
      submit: 'Create local account',
      demo: 'Local demo login',
      cached: 'Cached locally',
      guest: 'Guest session',
    },
    cache: {
      title: 'Local cache',
      body: 'Favorites, route order, locks, and account session are stored in localStorage. React Query caches live data in memory while the app is open.',
      route: 'Route stops',
      favorites: 'Saved places',
      mode: 'Mode',
      local: 'Local-first',
      clear: 'Clear saved route',
    },
    destinationCta: 'View in 3D',
    ratingLabel: 'Rating',
    routeSource: 'Planned route',
    distanceUnit: 'km',
    durationUnit: 'h',
    speedUnit: 'km/h',
    coordinateLabels: { lat: 'LAT', lon: 'LON' },
    highlights: [],
    trafficLabels: homeCopy.en.trafficLabels,
    segmentTypes: homeCopy.en.segmentTypes,
    segmentDescriptions: homeCopy.en.segmentDescriptions,
    routeLabels: homeCopy.en.routeLabels,
    itinerary: homeCopy.en.itinerary,
  },
  zh: {
    brand: { eyebrow: 'Web3D', title: 'Trip3D 意大利' },
    languageLabels: { en: 'EN', zh: '中文' },
    nav: [
      { id: 'destinations', label: '目的地' },
      { id: 'planner', label: '行程' },
      { id: 'reviews', label: '点评' },
      { id: 'drive', label: '3D 导览' },
    ],
    search: {
      title: '想去哪一站',
      placeholder: '搜城市、景点、地区，或你想要的旅行感觉',
      clear: '重置',
    },
    filters: {
      title: '筛选',
      region: '地区',
      type: '体验',
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
      open3d: '打开 3D 路线',
      openV2: '路线地图',
      openV3: '拓扑视图',
      openAmsterdam: '阿姆斯特丹 VR',
      continue3d: '继续',
      export: '导出',
      compare: '对比',
      favorites: '收藏',
      addToRoute: '加入行程',
      optimizeRoute: '优化路线',
      showMore: '查看更多',
      remove: '移除',
      generate: '生成行程',
      resetRoute: '重置路线',
      lock: '锁定',
      unlock: '解锁',
      signIn: '登录',
      signOut: '退出',
    },
    pages: {
      destinations: {
        eyebrow: '目的地',
        title: '先挑想去的地方，再把路线串起来',
        body: '按地区、玩法和适合出发的时间筛选景点。看到喜欢的地方可以收藏、对比，或直接加入行程。',
      },
      planner: {
        eyebrow: '行程',
        title: '把必去景点固定住，其余交给路线优化',
        body: '当前行程会保存在本机。系统会根据已有经纬度估算距离，并帮你调整更顺的游览顺序。',
      },
      reviews: {
        eyebrow: '点评',
        title: '出发前先看看每个地方值不值得停',
        body: '这里保留简短背景、来源链接和旅行提示，方便你快速判断哪些景点更适合加入路线。',
      },
      drive: {
        eyebrow: '3D 导览',
        title: '路线定好后，用 3D 方式预览一遍',
        body: '打开 3D 驾驶体验后，可以沿路线查看地标位置、城市关系和重点景点。',
      },
    },
    booking: {
      tabs: ['酒店', '景点', '路线', '3D 预览'],
      destination: '目的地',
      dates: '日期',
      guests: '出行人数',
      destinationValue: '意大利遗产路线',
      datesValue: '日期灵活',
      guestsValue: '2 位成人',
      submit: '搜索行程',
    },
    account: {
      title: '账户',
      body: '收藏、行程和登录状态会先保存在这台设备上。',
      email: '邮箱',
      name: '昵称',
      submit: '登录并保存',
      demo: '例如：意大利旅行者',
      cached: '已本地缓存',
      guest: '游客模式',
    },
    cache: {
      title: '本地缓存',
      body: '收藏、路线顺序、锁定景点和登录状态会保存在浏览器里；实时数据会在当前页面会话中缓存。',
      route: '路线停靠点',
      favorites: '收藏地点',
      mode: '模式',
      local: '本地保存',
      clear: '清空路线缓存',
    },
    destinationCta: '进入 3D',
    ratingLabel: '评分',
    routeSource: '规划路线',
    distanceUnit: 'km',
    durationUnit: '小时',
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
      city: '城市道路',
      motorway: '高速公路',
      scenic: '风景道路',
      mountain: '山地路段',
      bridge: '桥梁',
      tunnel: '隧道',
      ringRoad: '环城路',
    },
    segmentDescriptions: homeCopy.en.segmentDescriptions,
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
      pace: '节奏',
      relaxed: '轻松',
      standard: '标准',
      fast: '紧凑',
    },
  },
};

const refinedTravelGuide = {
  en: {
    ...travelGuide.en,
    hero: {
      ...travelGuide.en.hero,
      kicker: 'Italy heritage escapes',
      title: 'From Roman ruins to lagoon light, Italy is better by the road.',
      summary: 'Handpicked landmarks, coastal towns, historic streets, and scenic transfers for a route that feels less like a checklist and more like a journey.',
      secondaryCta: 'Plan route',
    },
  },
  zh: {
    ...travelGuide.zh,
    hero: {
      ...travelGuide.zh.hero,
      kicker: '意大利遗产之旅',
      title: '从古罗马遗迹，到泻湖晨光，一路驶进意大利。',
      summary: '精选地标、海岸小镇、古城街巷与风景路段，把一串目的地串成真正有节奏的旅程。',
      primaryCta: '打开 3D 路线',
      secondaryCta: '去排行程',
    },
    routePanel: {
      eyebrow: '建议路线',
      title: '从米兰一路南下到古罗马遗产',
      body: '从米兰和威尼斯出发，经过佛罗伦萨、比萨，再抵达罗马、庞贝和意大利南部遗产点。',
    },
    featurePanel: {
      eyebrow: '沉浸式导览',
      title: '3D 驾驶模式',
      body: '把已经排好的路线放进 3D 场景里，沿途查看地标、路线距离和模型预览。',
    },
  },
};

export function HomePage({ onOpenDrive, onOpenAmsterdam }) {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setActiveRouteIds = useAppStore((state) => state.setActiveRouteIds);
  const setActiveRouteGeometry = useAppStore((state) => state.setActiveRouteGeometry);
  const copy = refinedHomeCopy[language] ?? refinedHomeCopy.en;
  const guideCopy = refinedTravelGuide[language] ?? refinedTravelGuide.en;
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
  const [userSession, setUserSession] = useLocalStorageState('web3d.userSession', null);
  const [showLogin, setShowLogin] = useState(false);
  const [showAccountCenter, setShowAccountCenter] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageState('web3d.sidebarCollapsed', false);
  const [activeService, setActiveService] = useState(null);

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
    for (const landmark of landmarks) out.add(getLandmarkMeta(landmark.id, language)?.region?.[language] ?? '');
    return [...out].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [language]);

  const types = useMemo(() => {
    const out = new Set();
    for (const landmark of landmarks) out.add(getLandmarkMeta(landmark.id, language)?.type?.[language] ?? '');
    return [...out].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [language]);

  const seasons = useMemo(() => {
    const out = new Set();
    for (const landmark of landmarks) out.add(getLandmarkMeta(landmark.id, language)?.season?.[language] ?? '');
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
      const meta = getLandmarkMeta(landmark.id, language);
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
        const ac = getLandmarkMeta(a.id, language)?.city?.[language] ?? a.name;
        const bc = getLandmarkMeta(b.id, language)?.city?.[language] ?? b.name;
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
        const meta = getLandmarkMeta(landmark.id, language);
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
      .map((id) => getLandmarkMeta(id, language)?.city?.[language])
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
        const meta = getLandmarkMeta(id, language);
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

  const handleLogin = useCallback((payload) => {
    setUserSession({
      name: payload.name || payload.email.split('@')[0] || 'Traveler',
      email: payload.email,
      createdAt: new Date().toISOString(),
    });
    setShowLogin(false);
    setShowAccountCenter(true);
  }, [setUserSession]);

  const openLoginFromAccount = useCallback(() => {
    setShowAccountCenter(false);
    setShowLogin(true);
  }, []);

  const signOutFromAccount = useCallback(() => {
    setUserSession(null);
    setShowAccountCenter(false);
  }, [setUserSession]);

  const CompareModal = CompareModalV2;
  const DestinationGrid = DestinationGridV2;

  return (
    <div className={`travel-home ${language === 'zh' ? 'is-zh' : 'is-en'} travel-home--modern travel-home--neo ${sidebarCollapsed ? 'is-nav-collapsed' : ''}`}>
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
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        onOpenService={setActiveService}
      />

      <AccountAvatar
        copy={copy}
        language={language}
        userSession={userSession}
        onOpen={() => setShowAccountCenter((value) => !value)}
      />

      {showAccountCenter && (
        <AccountCenter
          copy={copy}
          language={language}
          userSession={userSession}
          favoritesCount={favoriteSet.size}
          compareCount={compareSet.size}
          routeCount={routeIds.length}
          itineraryDays={itineraryDays}
          onClose={() => setShowAccountCenter(false)}
          onSignIn={openLoginFromAccount}
          onSignOut={signOutFromAccount}
          onOpenPlanner={() => { setActivePage('planner'); setShowAccountCenter(false); }}
          onOpenFavorites={() => { setActivePage('destinations'); setShowAccountCenter(false); }}
          onResetRoute={resetRoute}
          onOpenService={(serviceId) => { setActiveService(serviceId); setShowAccountCenter(false); }}
        />
      )}

      {activePage === 'destinations' && (
        <header className="travel-hero">
          <div className="travel-hero__copy">
            <p className="travel-kicker">{guideCopy.hero.kicker}</p>
            <h1 className="travel-title">{guideCopy.hero.title}</h1>
            <p className="travel-summary">{guideCopy.hero.summary}</p>
            <BookingSearchStrip
              copy={copy}
              onSubmit={() => setActivePage('planner')}
              onOpenService={setActiveService}
            />
            <TripToolkit
              language={language}
              onPlan={() => setActivePage('planner')}
              onSaved={() => setActivePage('destinations')}
              onReviews={() => setActivePage('reviews')}
              onDrive={openDriveFromRoute}
            />

            <div className="travel-hero__actions">
              <button className="travel-btn travel-btn--primary" type="button" onClick={openDriveFromRoute}>{copy.actions.open3d}</button>
              <div className="travel-hero__quicklinks" aria-label={language === 'zh' ? '路线工具' : 'Route tools'}>
                <button type="button" onClick={() => setActivePage('planner')}>{guideCopy.hero.secondaryCta}</button>
                <button type="button" onClick={() => { window.location.hash = '#/v2'; }}>{copy.actions.openV2}</button>
                <button type="button" onClick={() => { window.location.hash = '#/v3'; }}>{copy.actions.openV3}</button>
                <button type="button" onClick={onOpenAmsterdam}>{copy.actions.openAmsterdam ?? 'Amsterdam VR'}</button>
              </div>
            </div>

            <ModernHeroTelemetryFixed
              language={language}
              routeIds={routeIds}
              distanceKm={routeMetrics.data?.distanceKm ?? itineraryStats.totalKm ?? currentRoute.distanceKm}
              durationHours={routeMetrics.data?.durationHours ?? currentRoute.durationHours}
            />
            <TripHeroGallery
              language={language}
              liveIndex={liveData.index}
              routeIds={routeIds}
              onOpenDrive={onOpenDrive}
            />
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
              placeholder={language === 'zh' ? copy.search.placeholder : routeSearchPlaceholder}
            />
            <AccountCachePanel
              copy={copy}
              userSession={userSession}
              favoritesCount={favoriteSet.size}
              routeCount={routeIds.length}
              onSignIn={() => setShowLogin(true)}
              onSignOut={() => setUserSession(null)}
              onClearRoute={resetRoute}
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

      {showLogin && (
        <LoginModal
          copy={copy}
          onClose={() => setShowLogin(false)}
          onLogin={handleLogin}
        />
      )}

      {activeService && (
        <TravelServicePanel
          serviceId={activeService}
          language={language}
          copy={copy}
          routeIds={routeIds}
          itinerary={itinerary}
          itineraryStats={itineraryStats}
          leadWeather={leadWeather.data}
          onClose={() => setActiveService(null)}
          onOpenPlanner={() => { setActivePage('planner'); setActiveService(null); }}
          onOpenDrive={() => { setActiveService(null); openDriveFromRoute(); }}
          onExport={exportItinerary}
        />
      )}
    </div>
  );
}

function BookingSearchStrip({ copy, onSubmit, onOpenService }) {
  const tabServices = ['hotels', 'tickets', 'transit', 'drive'];
  return (
    <form className="travel-booking-strip" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div className="travel-booking-tabs" role="tablist" aria-label="Travel services">
        {copy.booking.tabs.map((item, index) => (
          <button key={item} type="button" className={index === 0 ? 'is-active' : ''} onClick={() => onOpenService(tabServices[index] ?? 'hotels')}>{item}</button>
        ))}
      </div>
      <label>
        <span>{copy.booking.destination}</span>
        <strong>{copy.booking.destinationValue}</strong>
      </label>
      <label>
        <span>{copy.booking.dates}</span>
        <strong>{copy.booking.datesValue}</strong>
      </label>
      <label>
        <span>{copy.booking.guests}</span>
        <strong>{copy.booking.guestsValue}</strong>
      </label>
      <button type="submit">{copy.booking.submit}</button>
    </form>
  );
}

function TripToolkit({ language, onPlan, onSaved, onReviews, onDrive }) {
  const isZh = language === 'zh';
  const tools = isZh
    ? [
        { label: '智能排程', meta: '按距离和天数整理路线', onClick: onPlan },
        { label: '我的收藏', meta: '继续筛选想去的地方', onClick: onSaved },
        { label: '旅行口碑', meta: '先看背景和点评', onClick: onReviews },
        { label: '3D 预览', meta: '用空间视角检查路线', onClick: onDrive },
      ]
    : [
        { label: 'Smart plan', meta: 'Order stops by distance and days', onClick: onPlan },
        { label: 'Saved places', meta: 'Keep refining destinations', onClick: onSaved },
        { label: 'Travel notes', meta: 'Compare context and reviews', onClick: onReviews },
        { label: '3D preview', meta: 'Check the route spatially', onClick: onDrive },
      ];

  return (
    <div className="travel-toolkit" aria-label={isZh ? '旅行工具' : 'Trip tools'}>
      {tools.map((tool) => (
        <button key={tool.label} type="button" onClick={tool.onClick}>
          <strong>{tool.label}</strong>
          <span>{tool.meta}</span>
        </button>
      ))}
    </div>
  );
}

function buildServiceContent({ serviceId, language, routeIds, itinerary, itineraryStats, leadWeather }) {
  const isZh = language === 'zh';
  const stops = routeIds
    .map((id) => landmarks.find((item) => item.id === id))
    .filter(Boolean)
    .map((landmark) => ({ landmark, meta: getLandmarkMeta(landmark.id, language) }))
    .filter((item) => item.meta);
  const cities = [...new Map(stops.map(({ meta }) => [meta.city[language], meta])).entries()];
  const totalKm = Math.round(itineraryStats.totalKm || 0);
  const dayCount = Math.max(1, itinerary.length || 1);
  const budget = {
    hotel: dayCount * 145,
    food: dayCount * 72 * 2,
    tickets: Math.max(1, stops.length) * 22,
    transit: Math.max(120, Math.round(totalKm * 0.22)),
  };
  budget.total = budget.hotel + budget.food + budget.tickets + budget.transit;

  const commonTitles = {
    hotels: [isZh ? '酒店和住宿' : 'Hotels and stays', isZh ? '按路线城市给出住宿落点，方便把景点和交通串起来。' : 'Stay bases matched to the route cities so sightseeing and transfers stay practical.'],
    tickets: [isZh ? '门票和预约' : 'Tickets and entry', isZh ? '把需要提前关注的热门景点列出来，适合后续接真实票务 API。' : 'A reservation watchlist for busy stops, ready to connect to real ticket APIs later.'],
    food: [isZh ? '美食和餐厅' : 'Food and restaurants', isZh ? '按城市和地区给出用餐灵感，让行程不只是看景点。' : 'Dining ideas by city and region, so the trip is not only landmark-hopping.'],
    transit: [isZh ? '交通和接驳' : 'Transit and transfers', isZh ? '按路线顺序拆出城际转场，方便评估自驾、火车或短途接驳。' : 'Route transfers in order, useful for comparing driving, trains, and local hops.'],
    weather: [isZh ? '天气和出发建议' : 'Weather and timing', isZh ? '结合下一站实时天气缓存，给出出发参考。' : 'Uses the next-stop weather cache as a practical timing reference.'],
    budget: [isZh ? '预算估算' : 'Budget estimate', isZh ? '基于天数、停靠点和路线距离做本地估算。' : 'A local estimate based on days, stops, and route distance.'],
    guides: [isZh ? '城市攻略' : 'City guides', isZh ? '把每一站拆成可执行的旅行提醒。' : 'Actionable notes for each stop on the route.'],
    ai: [isZh ? 'AI 行程草案' : 'AI itinerary draft', isZh ? '根据当前路线和天数生成可调整的每日安排。' : 'A day-by-day draft generated from the current route and pace.'],
    drive: [isZh ? '3D 路线预览' : '3D route preview', isZh ? '进入 3D 前先确认路线长度、停靠点和模型覆盖。' : 'Check distance, stops, and 3D coverage before entering the scene.'],
  };

  const itemsByService = {
    hotels: cities.map(([city, meta], index) => ({
      title: city,
      value: isZh ? ['历史中心', '火车站周边', '景点步行圈'][index % 3] : ['Historic center', 'Station area', 'Walkable landmark zone'][index % 3],
      detail: isZh ? `${meta.region[language]} · 建议住 1 晚，靠近主要步行区。` : `${meta.region[language]} · Suggested 1 night near the walkable core.`,
    })),
    tickets: stops.slice(0, 8).map(({ landmark, meta }, index) => ({
      title: getLandmarkDisplayName(landmark, language),
      value: isZh ? (index % 2 ? '建议提前 3 天' : '热门时段需预约') : (index % 2 ? 'Book 3 days ahead' : 'Reserve busy slots'),
      detail: `${meta.city[language]} · ${meta.type[language]}`,
    })),
    food: cities.map(([city, meta], index) => ({
      title: city,
      value: isZh ? ['传统小馆', '咖啡和甜点', '晚餐街区'][index % 3] : ['Trattoria picks', 'Coffee and pastry', 'Dinner district'][index % 3],
      detail: isZh ? `${meta.region[language]} · 适合安排在景点之间的慢节奏时段。` : `${meta.region[language]} · Best placed between major sightseeing blocks.`,
    })),
    transit: routeIds.slice(0, -1).map((id, index) => {
      const from = getLandmarkMeta(id, language);
      const to = getLandmarkMeta(routeIds[index + 1], language);
      const km = from && to ? Math.round(haversineKm(from, to)) : 0;
      return {
        title: `${from?.city?.[language] ?? id} -> ${to?.city?.[language] ?? routeIds[index + 1]}`,
        value: `${km} km`,
        detail: isZh ? '可比较自驾、火车和本地接驳。' : 'Compare driving, rail, and local transfer options.',
      };
    }),
    weather: [{
      title: isZh ? '下一站天气' : 'Next-stop weather',
      value: leadWeather?.temperatureC != null ? `${Math.round(leadWeather.temperatureC)}°C` : (isZh ? '等待缓存' : 'Waiting for cache'),
      detail: leadWeather?.windKph != null ? `${isZh ? '风速' : 'Wind'} ${Math.round(leadWeather.windKph)} km/h` : (isZh ? '天气数据来自本地实时缓存。' : 'Weather comes from the local live-data cache.'),
    }, {
      title: isZh ? '出发建议' : 'Timing note',
      value: isZh ? '清晨 / 傍晚' : 'Morning / golden hour',
      detail: isZh ? '热门古城和广场尽量避开正午人流。' : 'Avoid the densest midday windows in historic cores.',
    }],
    budget: [
      { title: isZh ? '住宿' : 'Hotels', value: `€${budget.hotel}`, detail: `${dayCount} ${isZh ? '天估算' : 'days estimate'}` },
      { title: isZh ? '餐饮' : 'Food', value: `€${budget.food}`, detail: isZh ? '按 2 人估算' : 'Estimated for 2 travelers' },
      { title: isZh ? '门票' : 'Tickets', value: `€${budget.tickets}`, detail: `${stops.length} ${isZh ? '个停靠点' : 'route stops'}` },
      { title: isZh ? '交通' : 'Transit', value: `€${budget.transit}`, detail: `${totalKm} km` },
      { title: isZh ? '合计' : 'Total', value: `€${budget.total}`, detail: isZh ? '本地粗略预算，可继续接入真实价格。' : 'Local rough budget, ready for real pricing data.' },
    ],
    guides: stops.slice(0, 8).map(({ landmark, meta }) => ({
      title: getLandmarkDisplayName(landmark, language),
      value: meta.season[language],
      detail: isZh ? `${meta.city[language]} · 预留步行时间，优先安排光线好的时段。` : `${meta.city[language]} · Leave walking time and prioritize good light.`,
    })),
    ai: itinerary.map((day) => ({
      title: isZh ? `第 ${day.dayIndex} 天` : `Day ${day.dayIndex}`,
      value: day.stops.map((id) => getLandmarkMeta(id, language)?.city?.[language]).filter(Boolean).join(' / '),
      detail: day.stops.map((id) => {
        const landmark = landmarks.find((item) => item.id === id);
        return landmark ? getLandmarkDisplayName(landmark, language) : id;
      }).join(' -> '),
    })),
    drive: [
      { title: isZh ? '路线里程' : 'Route distance', value: `${formatDistanceKm(totalKm)} km`, detail: isZh ? '将用于 3D 场景路线预览。' : 'Used for the 3D scene route preview.' },
      { title: isZh ? '停靠点' : 'Stops', value: String(stops.length), detail: isZh ? '可从任意地标进入聚焦视角。' : 'Open focus mode from any landmark.' },
      { title: isZh ? '模型覆盖' : '3D model coverage', value: `${stops.filter(({ landmark }) => landmark.modelPath).length}/${stops.length}`, detail: isZh ? '无模型的地标会以位置标记显示。' : 'Stops without models appear as spatial markers.' },
    ],
  };

  const [title, body] = commonTitles[serviceId] ?? commonTitles.hotels;
  return { title, body, items: itemsByService[serviceId] ?? itemsByService.hotels };
}

function TravelServicePanel({
  serviceId,
  language,
  copy,
  routeIds,
  itinerary,
  itineraryStats,
  leadWeather,
  onClose,
  onOpenPlanner,
  onOpenDrive,
  onExport,
}) {
  const isZh = language === 'zh';
  const content = buildServiceContent({ serviceId, language, routeIds, itinerary, itineraryStats, leadWeather });
  const isDrive = serviceId === 'drive';
  const isAi = serviceId === 'ai';

  return (
    <div className="travel-service-modal" role="dialog" aria-modal="true" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="travel-service-panel">
        <div className="travel-service-panel__head">
          <div>
            <p>{isZh ? '旅行服务' : 'Travel service'}</p>
            <h2>{content.title}</h2>
            <span>{content.body}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">x</button>
        </div>

        <div className="travel-service-panel__list">
          {content.items.map((item, index) => (
            <article key={`${item.title}-${index}`} className={index === content.items.length - 1 && serviceId === 'budget' ? 'is-total' : ''}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>

        <div className="travel-service-panel__actions">
          <button className="travel-btn travel-btn--primary" type="button" onClick={isDrive ? onOpenDrive : onOpenPlanner}>
            {isDrive ? copy.actions.open3d : (isZh ? '打开行程' : 'Open trip')}
          </button>
          <button className="travel-btn travel-btn--ghost" type="button" onClick={isAi ? onExport : onOpenDrive}>
            {isAi ? copy.actions.export : copy.actions.open3d}
          </button>
        </div>
      </aside>
    </div>
  );
}

function TripHeroGallery({ language, liveIndex, routeIds, onOpenDrive }) {
  const isZh = language === 'zh';
  const galleryItems = routeIds
    .map((id) => landmarks.find((item) => item.id === id))
    .filter(Boolean)
    .map((landmark) => {
      const live = liveIndex?.get(landmark.id);
      const meta = getLandmarkMeta(landmark.id, language);
      return {
        id: landmark.id,
        name: getLandmarkDisplayName(landmark, language),
        city: meta?.city?.[language] ?? landmark.name,
        image: getLiveImage(live, language),
      };
    })
    .filter((item) => item.image)
    .slice(0, 5);

  if (galleryItems.length === 0) return null;

  return (
    <section className="travel-hero-gallery" aria-label={isZh ? '目的地图片' : 'Destination photos'}>
      {galleryItems.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={`travel-hero-gallery__tile travel-hero-gallery__tile--${index}`}
          onClick={() => onOpenDrive(item.id)}
        >
          <img src={item.image} alt="" loading={index === 0 ? 'eager' : 'lazy'} />
          <span>{item.city}</span>
          <strong>{item.name}</strong>
        </button>
      ))}
    </section>
  );
}

function AccountCachePanel({ copy, userSession, favoritesCount, routeCount, onSignIn, onSignOut, onClearRoute }) {
  return (
    <section className="travel-panel travel-panel--account-cache">
      <div className="travel-account-card">
        <div>
          <p className="travel-panel__eyebrow">{copy.account.title}</p>
          <h2>{userSession ? userSession.name : copy.account.guest}</h2>
          <p>{copy.account.body}</p>
        </div>
        <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={userSession ? onSignOut : onSignIn}>
          {userSession ? copy.actions.signOut : copy.actions.signIn}
        </button>
      </div>
      <dl className="travel-cache-grid">
        <div><dt>{copy.cache.route}</dt><dd>{routeCount}</dd></div>
        <div><dt>{copy.cache.favorites}</dt><dd>{favoritesCount}</dd></div>
        <div><dt>{copy.cache.mode}</dt><dd>{copy.cache.local}</dd></div>
      </dl>
      <p className="travel-cache-note">{copy.cache.body}</p>
      <button className="travel-cache-clear" type="button" onClick={onClearRoute}>{copy.cache.clear}</button>
    </section>
  );
}

function LoginModal({ copy, onClose, onLogin }) {
  const [email, setEmail] = useState('traveler@example.com');
  const [name, setName] = useState('');

  return (
    <div className="travel-modal" role="dialog" aria-modal="true" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <form className="travel-login-dialog" onSubmit={(event) => { event.preventDefault(); onLogin({ email, name }); }}>
        <div className="travel-modal__head">
          <div>
            <p className="travel-modal__eyebrow">{copy.account.cached}</p>
            <h2>{copy.account.title}</h2>
          </div>
          <button className="travel-modal__close" type="button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <p>{copy.account.body}</p>
        <label>
          <span>{copy.account.email}</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          <span>{copy.account.name}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.account.demo} />
        </label>
        <button className="travel-btn travel-btn--primary" type="submit">{copy.account.submit}</button>
      </form>
    </div>
  );
}

function ModernHeroTelemetryFixed({ language, routeIds, distanceKm, durationHours }) {
  const isZh = language === 'zh';
  const labels = isZh
    ? { status: '路线状态', distance: '路线里程', eta: '预计时间', stops: '停靠点' }
    : { status: 'Route status', distance: 'Route distance', eta: 'ETA', stops: 'Stops' };
  const visibleStops = routeIds
    .map((id) => getLandmarkMeta(id, language))
    .filter(Boolean)
    .slice(0, 6);
  const durationLabel = isZh
    ? `${Math.floor(durationHours || 0)} 小时${Math.round(((durationHours || 0) % 1) * 60) ? ` ${Math.round(((durationHours || 0) % 1) * 60)} 分钟` : ''}`
    : formatDurationHours(durationHours, language);

  return (
    <section className="travel-hero-telemetry" aria-label={labels.status}>
      <div className="travel-hero-telemetry__rail" aria-hidden="true">
        {visibleStops.map((stop, index) => (
          <span key={`${stop.name.en}-${index}`} style={{ ['--rail-index']: index }} />
        ))}
        <i />
      </div>
      <div className="travel-hero-telemetry__stats">
        <article>
          <span>{labels.distance}</span>
          <strong>{formatDistanceKm(distanceKm)} km</strong>
        </article>
        <article>
          <span>{labels.eta}</span>
          <strong>{durationLabel}</strong>
        </article>
        <article>
          <span>{labels.stops}</span>
          <strong>{routeIds.length}</strong>
        </article>
      </div>
    </section>
  );
}

function ModernHeroTelemetry({ language, routeIds, distanceKm, durationHours }) {
  const isZh = language === 'zh';
  const visibleStops = routeIds
    .map((id) => getLandmarkMeta(id, language))
    .filter(Boolean)
    .slice(0, 6);

  return (
    <section className="travel-hero-telemetry" aria-label={isZh ? '路线状态' : 'Route status'}>
      <div className="travel-hero-telemetry__rail" aria-hidden="true">
        {visibleStops.map((stop, index) => (
          <span key={`${stop.name.en}-${index}`} style={{ ['--rail-index']: index }} />
        ))}
        <i />
      </div>
      <div className="travel-hero-telemetry__stats">
        <article>
          <span>{isZh ? '路线里程' : 'Route distance'}</span>
          <strong>{formatDistanceKm(distanceKm)} km</strong>
        </article>
        <article>
          <span>{isZh ? '预计时间' : 'ETA'}</span>
          <strong>{formatDurationHours(durationHours, language)}</strong>
        </article>
        <article>
          <span>{isZh ? '停靠点' : 'Stops'}</span>
          <strong>{routeIds.length}</strong>
        </article>
      </div>
    </section>
  );
}

function getAccountInitial(userSession, language) {
  if (!userSession?.name) return language === 'zh' ? '我' : 'U';
  return userSession.name.trim().slice(0, 1).toUpperCase();
}

function AccountAvatar({ copy, language, userSession, onOpen }) {
  return (
    <button
      className={`travel-account-avatar ${userSession ? 'is-signed-in' : ''}`}
      type="button"
      onClick={onOpen}
      aria-label={userSession ? `${copy.account.title}: ${userSession.name}` : copy.actions.signIn}
      title={userSession ? userSession.name : copy.actions.signIn}
    >
      <span>{getAccountInitial(userSession, language)}</span>
    </button>
  );
}

function AccountCenter({
  copy,
  language,
  userSession,
  favoritesCount,
  compareCount,
  routeCount,
  itineraryDays,
  onClose,
  onSignIn,
  onSignOut,
  onOpenPlanner,
  onOpenFavorites,
  onResetRoute,
  onOpenService,
}) {
  const isZh = language === 'zh';
  const displayName = userSession?.name || (isZh ? '游客' : 'Guest');
  const email = userSession?.email || (isZh ? '登录后同步你的旅行资料' : 'Sign in to keep your travel profile');
  const accountServices = isZh
    ? [
        { id: 'hotels', label: '酒店', detail: '住宿落点' },
        { id: 'tickets', label: '门票', detail: '预约清单' },
        { id: 'budget', label: '预算', detail: '费用估算' },
        { id: 'ai', label: 'AI', detail: '行程草案' },
      ]
    : [
        { id: 'hotels', label: 'Hotels', detail: 'Stay bases' },
        { id: 'tickets', label: 'Tickets', detail: 'Entry watchlist' },
        { id: 'budget', label: 'Budget', detail: 'Cost estimate' },
        { id: 'ai', label: 'AI', detail: 'Itinerary draft' },
      ];

  return (
    <aside className="travel-account-center" role="dialog" aria-label={isZh ? '个人中心' : 'Profile center'}>
      <div className="travel-account-center__head">
        <div className="travel-account-center__avatar">{getAccountInitial(userSession, language)}</div>
        <div>
          <h2>{displayName}</h2>
          <p>{email}</p>
        </div>
        <button type="button" className="travel-account-center__close" onClick={onClose} aria-label="Close">x</button>
      </div>

      <div className="travel-account-center__stats">
        <button type="button" onClick={onOpenFavorites}>
          <strong>{favoritesCount}</strong>
          <span>{copy.actions.favorites}</span>
        </button>
        <button type="button" onClick={onOpenPlanner}>
          <strong>{routeCount}</strong>
          <span>{copy.nav[1].label}</span>
        </button>
        <button type="button" onClick={onOpenFavorites}>
          <strong>{compareCount}</strong>
          <span>{copy.actions.compare}</span>
        </button>
      </div>

      <div className="travel-account-center__section">
        <h3>{isZh ? '我的旅行' : 'My trip'}</h3>
        <button type="button" onClick={onOpenPlanner}>
          <span>{isZh ? '当前行程' : 'Current itinerary'}</span>
          <strong>{routeCount} {isZh ? '站' : 'stops'} / {itineraryDays} {isZh ? '天' : 'days'}</strong>
        </button>
        <button type="button" onClick={onOpenFavorites}>
          <span>{isZh ? '收藏夹' : 'Saved places'}</span>
          <strong>{favoritesCount}</strong>
        </button>
        <button type="button" onClick={onResetRoute}>
          <span>{copy.cache.clear}</span>
          <strong>{copy.cache.local}</strong>
        </button>
      </div>

      <div className="travel-account-center__section">
        <h3>{isZh ? '服务' : 'Services'}</h3>
        <div className="travel-account-center__chips travel-account-center__chips--actions">
          {accountServices.map((item) => (
            <button key={item.id} type="button" onClick={() => onOpenService(item.id)}>
              <span>{item.label}</span>
              <strong>{item.detail}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="travel-account-center__actions">
        {userSession
          ? <button type="button" className="travel-btn travel-btn--ghost" onClick={onSignOut}>{copy.actions.signOut}</button>
          : <button type="button" className="travel-btn travel-btn--primary" onClick={onSignIn}>{copy.actions.signIn}</button>}
      </div>
    </aside>
  );
}

function getNavIcon(id) {
  const icons = {
    destinations: 'D',
    planner: 'T',
    reviews: 'R',
    drive: '3D',
  };
  return icons[id] ?? id.slice(0, 1).toUpperCase();
}

function getTravelServices(language) {
  if (language === 'zh') {
    return [
      { id: 'hotels', label: '酒店', detail: '住宿推荐', target: 'destinations' },
      { id: 'tickets', label: '门票', detail: '景点预约', target: 'destinations' },
      { id: 'food', label: '美食', detail: '餐厅灵感', target: 'reviews' },
      { id: 'transit', label: '交通', detail: '路线接驳', target: 'planner' },
      { id: 'weather', label: '天气', detail: '出发参考', target: 'destinations' },
      { id: 'budget', label: '预算', detail: '花费估算', target: 'planner' },
      { id: 'guides', label: '攻略', detail: '城市贴士', target: 'reviews' },
      { id: 'ai', label: 'AI', detail: '智能行程', target: 'planner' },
    ];
  }
  return [
    { id: 'hotels', label: 'Hotels', detail: 'Stay ideas', target: 'destinations' },
    { id: 'tickets', label: 'Tickets', detail: 'Attraction entry', target: 'destinations' },
    { id: 'food', label: 'Food', detail: 'Restaurant notes', target: 'reviews' },
    { id: 'transit', label: 'Transit', detail: 'Route transfers', target: 'planner' },
    { id: 'weather', label: 'Weather', detail: 'Trip timing', target: 'destinations' },
    { id: 'budget', label: 'Budget', detail: 'Cost outline', target: 'planner' },
    { id: 'guides', label: 'Guides', detail: 'City tips', target: 'reviews' },
    { id: 'ai', label: 'AI', detail: 'Smart plan', target: 'planner' },
  ];
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
  collapsed,
  onToggleCollapsed,
  onOpenService,
}) {
  const navIndex = Math.max(0, copy.nav.findIndex((item) => item.id === activePage));

  return (
    <aside className={`travel-site-nav ${collapsed ? 'is-collapsed' : ''}`}>
      <button
        className="travel-nav-collapse"
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? (language === 'zh' ? '展开侧边栏' : 'Expand sidebar') : (language === 'zh' ? '收起侧边栏' : 'Collapse sidebar')}
      >
        <span>{collapsed ? '>' : '<'}</span>
      </button>
      <button className="travel-brand" type="button" onClick={() => setActivePage('destinations')} aria-label="Web3D Italy Drive home">
        <span>{copy.brand.eyebrow}</span>
        <strong>{copy.brand.title}</strong>
      </button>

      <div className="travel-nav-links travel-neo-nav-links" style={{ ['--nav-count']: copy.nav.length, ['--nav-index']: navIndex }}>
        <span className="travel-nav-links__indicator" aria-hidden="true" />
        {copy.nav.map((item) => (
          <button key={item.id} type="button" className={item.id === activePage ? 'is-active' : ''} onClick={() => setActivePage(item.id)} title={item.label}>
            <span className="travel-nav-icon">{getNavIcon(item.id)}</span>
            <span className="travel-nav-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="travel-sidebar-services" aria-label={language === 'zh' ? '旅行服务' : 'Travel services'}>
        {getTravelServices(language).map((service) => (
          <button key={service.label} type="button" onClick={() => onOpenService(service.id)} title={`${service.label} · ${service.detail}`}>
            <strong>{service.label}</strong>
            <span>{service.detail}</span>
          </button>
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
        <div><dt>{isZh ? '场景' : 'Scene'}</dt><dd>{isZh ? '城市漫游' : 'City roaming'}</dd></div>
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
        const meta = getLandmarkMeta(landmark.id, language);
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
                <span>{language === 'zh' ? '背景资料' : 'Background'}</span>
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
            const meta = getLandmarkMeta(landmark.id, language);
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
          const meta = getLandmarkMeta(id, language);
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
      const meta = getLandmarkMeta(id, language);
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
      ? (language === 'zh' ? '正在生成推荐路线...' : 'Calculating the recommended route...')
      : routeGeometry
        ? (language === 'zh' ? '已根据城市道路和停靠点绘制路线。' : 'Route drawn from roads and selected stops.')
        : (language === 'zh' ? '暂时显示停靠点和主要交通走廊。' : 'Showing selected stops and main travel corridors for now.');

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
                const meta = getLandmarkMeta(id, language);
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
          ? <small><a href={sourceUrl} target="_blank" rel="noreferrer">{language === 'zh' ? '查看背景资料' : 'Read background'}</a></small>
          : <small>{language === 'zh' ? '背景资料' : 'Background'}</small>}
      </article>
    );
  }
  if (wiki.isLoading) return <article className="travel-review-card"><p>{language === 'zh' ? '正在加载...' : 'Loading...'}</p><small>{language === 'zh' ? '背景资料' : 'Background'}</small></article>;
  if (!wiki.data?.extract) return <article className="travel-review-card"><p>-</p><small>{language === 'zh' ? '背景资料' : 'Background'}</small></article>;
  return (
    <article className="travel-review-card">
      <p>{wiki.data.extract}</p>
      <small>{language === 'zh' ? '背景资料' : 'Background'}</small>
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
  const meta = getLandmarkMeta(landmark.id, language);
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
            ? <a href={sourceUrl} target="_blank" rel="noreferrer">{language === 'zh' ? '查看背景资料' : 'Read background'}</a>
            : <span>{language === 'zh' ? '背景资料' : 'Background'}</span>}
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
        const meta = getLandmarkMeta(landmark.id, language);
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
    meta: getLandmarkMeta(landmark.id, language),
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
    meta: getLandmarkMeta(landmark.id, language),
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
