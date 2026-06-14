import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { landmarks } from '../../data/landmarks.js';
import { italyOutlineGeoJson } from '../../data/italyOutline.js';
import { useAppStore } from '../../state/useAppStore.js';
import { fetchRouteMetrics, useRouteMetrics } from '../../hooks/useRouteMetrics.js';
import {
  PACE_DAILY_HOURS,
  PACE_PROFILES,
  createGuideItineraryPlan,
  plannedVisitHoursForLandmark,
} from '../../lib/itinerarySchedule.js';
import liveLandmarksData from '../../../public/data/live-landmarks.json';

const ACTIVE_HOME_VERSION = { id: 'cinema', accent: '#80d7ff' };

const storyModelPaths = {
  colosseum: '/models/romes_colosseum.glb',
  pisa: '/models/pisas_tower.glb',
  florence: '/models/santa-maria-del-fiore/source/Santa%20Maria.glb',
};

const liveIndex = new Map((liveLandmarksData.items ?? []).map((item) => [item.id, item]));
const routeMatrixIds = liveLandmarksData.routeMatrix?.ids ?? [];
const routeMatrixIndex = new Map(routeMatrixIds.map((id, index) => [id, index]));
const initialRouteIds = ['milan_duomo', 'venice_rialto', 'florence_duomo', 'pisa', 'colosseum', 'pompeii'];
const classicRouteIds = ['colosseum', 'florence_duomo', 'pisa', 'venice_rialto', 'milan_duomo'];

const STORY_PARTICLE_COUNT = 7600;
const STORY_MODEL_SAMPLE_COUNT = 8200;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatHours(value, digits = 1) {
  return safeNumber(value).toFixed(digits);
}

function formatKm(value) {
  const km = safeNumber(value);
  if (km > 0 && km < 1) return `${Math.max(1, Math.round(km * 1000))} m`;
  return `${Math.round(km)} km`;
}

function formatDuration(value) {
  const hours = safeNumber(value);
  if (hours > 0 && hours < 0.05) return `${Math.max(1, Math.round(hours * 60))} min`;
  return `${formatHours(hours)} h`;
}

function textValue(value, language = 'en') {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) return value.map((item) => textValue(item, language)).filter(Boolean).join(' / ');
  if (typeof value === 'object') {
    return textValue(value[language] ?? value.en ?? value.zh ?? value.label ?? value.name ?? '', language);
  }
  return '';
}
const AUTH_TOKEN_KEY = 'web3d_auth_token';
const HOME_ENTERED_KEY = 'trip3d_home_entered';
const ONBOARDING_SEEN_KEY = 'trip3d_onboarding_seen';
const ROUTE_IDS_KEY = 'trip3d_route_ids';
const FAVORITES_KEY = 'trip3d_favorites';
const COMPARE_KEY = 'trip3d_compare';
const DAYS_KEY = 'trip3d_days';
const PACE_KEY = 'trip3d_pace';
const LANGUAGE_KEY = 'trip3d_language';
const MY_REVIEWS_KEY = 'trip3d_my_reviews';
const MAX_TRIP_DAYS = 30;

const paceDailyHours = PACE_DAILY_HOURS;
const paceLabels = {
  en: { Relaxed: 'Relaxed', Standard: 'Standard', Fast: 'Fast' },
  zh: { Relaxed: '轻松', Standard: '标准', Fast: '紧凑' },
};
const paceProfiles = PACE_PROFILES;
const imageFallbacks = {
  italy_q1466700: 'https://commons.wikimedia.org/wiki/Special:FilePath/City%20of%20Rome%20during%20time%20of%20republic.jpg',
};

const storyScenes = [
  {
    id: 'intro',
    kind: 'chaos',
    side: 'center',
    title: 'Italy',
  },
  {
    id: 'colosseum',
    kind: 'colosseum',
    side: 'right',
    title: 'Colosseum',
  },
  {
    id: 'pisa',
    kind: 'pisa',
    side: 'left',
    title: 'Leaning Tower of Pisa',
    modelScale: 0.78,
  },
  {
    id: 'florence',
    kind: 'florence',
    side: 'right',
    title: 'Santa Maria del Fiore',
  },
];



const regionLabels = {
  en: { North: 'North', Central: 'Central', South: 'South', Islands: 'Islands' },
  zh: { North: '\u5317\u90e8', Central: '\u4e2d\u90e8', South: '\u5357\u90e8', Islands: '\u5c9b\u5c7f' },
};

const kindLabels = {
  en: {},
  zh: {
    arena: '\u7ade\u6280\u573a',
    bridge: '\u6865\u6881',
    castle: '\u57ce\u5821',
    cathedral: '\u6559\u5802',
    coast: '\u6d77\u5cb8',
    dome: '\u7a79\u9876',
    fountain: '\u55b7\u6cc9',
    lake: '\u6e56\u6cca',
    monument: '\u7eaa\u5ff5\u5730\u6807',
    mountain: '\u5c71\u5730',
    palace: '\u5bab\u6bbf',
    ruins: '\u9057\u5740',
    temple: '\u795e\u5e99',
    tower: '\u5854\u697c',
    village: '\u6751\u9547',
  },
};

const seasonLabels = {
  en: {},
  zh: {
    Spring: '\u6625\u5b63',
    Summer: '\u590f\u5b63',
    Autumn: '\u79cb\u5b63',
    Morning: '\u6e05\u6668',
    Afternoon: '\u4e0b\u5348',
    Evening: '\u591c\u665a',
    Flexible: '\u7075\u6d3b',
  },
};




function liveFor(id) {
  return liveIndex.get(id);
}

function nameFor(landmark, language) {
  const live = liveFor(landmark.id);
  return landmark.localizedNames?.[language]
    || live?.name?.[language]
    || landmark.localizedNames?.en
    || live?.name?.en
    || landmark.name;
}

const summaryFallbacks = {
  pompeii: {
    zh: '庞贝是意大利南部的一座古罗马城市遗址。公元 79 年维苏威火山喷发后，城市被火山灰掩埋，街道、住宅、剧场与壁画因此得到保存。',
    en: 'Pompeii is an ancient Roman city near Naples. It was buried by the eruption of Mount Vesuvius in AD 79, preserving streets, homes, theatres, and frescoes.',
  },
};

function cleanWikipediaExtract(value) {
  return String(value ?? '')
    .replace(/\{\{[\s\S]*?\}\}/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function summaryFor(landmark, language) {
  const live = liveFor(landmark.id);
  const localized = cleanWikipediaExtract(live?.wikipedia?.[language]?.extract);
  if (localized.length >= 24) return localized;
  const fallback = summaryFallbacks[landmark.id]?.[language];
  if (fallback) return fallback;
  const english = cleanWikipediaExtract(live?.wikipedia?.en?.extract);
  return english || cleanWikipediaExtract(landmark.description);
}

function imageFor(landmark, language) {
  const live = liveFor(landmark.id);
  return live?.wikipedia?.[language]?.thumbnail
    || live?.wikipedia?.en?.thumbnail
    || live?.wikidata?.image
    || imageFallbacks[landmark.id]
    || '';
}

function pageUrlFor(landmark, language) {
  const live = liveFor(landmark.id);
  return live?.wikipedia?.[language]?.pageUrl || live?.wikipedia?.en?.pageUrl || live?.wikidata?.source || '';
}

function regionFor(landmark) {
  if (landmark.lat > 44.6) return 'North';
  if (landmark.lat > 42.5) return 'Central';
  if (landmark.lat > 39.8) return 'South';
  return 'Islands';
}

function locationValue(landmark, field, language) {
  const liveValue = cleanWikipediaExtract(textValue(liveFor(landmark.id)?.location?.[field], language));
  if (liveValue) return liveValue;
  return cleanWikipediaExtract(textValue(landmark.location?.[field], language));
}

function locationLabel(landmark, language) {
  return [
    locationValue(landmark, 'city', language),
    locationValue(landmark, 'province', language),
    locationValue(landmark, 'region', language),
  ].filter((value, index, values) => value && values.indexOf(value) === index).join(' / ');
}

function normalizeSearchText(value) {
  return textValue(value)
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[(),，。·/\\_-]/g, ' ')
    .replace(/(?:城内|市内|附近|周边|里面|当地|景点|地点|地方|旅游|旅行|attractions?|sights?|places?|near|in city)/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length];
}

function fuzzyFieldScore(query, value, weight) {
  const normalized = normalizeSearchText(value);
  if (!normalized) return 0;
  if (normalized === query) return weight;
  if (normalized.startsWith(query)) return weight * 0.9;
  if (normalized.includes(query) || query.includes(normalized)) return weight * 0.78;
  if (query.length < 3) return 0;
  const words = normalized.split(' ');
  const distance = Math.min(...words.map((word) => editDistance(query, word)));
  const maxLength = Math.max(query.length, ...words.map((word) => word.length));
  const similarity = 1 - distance / Math.max(1, maxLength);
  return similarity >= 0.68 ? weight * similarity * 0.65 : 0;
}

function landmarkSearchScore(landmark, rawQuery, language) {
  const query = normalizeSearchText(rawQuery);
  if (!query) return 1;
  const live = liveFor(landmark.id);
  const aliases = [
    ...(live?.search?.aliases?.[language] ?? []),
    ...(live?.search?.aliases?.en ?? []),
    ...(landmark.searchMeta?.aliases?.[language] ?? []),
    ...(landmark.searchMeta?.aliases?.en ?? []),
  ].map((value) => textValue(value, language)).filter(Boolean);
  const tags = [
    ...(live?.search?.tags?.[language] ?? []),
    ...(live?.search?.tags?.en ?? []),
    ...(landmark.searchMeta?.tags?.[language] ?? []),
    ...(landmark.searchMeta?.tags?.en ?? []),
  ].map((value) => textValue(value, language)).filter(Boolean);
  const fields = [
    [nameFor(landmark, language), 120],
    [landmark.name, 105],
    ...aliases.map((value) => [value, 100]),
    [locationValue(landmark, 'city', language), 115],
    [locationValue(landmark, 'administrativeArea', language), 90],
    [locationValue(landmark, 'province', language), 82],
    [locationValue(landmark, 'region', language), 76],
    [locationValue(landmark, 'country', language), 35],
    [kindText(landmark, language), 55],
    [landmark.modelKind, 50],
    ...tags.map((value) => [value, 45]),
  ];
  return fields.reduce((best, [value, weight]) => Math.max(best, fuzzyFieldScore(query, value, weight)), 0);
}

function seasonFor(landmark) {
  const map = {
    coast: 'Spring',
    lake: 'Summer',
    mountain: 'Autumn',
    ruins: 'Morning',
    cathedral: 'Afternoon',
    arena: 'Evening',
  };
  return map[landmark.modelKind] ?? 'Flexible';
}

function regionText(landmark, language) {
  const region = regionFor(landmark);
  return regionLabels[language]?.[region] ?? region;
}

function locationFilterOptions(language) {
  const byRegion = new Map();
  landmarks.forEach((stop) => {
    const region = locationValue(stop, 'region', language) || regionText(stop, language);
    const city = locationValue(stop, 'city', language);
    if (!region) return;
    if (!byRegion.has(region)) byRegion.set(region, new Set());
    if (city) byRegion.get(region).add(city);
  });
  return [...byRegion.entries()]
    .sort(([a], [b]) => a.localeCompare(b, language === 'zh' ? 'zh-CN' : 'en'))
    .flatMap(([region, cities]) => [
      { value: `region:${region}`, label: homeText(language, `全部 ${region}`, `All ${region}`), group: region },
      ...[...cities]
        .sort((a, b) => a.localeCompare(b, language === 'zh' ? 'zh-CN' : 'en'))
        .map((city) => ({ value: `city:${city}`, label: city, group: region })),
    ]);
}

function locationMatchesFilter(stop, value, language) {
  if (value === 'any') return true;
  const [scope, target] = value.split(':');
  if (!target) return regionFor(stop) === value;
  if (scope === 'city') return locationValue(stop, 'city', language) === target;
  if (scope === 'region') {
    return [locationValue(stop, 'region', language), locationValue(stop, 'province', language), regionText(stop, language)].includes(target);
  }
  return true;
}

function kindText(landmark, language) {
  return kindLabels[language]?.[landmark.modelKind]
    ?? (language === 'zh' ? '其他类型' : landmark.modelKind);
}

function filterOptionLabel(value, language) {
  if (typeof value === 'object') return value.label;
  return kindLabels[language]?.[value]
    ?? seasonLabels[language]?.[value]
    ?? regionLabels[language]?.[value]
    ?? (language === 'zh' ? '其他类型' : value);
}

function seasonText(landmark, language) {
  const season = seasonFor(landmark);
  return seasonLabels[language]?.[season] ?? season;
}



function routeDistanceForIds(routeIds) {
  const stops = routeIds.map((id) => landmarks.find((stop) => stop.id === id)).filter(Boolean);
  return routeSegmentsFor(stops).reduce((sum, segment) => sum + segment.distance, 0);
}

function segmentDistanceKm(a, b) {
  if (!a || !b) return 0;
  const fromIndex = routeMatrixIndex.get(a.id);
  const toIndex = routeMatrixIndex.get(b.id);
  const distance = liveLandmarksData.routeMatrix?.distancesKm?.[fromIndex]?.[toIndex];
  if (Number.isFinite(distance)) return distance;
  return geographicDistanceKm(a, b) * 1.22;
}

function geographicDistanceKm(a, b) {
  if (!a || !b) return 0;
  const earthRadiusKm = 6371;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const deltaLat = (b.lat - a.lat) * Math.PI / 180;
  const deltaLon = (b.lon - a.lon) * Math.PI / 180;
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function segmentDurationHours(distance, source = 'estimated', travelMode = 'DRIVE') {
  if (!Number.isFinite(distance) || distance <= 0) return 0;
  if (travelMode === 'WALK') return distance / 4.5;
  if (distance <= 8) return distance / 24;
  return distance / (source === 'osrm' ? 58 : 58);
}

function routeDistanceForOrderedIds(routeIds, distanceForStops = segmentDistanceKm) {
  return routeIds.slice(1).reduce((total, id, index) => {
    const from = landmarks.find((stop) => stop.id === routeIds[index]);
    const to = landmarks.find((stop) => stop.id === id);
    const distance = distanceForStops(from, to);
    return total + (Number.isFinite(distance) ? distance : 0);
  }, 0);
}

function improveRouteWithTwoOpt(routeIds, { preserveEnds = true, distanceForStops = segmentDistanceKm } = {}) {
  if (routeIds.length < 4) return routeIds;
  let best = [...routeIds];
  let bestDistance = routeDistanceForOrderedIds(best, distanceForStops);
  let improved = true;

  while (improved) {
    improved = false;
    const startMin = preserveEnds ? 1 : 0;
    const endMax = preserveEnds ? best.length - 1 : best.length;
    for (let start = startMin; start < endMax - 1; start += 1) {
      for (let end = start + 1; end < endMax; end += 1) {
        const candidate = [
          ...best.slice(0, start),
          ...best.slice(start, end + 1).reverse(),
          ...best.slice(end + 1),
        ];
        const candidateDistance = routeDistanceForOrderedIds(candidate, distanceForStops);
        if (candidateDistance + 0.1 < bestDistance) {
          best = candidate;
          bestDistance = candidateDistance;
          improved = true;
        }
      }
    }
  }

  return best;
}

function cityKeyForId(id, language = 'en') {
  const stop = landmarks.find((item) => item.id === id);
  return stop ? locationValue(stop, 'city', language) || locationValue(stop, 'city', 'en') : '';
}

function isSingleCityRouteIds(routeIds) {
  const cityKeys = new Set(routeIds.map((id) => cityKeyForId(id)).filter(Boolean));
  return routeIds.length >= 3 && cityKeys.size === 1;
}

function nearestRouteFromStart(chunk, startId) {
  const ordered = [startId];
  const remaining = new Set(chunk.filter((id) => id !== startId));
  let cursor = startId;
  while (remaining.size) {
    const from = landmarks.find((stop) => stop.id === cursor);
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const id of remaining) {
      const to = landmarks.find((stop) => stop.id === id);
      const distance = geographicDistanceKm(from, to);
      if (distance < bestDistance) {
        best = id;
        bestDistance = distance;
      }
    }
    const next = best ?? remaining.values().next().value;
    ordered.push(next);
    remaining.delete(next);
    cursor = next;
  }
  return ordered;
}

function optimizeSingleCityChunk(chunk) {
  if (chunk.length < 3) return chunk;
  return chunk
    .map((id) => improveRouteWithTwoOpt(nearestRouteFromStart(chunk, id), {
      preserveEnds: false,
      distanceForStops: geographicDistanceKm,
    }))
    .sort((a, b) => (
      routeDistanceForOrderedIds(a, geographicDistanceKm) - routeDistanceForOrderedIds(b, geographicDistanceKm)
    ))[0] ?? chunk;
}

function optimizeRouteIds(routeIds, lockedIds) {
  const locked = new Set(lockedIds);
  const output = [...routeIds];
  let start = 0;

  while (start < output.length) {
    while (start < output.length && locked.has(output[start])) start += 1;
    let end = start;
    while (end < output.length && !locked.has(output[end])) end += 1;
    const chunk = output.slice(start, end);
    if (chunk.length > 2) {
      if (isSingleCityRouteIds(chunk) && !output[start - 1] && !output[end]) {
        output.splice(start, chunk.length, ...optimizeSingleCityChunk(chunk));
        start = end + 1;
        continue;
      }
      const ordered = [];
      const remaining = new Set(chunk);
      let cursor = output[start - 1] ?? chunk[0];
      if (remaining.has(cursor)) {
        ordered.push(cursor);
        remaining.delete(cursor);
      }
      while (remaining.size) {
        const from = landmarks.find((stop) => stop.id === cursor) ?? landmarks.find((stop) => stop.id === ordered[ordered.length - 1]);
        let best = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const id of remaining) {
          const to = landmarks.find((stop) => stop.id === id);
          const distance = segmentDistanceKm(from, to);
          if (distance < bestDistance) {
            best = id;
            bestDistance = distance;
          }
        }
        const next = best ?? remaining.values().next().value;
        ordered.push(next);
        remaining.delete(next);
        cursor = next;
      }
      output.splice(start, chunk.length, ...improveRouteWithTwoOpt(ordered));
    }
    start = end + 1;
  }

  return output;
}

function sortRouteIdsByLatitude(routeIds, lockedIds, direction) {
  const locked = new Set(lockedIds);
  const unlockedIds = routeIds
    .filter((id) => !locked.has(id))
    .sort((a, b) => {
      const aStop = landmarks.find((stop) => stop.id === a);
      const bStop = landmarks.find((stop) => stop.id === b);
      return direction * ((bStop?.lat ?? 0) - (aStop?.lat ?? 0));
    });
  let unlockedIndex = 0;
  return routeIds.map((id) => (locked.has(id) ? id : unlockedIds[unlockedIndex++]));
}

function sortRouteIdsByCorridor(routeIds, lockedIds, direction = 1) {
  const locked = new Set(lockedIds);
  const stops = routeIds
    .filter((id) => !locked.has(id))
    .map((id) => landmarks.find((stop) => stop.id === id))
    .filter(Boolean)
    .sort((a, b) => {
      const aScore = a.lat * 1.8 + a.lon * 0.35;
      const bScore = b.lat * 1.8 + b.lon * 0.35;
      return direction * (bScore - aScore);
    })
    .map((stop) => stop.id);
  let index = 0;
  return routeIds.map((id) => (locked.has(id) ? id : stops[index++]));
}



function smoothUnlockedRouteIds(routeIds, lockedIds) {
  const locked = new Set(lockedIds);
  const output = [...routeIds];
  let start = 0;
  while (start < output.length) {
    while (start < output.length && locked.has(output[start])) start += 1;
    let end = start;
    while (end < output.length && !locked.has(output[end])) end += 1;
    const chunk = output.slice(start, end);
    if (chunk.length > 3) output.splice(start, chunk.length, ...improveRouteWithTwoOpt(chunk));
    start = end + 1;
  }
  return output;
}

function buildRouteRecommendations(routeIds, lockedIds, language) {
  if (routeIds.length < 2) return [];
  const currentDistance = routeDistanceForIds(routeIds);
  const candidates = [
    {
      id: 'current',
      title: homeText(language, '当前顺序', 'Current order'),
      detail: homeText(language, '保留你现在手动排列的路线，用真实道路结果一起比较。', 'Keep your current manual order and compare it with routed results.'),
      ids: routeIds,
    },
    {
      id: 'shortest',
      title: homeText(language, '减少回头', 'Less backtracking'),
      detail: homeText(language, '先用距离估算找更近的下一站，选择后再加载真实道路校验。', 'Choose the nearest next stop first, then verify it with live routing after selection.'),
      ids: optimizeRouteIds(routeIds, lockedIds),
    },
    {
      id: 'south-north',
      title: homeText(language, '从南向北', 'South to north'),
      detail: homeText(language, '适合从南部出发，逐步向北移动。', 'Useful when starting in the south and moving north.'),
      ids: sortRouteIdsByLatitude(routeIds, lockedIds, -1),
    },
    {
      id: 'north-south',
      title: homeText(language, '从北向南', 'North to south'),
      detail: homeText(language, '减少跨区域往返，适合一路向南的行程。', 'Reduce regional backtracking on a southbound trip.'),
      ids: sortRouteIdsByLatitude(routeIds, lockedIds, 1),
    },
  ];
  const seen = new Set();
  return candidates
    .filter((candidate) => {
      const signature = candidate.ids.join('|');
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    })
    .map((candidate) => {
      const distance = routeDistanceForIds(candidate.ids);
      return {
        ...candidate,
        distance,
        savedKm: Number.isFinite(currentDistance - distance) ? Math.max(0, currentDistance - distance) : 0,
      };
    });
}

function routeSignatureFor(routeIds) {
  return routeIds.filter(Boolean).join('|');
}

function routeProviderLabel(mode, language) {
  if (mode === 'google-routes') return 'Google Routes';
  if (mode === 'osrm') return 'OSRM';
  if (mode === 'mixed') return homeText(language, '混合规划', 'Mixed routing');
  return homeText(language, '坐标估算', 'Estimated');
}

function travelModeLabel(mode, language) {
  if (mode === 'FERRY_DRIVE') return homeText(language, '车渡轮', 'Car ferry');
  if (mode === 'FERRY') return homeText(language, '\u8f6e\u6e21', 'Ferry');
  if (mode === 'MIXED') return homeText(language, '混合', 'Mixed');
  if (mode === 'WALK') return homeText(language, '步行', 'Walking');
  return homeText(language, '驾车', 'Driving');
}

function routeDetourHint(segment, routePreference, language) {
  if (
    segment.travelMode !== 'DRIVE'
    || !segment.diagnostics?.excessiveDetour
    || segment.diagnostics.straightDistanceKm > 8
  ) {
    return '';
  }

  if (routePreference === 'AUTO') {
    return homeText(
      language,
      '\u8ddd\u79bb\u8f83\u77ed\uff0c\u9ed8\u8ba4\u5df2\u9009\u62e9\u9a7e\u8f66\uff0c\u4e5f\u53ef\u9009\u62e9\u6b65\u884c',
      'This is a short distance. Driving is selected by default, but you can also choose walking.',
    );
  }

  return homeText(
    language,
    '\u9a7e\u8f66\u7ed5\u884c\u660e\u663e\uff0c\u53ef\u5207\u6362\u201c\u81ea\u52a8\u6df7\u5408\u201d\u6216\u201c\u6b65\u884c\u201d',
    'Driving detour detected; try Auto mix or Walk',
  );
}

function routeRecommendationMetrics(recommendation, metricsMap) {
  const signature = routeSignatureFor(recommendation.ids);
  const metrics = metricsMap[signature];
  if (metrics?.routeSignature === signature && Number.isFinite(metrics.distanceKm)) {
    return {
      distance: metrics.distanceKm,
      duration: safeNumber(metrics.durationHours),
      provider: metrics.mode ?? metrics.provider ?? 'backend',
      travelMode: metrics.travelMode ?? 'DRIVE',
      isEstimated: false,
    };
  }
  const distance = routeDistanceForIds(recommendation.ids);
  return {
    distance,
    duration: segmentDurationHours(distance),
    provider: 'estimated',
    travelMode: 'DRIVE',
    isEstimated: true,
  };
}

function routeVisitHoursForIds(routeIds, language, pace) {
  return routeIds.reduce((sum, id) => {
    const stop = landmarks.find((item) => item.id === id);
    return sum + (stop ? plannedVisitHours(stop, language, pace) : 0);
  }, 0);
}

function routeSegmentsFor(routeStops, metricSegments = []) {
  return routeStops.slice(1).map((stop, index) => {
    const from = routeStops[index];
    const metricSegment = metricSegments.find((segment) => (
      (segment.fromId === from.id && segment.toId === stop.id) || segment.index === index
    ));
    if (metricSegment) {
      return {
        from,
        to: stop,
        distance: safeNumber(metricSegment.distanceKm),
        duration: safeNumber(metricSegment.durationHours),
        source: metricSegment.mode ?? 'mixed',
        travelMode: metricSegment.travelMode ?? 'MIXED',
        diagnostics: metricSegment.diagnostics ?? null,
        parts: metricSegment.parts ?? [],
      };
    }
    const fromIndex = routeMatrixIndex.get(from.id);
    const toIndex = routeMatrixIndex.get(stop.id);
    const distance = liveLandmarksData.routeMatrix?.distancesKm?.[fromIndex]?.[toIndex];
    const duration = liveLandmarksData.routeMatrix?.durationsHours?.[fromIndex]?.[toIndex];
    if (!Number.isFinite(distance) || !Number.isFinite(duration)) {
      const estimatedDistance = segmentDistanceKm(from, stop);
      const travelMode = estimatedTravelModeForStops(from, stop);
      return {
        from,
        to: stop,
        distance: estimatedDistance,
        duration: segmentDurationHours(estimatedDistance, 'estimated', travelMode),
        source: 'estimated',
        travelMode,
      };
    }
    return {
      from,
      to: stop,
      distance,
      duration,
      source: 'osrm',
      travelMode: estimatedTravelModeForStops(from, stop),
    };
  }).filter(Boolean);
}

function activeRouteSegmentsFor(metrics) {
  return metrics?.segments ?? [];
}

function estimatedTravelModeForStops(from, to) {
  const city = cityKeyForId(from.id);
  const sameCity = city && city === cityKeyForId(to.id);
  if (sameCity && city.toLowerCase() === 'venice') return 'WALK';
  return 'DRIVE';
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function sampleBox(cx, cy, cz, sx, sy, sz) {
  return [
    cx + (Math.random() - 0.5) * sx,
    cy + (Math.random() - 0.5) * sy,
    cz + (Math.random() - 0.5) * sz,
  ];
}





function sampleColosseumPoint() {
  const tier = Math.floor(Math.random() * 4);
  const angle = Math.random() * Math.PI * 2;
  const archPhase = ((angle / (Math.PI * 2)) * 30) % 1;
  const onColumn = archPhase < 0.16 || archPhase > 0.84;
  const radiusNoise = onColumn ? 0.03 : 0.16;
  const rx = 2.75 + (Math.random() - 0.5) * radiusNoise;
  const rz = 1.12 + (Math.random() - 0.5) * radiusNoise;
  const y = -1.15 + tier * 0.62 + (Math.random() - 0.5) * (onColumn ? 0.56 : 0.1);
  const cut = !onColumn && tier < 3 ? Math.sin(archPhase * Math.PI) * 0.28 : 0;
  return [Math.cos(angle) * rx, y + cut, Math.sin(angle) * rz];
}

function samplePisaPoint() {
  const angle = Math.random() * Math.PI * 2;
  const floor = Math.floor(Math.random() * 8);
  const band = Math.random() < 0.38;
  const radius = band ? 0.78 + Math.random() * 0.06 : 0.62 + Math.random() * 0.16;
  let x = Math.cos(angle) * radius;
  const y = -1.75 + floor * 0.48 + (band ? (Math.random() - 0.5) * 0.08 : (Math.random() - 0.5) * 0.34);
  const z = Math.sin(angle) * radius * 0.92;
  x += y * 0.18;
  return [x, y, z];
}

function sampleDuomoPoint() {
  const r = Math.random();
  if (r < 0.42) {
    const x = -2.45 + Math.random() * 4.9;
    const roof = 0.82 + Math.abs(x) * 0.18;
    return [x, -1.3 + Math.random() * (roof + 1.3), (Math.random() - 0.5) * 0.2];
  }
  if (r < 0.58) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.42 + Math.random() * 0.08;
    return [Math.cos(angle) * radius, -0.08 + Math.sin(angle) * radius, (Math.random() - 0.5) * 0.12];
  }
  if (r < 0.82) {
    const xs = [-2.35, -1.75, -1.1, -0.48, 0.48, 1.1, 1.75, 2.35];
    const x = xs[Math.floor(Math.random() * xs.length)];
    const h = 1.55 + (Math.abs(x) < 0.6 ? 0.5 : 0);
    const t = Math.random();
    return [x + (Math.random() - 0.5) * (1 - t) * 0.16, 0.65 + t * h, (Math.random() - 0.5) * 0.14];
  }
  const xs = [-1.7, -0.86, 0, 0.86, 1.7];
  return sampleBox(xs[Math.floor(Math.random() * xs.length)], -1.3 + Math.random() * 1.28, 0, 0.2, 0.18, 0.12);
}

function sampleStoryTarget(kind) {
  if (kind === 'colosseum') return sampleColosseumPoint();
  if (kind === 'pisa') return samplePisaPoint();
  if (kind === 'duomo') return sampleDuomoPoint();
  if (kind !== 'chaos') return sampleBox(0, 0, 0, 4.8, 2.7, 1.9);
  return sampleBox(0, 0, 0, 7, 4, 3);
}

function createStoryMorphData(count = STORY_PARTICLE_COUNT) {
  const random = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const proceduralTargets = {};

  for (let i = 0; i < count; i += 1) {
    const radius = 2.1 + Math.random() * 3.55;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    random[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    random[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius * 0.68;
    random[i * 3 + 2] = Math.cos(phi) * radius * 0.64;
    seeds[i] = Math.random();
  }

  storyScenes.forEach((scene) => {
    const target = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const [x, y, z] = sampleStoryTarget(scene.kind);
      target[i * 3] = x;
      target[i * 3 + 1] = y;
      target[i * 3 + 2] = z;
    }
    proceduralTargets[scene.id] = target;
  });

  return { random, seeds, proceduralTargets };
}

function getDensePointCloud(sourcePoints, box) {
  const size = box.getSize(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z) || 1;
  const cellSize = largest * 0.035;
  const densityByCell = new Map();
  const keys = sourcePoints.map((point) => {
    const key = `${Math.floor(point.x / cellSize)},${Math.floor(point.y / cellSize)},${Math.floor(point.z / cellSize)}`;
    densityByCell.set(key, (densityByCell.get(key) ?? 0) + 1);
    return key;
  });
  const densePoints = sourcePoints.filter((_, index) => densityByCell.get(keys[index]) >= 3);
  return densePoints.length >= Math.min(800, sourcePoints.length * 0.28) ? densePoints : sourcePoints;
}

function sampleModelPointCloud(scene, count, options = {}) {
  const sourcePoints = [];
  const box = new THREE.Box3();
  const temp = new THREE.Vector3();

  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (!object.isMesh || !object.geometry?.attributes?.position) return;
    const position = object.geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      temp.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
      sourcePoints.push(temp.clone());
      box.expandByPoint(temp);
    }
  });

  if (!sourcePoints.length) return null;

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z) || 1;
  const denseSourcePoints = getDensePointCloud(sourcePoints, box);
  const scale = options.scale ?? 4.6;
  const rotateX = options.rotateX ?? 0;
  const rotateY = options.rotateY ?? 0;
  const tiltZ = options.tiltZ ?? 0;
  const matrix = new THREE.Matrix4()
    .makeRotationX(rotateX)
    .multiply(new THREE.Matrix4().makeRotationY(rotateY))
    .multiply(new THREE.Matrix4().makeRotationZ(tiltZ));

  const target = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const point = denseSourcePoints[Math.floor(Math.random() * denseSourcePoints.length)].clone();
    point.sub(center).multiplyScalar(scale / largest);
    point.applyMatrix4(matrix);
    point.x += (Math.random() - 0.5) * 0.018;
    point.y += (Math.random() - 0.5) * 0.018;
    point.z += (Math.random() - 0.5) * 0.018;
    target[i * 3] = point.x + (options.offsetX ?? 0);
    target[i * 3 + 1] = point.y + (options.offsetY ?? 0);
    target[i * 3 + 2] = point.z + (options.offsetZ ?? 0);
  }

  return target;
}

function ModelPointCloudLoader({ onTargetsReady }) {
  const colosseum = useGLTF(storyModelPaths.colosseum);
  const pisa = useGLTF(storyModelPaths.pisa);
  const florence = useGLTF(storyModelPaths.florence);

  const targets = useMemo(() => {
    const count = STORY_MODEL_SAMPLE_COUNT;
    return {
      colosseum: sampleModelPointCloud(colosseum.scene, count, { scale: 6.2, rotateY: -0.32, offsetY: 0.08 }),
      pisa: sampleModelPointCloud(pisa.scene, count, { scale: 5.8, rotateX: -Math.PI / 2, rotateY: 0.18, offsetY: 0.08 }),
      florence: sampleModelPointCloud(florence.scene, count, { scale: 6.2, rotateY: 0.22, offsetY: 0.04 }),
    };
  }, [colosseum.scene, pisa.scene, florence.scene]);

  useEffect(() => {
    onTargetsReady(targets);
  }, [onTargetsReady, targets]);

  return null;
}







function SemanticParticleCanvas2D({ activeScene, modelTargets }) {
  const canvasRef = useRef(null);
  const data = useMemo(() => createStoryMorphData(), []);
  const requiresLoadedModel = Object.hasOwn(storyModelPaths, activeScene.kind);
  const loadedTarget = modelTargets?.[activeScene.kind] ?? null;
  const activeTarget = requiresLoadedModel
    ? loadedTarget ?? data.proceduralTargets.intro
    : data.proceduralTargets[activeScene.id] ?? data.proceduralTargets.intro;
  const shouldAssembleScene = activeScene.id !== 'intro' && (!requiresLoadedModel || Boolean(loadedTarget));
  const activeTargetRef = useRef(activeTarget);
  const morphRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    activeTargetRef.current = activeTarget;
    morphRef.current = 0;
  }, [activeTarget]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.35);
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMouseMove = (event) => {
      mouseRef.current.x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      mouseRef.current.y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMouseMove);

    const draw = (time) => {
      const t = time * 0.001;
      const shouldAssemble = shouldAssembleScene;
      morphRef.current = THREE.MathUtils.lerp(morphRef.current, shouldAssemble ? 1 : 0, 0.18);
      const morph = morphRef.current;
      const target = activeTargetRef.current;
      const side = activeScene.side ?? 'center';
      const centerX = width * (side === 'left' ? 0.34 : side === 'right' ? 0.66 : 0.52);
      const centerY = height * 0.5;
      const sceneScale = activeScene.modelScale ?? 1;
      const scale = Math.min(width, height) * (shouldAssemble ? 0.26 : 0.22) * sceneScale;
      const rotateY = t * 0.34 + mouseRef.current.x * 0.2;
      const rotateX = -0.08 + mouseRef.current.y * 0.1;
      const cy = Math.cos(rotateY);
      const sy = Math.sin(rotateY);
      const cx = Math.cos(rotateX);
      const sx = Math.sin(rotateX);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = shouldAssemble ? 'rgba(45, 93, 161, 0.86)' : 'rgba(45, 45, 45, 0.72)';

      for (let i = 0; i < data.random.length; i += 3) {
        const seed = data.seeds[i / 3];
        const localMorph = THREE.MathUtils.clamp(morph + (seed - 0.5) * 0.12, 0, 1);
        const loose = 1 - localMorph;
        let x = THREE.MathUtils.lerp(data.random[i], target[i], localMorph) + Math.sin(t * 0.92 + seed * 22) * loose * 0.14;
        let y = THREE.MathUtils.lerp(data.random[i + 1], target[i + 1], localMorph) + Math.cos(t * 0.78 + seed * 30) * loose * 0.12;
        let z = THREE.MathUtils.lerp(data.random[i + 2], target[i + 2], localMorph) + Math.sin(t * 0.62 + seed * 18) * loose * 0.13;

        const rx = x * cy - z * sy;
        const rz = x * sy + z * cy;
        const ry = y * cx - rz * sx;
        const rz2 = y * sx + rz * cx;
        const perspective = 1 / (1 + (rz2 + 3.8) * 0.09);
        const px = centerX + rx * scale * perspective;
        const py = centerY - ry * scale * perspective;
        const radius = (shouldAssemble ? 1.42 : 1.25) * perspective * (0.92 + localMorph * 0.42);

        ctx.globalAlpha = 0.34 + localMorph * 0.5;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMouseMove);
    };
  }, [activeScene.id, data, shouldAssembleScene]);

  return <canvas ref={canvasRef} className="semantic-story__canvas2d" aria-hidden="true" />;
}

function SemanticParticleStory({ language, onEnterHome }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [modelTargets, setModelTargets] = useState(null);
  const storyRef = useRef(null);
  const sectionRefs = useRef([]);
  const activeScene = storyScenes[activeIndex] ?? storyScenes[0];

  useEffect(() => {
    const updateFromScroll = () => {
      if (!storyRef.current) return;
      const rect = storyRef.current.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const progress = THREE.MathUtils.clamp((-rect.top + viewport * 0.42) / viewport, 0, storyScenes.length - 1);
      setActiveIndex(Math.round(progress));
    };

    updateFromScroll();
    window.addEventListener('scroll', updateFromScroll, { passive: true });
    window.addEventListener('resize', updateFromScroll);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-story-index'));
          if (!Number.isNaN(index)) setActiveIndex(index);
        }
      });
    }, { threshold: 0.58 });

    sectionRefs.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', updateFromScroll);
      window.removeEventListener('resize', updateFromScroll);
    };
  }, []);

  return (
    <section ref={storyRef} className="semantic-story" aria-label="Semantic particle landmark story">
      <div className="semantic-story__loader" aria-hidden="true">
        <Canvas frameloop="demand">
          <Suspense fallback={null}>
            <ModelPointCloudLoader onTargetsReady={setModelTargets} />
          </Suspense>
        </Canvas>
      </div>
      <div className="semantic-story__canvas">
        <SemanticParticleCanvas2D activeScene={activeScene} modelTargets={modelTargets} />
      </div>
      <div className="semantic-story__rail" aria-hidden="true">
        {storyScenes.map((scene, index) => (
          <span key={scene.id} className={index === activeIndex ? 'is-active' : ''} />
        ))}
      </div>
      <div className="semantic-story__copy">
        {storyScenes.map((scene, index) => (
          <article
            key={scene.id}
            ref={(node) => { sectionRefs.current[index] = node; }}
            data-story-index={index}
            className={`semantic-story__panel semantic-story__panel--${scene.side ?? 'center'} ${index === activeIndex ? 'is-active' : ''}`}
          >
            <h2>{scene.title}</h2>
            {index === storyScenes.length - 1 && (
              <button className="semantic-story__enter" type="button" onClick={onEnterHome}>
                enter
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}







function AuthDialog({
  language,
  mode,
  setMode,
  form,
  setForm,
  error,
  loading,
  userSession,
  history,
  savedRoutes,
  onSubmit,
  onClose,
  onSignOut,
  onOpenSavedRoute,
  onDeleteSavedRoute,
}) {
  const isRegister = mode === 'register';
  return (
    <div className="home-auth" role="dialog" aria-modal="true" aria-label={language === 'zh' ? '账号' : 'Account'}>
      <div className="home-auth__panel">
        <button className="home-auth__close" type="button" onClick={onClose}>×</button>
        {userSession ? (
          <>
            <div className="home-auth__head">
              <span>{language === 'zh' ? '已登录' : 'Signed in'}</span>
              <strong>{userSession.name}</strong>
              <p>{userSession.email}</p>
            </div>
            <div className="home-auth__history">
              <h3>{language === 'zh' ? '账号历史' : 'Account history'}</h3>
              {(history.length ? history : []).slice(0, 8).map((item) => (
                <section key={item.id}>
                  <strong>{item.action}</strong>
                  <span>{item.detail}</span>
                </section>
              ))}
            </div>
            <div className="home-auth__saved-routes">
              <h3>{language === 'zh' ? '保存的路线' : 'Saved routes'}</h3>
              {savedRoutes.length ? savedRoutes.map((route) => (
                <section key={route.id}>
                  <button type="button" onClick={() => onOpenSavedRoute(route)}>
                    <strong>{route.name}</strong>
                    <span>{route.route_ids?.length ?? 0} {language === 'zh' ? '个景点' : 'stops'} · {route.days} {language === 'zh' ? '天' : 'days'}</span>
                  </button>
                  <button type="button" aria-label={language === 'zh' ? '删除路线' : 'Delete route'} onClick={() => onDeleteSavedRoute(route.id)}>×</button>
                </section>
              )) : <p>{language === 'zh' ? '还没有保存路线。' : 'No saved routes yet.'}</p>}
            </div>
            <button className="home-auth__submit" type="button" onClick={onSignOut}>{language === 'zh' ? '退出登录' : 'Sign out'}</button>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="home-auth__head">
              <span>{isRegister ? (language === 'zh' ? '注册' : 'Register') : (language === 'zh' ? '登录' : 'Login')}</span>
              <strong>{isRegister ? 'Create account' : 'Welcome back'}</strong>
            </div>
            {isRegister && (
              <label>
                <span>{language === 'zh' ? '昵称' : 'Name'}</span>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
            )}
            <label>
              <span>Email</span>
              <input type="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <label>
              <span>{language === 'zh' ? '密码' : 'Password'}</span>
              <input type="password" required minLength={6} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            </label>
            {error && <p className="home-auth__error">{error}</p>}
            <button className="home-auth__submit" type="submit" disabled={loading}>
              {loading ? '...' : (isRegister ? (language === 'zh' ? '注册并登录' : 'Register') : (language === 'zh' ? '登录' : 'Login'))}
            </button>
            <button className="home-auth__switch" type="button" onClick={() => setMode(isRegister ? 'login' : 'register')}>
              {isRegister ? (language === 'zh' ? '已有账号，去登录' : 'Have an account? Login') : (language === 'zh' ? '没有账号，去注册' : 'Create an account')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}















function SelectField({ label, value, onChange, options, anyLabel, language }) {
  const grouped = options.some((option) => typeof option === 'object' && option.group);
  const optionNode = (option) => {
    const optionValue = typeof option === 'object' ? option.value : option;
    return <option key={optionValue} value={optionValue}>{filterOptionLabel(option, language)}</option>;
  };
  const groupedOptions = grouped
    ? [...new Map(options.map((option) => [option.group, options.filter((item) => item.group === option.group)])).entries()]
    : [];
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="any">{anyLabel}</option>
        {grouped
          ? groupedOptions.map(([group, groupOptions]) => <optgroup key={group} label={group}>{groupOptions.map(optionNode)}</optgroup>)
          : options.map(optionNode)}
      </select>
    </label>
  );
}






































function scrollToHomeSection(id) {
  if (window.location.hash && window.location.hash !== '#/' && !window.location.hash.startsWith('#home-')) {
    window.location.hash = '#/';
  }
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function resetPageScroll() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function homeText(language, zh, en) {
  return language === 'zh' ? zh : en;
}

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function loadStoredArray(key, fallback) {
  const parsed = safeJsonParse(window.localStorage.getItem(key), fallback);
  return Array.isArray(parsed) ? parsed : fallback;
}

function loadStoredSet(key) {
  return new Set(loadStoredArray(key, []));
}

function uniqueValidRouteIds(ids) {
  const validIds = new Set(landmarks.map((stop) => stop.id));
  return [...new Set(ids)].filter((id) => validIds.has(id));
}

function clampDays(value) {
  if (value == null || value === '') return 3;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 3;
  return Math.min(MAX_TRIP_DAYS, Math.max(1, Math.round(numeric)));
}

function visitFor(landmark, language) {
  const live = liveFor(landmark.id);
  const sourceVisit = live?.visit ?? {};
  const visitHours = sourceVisit.durationHours ?? (
    landmark.modelKind === 'museum' ? 3
      : landmark.modelKind === 'coast' || landmark.modelKind === 'lake' || landmark.modelKind === 'mountain' ? 4
        : landmark.modelKind === 'ruins' || landmark.modelKind === 'temple' ? 2.5
          : 2
  );
  return {
    durationHours: visitHours,
    bestTime: sourceVisit.bestTime?.[language] ?? sourceVisit.bestTime?.en ?? '',
    bookingNote: sourceVisit.bookingNote?.[language] ?? sourceVisit.bookingNote?.en ?? '',
    fit: sourceVisit.fit?.[language] ?? sourceVisit.fit?.en ?? '',
    firstTimer: sourceVisit.firstTimer === true,
    sourceNote: sourceVisit.sourceNote?.[language] ?? sourceVisit.sourceNote?.en ?? '',
  };
}

function sourceLabelsFor(landmark, language) {
  const live = liveFor(landmark.id);
  const labels = [];
  if (live?.wikipedia?.[language]?.pageUrl || live?.wikipedia?.en?.pageUrl) labels.push('Wikipedia');
  if (live?.wikidata?.source) labels.push('Wikidata');
  if (live?.wikidata?.officialWebsite) labels.push(homeText(language, '官方网站', 'Official site'));
  if (live?.weather?.source) labels.push('Open-Meteo');
  return labels.length ? labels.join(' / ') : homeText(language, '本地资料', 'Local notes');
}

function travelPreferenceTags(landmark, language) {
  const tags = new Set();
  const live = liveFor(landmark.id);
  const blocked = new Set([
    kindText(landmark, language),
    landmark.modelKind,
    locationValue(landmark, 'city', language),
    locationValue(landmark, 'province', language),
    locationValue(landmark, 'region', language),
    locationValue(landmark, 'country', language),
    'Italy',
    '意大利',
  ].map((tag) => normalizeSearchText(tag)).filter(Boolean));
  [
    seasonText(landmark, language),
    ...(live?.search?.tags?.[language] ?? []),
    ...(landmark.searchMeta?.tags?.[language] ?? []),
  ].map((tag) => textValue(tag, language)).filter(Boolean).forEach((tag) => {
    if (!blocked.has(normalizeSearchText(tag))) tags.add(tag);
  });
  return [...tags].slice(0, 3);
}

function nearbyStopsFor(stop, routeStops, language) {
  return landmarks
    .filter((item) => item.id !== stop.id)
    .map((item) => ({ item, distance: segmentDistanceKm(stop, item), inRoute: routeStops.some((routeStop) => routeStop.id === item.id) }))
    .sort((a, b) => Number(b.inRoute) - Number(a.inRoute) || a.distance - b.distance)
    .slice(0, 3)
    .map(({ item }) => nameFor(item, language));
}

function paceText(pace, language) {
  const clearCopy = {
    zh: {
      Relaxed: '每天目标约 6 小时：预留 1 小时机动，适合休闲人群。',
      Standard: '每天目标约 8 小时：按建议参观时长安排，预留 0.5 小时机动。长距离驾驶会顺延到第二天。',
      Fast: '每天目标约 10 小时：参观时长压缩约 25%，预留 0.25 小时机动，适合特种兵行程。',
    },
    en: {
      Relaxed: 'Target about 6 hours per day: longer visits, 1 hour of buffer, and driving kept separate from exploring.',
      Standard: 'Target about 8 hours per day with suggested visit times, 0.5 hours of buffer, and long drives rolling into the next day.',
      Fast: 'Target about 10 hours per day with visits compressed by about 25% and 0.25 hours of buffer.',
    },
  };
  if (clearCopy[language]?.[pace]) return clearCopy[language][pace];
  const zh = {
    Relaxed: '每天目标约 6 小时；每站停留增加约 30%，另留 1 小时机动，邻近景点会优先安排在同一天。',
    Standard: '每天目标约 8 小时；按建议停留时间并留 0.5 小时机动，在时间允许时尽量多安排邻近景点。',
    Fast: '每天目标约 10 小时；每站停留压缩约 25%，另留 0.25 小时机动，减少空余时间。',
  };
  const en = {
    Relaxed: 'Target about 6 hours, with 30% longer visits and a 1-hour buffer; nearby stops stay together when possible.',
    Standard: 'Target about 8 hours with suggested visit times and a 0.5-hour buffer, packing nearby stops when time allows.',
    Fast: 'Target about 10 hours, with 25% shorter visits and a 0.25-hour buffer to reduce unused time.',
  };
  return language === 'zh' ? zh[pace] : en[pace];
}

function plannedVisitHours(landmark, language, pace) {
  return plannedVisitHoursForLandmark(landmark, visitFor(landmark, language).durationHours, pace);
}

function paceLabel(pace, language) {
  return paceLabels[language]?.[pace] ?? pace;
}

function makeEmptyItineraryDay(index, dailyLimit) {
  return {
    day: index + 1,
    stops: [],
    segments: [],
    driveItems: [],
    visitItems: [],
    activities: [],
    totalKm: 0,
    travelHours: 0,
    visitHours: 0,
    bufferHours: 0,
    dailyLimit,
  };
}

function pushTravelActivity(days, segment, dailyLimit, paceProfile, language) {
  if (!segment || segment.duration <= 0) return;
  let remainingHours = segment.duration;
  while (remainingHours > 0.01) {
    let day = days[days.length - 1];
    const bufferHours = paceProfile.dailyBufferHours;
    const availableHours = dailyLimit - day.travelHours - day.visitHours - bufferHours;

    if (availableHours <= 0.05 && day.activities.length) {
      day = makeEmptyItineraryDay(days.length, dailyLimit);
      days.push(day);
    }

    const dayCapacity = Math.max(0.5, dailyLimit - day.travelHours - day.visitHours - paceProfile.dailyBufferHours);
    const hours = Math.min(remainingHours, dayCapacity);
    const km = segment.distance * (hours / segment.duration);
    const kind = segment.travelMode === 'WALK'
      ? 'walk'
      : segment.travelMode === 'FERRY_DRIVE' ? 'ferry'
      : segment.travelMode === 'FERRY' ? 'ferry'
        : segment.travelMode === 'MIXED' ? 'mixed' : 'drive';
    const item = {
      kind,
      travelMode: segment.travelMode ?? 'DRIVE',
      from: segment.from,
      to: segment.to,
      hours,
      km,
      continued: remainingHours < segment.duration,
      continues: remainingHours - hours > 0.01,
      label: `${nameFor(segment.from, language)} -> ${nameFor(segment.to, language)}`,
    };
    day.activities.push(item);
    day.driveItems.push(item);
    day.segments.push(segment);
    day.travelHours += hours;
    day.totalKm += km;
    remainingHours -= hours;

    if (remainingHours > 0.01) days.push(makeEmptyItineraryDay(days.length, dailyLimit));
  }
}

function pushVisitActivity(days, stop, hours, dailyLimit, paceProfile, language) {
  let day = days[days.length - 1];
  const bufferHours = paceProfile.dailyBufferHours;
  const availableHours = dailyLimit - day.travelHours - day.visitHours - bufferHours;
  if (availableHours < hours && day.activities.length) {
    day = makeEmptyItineraryDay(days.length, dailyLimit);
    days.push(day);
  }
  const item = { kind: 'visit', stop, hours, label: nameFor(stop, language) };
  day.activities.push(item);
  day.visitItems.push(item);
  day.stops.push(stop);
  day.visitHours += hours;
}

function addActivityToDay(day, item) {
  day.activities.push(item);
  if (item.kind === 'visit') {
    day.visitItems.push(item);
    day.stops.push(item.stop);
    day.visitHours += item.hours;
    return;
  }
  day.driveItems.push(item);
  day.segments.push({
    from: item.from,
    to: item.to,
    distance: item.km,
    duration: item.hours,
    travelMode: item.travelMode,
  });
  day.travelHours += item.hours;
  day.totalKm += item.km;
}

function distributeActivitiesAcrossDays(days, requestedDays, dailyLimit) {
  const activities = days.flatMap((day) => day.activities);
  if (!activities.length) return days;

  const activityCount = activities.length;
  const groupCount = Math.max(1, Math.min(clampDays(requestedDays), activityCount));
  const weights = activities.map((item) => safeNumber(item.hours));
  const prefixHours = [0];
  weights.forEach((hours) => prefixHours.push(prefixHours.at(-1) + hours));

  const maxHours = Array.from({ length: groupCount + 1 }, () => Array(activityCount + 1).fill(Infinity));
  const balanceScore = Array.from({ length: groupCount + 1 }, () => Array(activityCount + 1).fill(Infinity));
  const splitAt = Array.from({ length: groupCount + 1 }, () => Array(activityCount + 1).fill(0));
  maxHours[0][0] = 0;
  balanceScore[0][0] = 0;

  for (let group = 1; group <= groupCount; group += 1) {
    for (let itemCount = group; itemCount <= activityCount; itemCount += 1) {
      for (let split = group - 1; split < itemCount; split += 1) {
        if (!Number.isFinite(maxHours[group - 1][split])) continue;
        const segmentHours = prefixHours[itemCount] - prefixHours[split];
        const candidateMax = Math.max(maxHours[group - 1][split], segmentHours);
        const candidateBalance = balanceScore[group - 1][split] + segmentHours ** 2;
        const isBetter = candidateMax < maxHours[group][itemCount] - 0.001
          || (Math.abs(candidateMax - maxHours[group][itemCount]) <= 0.001
            && candidateBalance < balanceScore[group][itemCount]);
        if (isBetter) {
          maxHours[group][itemCount] = candidateMax;
          balanceScore[group][itemCount] = candidateBalance;
          splitAt[group][itemCount] = split;
        }
      }
    }
  }

  const groups = [];
  let group = groupCount;
  let itemCount = activityCount;
  while (group > 0) {
    const split = splitAt[group][itemCount];
    groups.unshift(activities.slice(split, itemCount));
    itemCount = split;
    group -= 1;
  }

  return groups.map((groupItems, index) => {
    const day = makeEmptyItineraryDay(index, dailyLimit);
    groupItems.forEach((item) => addActivityToDay(day, item));
    return day;
  });
}



function buildBaseItineraryDays(routeStops, dailyLimit, paceProfile, pace, language, segmentOverrides = []) {
  const uniqueStops = [...new Map(routeStops.map((stop) => [stop.id, stop])).values()];
  const buckets = [makeEmptyItineraryDay(0, dailyLimit)];

  uniqueStops.forEach((stop, index) => {
    const incoming = index > 0
      ? segmentOverrides[index - 1] ?? routeSegmentsFor([uniqueStops[index - 1], stop])[0] ?? null
      : null;
    if (incoming) pushTravelActivity(buckets, incoming, dailyLimit, paceProfile, language);
    pushVisitActivity(buckets, stop, plannedVisitHours(stop, language, pace), dailyLimit, paceProfile, language);
  });

  return buckets;
}

function buildItineraryDays(routeStops, dayCount, pace, language, segmentOverrides = []) {
  const safeDays = clampDays(dayCount);
  const dailyLimit = paceDailyHours[pace] ?? paceDailyHours.Standard;
  const paceProfile = paceProfiles[pace] ?? paceProfiles.Standard;
  const buckets = buildBaseItineraryDays(routeStops, dailyLimit, paceProfile, pace, language, segmentOverrides);
  const baseDayCount = buckets.filter((day) => day.activities.length > 0).length || 1;

  const distributedBuckets = safeDays === baseDayCount
    ? buckets
    : distributeActivitiesAcrossDays(buckets, safeDays, dailyLimit);
  buckets.splice(0, buckets.length, ...distributedBuckets);

  const outputDays = Math.max(safeDays, buckets.length);
  while (buckets.length < outputDays) buckets.push(makeEmptyItineraryDay(buckets.length, dailyLimit));

  return buckets.slice(0, outputDays).map((day) => {
    const bufferHours = day.activities.length ? paceProfile.dailyBufferHours : 0;
    const totalHours = day.visitHours + day.travelHours + bufferHours;
    return {
      ...day,
      bufferHours,
      totalKm: Number(day.totalKm.toFixed(2)),
      travelHours: Math.round(day.travelHours * 100) / 100,
      visitHours: Math.round(day.visitHours * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      overHours: Math.max(0, totalHours - dailyLimit),
      paceNote: paceText(pace, language),
    };
  });
}

function minimumDaysFor(routeStops, pace, language, segmentOverrides = []) {
  const dailyLimit = paceDailyHours[pace] ?? paceDailyHours.Standard;
  const paceProfile = paceProfiles[pace] ?? paceProfiles.Standard;
  return buildBaseItineraryDays(routeStops, dailyLimit, paceProfile, pace, language, segmentOverrides)
    .filter((day) => day.activities.length > 0).length || 1;
}

function physicalMinimumDaysFor(routeStops, pace, language, segments = []) {
  const travelHours = segments.reduce((sum, segment) => sum + safeNumber(segment.duration), 0);
  const visitHours = routeStops.reduce((sum, stop) => sum + plannedVisitHours(stop, language, pace), 0);
  return Math.max(1, Math.ceil((travelHours + visitHours) / 24));
}

function makeItineraryPlan(routeStops, days, pace = 'Standard', language = 'en', segmentOverrides = []) {
  const dailyLimit = paceDailyHours[pace] ?? paceDailyHours.Standard;
  const segments = segmentOverrides.length ? segmentOverrides : routeSegmentsFor(routeStops);
  const itineraryDays = buildItineraryDays(routeStops, days, pace, language, segments);
  const travelHours = segments.reduce((sum, segment) => sum + segment.duration, 0);
  const visitHours = routeStops.reduce((sum, stop) => sum + plannedVisitHours(stop, language, pace), 0);
  const bufferHours = itineraryDays.reduce((sum, day) => sum + day.bufferHours, 0);
  const minimumDays = minimumDaysFor(routeStops, pace, language, segments);
  const physicalMinimumDays = physicalMinimumDaysFor(routeStops, pace, language, segments);
  return {
    days: itineraryDays,
    dailyLimit,
    minimumDays,
    physicalMinimumDays,
    travelHours,
    visitHours,
    bufferHours,
    totalHours: travelHours + visitHours + bufferHours,
    totalKm: Number(segments.reduce((sum, segment) => sum + segment.distance, 0).toFixed(2)),
    isFeasible: itineraryDays.every((day) => day.overHours <= 0.05) && clampDays(days) >= physicalMinimumDays,
  };
}


function starRating(value) {
  const count = Math.max(1, Math.min(5, Math.round(value)));
  return '★★★★★'.slice(0, count) + '☆☆☆☆☆'.slice(0, 5 - count);
}

function routeHealthReport(routeStops, plan, routeSegments, diagnostics, language) {
  if (routeStops.length < 2) {
    return { empty: true, message: homeText(language, '加入至少 2 个景点后，我会帮你检查路线是否顺路。', 'Add at least 2 stops and I will check whether the route is sensible.') };
  }
  const distance = plan.totalKm;
  const recommendedDays = Math.max(plan.minimumDays, Math.ceil((plan.travelHours + plan.visitHours) / (plan.dailyLimit || 8)));
  const directness = Math.max(2, Math.min(5, 5 - (diagnostics?.excessiveOverlap ? 1.2 : 0) - Math.max(0, routeStops.length - 6) * 0.25 - Math.max(0, distance - 900) / 650));
  const comfort = Math.max(1, Math.min(5, 5 - (plan.isFeasible ? 0 : 1.5) - Math.max(0, plan.minimumDays - plan.days.length) * 0.75));
  const friendly = Math.max(2, Math.min(5, 5 - Math.max(0, routeStops.length - 5) * 0.35 - Math.max(0, distance - 1100) / 900));
  let advice = homeText(language, '当前路线整体顺路，适合首次意大利旅行。', 'This route is generally direct and friendly for a first Italy trip.');
  if (!plan.isFeasible || routeStops.length > 7 || distance > 1200) advice = homeText(language, '这条路线可能比较紧凑，建议增加旅行天数或切换为轻松节奏。', 'This route may feel compact. Add days or switch to a relaxed pace.');
  if (diagnostics?.excessiveOverlap) advice = homeText(language, '当前路线可能存在回头路，建议点击“减少回头”优化顺序。', 'This route may double back. Try Optimize to reduce backtracking.');
  return { empty: false, directness: starRating(directness), comfort: starRating(comfort), friendly: starRating(friendly), distance, trafficHours: plan.travelHours, recommendedDays, advice };
}


function itineraryExportText(language, routeStops, days, pace, segmentOverrides = []) {
  const plan = makeItineraryPlan(routeStops, days, pace, language, segmentOverrides);
  const lines = [
    homeText(language, 'Trip3D 意大利旅行手册', 'Trip3D Italy travel notebook'),
    `${homeText(language, '旅行节奏', 'Pace')}: ${paceLabel(pace, language)} (${plan.dailyLimit}h/${homeText(language, '天', 'day')})`,
    `${homeText(language, '建议至少预留', 'Suggested minimum')}: ${plan.minimumDays} ${homeText(language, '天', 'days')}`,
    `${homeText(language, '全程', 'Whole trip')}: ${formatKm(plan.totalKm)} / ${formatDuration(plan.travelHours)} ${homeText(language, '交通', 'in transit')} / ${formatDuration(plan.visitHours)} ${homeText(language, '参观', 'exploring')}`,
    `${homeText(language, '路线', 'Route')}: ${routeStops.map((stop) => nameFor(stop, language)).join(' -> ') || homeText(language, '还没有添加景点', 'No stops yet')}`,
    '',
  ];
  if (!plan.isFeasible) {
    lines.push(homeText(language, '提示：当前天数偏紧，长距离驾驶可能会占用完整的一天，建议增加天数。', 'Note: this plan is tight. Long drives may take a full day, so consider adding days.'));
    lines.push('');
  }
  plan.days.forEach((day) => {
    lines.push(`${homeText(language, `第 ${day.day} 天`, `Day ${day.day}`)} - ${formatDuration(day.totalHours)} - ${formatKm(day.totalKm)}`);
    if (!day.activities.length) lines.push(homeText(language, '  机动日：没有固定交通或参观安排。', '  Flexible day: no fixed transit or visit plan.'));
    day.activities.forEach((item) => {
      if (item.kind !== 'visit') {
        lines.push(`  ${travelModeLabel(item.travelMode, language)}: ${item.label} - ${formatDuration(item.hours)} / ${formatKm(item.km)}${item.continues ? homeText(language, '（次日继续）', ' (continues next day)') : ''}`);
        return;
      }
      const visit = visitFor(item.stop, language);
      lines.push(`  ${homeText(language, '参观', 'Visit')}: ${item.label} - ${formatHours(item.hours)}h${visit.bestTime ? ` - ${visit.bestTime}` : ''}`);
      if (visit.bookingNote) lines.push(`     ${visit.bookingNote}`);
    });
    if (day.bufferHours > 0) lines.push(`  ${homeText(language, '机动缓冲', 'Buffer')}: ${formatHours(day.bufferHours)}h`);
    lines.push('');
  });
  lines.push(homeText(language, '开放时间、预约和现场交通可能变化，出发前请再次确认。', 'Opening hours, reservations, and local transfers can change, so check again before departure.'));
  return lines.join('\n');
}


function HomeHeader({ language, setLanguage, userSession, onAccount, onHelp }) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const items = language === 'zh'
    ? [
      ['home-hero', '\u9996\u9875'],
      ['home-destinations', '\u76ee\u7684\u5730'],
      ['home-planner', '\u8def\u7ebf\u89c4\u5212'],
      ['home-3d', '3D\u5bfc\u89c8'],
      ['home-reviews', '\u70b9\u8bc4'],
      ['home-services', '\u670d\u52a1'],
    ]
    : [
      ['home-hero', 'Home'],
      ['home-destinations', 'Destinations'],
      ['home-planner', 'Route planner'],
      ['home-3d', '3D guide'],
      ['home-reviews', 'Travel notes'],
      ['home-services', 'Services'],
    ];
  const navigateTo = (id) => {
    scrollToHomeSection(id);
    setMobileExpanded(false);
  };
  return (
    <header className={`cinematic-home-nav ${mobileExpanded ? 'is-expanded' : 'is-collapsed'}`}>
      <button className="cinematic-home-nav__brand" type="button" onClick={() => navigateTo('home-hero')}><span>Trip3D</span><strong>{language === 'zh' ? '\u610f\u5927\u5229\u65c5\u884c\u624b\u518c' : 'Italy travel notebook'}</strong></button>
      <button
        className="cinematic-home-nav__toggle"
        type="button"
        aria-expanded={mobileExpanded}
        aria-controls="cinematic-home-navigation"
        onClick={() => setMobileExpanded((expanded) => !expanded)}
      >
        <span>{language === 'zh' ? (mobileExpanded ? '\u6536\u8d77' : '\u83dc\u5355') : (mobileExpanded ? 'Close' : 'Menu')}</span>
        <strong aria-hidden="true">{mobileExpanded ? '\u00d7' : '\u2630'}</strong>
      </button>
      <nav id="cinematic-home-navigation" aria-label={language === 'zh' ? '\u9996\u9875\u5bfc\u822a' : 'Home sections'}>{items.map(([id, label]) => <button key={id} type="button" onClick={() => navigateTo(id)}>{label}</button>)}<button type="button" onClick={() => navigateTo('home-account')}>{language === 'zh' ? '\u8d26\u6237' : 'Account'}</button></nav>
      <div className="cinematic-home-nav__tools"><div className="home-language-toggle" aria-label={homeText(language, '\u8bed\u8a00', 'Language')}><button type="button" className={language === 'zh' ? 'is-active' : ''} onClick={() => setLanguage('zh')}>{'\u4e2d\u6587'}</button><button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>EN</button></div><button className="cinematic-home-nav__help" type="button" onClick={onHelp}>{language === 'zh' ? '使用提示' : 'Quick guide'}</button><button className="cinematic-home-nav__account" type="button" onClick={onAccount}>{userSession ? userSession.name : (language === 'zh' ? '\u767b\u5f55' : 'Sign in')}</button></div>
    </header>
  );
}

function HomeHero({ language, routeStops, selectedStop, onOpenDrive, onClassicRoute }) {
  const title = language === 'zh' ? '\u4eca\u5929\u60f3\u53bb\u54ea\uff1f' : 'Where to today?';
  return <section id="home-hero" className="cinematic-section cinematic-hero"><div className="cinematic-hero__copy"><span>{language === 'zh' ? '\u610f\u5927\u5229\u65c5\u884c\u624b\u8bb0' : 'Italy travel notebook'}</span><h1>{title}</h1><p>{language === 'zh' ? '\u7b5b\u9009\u666f\u70b9\uff0c\u5f00\u59cb\u89c4\u5212\uff01' : 'Filter stops and start planning.'}</p><div className="cinematic-actions"><button className="concept-btn concept-btn--primary" type="button" onClick={() => scrollToHomeSection('home-planner')}>{language === 'zh' ? '\u5f00\u59cb\u89c4\u5212\u8def\u7ebf' : 'Start planning'}</button><button className="concept-btn concept-btn--classic" type="button" onClick={onClassicRoute}>{homeText(language, '试试经典路线', 'Try classic route')}</button><button className="concept-btn" type="button" onClick={() => scrollToHomeSection('home-3d')}>{language === 'zh' ? '\u8fdb\u51653D\u5bfc\u89c8' : 'Enter 3D guide'}</button></div></div><div className="cinematic-hero__preview" aria-label={language === 'zh' ? '\u8def\u7ebf\u548c3D\u5bfc\u89c8\u9884\u89c8' : 'Route and 3D guide preview'}><div className="cinematic-hero__media">{imageFor(selectedStop, language) && <img src={imageFor(selectedStop, language)} alt="" loading="eager" />}<button type="button" disabled={routeStops.length < 2} title={routeStops.length < 2 ? homeText(language, '请至少加入 2 个景点后再进入 3D 导览。', 'Add at least 2 stops before entering the 3D guide.') : ''} onClick={() => routeStops.length >= 2 && onOpenDrive(selectedStop.id)}>{language === 'zh' ? '\u6253\u5f00 3D Drive' : 'Open 3D Drive'}</button></div><div className="cinematic-hero__route"><span>{language === 'zh' ? '\u5f53\u524d\u8def\u7ebf' : 'Current route'}</span>{routeStops.slice(0, 5).map((stop, index) => <strong key={stop.id}>{index + 1}. {nameFor(stop, language)}</strong>)}</div></div></section>;
}

const ROUTE_MAP_BOUNDS = { lonMin: 6.4, lonMax: 19.0, latMin: 35.4, latMax: 47.2 };
const ITALY_COASTLINES = italyOutlineGeoJson.geometry.coordinates.map((polygon) => polygon[0]);
const ROUTE_NETWORK = [
  [[9.19,45.46],[10.99,45.44],[11.88,45.41],[12.23,45.49]],
  [[10.99,45.44],[11.34,44.49],[11.25,43.77],[12.48,41.91],[14.33,41.07],[14.49,40.75]],
  [[11.25,43.77],[10.4,43.72],[9.71,44.15]],
];

function projectRouteMapPoint(lon, lat) {
  const padding = 4;
  const drawingArea = 100 - padding * 2;
  const centerLat = (ROUTE_MAP_BOUNDS.latMin + ROUTE_MAP_BOUNDS.latMax) / 2;
  const longitudeScale = Math.cos(centerLat * Math.PI / 180);
  const minX = ROUTE_MAP_BOUNDS.lonMin * longitudeScale;
  const maxX = ROUTE_MAP_BOUNDS.lonMax * longitudeScale;
  const x = lon * longitudeScale;
  return {
    x: padding + ((x - minX) / (maxX - minX)) * drawingArea,
    y: padding + (1 - ((lat - ROUTE_MAP_BOUNDS.latMin) / (ROUTE_MAP_BOUNDS.latMax - ROUTE_MAP_BOUNDS.latMin))) * drawingArea,
  };
}

function createRouteMapProjector(coordinates) {
  const validCoordinates = coordinates.filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
  if (!validCoordinates.length) return projectRouteMapPoint;
  const lons = validCoordinates.map(([lon]) => lon);
  const lats = validCoordinates.map(([, lat]) => lat);
  let lonMin = Math.min(...lons);
  let lonMax = Math.max(...lons);
  let latMin = Math.min(...lats);
  let latMax = Math.max(...lats);
  const centerLat = (latMin + latMax) / 2;
  const longitudeScale = Math.cos(centerLat * Math.PI / 180);
  let width = Math.max((lonMax - lonMin) * longitudeScale, 0.012);
  let height = Math.max(latMax - latMin, 0.012);
  const targetSpan = Math.max(width, height) * 1.28;
  const centerLon = (lonMin + lonMax) / 2;
  const centerLatitude = (latMin + latMax) / 2;
  width = targetSpan;
  height = targetSpan;
  lonMin = centerLon - width / longitudeScale / 2;
  lonMax = centerLon + width / longitudeScale / 2;
  latMin = centerLatitude - height / 2;
  latMax = centerLatitude + height / 2;

  return (lon, lat) => ({
    x: 4 + ((lon - lonMin) / (lonMax - lonMin)) * 92,
    y: 4 + (1 - ((lat - latMin) / (latMax - latMin))) * 92,
  });
}

function routeMapPath(coordinates, close = false, projectPoint = projectRouteMapPoint) {
  const path = coordinates.map(([lon, lat], index) => {
    const point = projectPoint(lon, lat);
    return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }).join(' ');
  return close && path ? `${path} Z` : path;
}

function convexHull(coordinates) {
  const points = coordinates
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat))
    .map(([lon, lat]) => [lon, lat])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (points.length <= 2) return points;
  const cross = (origin, a, b) => (
    (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0])
  );
  const lower = [];
  points.forEach((point) => {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  });
  const upper = [];
  [...points].reverse().forEach((point) => {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  });
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function routeMapCityInfo(routeStops) {
  const cityEntries = routeStops.map((stop) => ({
    en: locationValue(stop, 'city', 'en'),
    zh: locationValue(stop, 'city', 'zh'),
  })).filter((city) => city.en || city.zh);
  const cityKeys = [...new Set(cityEntries.map((city) => city.en || city.zh))];
  if (routeStops.length >= 2 && cityEntries.length === routeStops.length && cityKeys.length === 1) {
    return {
      isCity: true,
      city: cityEntries[0]?.zh || cityEntries[0]?.en,
      cityEn: cityEntries[0]?.en || '',
    };
  }
  return { isCity: false, city: null, cityEn: '' };
}

function RouteSketchMap({
  language,
  routeStops,
  routeGeometry = [],
  routeGeometrySegments = [],
  isRouteLoading = false,
}) {
  const routeSignature = routeStops.map((stop) => stop.id).join('|');
  const previousRouteSignature = useRef(routeSignature);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (previousRouteSignature.current === routeSignature) return undefined;
    previousRouteSignature.current = routeSignature;
    setIsTransitioning(true);
    const timer = window.setTimeout(() => setIsTransitioning(false), 550);
    return () => window.clearTimeout(timer);
  }, [routeSignature]);

  const showRouteLoading = isRouteLoading || isTransitioning;
  const stopCoordinates = routeStops.map((stop) => {
    const live = liveFor(stop.id);
    return [live?.coordinates?.lon ?? stop.lon, live?.coordinates?.lat ?? stop.lat];
  });
  const displayGeometry = !showRouteLoading && routeGeometry.length >= 2
    ? routeGeometry
    : [];
  const projectPoint = createRouteMapProjector(displayGeometry.length ? [...displayGeometry, ...stopCoordinates] : stopCoordinates);
  const points = routeStops.map((stop, index) => {
    const [lon, lat] = stopCoordinates[index];
    const projected = projectPoint(lon, lat);
    return {
      stop,
      lon,
      lat,
      x: projected.x,
      y: projected.y,
    };
  });
  const routeStep = Math.max(1, Math.floor(displayGeometry.length / 1200));
  const simplifiedRoute = displayGeometry.filter((_, index) => index % routeStep === 0);
  const displaySegments = showRouteLoading ? [] : routeGeometrySegments
    .map((segment) => {
      const coordinates = segment.geometryCoordinates ?? [];
      const step = Math.max(1, Math.floor(coordinates.length / 500));
      return {
        ...segment,
        geometryCoordinates: coordinates.filter((_, index) => index % step === 0),
      };
    })
    .filter((segment) => segment.geometryCoordinates.length >= 2);
  const cityInfo = routeMapCityInfo(routeStops);
  const labelEvery = points.length > 14 ? 2 : 1;

  return (
    <div
      className={`paper-route-map ${showRouteLoading ? 'is-loading' : ''} ${cityInfo.isCity ? 'is-city-route' : ''} ${cityInfo.cityEn === 'Venice' ? 'is-water-city' : ''}`}
      aria-busy={showRouteLoading}
      aria-label={language === 'zh' ? '手绘道路路线地图' : 'Hand-drawn road route map'}
    >
      <svg viewBox="0 0 100 100" role="img" aria-hidden="true">
        {cityInfo.isCity ? (
          <g className="paper-route-map__city">
            {displayGeometry.length >= 2 && <path className="paper-route-map__city-network" d={routeMapPath(simplifiedRoute, false, projectPoint)} />}
          </g>
        ) : (
          <>
            {ITALY_COASTLINES.map((coastline, index) => <path key={index} className="paper-route-map__land" d={routeMapPath(coastline, true, projectPoint)} />)}
            {ROUTE_NETWORK.map((line, index) => <path key={index} className="paper-route-map__network" d={routeMapPath(line, false, projectPoint)} />)}
          </>
        )}
        {displaySegments.length ? displaySegments.map((segment, index) => (
          <g key={`${segment.travelMode}-${index}`}>
            <path className="paper-route-map__path-casing" d={routeMapPath(segment.geometryCoordinates, false, projectPoint)} />
            <path
              className={`paper-route-map__path is-${String(segment.travelMode ?? 'DRIVE').toLowerCase()}`}
              d={routeMapPath(segment.geometryCoordinates, false, projectPoint)}
            />
          </g>
        )) : (
          <>
            {simplifiedRoute.length >= 2 && <path className="paper-route-map__path-casing" d={routeMapPath(simplifiedRoute, false, projectPoint)} />}
            {simplifiedRoute.length >= 2 && <path className="paper-route-map__path" d={routeMapPath(simplifiedRoute, false, projectPoint)} />}
          </>
        )}
        {points.map((point, index) => (
          <g key={point.stop.id} className="paper-route-map__stop">
            <circle cx={point.x} cy={point.y} r="3.2" />
            <text x={point.x} y={point.y + 1.4}>{index + 1}</text>
          </g>
        ))}
      </svg>
      {cityInfo.isCity && <b className="paper-route-map__city-label">{cityInfo.city}</b>}
      {displaySegments.length > 0 && (
        <div className="paper-route-map__legend">
          {displaySegments.some((segment) => segment.travelMode === 'DRIVE') && <span className="is-drive">{homeText(language, '驾车', 'Drive')}</span>}
          {displaySegments.some((segment) => segment.travelMode === 'WALK') && <span className="is-walk">{homeText(language, '步行', 'Walk')}</span>}
        </div>
      )}
      {points.map((point, index) => (
        <span
          key={point.stop.id}
          className={index % labelEvery === 0 ? '' : 'is-compact'}
          style={{ '--x': point.x + '%', '--y': point.y + '%' }}
          title={nameFor(point.stop, language)}
        >
          {index % labelEvery === 0 ? nameFor(point.stop, language) : index + 1}
        </span>
      ))}
      {showRouteLoading && (
        <div className="paper-route-map__loading" role="status">
          <i aria-hidden="true" />
          <strong>{language === 'zh' ? '正在规划路线' : 'Drawing the roads into your notebook'}</strong>
        </div>
      )}
    </div>
  );
}

function DestinationSection(props) {
  const {
    language,
    query,
    setQuery,
    region,
    setRegion,
    kind,
    setKind,
    season,
    setSeason,
    sort,
    setSort,
    preference,
    setPreference,
    preferenceOptions,
    options,
    filteredStops,
    favorites,
    compare,
    routeIds,
    selectedId,
    visibleCount,
    onShowMore,
    onCollapse,
    onOpenDetail,
  } = props;
  const visibleStops = filteredStops.slice(0, visibleCount);

  return (
    <section id="home-destinations" className="cinematic-section cinematic-destinations" data-guide="search">
      <div className="cinematic-section__head">
        <span>{language === 'zh' ? '目的地' : 'Featured destinations'}</span>
        <h2>{language === 'zh' ? '先选想停留的地方' : 'Pick the stops that feel worth your time'}</h2>
        <p>{language === 'zh' ? '根据筛选挑选合适的景点' : 'Choose from public-source city and landmark notes, then turn them into a route.'}</p>
      </div>

      <section className="home-module home-module--search">
        <div className="home-module__head"><span>{homeText(language, '搜索与规划', 'Search & plan')}</span><strong>{homeText(language, '筛选', 'Filters')}</strong></div>
        <label className="home-search">
          <span>{homeText(language, '搜索', 'Search')}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={homeText(language, '搜景点、城市、地区，或者一句旅行想法', 'Search a stop, city, region, or travel idea')} />
        </label>
        <div className="home-filter-row home-filter-row--wide">
          <SelectField label={homeText(language, '地区', 'Region')} value={region} onChange={setRegion} options={options.regions} anyLabel={homeText(language, '不限', 'Any')} language={language} />
          <SelectField label={homeText(language, '类型', 'Type')} value={kind} onChange={setKind} options={options.kinds} anyLabel={homeText(language, '不限', 'Any')} language={language} />
          <SelectField label={homeText(language, '时间', 'Best time')} value={season} onChange={setSeason} options={options.seasons} anyLabel={homeText(language, '不限', 'Any')} language={language} />
          <label>
            <span>{homeText(language, '排序', 'Sort')}</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="featured">{homeText(language, '推荐', 'Featured')}</option>
              <option value="name">{homeText(language, '名称', 'Name')}</option>
              <option value="north">{homeText(language, '从北到南', 'North to south')}</option>
            </select>
          </label>
        </div>
        <div className="preference-chips" aria-label={homeText(language, '旅行偏好', 'Travel preferences')}>
          <button type="button" className={preference === 'any' ? 'is-active' : ''} onClick={() => setPreference('any')}>{homeText(language, '都看看', 'All')}</button>
          {preferenceOptions.map((item) => (
            <button key={item} type="button" className={preference === item ? 'is-active' : ''} onClick={() => setPreference(item)}>{item}</button>
          ))}
        </div>
      </section>

      <div className="cinematic-destination-grid">
        {visibleStops.map((stop) => {
          const url = pageUrlFor(stop, language);
          const visit = visitFor(stop, language);
          return (
            <article key={stop.id} className={'cinematic-destination-card ' + (selectedId === stop.id ? 'is-selected' : '')}>
              {imageFor(stop, language) && <img src={imageFor(stop, language)} alt="" loading="lazy" />}
              <div className="cinematic-destination-card__body">
                <strong>{nameFor(stop, language)}</strong>
                <span>{[locationLabel(stop, language) || regionText(stop, language), kindText(stop, language), visit.bestTime].filter(Boolean).join(' / ')}</span>
                <p>{summaryFor(stop, language) || homeText(language, '这处资料还不完整，适合作为行程里的待确认点。', 'These notes are still thin, so keep this as a check-before-you-go stop.')}</p>
                <div className="destination-tags">{travelPreferenceTags(stop, language).map((tag) => <small key={tag}>{tag}</small>)}</div>
              </div>
              <div className="home-card-actions">
                <button className={favorites.has(stop.id) ? 'is-on' : ''} type="button" onClick={() => props.onFavorite(stop.id)}>{homeText(language, '收藏', 'Save')}</button>
                <button className={compare.has(stop.id) ? 'is-on' : ''} type="button" onClick={() => props.onCompare(stop.id)}>{homeText(language, '对比', 'Compare')}</button>
                <button
                  data-guide="add-route"
                  className={routeIds.includes(stop.id) ? 'is-route-added' : ''}
                  type="button"
                  aria-pressed={routeIds.includes(stop.id)}
                  onClick={() => props.onAddRoute(stop.id)}
                >
                  {routeIds.includes(stop.id) ? homeText(language, '取消加入', 'Remove from route') : homeText(language, '加入路线', 'Add to route')}
                </button>
                <button type="button" onClick={() => onOpenDetail(stop.id)}>{homeText(language, '查看详情', 'Details')}</button>
                {url && <a href={url} target="_blank" rel="noreferrer">{homeText(language, '资料页', 'Source page')}</a>}
              </div>
            </article>
          );
        })}
      </div>
      <div className="section-expand-actions">
        {visibleStops.length < filteredStops.length && <button className="home-download-btn" type="button" onClick={onShowMore}>{language === 'zh' ? '展示更多景点' : 'Show more destinations'}</button>}
        {visibleCount > 12 && <button className="home-download-btn is-secondary" type="button" onClick={onCollapse}>{language === 'zh' ? '收起景点列表' : 'Collapse destinations'}</button>}
      </div>
    </section>
  );
}

function PrintableItinerary({ language, routeStops, plan, pace }) {
  return (
    <section className="print-itinerary" aria-label={homeText(language, '可打印行程', 'Printable itinerary')}>
      <h1>{homeText(language, 'Trip3D 行程草稿', 'Trip3D Italy planning draft')}</h1>
      <p>{homeText(language, '路线', 'Route')}: {routeStops.map((stop) => nameFor(stop, language)).join(' -> ') || homeText(language, '还没有添加景点', 'No stops yet')}</p>
      <p>{homeText(language, '节奏', 'Pace')}: {paceLabel(pace, language)}</p>
      <p>{homeText(language, '建议至少预留', 'Suggested minimum')}: {plan.minimumDays} {homeText(language, '天', 'days')}</p>
      {!plan.isFeasible && <p>{homeText(language, '这份安排会有些赶，建议再留一天。', 'This plan is rather full, so consider adding another day.')}</p>}
      {plan.days.map((day) => (
        <article key={day.day}>
          <h2>{homeText(language, `第 ${day.day} 天`, `Day ${day.day}`)} · {formatKm(day.totalKm)} · {formatDuration(day.totalHours)}</h2>
          {day.activities.length ? (
            <>
              {day.activities.map((item, index) => {
                if (item.kind !== 'visit') {
                  return (
                    <section key={`${item.from.id}-${item.to.id}-${index}`}>
                      <h3>{travelModeLabel(item.travelMode, language)}: {item.label}</h3>
                      <p>{formatDuration(item.hours)} / {formatKm(item.km)}{item.continues ? homeText(language, '，次日继续。', ', continues next day.') : ''}</p>
                    </section>
                  );
                }
                const visit = visitFor(item.stop, language);
                return (
                  <section key={`${item.stop.id}-${index}`}>
                    <h3>{homeText(language, '参观', 'Visit')}: {item.label}</h3>
                    <p>{summaryFor(item.stop, language)}</p>
                    <p>{homeText(language, '参观预留', 'Visit allowance')}: {formatHours(item.hours)}h</p>
                    {visit.bookingNote && <p>{visit.bookingNote}</p>}
                  </section>
                );
              })}
            </>
          ) : <p>{homeText(language, '留作机动日。', 'Keep this as a buffer day.')}</p>}
        </article>
      ))}
      <footer>{homeText(language, '开放时间、预约和交通请在出发前再次确认。', 'Recheck opening hours, reservations, and transfers before departure.')}</footer>
    </section>
  );
}


function RoutePlannerSection(props) {
  const { language, routeStops, routeSegments, routeGeometry, isRouteLoading, routeQuery, setRouteQuery, routeMatches, days, setDays, pace, setPace, lockedIds } = props;
  const [showAllDays, setShowAllDays] = useState(false);
  const plan = makeItineraryPlan(routeStops, days, pace, language, routeSegments);
  const exportText = itineraryExportText(language, routeStops, days, pace, routeSegments);
  const minSelectableDays = plan.physicalMinimumDays ?? 1;
  const visiblePlanDays = showAllDays ? plan.days : plan.days.slice(0, 4);
  const hiddenDayCount = Math.max(0, plan.days.length - visiblePlanDays.length);
  const routeRecommendations = useMemo(() => [...(props.routeRecommendations ?? [])]
    .map((recommendation) => ({
      ...recommendation,
      metrics: routeRecommendationMetrics(recommendation, props.recommendationMetrics ?? {}),
    }))
    .map((recommendation) => ({
      ...recommendation,
      displayedDuration: recommendation.metrics.duration + routeVisitHoursForIds(recommendation.ids, language, pace),
    }))
    .slice(0, 4), [language, pace, props.recommendationMetrics, props.routeRecommendations]);
  const printPdf = () => window.print();
  const healthReport = routeHealthReport(routeStops, plan, routeSegments, props.routeDiagnostics, language);
  const handleDaysChange = (event) => {
    setDays(Math.max(clampDays(event.target.value), minSelectableDays));
  };
  const handleDaysKeyDown = (event) => {
    if (event.key === 'ArrowDown' && days <= minSelectableDays) {
      event.preventDefault();
    }
  };

  return (
    <section id="home-planner" className="cinematic-section cinematic-route-planner" data-guide="planner">
      <div className="cinematic-section__head">
        <span>{language === 'zh' ? '路线规划' : 'Route planner'}</span>
        <h2>{language === 'zh' ? '进一步修改路线顺序及节奏' : 'Turn stops into days you can actually follow'}</h2>
        <p>{language === 'zh' ? '修改景点顺序、游览方式、路程、停留时间。' : 'No hotel coordinates and no changes to the 3D guide. This keeps the stop order, timing, travel gaps, and check-before-you-go notes readable.'}</p>
      </div>

      <div className="cinematic-route-planner__main">
        <div className="cinematic-route-planner__controls">
          <section className="home-module home-module--planner">
            <div className="home-module__head"><span>{homeText(language, '路线控制', 'Route controls')}</span><strong>{routeStops.length}</strong></div>
            <div className="route-mode-control" aria-label={homeText(language, '路线交通方式', 'Route travel mode')}>
              {[
                ['AUTO', homeText(language, '自动混合', 'Auto mix')],
                ['DRIVE', homeText(language, '驾车', 'Drive')],
                ['WALK', homeText(language, '步行', 'Walk')],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={props.routeTravelPreference === mode ? 'is-active' : ''}
                  aria-pressed={props.routeTravelPreference === mode}
                  onClick={() => props.setRouteTravelPreference(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="home-search">
              <span>{homeText(language, '添加景点', 'Add stop')}</span>
              <input value={routeQuery} onChange={(event) => setRouteQuery(event.target.value)} placeholder={homeText(language, '搜一个景点，放进当前路线', 'Search a stop and add it to this route')} />
            </label>
            {routeQuery && <div className="concept-suggestion-list">{routeMatches.slice(0, 5).map((stop) => <button key={stop.id} type="button" onClick={() => props.onAddRoute(stop.id)}><strong>{nameFor(stop, language)}</strong><span>{locationLabel(stop, language) || regionText(stop, language)} / {kindText(stop, language)}</span></button>)}</div>}
            <div className="home-planner-list">
              {!routeStops.length && <p className="planner-empty-state">{homeText(language, '路线本里还没有目的地，先从景点卡片中加入几个想去的地方吧。', 'Your route notebook is empty. Add a few places from destination cards first.')}</p>}
              {routeStops.map((stop, index) => (
                <section key={stop.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{nameFor(stop, language)}</strong>
                  <button type="button" aria-label={homeText(language, '上移', 'Move up')} onClick={() => props.onMove(stop.id, -1)}>↑</button>
                  <button type="button" aria-label={homeText(language, '下移', 'Move down')} onClick={() => props.onMove(stop.id, 1)}>↓</button>
                  <button className="route-lock-btn" type="button" aria-label={lockedIds.has(stop.id) ? homeText(language, '解锁', 'Unlock') : homeText(language, '锁定', 'Lock')} onClick={() => props.onToggleLock(stop.id)}>
                    <i aria-hidden="true" className={lockedIds.has(stop.id) ? 'sketch-lock is-locked' : 'sketch-lock'} />
                  </button>
                  <button type="button" aria-label={homeText(language, '移除', 'Remove')} onClick={() => props.onRemove(stop.id)}>×</button>
                </section>
              ))}
            </div>
            <div className="concept-actions concept-actions--compact">
              <button className="concept-btn" type="button" onClick={props.onOptimize}>{homeText(language, '减少回头', 'Reduce backtracking')}</button>
              <button className="concept-btn concept-btn--classic" type="button" onClick={props.onClassicRoute}>{homeText(language, '一键体验经典意大利路线', 'Try classic Italy route')}</button>
              <button className="concept-btn" type="button" onClick={props.onResetRoute}>{homeText(language, '回到默认路线', 'Reset route')}</button>
              <button className="concept-btn" type="button" onClick={props.onClearRoute}>{homeText(language, '一键清空', 'Clear route')}</button>
              <button className="concept-btn" type="button" onClick={props.onSaveRoute}>
                {props.userSession ? homeText(language, '保存当前路线', 'Save route') : homeText(language, '登录后保存', 'Sign in to save')}
              </button>
            </div>
            {props.optimizeMessage && <p className="planner-note" role="status">{props.optimizeMessage}</p>}
            {props.routeSaveStatus && <p className="planner-note" role="status">{props.routeSaveStatus}</p>}
          </section>

          <section className="home-module home-module--route-recommendations">
            <div className="home-module__head">
              <span>{homeText(language, '推荐路线', 'Recommended routes')}</span>
              <strong>{routeRecommendations.length}</strong>
            </div>
            <p className="route-recommendations__intro">
              {homeText(language, '基于当前景点和锁定位置生成，可继续手动调整。', 'Generated from the current stops and locked positions. You can still edit after choosing.')}
            </p>
            <div className="route-recommendations">
              {routeRecommendations.map((recommendation) => {
                const isSelected = recommendation.ids.join('|') === routeStops.map((stop) => stop.id).join('|');
                return (
                <button
                  key={recommendation.id}
                  type="button"
                  className={`route-recommendation-card ${isSelected ? 'is-selected' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => props.onSelectRecommendation(recommendation)}
                >
                  <div>
                    <strong>{recommendation.title}</strong>
                    <span>{formatKm(recommendation.metrics.distance)} / {formatDuration(recommendation.displayedDuration)}</span>
                  </div>
                  {recommendation.savedKm >= 1 && <small>{homeText(language, `少约 ${Math.round(recommendation.savedKm)} km`, `save about ${Math.round(recommendation.savedKm)} km`)}</small>}
                </button>
              )})}
            </div>
          </section>

          <section className="home-module home-module--itinerary-controls">
            <div className="home-module__head"><span>{homeText(language, '按天安排', 'Day plan')}</span><strong>{days}</strong></div>
            <div className="home-planner-controls">
              <label>
                <span>{homeText(language, '天数', 'Days')}</span>
                <input
                  type="number"
                  min={minSelectableDays}
                  max={MAX_TRIP_DAYS}
                  value={days}
                  onChange={handleDaysChange}
                  onKeyDown={handleDaysKeyDown}
                />
              </label>
              <label><span>{homeText(language, '节奏', 'Pace')}</span><select value={pace} onChange={(event) => setPace(event.target.value)}>{Object.keys(paceDailyHours).map((item) => <option key={item} value={item}>{paceLabel(item, language)}</option>)}</select></label>
            </div>
            <p className="planner-note">{paceText(pace, language)}</p>
            <div className={`itinerary-readiness ${plan.isFeasible ? 'is-ready' : 'is-tight'}`}>
              <strong>{plan.isFeasible
                ? homeText(language, '行程时间合适', 'This plan has room to breathe')
                : homeText(language, '行程有点赶', 'This plan is rather full')}</strong>
              <p>{homeText(
                language,
                `按现在的节奏，建议至少预留 ${plan.minimumDays} 天：约 ${formatHours(plan.travelHours)} 小时在路上，${formatHours(plan.visitHours)} 小时游览，另有 ${formatHours(plan.bufferHours)} 小时机动。`,
                `At this pace, allow at least ${plan.minimumDays} days: about ${formatHours(plan.travelHours)} hours on the road, ${formatHours(plan.visitHours)} hours exploring, plus ${formatHours(plan.bufferHours)} buffer hours.`,
              )}</p>
            </div>
          </section>

        </div>

        <div className="cinematic-route-planner__visual">
          <section className="home-module home-module--map">
            <div className="home-module__head"><span>{homeText(language, '路线预览', 'Route preview')}</span><strong>{isRouteLoading ? homeText(language, '正在规划路线', 'Drawing route') : routeGeometry.length >= 2 ? homeText(language, '已按道路整理', 'Road route ready') : homeText(language, '大致方向', 'Rough direction')}</strong></div>
            <RouteSketchMap language={language} routeStops={routeStops} routeGeometry={routeGeometry} routeGeometrySegments={props.routeGeometrySegments} isRouteLoading={isRouteLoading} />
            {!isRouteLoading && routeGeometry.length < 2 && <p className="planner-note">{homeText(language, '道路信息加载中，路线仅供参考。', 'Road details are taking a little longer, so the map is showing the general direction for now.')}</p>}
            {props.routeDiagnostics?.excessiveOverlap && <p className="planner-note is-warning">{homeText(language, `检测到约 ${Math.round(props.routeDiagnostics.overlapRatio * 100)}% 的道路重复，建议使用“同城少回头”路线或调整景点顺序。`, `About ${Math.round(props.routeDiagnostics.overlapRatio * 100)}% of the route repeats. Try the city-local route or reorder stops.`)}</p>}
          </section>
          <section className="home-module home-module--schema">
            <div className="home-module__head"><span>{homeText(language, '站点连接', 'Stop connections')}</span><strong>{routeSegments.length}</strong></div>
            <div className="home-schema-list">
              {routeSegments.map((segment, index) => {
                const detourHint = routeDetourHint(segment, props.routeTravelPreference, language);
                return (
                  <article key={segment.from.id + '-' + segment.to.id} className={`is-${String(segment.travelMode ?? 'DRIVE').toLowerCase()}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{nameFor(segment.from, language) + ' -> ' + nameFor(segment.to, language)}</strong>
                    <small>{formatKm(segment.distance)} / {formatDuration(segment.duration)} · {travelModeLabel(segment.travelMode, language)}</small>
                    {detourHint && <em>{detourHint}</em>}
                  </article>
                );
              })}
            </div>
          </section>
          <section className="home-module home-module--metrics">
            <div className="home-module__head"><span>{homeText(language, '路线概览', 'Route overview')}</span><strong>{pace}</strong></div>
            <div className="home-metric-grid">
              <section><strong>{formatKm(plan.totalKm)}</strong><span>{homeText(language, '全程里程', 'Distance')}</span></section>
              <section><strong>{formatHours(plan.travelHours)} h</strong><span>{homeText(language, '在路上', 'On the road')}</span></section>
              <section><strong>{formatHours(plan.visitHours)} h</strong><span>{homeText(language, '慢慢看', 'Exploring')}</span></section>
              <section><strong>{formatHours(plan.bufferHours)} h</strong><span>{homeText(language, '机动缓冲', 'Buffer time')}</span></section>
            </div>
            <aside className="route-health-card">
              <div className="home-module__head"><span>{homeText(language, '路线体检报告', 'Route health report')}</span><strong>{healthReport.empty ? '--' : healthReport.recommendedDays + homeText(language, '天', 'd')}</strong></div>
              {healthReport.empty ? <p>{healthReport.message}</p> : (
                <>
                  <dl>
                    <div><dt>{homeText(language, '路线顺路度', 'Directness')}</dt><dd>{healthReport.directness}</dd></div>
                    <div><dt>{homeText(language, '节奏舒适度', 'Pace comfort')}</dt><dd>{healthReport.comfort}</dd></div>
                    <div><dt>{homeText(language, '首次旅行友好度', 'First-trip friendly')}</dt><dd>{healthReport.friendly}</dd></div>
                    <div><dt>{homeText(language, '总距离', 'Total distance')}</dt><dd>{formatKm(healthReport.distance)}</dd></div>
                    <div><dt>{homeText(language, '预计交通时间', 'Transit time')}</dt><dd>{formatDuration(healthReport.trafficHours)}</dd></div>
                    <div><dt>{homeText(language, '推荐天数', 'Recommended days')}</dt><dd>{healthReport.recommendedDays}</dd></div>
                  </dl>
                  <p>{healthReport.advice}</p>
                </>
              )}
            </aside>
          </section>
        </div>
      </div>

      <section className="home-module home-module--day-cards" id="home-day-plan">
            <div className="home-module__head home-module__head--day-plan">
              <span>{homeText(language, '每天怎么走', 'Day by day')}</span>
              <div className="day-plan-tools" data-guide="export">
                <strong>{plan.dailyLimit}h / {homeText(language, '天', 'day')}</strong>
                <button className="home-download-btn" type="button" onClick={() => downloadTextFile('trip3d-itinerary.txt', exportText)}>TXT</button>
                <button className="home-download-btn home-download-btn--pdf" type="button" onClick={printPdf}>PDF</button>
              </div>
            </div>
            <div className={`cinematic-day-grid ${showAllDays ? 'is-expanded' : ''}`}>
              {visiblePlanDays.map((day) => (
                <article key={day.day} className={`cinematic-day-card ${day.overHours > 0 ? 'is-tight' : ''}`}>
                  <span>{homeText(language, `第 ${day.day} 天`, `Day ${day.day}`)}</span>
                  <strong>{formatDuration(day.totalHours)} / {formatKm(day.totalKm)}</strong>
                  <p>{day.activities.length ? homeText(language, '当天安排', 'Day plan') : homeText(language, '留作机动日', 'A flexible day')}</p>
                  <div className="day-time-ratio" style={{ '--travel': `${Math.max(4, (day.travelHours / Math.max(day.totalHours, 0.1)) * 100)}%`, '--visit': `${Math.max(4, (day.visitHours / Math.max(day.totalHours, 0.1)) * 100)}%`, '--buffer': `${Math.max(4, (day.bufferHours / Math.max(day.totalHours, 0.1)) * 100)}%` }}>
                    <i className="is-travel" title={homeText(language, '交通时间', 'Transit time')} />
                    <i className="is-visit" title={homeText(language, '参观时间', 'Visit time')} />
                    <i className="is-buffer" title={homeText(language, '机动时间', 'Buffer time')} />
                  </div>
                  <div className="day-time-ratio__legend"><span>{homeText(language, '交通', 'Transit')} {formatHours(day.travelHours)}h</span><span>{homeText(language, '参观', 'Visit')} {formatHours(day.visitHours)}h</span><span>{homeText(language, '机动', 'Buffer')} {formatHours(day.bufferHours)}h</span></div>
                  {day.activities.length > 0 && (
                    <div className="cinematic-day-card__timeline">
                      {day.activities.map((item, index) => {
                        if (item.kind !== 'visit') {
                          const activityClass = item.kind === 'walk'
                            ? 'is-walk'
                            : item.kind === 'mixed' ? 'is-mixed' : 'is-drive';
                          return (
                            <div key={`${item.from.id}-${item.to.id}-${index}`} className={`cinematic-day-card__activity ${activityClass}`}>
                              <i aria-hidden="true">→</i>
                              <span>{travelModeLabel(item.travelMode, language)}</span>
                              <strong>{item.label}</strong>
                              <em>{formatDuration(item.hours)} / {formatKm(item.km)}{item.continues ? homeText(language, ' · 次日继续', ' · continues next day') : ''}</em>
                            </div>
                          );
                        }
                        return (
                          <div key={`${item.stop.id}-${index}`} className="cinematic-day-card__activity is-visit">
                            <i aria-hidden="true">●</i>
                            <span>{homeText(language, '参观', 'Visit')}</span>
                            <strong>{item.label}</strong>
                            <em>{formatHours(item.hours)}h</em>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <small>{day.overHours > 0
                    ? homeText(language, `这一天可能比较紧凑，建议增加天数或调整为轻松节奏。`, `About ${formatHours(day.overHours)} hours over the limit. Move one stop to another day.`)
                    : homeText(language, `${formatHours(day.travelHours)} 小时在路上，${formatHours(day.visitHours)} 小时参观，${formatHours(day.bufferHours)} 小时机动`, `${formatHours(day.travelHours)} hours in transit, ${formatHours(day.visitHours)} hours exploring, ${formatHours(day.bufferHours)} hours buffer`)}</small>
                </article>
              ))}
            </div>
            {plan.days.length > 4 && (
              <button className="home-download-btn day-collapse-toggle" type="button" aria-expanded={showAllDays} onClick={() => setShowAllDays((current) => !current)}>
                {showAllDays
                  ? homeText(language, '收起天数', 'Collapse days')
                  : homeText(language, `展开其余 ${hiddenDayCount} 天`, `Show ${hiddenDayCount} more days`)}
              </button>
            )}
      </section>

      <PrintableItinerary language={language} routeStops={routeStops} plan={plan} pace={pace} />
    </section>
  );
}

function ThreeDGuideSection({ language, selectedStop, routeStops, onOpenDrive }) {
  const entryStop = selectedStop && routeStops.some((stop) => stop.id === selectedStop.id)
    ? selectedStop
    : routeStops[0] ?? null;
  return <section id="home-3d" className="cinematic-section cinematic-3d"><div className="cinematic-section__head"><span>{language === 'zh' ? '3D旅行导览' : '3D travel guide'}</span><h2>{language === 'zh' ? '进入3D路线导览' : 'Enter the 3D route guide'}</h2><p>{language === 'zh' ? '沉浸式体验规划路线' : 'Experience your planned route immersively.'}</p></div><div className="cinematic-3d__layout"><div className="cinematic-3d__copy"><strong>{entryStop ? nameFor(entryStop, language) : homeText(language, '还没有选择路线', 'No route selected')}</strong><p>{language === 'zh' ? '当前路线包含 ' + routeStops.length + ' 个停靠点，准备好后就沿着选好的路出发。' : 'Your route has ' + routeStops.length + ' stops. When you are ready, set off along the roads you picked.'}</p></div><div className="cinematic-entry-grid cinematic-entry-grid--single"><article><strong>3D Drive</strong><p>{language === 'zh' ? '沿当前路线进入沉浸式导览；规划页会按距离和城市条件自动混合驾车与步行。' : 'Enter immersive guidance along the current route; the planner mixes driving and walking based on distance and city conditions.'}</p><button type="button" disabled={!entryStop || routeStops.length < 2} onClick={() => entryStop && routeStops.length >= 2 && onOpenDrive(entryStop.id)}>{language === 'zh' ? '进入' : 'Enter'}</button>{routeStops.length < 2 && <small className="planner-note">{homeText(language, '请至少加入 2 个景点后再进入 3D 导览。', 'Add at least 2 stops before entering the 3D guide.')}</small>}</article></div></div></section>;
}

function FeatureSection({ language, favorites, compare, routeStops, userSession, onOpenService }) {
  const features = language === 'zh' ? [['01', '收藏目的地', favorites.size + ' 个已收藏', '把喜欢的地方留在手边'], ['02', '景点对比', compare.size + ' 个对比项', '摊开看看，再决定停在哪里'], ['03', '顺路整理', '让未锁定的景点走得更顺', '少绕一点路，多留一点时间'], ['04', '按天安排行程', '看看每天在路上多久', '把快慢节奏安排清楚'], ['05', '旅行资料', '读一读目的地的故事', '出发前心里更有底'], ['06', '我的旅行手册', userSession ? userSession.name : '游客模式', '保存这次旅行的选择']] : [['01', 'Saved destinations', favorites.size + ' saved', 'Keep favorite places close by'], ['02', 'Compare stops', compare.size + ' compared', 'Put ideas side by side before choosing'], ['03', 'Smoother route', 'Keep unlocked stops more direct', 'Spend less time doubling back'], ['04', 'Day itinerary', 'See how each day feels', 'Balance driving and exploring'], ['05', 'Travel notes', 'Read the story behind each place', 'Leave with a little more context'], ['06', 'My travel notebook', userSession ? userSession.name : 'Guest mode', 'Keep your trip choices together']];
  const ids = ['favorites', 'compare', 'optimize', 'days', 'notes', 'account'];
  return <section id="home-services" className="cinematic-section cinematic-features"><div className="cinematic-section__head"><span>{language === 'zh' ? '\u529f\u80fd\u670d\u52a1' : 'Travel tools'}</span><h2>{language === 'zh' ? '\u89c4\u5212\u65c5\u7a0b\u65f6\u5e38\u7528\u7684\u5165\u53e3' : 'Useful entries while planning'}</h2></div><div className="cinematic-feature-grid">{features.map(([index, title, detail, action], itemIndex) => <button className="cinematic-feature-card" key={title} type="button" onClick={() => onOpenService(ids[itemIndex])}><span>{index}</span><strong>{title}</strong><p>{detail}</p><small>{action}</small></button>)}</div></section>;
}

function TravelServiceDrawer({ language, mode, favorites, compare, routeIds, onClose, onFavorite, onCompare, onAddRoute, onOpenDetail }) {
  if (!mode) return null;
  const ids = mode === 'favorites' ? [...favorites] : [...compare];
  const stops = ids.map((id) => landmarks.find((stop) => stop.id === id)).filter(Boolean);
  const isCompare = mode === 'compare';
  return (
    <section className="travel-service-drawer" role="dialog" aria-modal="true" aria-label={homeText(language, isCompare ? '景点对比' : '收藏目的地', isCompare ? 'Compare stops' : 'Saved destinations')}>
      <div className="travel-service-drawer__panel">
        <header>
          <div>
            <span>{homeText(language, '旅行夹页', 'Travel notebook insert')}</span>
            <h2>{homeText(language, isCompare ? '把想去的地方摊开看看' : '这些地方已经被你圈起来了', isCompare ? 'Put your possible stops side by side' : 'The places you have circled')}</h2>
            <p>{homeText(language, isCompare ? '看看停留时间、适合时段和预约提醒，再决定把谁放进路线。' : '从收藏里继续看详情，或者直接把它放进路线。', isCompare ? 'Compare timing, visit length, and planning notes before choosing.' : 'Open a saved place or add it straight to your route.')}</p>
          </div>
          <button type="button" onClick={onClose}>{homeText(language, '合上夹页', 'Close')}</button>
        </header>
        {!stops.length ? (
          <div className="travel-service-empty">
            <strong>{homeText(language, isCompare ? '还没有放进对比栏的景点' : '还没有收藏目的地', isCompare ? 'Nothing to compare yet' : 'No saved destinations yet')}</strong>
            <p>{homeText(language, '先去挑几个想停留的地方，这里会替你收好。', 'Pick a few places that catch your eye and they will wait here.')}</p>
            <button type="button" onClick={() => { onClose(); scrollToHomeSection('home-destinations'); }}>{homeText(language, '去挑目的地', 'Browse destinations')}</button>
          </div>
        ) : (
          <div className={`travel-service-grid ${isCompare ? 'is-compare' : ''}`}>
            {stops.map((stop) => {
              const visit = visitFor(stop, language);
              const inRoute = routeIds.includes(stop.id);
              return (
                <article key={stop.id}>
                  {imageFor(stop, language) && <img src={imageFor(stop, language)} alt="" />}
                  <span>{locationLabel(stop, language) || regionText(stop, language)} / {kindText(stop, language)}</span>
                  <h3>{nameFor(stop, language)}</h3>
                  <dl>
                    <div><dt>{homeText(language, '建议停留', 'Visit')}</dt><dd>{visit.durationHours} h</dd></div>
                    <div><dt>{homeText(language, '适合时段', 'Best time')}</dt><dd>{visit.bestTime}</dd></div>
                    <div><dt>{homeText(language, '出发前记得', 'Before you go')}</dt><dd>{visit.bookingNote}</dd></div>
                  </dl>
                  <div>
                    <button type="button" onClick={() => onOpenDetail(stop.id)}>{homeText(language, '看看详情', 'Details')}</button>
                    <button className={inRoute ? 'is-route-added' : ''} type="button" aria-pressed={inRoute} onClick={() => onAddRoute(stop.id)}>{inRoute ? homeText(language, '取消加入', 'Remove from route') : homeText(language, '加入路线', 'Add to route')}</button>
                    <button type="button" onClick={() => (isCompare ? onCompare(stop.id) : onFavorite(stop.id))}>{homeText(language, isCompare ? '移出对比' : '取消收藏', isCompare ? 'Remove' : 'Unsave')}</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ReviewSection({ language, stops, visibleCount = 6, onShowMore, onCollapse }) {
  const visibleStops = stops.slice(0, visibleCount);
  return (
    <section id="home-reviews" className="cinematic-section cinematic-reviews">
      <div className="cinematic-section__head">
        <span>{language === 'zh' ? '景点资料' : 'Destination notes'}</span>
        <h2>{language === 'zh' ? '出发前，先了解每一站' : 'Get to know each stop before departure'}</h2>
        <p>{language === 'zh' ? '查看景点背景、适合人群、参观时长和预约信息。' : 'Review landmark background, suitable visitors, suggested visit time, and reservation details.'}</p>
      </div>
      <div className="cinematic-review-grid">
        {visibleStops.map((stop) => {
          const visit = visitFor(stop, language);
          const meta = [
            visit.durationHours ? homeText(language, `建议停留 ${visit.durationHours} 小时`, `${visit.durationHours}h visit`) : '',
            visit.bestTime,
            locationLabel(stop, language) || regionText(stop, language),
          ].filter(Boolean).join(' / ');
          return (
            <article key={stop.id}>
              <p>{summaryFor(stop, language).slice(0, 190) || homeText(language, '这处资料还需要补充，先把它当作待确认灵感。', 'This source note needs more detail, so keep it as a planning lead.')}</p>
              <div>
                {imageFor(stop, language) && <img src={imageFor(stop, language)} alt="" loading="lazy" />}
                <span>{meta}</span>
                <strong>{nameFor(stop, language)}</strong>
              </div>
            </article>
          );
        })}
      </div>
      <div className="section-expand-actions">
        {visibleStops.length < stops.length && <button className="home-download-btn cinematic-review-more" type="button" onClick={onShowMore}>{homeText(language, '显示更多资料卡', 'Show more notes')}</button>}
        {visibleCount > 6 && <button className="home-download-btn is-secondary" type="button" onClick={onCollapse}>{homeText(language, '收起资料卡', 'Collapse notes')}</button>}
      </div>
    </section>
  );
}


function TravelNotesSection({ language, stops }) {
  const noteStops = stops.filter((stop) => pageUrlFor(stop, language)).slice(0, 3);
  return <section id="home-notes" className="cinematic-section cinematic-notes"><div className="cinematic-section__head"><span>{language === 'zh' ? '\u65c5\u884c\u653b\u7565 / \u80cc\u666f\u8d44\u6599' : 'Travel notes / background'}</span><h2>{language === 'zh' ? '\u51fa\u53d1\u524d\u8bfb\u4e00\u8bfb\u5f53\u524d\u8def\u7ebf\u7684\u76ee\u7684\u5730' : 'Read about the stops in this route before you go'}</h2></div>{noteStops.length ? <div className="cinematic-notes-grid">{noteStops.map((stop) => <article key={stop.id}>{imageFor(stop, language) && <img src={imageFor(stop, language)} alt="" loading="lazy" />}<span>{regionText(stop, language)}</span><strong>{nameFor(stop, language)}</strong><p>{summaryFor(stop, language).slice(0, 160)}</p><a className="concept-btn" href={pageUrlFor(stop, language)} target="_blank" rel="noreferrer">{homeText(language, '\u67e5\u770b\u8be6\u60c5', 'View details')}</a></article>)}</div> : <p className="planner-note">{homeText(language, '当前路线里还没有可打开资料页的景点。', 'No route stop has a source page yet.')}</p>}</section>;
}

function AccountSummarySection({ language, favorites, routeStops, lockedIds, userSession, onSignIn, myReviews, savedRoutes }) {
  const items = [
    [language === 'zh' ? '\u5f53\u524d\u6a21\u5f0f' : 'Current mode', userSession ? userSession.name : homeText(language, '\u6e38\u5ba2\u6a21\u5f0f', 'Guest mode')],
    [homeText(language, '我评价过', 'Reviewed stops'), Object.keys(myReviews ?? {}).length],
    [homeText(language, '收藏了', 'Favorites'), favorites.size],
    [homeText(language, '保存了路线', 'Saved routes'), savedRoutes?.length ?? 0],
    [language === 'zh' ? '\u5f53\u524d\u8def\u7ebf\u666f\u70b9' : 'Route stops', routeStops.length],
    [language === 'zh' ? '\u5df2\u9501\u5b9a\u666f\u70b9' : 'Locked stops', lockedIds.size],
  ];
  return <section id="home-account" className="cinematic-section cinematic-account-summary"><div className="cinematic-section__head"><span>{homeText(language, '\u8d26\u6237', 'Account')}</span><h2>{language === 'zh' ? '我的旅行手册汇总' : 'My travel notebook summary'}</h2></div><div className="cinematic-account-summary__grid">{items.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}<button type="button" onClick={onSignIn}>{userSession ? (language === 'zh' ? '\u67e5\u770b\u8d26\u6237' : 'View account') : (language === 'zh' ? '\u767b\u5f55' : 'Sign in')}</button></div></section>;
}

function HomeFooter({ language }) {
  const links = [['home-hero', language === 'zh' ? '\u9996\u9875' : 'Home'], ['home-destinations', language === 'zh' ? '\u76ee\u7684\u5730' : 'Destinations'], ['home-planner', language === 'zh' ? '\u8def\u7ebf\u89c4\u5212' : 'Route planner'], ['home-3d', language === 'zh' ? '3D\u5bfc\u89c8' : '3D guide']];
  return <footer className="cinematic-footer"><strong>Trip3D</strong><p>{language === 'zh' ? '\u7528\u624b\u7ed8\u65c5\u884c\u624b\u518c\u7684\u65b9\u5f0f\u89c4\u5212\u610f\u5927\u5229\u8def\u7ebf\u3002' : 'A sketchbook-style planner for Italy routes.'}</p><nav>{links.map(([id, label]) => <button key={id} type="button" onClick={() => scrollToHomeSection(id)}>{label}</button>)}</nav></footer>;
}


function DestinationDetailPage({ language, stop, routeStops, favorites, compare, onFavorite, onCompare, onAddRoute, onClose, onReviewSaved }) {
  if (!stop) return null;
  const [myReviews, setMyReviews] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem(MY_REVIEWS_KEY) || '{}'); } catch { return {}; }
  });
  const galleryStops = [stop, ...routeStops.filter((item) => item.id !== stop.id), ...landmarks.filter((item) => item.id !== stop.id)].filter((item, index, list) => list.findIndex((match) => match.id === item.id) === index).slice(0, 5);
  const nearbyStops = nearbyStopsFor(stop, routeStops, language);
  const visit = visitFor(stop, language);
  const url = pageUrlFor(stop, language);
  const visitorInfo = liveFor(stop.id)?.visitorInfo ?? stop.visitorInfo ?? {};
  const sourcedFacts = [
    [homeText(language, '开放时间', 'Opening hours'), visitorInfo.openingHours?.[language] ?? visitorInfo.openingHours?.en],
    [homeText(language, '门票', 'Tickets'), visitorInfo.ticketPrice?.[language] ?? visitorInfo.ticketPrice?.en],
    [homeText(language, '电话', 'Phone'), visitorInfo.phone],
    [homeText(language, '邮箱', 'Email'), visitorInfo.email],
    [homeText(language, '无障碍信息', 'Accessibility'), visitorInfo.wheelchairAccessibility],
    [homeText(language, '年访客量', 'Annual visitors'), visitorInfo.annualVisitors],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');
  const savedReview = myReviews[stop.id] ?? { rating: 5, tags: [], note: '', time: language === 'zh' ? '春季' : 'Spring' };
  const reviewTags = [homeText(language, '适合拍照', 'Photo-friendly'), homeText(language, '人较多', 'Crowded'), homeText(language, '交通方便', 'Easy transit'), homeText(language, '适合亲子', 'Family-friendly'), homeText(language, '建议提前预约', 'Book ahead')];
  const saveReview = (patch) => {
    const nextReview = { ...savedReview, ...patch };
    const next = { ...myReviews, [stop.id]: nextReview };
    setMyReviews(next);
    window.localStorage.setItem(MY_REVIEWS_KEY, JSON.stringify(next));
    onReviewSaved?.(next);
  };
  return (
    <section className="destination-detail" role="dialog" aria-modal="true" aria-label={homeText(language, '\u76ee\u7684\u5730\u8be6\u60c5', 'Destination details')}>
      <div className="destination-detail__panel">
        <button className="destination-detail__close" type="button" onClick={onClose}>{homeText(language, '\u5173\u95ed', 'Close')}</button>
        <div className="destination-detail__hero">
          <div className="destination-detail__media">{imageFor(stop, language) && <img src={imageFor(stop, language)} alt="" />}</div>
          <div className="destination-detail__copy">
            <span>{locationLabel(stop, language) || regionText(stop, language)} / {kindText(stop, language)} / {seasonText(stop, language)}</span>
            <h2>{nameFor(stop, language)}</h2>
            <p>{summaryFor(stop, language)}</p>
            <div className="destination-detail__actions">
              <button className={favorites.has(stop.id) ? 'is-on' : ''} type="button" onClick={() => onFavorite(stop.id)}>{homeText(language, '\u6536\u85cf', 'Favorite')}</button>
              <button className={compare.has(stop.id) ? 'is-on' : ''} type="button" onClick={() => onCompare(stop.id)}>{homeText(language, '\u5bf9\u6bd4', 'Compare')}</button>
              <button className={routeStops.some((item) => item.id === stop.id) ? 'is-route-added' : ''} type="button" aria-pressed={routeStops.some((item) => item.id === stop.id)} onClick={() => onAddRoute(stop.id)}>{routeStops.some((item) => item.id === stop.id) ? homeText(language, '取消加入', 'Remove from route') : homeText(language, '\u52a0\u5165\u8def\u7ebf', 'Add route')}</button>
              {url && <a className="concept-btn" href={url} target="_blank" rel="noreferrer">{homeText(language, '\u80cc\u666f\u8d44\u6599', 'Background')}</a>}
            </div>
          </div>
        </div>
        <div className="destination-detail__gallery">{galleryStops.map((item) => <figure key={item.id}>{imageFor(item, language) && <img src={imageFor(item, language)} alt="" loading="lazy" />}<figcaption>{nameFor(item, language)}</figcaption></figure>)}</div>
        <div className="destination-detail__facts">
          <article><span>{homeText(language, '\u6240\u5728\u533a\u57df', 'Region')}</span><strong>{locationLabel(stop, language) || regionText(stop, language)}</strong></article>
          <article><span>{homeText(language, '行程规划预留', 'Planning allowance')}</span><strong>{visit.durationHours} h</strong></article>
          {sourcedFacts.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
          <article><span>{homeText(language, '\u5750\u6807', 'Coordinates')}</span><strong>{stop.lat.toFixed(2)}, {stop.lon.toFixed(2)}</strong></article>
        </div>
        <div className="destination-detail__reviews">
          <div className="cinematic-section__head"><span>{homeText(language, '\u884c\u524d\u4fbf\u7b7e', 'Planning note')}</span><h2>{homeText(language, '\u51fa\u53d1\u524d\u5148\u770b\u8fd9\u51e0\u9879', 'Check these before you go')}</h2></div>
          <div className="destination-detail__planning">
            {visitorInfo.officialWebsite && <article><span>{homeText(language, '官方网站', 'Official website')}</span><p><a href={visitorInfo.officialWebsite} target="_blank" rel="noreferrer">{visitorInfo.officialWebsite}</a></p></article>}
            <article><span>{homeText(language, '\u9644\u8fd1\u987a\u8def', 'Nearby on route')}</span><p>{nearbyStops.join(' / ')}</p></article>
            <article><span>{homeText(language, '\u8d44\u6599\u6765\u6e90', 'Sources')}</span><p>{sourceLabelsFor(stop, language)}{url ? ` / ${url}` : ''}</p></article>
          </div>
          <section className="my-travel-review">
            <h3>{homeText(language, '我的评价 / 我的旅行足迹', 'My review / travel footprint')}</h3>
            <label><span>{homeText(language, '星级评分', 'Rating')}</span><select value={savedReview.rating} onChange={(event) => saveReview({ rating: Number(event.target.value) })}>{[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{'★'.repeat(rating)}</option>)}</select></label>
            <div className="my-travel-review__tags">{reviewTags.map((tag) => <button key={tag} type="button" className={savedReview.tags.includes(tag) ? 'is-on' : ''} onClick={() => saveReview({ tags: savedReview.tags.includes(tag) ? savedReview.tags.filter((item) => item !== tag) : [...savedReview.tags, tag] })}>{tag}</button>)}</div>
            <label><span>{homeText(language, '参观时间', 'Visit time')}</span><input value={savedReview.time} onChange={(event) => saveReview({ time: event.target.value })} placeholder={homeText(language, '春季 / 上午 / 傍晚', 'Spring / morning / evening')} /></label>
            <label><span>{homeText(language, '一句话感受', 'One-line note')}</span><textarea value={savedReview.note} onChange={(event) => saveReview({ note: event.target.value })} placeholder={homeText(language, '写下你对这个景点的印象', 'Write your impression of this stop')} /></label>
          </section>
        </div>
      </div>
    </section>
  );
}

function OnboardingGuide({ language, onClose }) {
  const steps = useMemo(() => (
    language === 'zh'
      ? [
        { selector: '[data-guide="search"] .home-module--search', title: '选择途径景点', detail: '输入城市、景点名称，或者用下面的旅行偏好缩小范围。' },
        { selector: '[data-guide="add-route"]', title: '调整景点顺序', detail: '点“加入路线”添加景点，再点一次即可取消加入。' },
        { selector: '[data-guide="planner"] .home-module--itinerary-controls', title: '调整天数和节奏', detail: '轻松、标准和紧凑节奏分别按每天 6、8、10 小时来安排。' },
        { selector: '[data-guide="export"]', title: '下载你的行程', detail: '可以下载 TXT，也可以打印并保存为 PDF。' },
        { selector: '#home-3d', title: '最后再看 3D 导览', detail: '路线确定后再进入 3D导览。' },
      ]
      : [
        { selector: '[data-guide="search"] .home-module--search', title: 'Start with a place', detail: 'Search a city or landmark, or narrow the list with a travel preference.' },
        { selector: '[data-guide="add-route"]', title: 'Add it to the route', detail: 'Use Add to route, then click again to remove the stop.' },
        { selector: '[data-guide="planner"] .home-module--itinerary-controls', title: 'Set days and pace', detail: 'Relaxed, Standard, and Fast allow 6, 8, or 10 hours for each day.' },
        { selector: '[data-guide="export"]', title: 'Take the plan with you', detail: 'Download TXT or print the page and save it as a PDF.' },
        { selector: '#home-3d', title: 'Open 3D when the route is ready', detail: 'This guide only points to the entry and leaves the 3D experience unchanged.' },
      ]
  ), [language]);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const step = steps[stepIndex];

  useLayoutEffect(() => {
    const target = document.querySelector(step.selector);
    setTargetRect(null);
    if (!target) return undefined;

    const updateRect = () => {
      const rect = target.getBoundingClientRect();
      const top = Math.max(8, rect.top - 8);
      const left = Math.max(8, rect.left - 8);
      const right = Math.min(window.innerWidth - 8, rect.right + 8);
      const bottom = Math.min(window.innerHeight - 8, rect.bottom + 8);
      if (rect.width <= 0 || rect.height <= 0 || right <= left || bottom <= top) {
        setTargetRect(null);
        return;
      }
      setTargetRect({
        top,
        left,
        width: right - left,
        height: bottom - top,
      });
    };

    const alignTarget = () => {
      target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
      window.requestAnimationFrame(updateRect);
    };
    const timers = [0, 120, 320, 560, 820].map((delay) => window.setTimeout(alignTarget, delay));
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateRect);
    observer?.observe(target);
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      observer?.disconnect();
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [step]);

  const finish = () => onClose();
  const next = () => {
    if (stepIndex === steps.length - 1) finish();
    else setStepIndex((index) => index + 1);
  };
  const previous = () => setStepIndex((index) => Math.max(0, index - 1));
  const tooltipBelow = !targetRect || targetRect.top < window.innerHeight * 0.52;
  const tooltipStyle = targetRect ? {
    left: Math.min(Math.max(16, targetRect.left), Math.max(16, window.innerWidth - 360)),
    top: tooltipBelow
      ? Math.max(16, Math.min(window.innerHeight - 230, targetRect.top + targetRect.height + 24))
      : Math.max(16, targetRect.top - 210),
  } : {};

  return (
    <section className="onboarding-guide" role="dialog" aria-modal="true" aria-live="polite">
      {targetRect && (
        <>
          <div className="onboarding-guide__shade onboarding-guide__shade--top" style={{ height: targetRect.top }} />
          <div
            className="onboarding-guide__shade onboarding-guide__shade--left"
            style={{ top: targetRect.top, width: targetRect.left, height: targetRect.height }}
          />
          <div
            className="onboarding-guide__shade onboarding-guide__shade--right"
            style={{
              top: targetRect.top,
              left: targetRect.left + targetRect.width,
              right: 0,
              height: targetRect.height,
            }}
          />
          <div
            className="onboarding-guide__shade onboarding-guide__shade--bottom"
            style={{ top: targetRect.top + targetRect.height }}
          />
          <div className="onboarding-guide__spotlight" style={targetRect} />
        </>
      )}
      <aside className={`onboarding-guide__tooltip ${tooltipBelow ? 'is-below' : 'is-above'}`} style={tooltipStyle}>
        <span>{homeText(language, `第 ${stepIndex + 1} 步，共 ${steps.length} 步`, `Step ${stepIndex + 1} of ${steps.length}`)}</span>
        <h2>{step.title}</h2>
        <p>{step.detail}</p>
        <div>
          <button type="button" onClick={finish}>{homeText(language, '跳过', 'Skip')}</button>
          {stepIndex > 0 && <button type="button" onClick={previous}>{homeText(language, '上一步', 'Back')}</button>}
          <button className="is-primary" type="button" onClick={next}>{stepIndex === steps.length - 1 ? homeText(language, '完成', 'Done') : homeText(language, '下一步', 'Next')}</button>
        </div>
      </aside>
    </section>
  );
}

function CinematicHomePage(props) {
  const { language, setLanguage, userSession, selectedStop, routeStops, filteredStops, onOpenDrive, onSignIn, onHelp } = props;
  return (
    <>
      <HomeHeader language={language} setLanguage={setLanguage} userSession={userSession} onAccount={onSignIn} onHelp={onHelp} />
      <div className="cinematic-home-page">
        <HomeHero language={language} routeStops={routeStops} selectedStop={selectedStop} onOpenDrive={onOpenDrive} onClassicRoute={props.onClassicRoute} />
        <DestinationSection {...props} />
        <RoutePlannerSection {...props} />
        <ThreeDGuideSection language={language} selectedStop={selectedStop} routeStops={routeStops} onOpenDrive={onOpenDrive} />
        <FeatureSection language={language} favorites={props.favorites} compare={props.compare} routeStops={routeStops} userSession={userSession} onOpenService={props.onOpenService} />
        <ReviewSection language={language} stops={routeStops} visibleCount={props.reviewVisibleCount} onShowMore={props.onShowMoreReviews} onCollapse={props.onCollapseReviews} />
        <TravelNotesSection language={language} stops={routeStops} />
        <AccountSummarySection language={language} favorites={props.favorites} routeStops={routeStops} lockedIds={props.lockedIds} userSession={userSession} onSignIn={onSignIn} myReviews={props.myReviews} savedRoutes={props.savedRoutes} />
        <HomeFooter language={language} />
      </div>
    </>
  );
}

export function HomeShowcase({ onOpenDrive }) {
  const activeVersion = ACTIVE_HOME_VERSION;
  const setActiveRouteIds = useAppStore((state) => state.setActiveRouteIds);
  const setActiveRouteGeometry = useAppStore((state) => state.setActiveRouteGeometry);
  const setActiveItineraryPlan = useAppStore((state) => state.setActiveItineraryPlan);
  const setAppLanguage = useAppStore((state) => state.setLanguage);
  const [hasEnteredHome, setHasEnteredHome] = useState(() => window.sessionStorage.getItem(HOME_ENTERED_KEY) === '1');
  const [language, setLanguage] = useState(() => {
    const stored = window.localStorage.getItem(LANGUAGE_KEY);
    return stored === 'en' || stored === 'zh' ? stored : 'zh';
  });
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('any');
  const [kind, setKind] = useState('any');
  const [season, setSeason] = useState('any');
  const [sort, setSort] = useState('featured');
  const [preference, setPreference] = useState('any');
  const [routeQuery, setRouteQuery] = useState('');
  const [routeIds, setRouteIds] = useState(() => {
    const hasStoredRoute = window.localStorage.getItem(ROUTE_IDS_KEY) !== null;
    const storedRoute = uniqueValidRouteIds(loadStoredArray(ROUTE_IDS_KEY, initialRouteIds));
    return hasStoredRoute ? storedRoute : initialRouteIds;
  });
  const [lockedIds, setLockedIds] = useState(() => new Set());
  const [favorites, setFavorites] = useState(() => loadStoredSet(FAVORITES_KEY));
  const [compare, setCompare] = useState(() => loadStoredSet(COMPARE_KEY));
  const [selectedId, setSelectedId] = useState(initialRouteIds[0]);
  const [days, setDays] = useState(() => clampDays(window.localStorage.getItem(DAYS_KEY)));
  const [daysMode, setDaysMode] = useState('auto');
  const savedDaysOverrideRef = useRef(null);
  const [pace, setPace] = useState(() => {
    const stored = window.localStorage.getItem(PACE_KEY);
    return paceDailyHours[stored] ? stored : 'Standard';
  });
  const [userSession, setUserSession] = useState(null);
  const [authToken, setAuthToken] = useState(() => window.localStorage.getItem(AUTH_TOKEN_KEY) ?? '');
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [accountHistory, setAccountHistory] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [accountPlanReady, setAccountPlanReady] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [reviewVisibleCount, setReviewVisibleCount] = useState(6);
  const [detailStopId, setDetailStopId] = useState(null);
  const [serviceDrawer, setServiceDrawer] = useState(null);
  const [optimizeMessage, setOptimizeMessage] = useState('');
  const [routeSaveStatus, setRouteSaveStatus] = useState('');
  const [recommendationMetrics, setRecommendationMetrics] = useState({});
  const [onboardingOpen, setOnboardingOpen] = useState(() => hasEnteredHome && window.localStorage.getItem(ONBOARDING_SEEN_KEY) !== '1');
  const [routeTravelPreference, setRouteTravelPreference] = useState('AUTO');
  const [myReviews, setMyReviews] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem(MY_REVIEWS_KEY) || '{}'); } catch { return {}; }
  });
  const routeSignature = routeSignatureFor(routeIds);
  const routeMetricsQuery = useRouteMetrics(routeIds, routeTravelPreference);

  const options = useMemo(() => ({
    regions: locationFilterOptions(language),
    kinds: [...new Set(landmarks.map((stop) => stop.modelKind))].sort(),
    seasons: [...new Set(landmarks.map(seasonFor))].sort(),
  }), [language]);
  const preferenceOptions = useMemo(() => {
    const tags = new Set();
    landmarks.forEach((stop) => travelPreferenceTags(stop, language).forEach((tag) => tags.add(tag)));
    return [...tags].slice(0, 8);
  }, [language]);

  const filteredStops = useMemo(() => {
    const base = landmarks.flatMap((stop) => {
      const searchScore = landmarkSearchScore(stop, query, language);
      const tags = travelPreferenceTags(stop, language);
      return ((!query.trim() || searchScore > 0)
        && locationMatchesFilter(stop, region, language)
        && (kind === 'any' || stop.modelKind === kind)
        && (season === 'any' || seasonFor(stop) === season)
        && (preference === 'any' || tags.includes(preference)))
        ? [{ stop, searchScore }]
        : [];
    });
    return base.sort((a, b) => {
      if (query.trim() && b.searchScore !== a.searchScore) return b.searchScore - a.searchScore;
      if (sort === 'name') return nameFor(a.stop, language).localeCompare(nameFor(b.stop, language));
      if (sort === 'north') return b.stop.lat - a.stop.lat;
      return landmarks.findIndex((stop) => stop.id === a.stop.id) - landmarks.findIndex((stop) => stop.id === b.stop.id);
    }).map(({ stop }) => stop);
  }, [kind, language, preference, query, region, season, sort]);

  useEffect(() => {
    setVisibleCount(12);
    setReviewVisibleCount(6);
  }, [kind, preference, query, region, season, sort]);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
    setAppLanguage(language);
  }, [language, setAppLanguage]);

  useEffect(() => {
    const cleanRouteIds = uniqueValidRouteIds(routeIds);
    window.localStorage.setItem(ROUTE_IDS_KEY, JSON.stringify(cleanRouteIds));
    if (cleanRouteIds.length !== routeIds.length) setRouteIds(cleanRouteIds);
  }, [routeIds]);

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    window.localStorage.setItem(COMPARE_KEY, JSON.stringify([...compare]));
  }, [compare]);

  useEffect(() => {
    window.localStorage.setItem(DAYS_KEY, String(days));
  }, [days]);

  useEffect(() => {
    window.localStorage.setItem(PACE_KEY, pace);
  }, [pace]);

  useEffect(() => {
    const metrics = routeMetricsQuery.data;
    if (!metrics?.geometryCoordinates?.length || metrics.routeSignature !== routeSignature) return;
    setActiveRouteGeometry({
      coordinates: metrics.geometryCoordinates,
      distanceKm: metrics.distanceKm,
      segments: activeRouteSegmentsFor(metrics),
    });
  }, [routeMetricsQuery.data, routeSignature, setActiveRouteGeometry]);

  useLayoutEffect(() => {
    if (!hasEnteredHome) return;
    resetPageScroll();
    const frame = requestAnimationFrame(resetPageScroll);
    const timers = [0, 80, 220, 420].map((delay) => window.setTimeout(resetPageScroll, delay));
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [hasEnteredHome]);

  const handleEnterHome = useCallback(() => {
    window.sessionStorage.setItem(HOME_ENTERED_KEY, '1');
    resetPageScroll();
    setHasEnteredHome(true);
    if (window.localStorage.getItem(ONBOARDING_SEEN_KEY) !== '1') setOnboardingOpen(true);
  }, []);

  const closeOnboarding = useCallback(() => {
    window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    setOnboardingOpen(false);
  }, []);

  const applyAccountPlan = useCallback((plan) => {
    if (!plan) return;
    const cleanRouteIds = uniqueValidRouteIds(plan.route_ids ?? []);
    setRouteIds(cleanRouteIds);
    setLockedIds(new Set(uniqueValidRouteIds(plan.locked_ids ?? [])));
    setFavorites(new Set(uniqueValidRouteIds(plan.favorites ?? [])));
    setCompare(new Set(uniqueValidRouteIds(plan.compare ?? [])));
    if (plan.days != null) {
      const savedDays = clampDays(plan.days);
      savedDaysOverrideRef.current = savedDays;
      setDays(savedDays);
      setDaysMode('manual');
    }
    if (paceDailyHours[plan.pace]) setPace(plan.pace);
  }, []);

  useEffect(() => {
    if (!authToken) {
      setAccountPlanReady(false);
      return undefined;
    }
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Session expired');
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        setUserSession(payload.user);
        setAccountHistory(payload.history ?? []);
        applyAccountPlan(payload.plan);
        setAccountPlanReady(true);
        fetch(`${API_BASE_URL}/api/account/routes`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
          .then((response) => response.ok ? response.json() : null)
          .then((routesPayload) => {
            if (!cancelled && routesPayload) setSavedRoutes(routesPayload.items ?? []);
          })
          .catch(() => {});
      })
      .catch(() => {
        if (cancelled) return;
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        setAuthToken('');
        setUserSession(null);
        setAccountHistory([]);
        setSavedRoutes([]);
        setAccountPlanReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyAccountPlan, authToken]);

  useEffect(() => {
    if (!authToken || !userSession || !accountPlanReady) return undefined;
    const timer = window.setTimeout(() => {
      fetch(`${API_BASE_URL}/api/account/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          route_ids: uniqueValidRouteIds(routeIds),
          locked_ids: uniqueValidRouteIds([...lockedIds]),
          favorites: uniqueValidRouteIds([...favorites]),
          compare: uniqueValidRouteIds([...compare]),
          days,
          pace,
          language,
        }),
      }).catch(() => {});
    }, 600);
    return () => window.clearTimeout(timer);
  }, [accountPlanReady, authToken, compare, days, favorites, language, lockedIds, pace, routeIds, userSession]);

  const routeStops = useMemo(() => routeIds.map((id) => landmarks.find((stop) => stop.id === id)).filter(Boolean), [routeSignature]);
  const activeMetricSegments = useMemo(
    () => (routeMetricsQuery.data?.routeSignature === routeSignature ? routeMetricsQuery.data.segments ?? [] : []),
    [routeMetricsQuery.data, routeSignature],
  );
  const routeSegments = useMemo(() => routeSegmentsFor(routeStops, activeMetricSegments), [activeMetricSegments, routeStops]);
  const routeRecommendations = useMemo(
    () => buildRouteRecommendations(routeIds, lockedIds, language),
    [language, lockedIds, routeIds],
  );
  const planningContextKey = `${routeSignature}|${pace}|${language}`;
  const planningContextKeyRef = useRef(planningContextKey);
  const suggestedDays = useMemo(
    () => clampDays(minimumDaysFor(routeStops, pace, language, routeSegments)),
    [language, pace, routeSegments, routeStops],
  );
  const minimumSelectableDays = useMemo(
    () => physicalMinimumDaysFor(routeStops, pace, language, routeSegments),
    [language, pace, routeSegments, routeStops],
  );
  useEffect(() => {
    const contextChanged = planningContextKeyRef.current !== planningContextKey;
    if (contextChanged) {
      planningContextKeyRef.current = planningContextKey;
      const savedDays = savedDaysOverrideRef.current;
      savedDaysOverrideRef.current = null;
      if (savedDays != null) {
        setDaysMode('manual');
        setDays(Math.max(savedDays, minimumSelectableDays));
        return;
      }
      setDaysMode('auto');
      setDays(suggestedDays);
      return;
    }
    setDays((current) => {
      if (daysMode === 'auto') return current === suggestedDays ? current : suggestedDays;
      return current < minimumSelectableDays ? minimumSelectableDays : current;
    });
  }, [daysMode, minimumSelectableDays, planningContextKey, suggestedDays]);
  const setManualDays = useCallback((value) => {
    setDays(Math.max(clampDays(value), minimumSelectableDays));
    setDaysMode('manual');
  }, [minimumSelectableDays]);
  useEffect(() => {
    if (!routeIds.length) return;
    setSelectedId((current) => (routeIds.includes(current) ? current : routeIds[0]));
  }, [routeIds, routeSignature]);
  const selectedStop = routeStops.find((stop) => stop.id === selectedId) ?? routeStops[0] ?? landmarks.find((stop) => stop.id === selectedId) ?? landmarks[0];
  const detailStop = landmarks.find((stop) => stop.id === detailStopId);
  const routeMatches = useMemo(() => {
    if (!routeQuery.trim()) return [];
    return landmarks
      .map((stop) => ({ stop, score: landmarkSearchScore(stop, routeQuery, language) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ stop }) => stop);
  }, [language, routeQuery]);

  const toggleSet = (setter, id) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addRoute = (id) => {
    const isAdding = !routeIds.includes(id);
    setRouteIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      return [...current, id];
    });
    if (isAdding) setSelectedId(id);
    setLockedIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };
  const removeRoute = (id) => {
    setRouteIds((current) => current.filter((item) => item !== id));
    setLockedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };
  const moveRoute = (id, direction) => {
    setRouteIds((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length || lockedIds.has(id)) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };
  const optimizeRoute = () => {
    setRouteIds((current) => {
      const optimized = optimizeRouteIds(current, lockedIds);
      const before = routeDistanceForIds(current);
      const after = routeDistanceForIds(optimized);
      const saved = before - after;
      if (!Number.isFinite(saved) || saved <= 0.5) {
        setOptimizeMessage(homeText(language, '现在的顺序已经很顺路，不需要再调整。', 'This order is already quite direct, so nothing was changed.'));
        return current;
      }
      setOptimizeMessage(homeText(language, `顺序已经整理好，预计少走约 ${Math.round(saved)} 公里。`, `The stops are in a smoother order, saving about ${Math.round(saved)} km.`));
      return optimized;
    });
  };
  const selectRouteRecommendation = (recommendation) => {
    setRouteIds(recommendation.ids);
    setSelectedId((current) => (recommendation.ids.includes(current) ? current : recommendation.ids[0] ?? current));
    setActiveRouteGeometry();
    setOptimizeMessage(homeText(
      language,
      `已选择“${recommendation.title}”，还可以继续移动或锁定景点。`,
      `Selected “${recommendation.title}”. You can still move or lock stops.`,
    ));
    setRouteSaveStatus('');
    fetchRouteMetrics(recommendation.ids, routeTravelPreference)
      .then((metrics) => {
        if (metrics?.geometryCoordinates?.length && metrics.routeSignature === routeSignatureFor(recommendation.ids)) {
          setActiveRouteGeometry({
            coordinates: metrics.geometryCoordinates,
            distanceKm: metrics.distanceKm,
            segments: activeRouteSegmentsFor(metrics),
          });
          setRecommendationMetrics((current) => ({ ...current, [metrics.routeSignature]: metrics }));
        }
      })
      .catch(() => {});
  };
  const resetRoute = () => {
    if (routeIds.length && !window.confirm(homeText(language, '确定要回到默认路线吗？', 'Reset to the default route?'))) return;
    setRouteIds(initialRouteIds);
    setSelectedId(initialRouteIds[0]);
    setLockedIds(new Set());
    setActiveRouteIds(initialRouteIds);
    setActiveRouteGeometry();
    setRouteSaveStatus('');
  };
  const clearRoute = () => {
    if (routeIds.length && !window.confirm(homeText(language, '确定要清空当前路线吗？', 'Clear the current route?'))) return;
    setRouteIds([]);
    setSelectedId(null);
    setLockedIds(new Set());
    setActiveRouteIds([]);
    setActiveRouteGeometry();
    setOptimizeMessage('');
    setRouteSaveStatus('');
  };
  const applyClassicRoute = () => {
    if (routeIds.length && !window.confirm(homeText(language, '当前路线已有内容，是否替换为经典路线？', 'This route already has stops. Replace it with the classic route?'))) return;
    setRouteIds(classicRouteIds);
    setSelectedId(classicRouteIds[0]);
    setLockedIds(new Set());
    setActiveRouteIds(classicRouteIds);
    setActiveRouteGeometry();
    setOptimizeMessage(homeText(language, '已加入经典意大利路线，可以继续调整天数或进入 3D 导览。', 'Classic Italy route loaded. You can still adjust days or enter the 3D guide.'));
    requestAnimationFrame(() => scrollToHomeSection('home-planner'));
  };
  const openDriveWithCurrentRoute = async (landmarkId = null) => {
    setActiveRouteIds(routeIds);
    let metrics = routeMetricsQuery.data?.routeSignature === routeSignature
      ? routeMetricsQuery.data
      : null;
    if (!metrics?.geometryCoordinates?.length) {
      metrics = await fetchRouteMetrics(routeIds, routeTravelPreference).catch(() => null);
    }
    if (metrics?.geometryCoordinates?.length && metrics.routeSignature === routeSignature) {
      setActiveRouteGeometry({
        coordinates: metrics.geometryCoordinates,
        distanceKm: metrics.distanceKm,
        segments: activeRouteSegmentsFor(metrics),
      });
    }
    const guideSegments = routeSegmentsFor(
      routeStops,
      metrics?.routeSignature === routeSignature ? activeRouteSegmentsFor(metrics) : routeSegments,
    );
    setActiveItineraryPlan(createGuideItineraryPlan({
      routeStops,
      routeSegments: guideSegments,
      days,
      pace,
      visitHoursById: Object.fromEntries(routeStops.map((stop) => [
        stop.id,
        plannedVisitHours(stop, language, pace),
      ])),
    }));
    onOpenDrive(landmarkId);
  };
  const saveAuthPayload = (payload) => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
    setAuthToken(payload.token);
    setUserSession(payload.user);
    setAccountHistory(payload.history ?? []);
    fetch(`${API_BASE_URL}/api/account/routes`, {
      headers: { Authorization: `Bearer ${payload.token}` },
    })
      .then((response) => response.ok ? response.json() : null)
      .then((routesPayload) => setSavedRoutes(routesPayload?.items ?? []))
      .catch(() => setSavedRoutes([]));
    applyAccountPlan(payload.plan);
    setAccountPlanReady(true);
    setAuthDialogOpen(false);
    setAuthError('');
  };
  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail ?? 'Auth failed');
      saveAuthPayload(payload);
    } catch (error) {
      setAuthError(homeText(language, '登录失败，请检查邮箱和密码后再试一次。', 'Sign-in did not work this time. Check your email and password and try again.'));
    } finally {
      setAuthLoading(false);
    }
  };
  const handleSignOut = async () => {
    if (authToken) {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken('');
    setUserSession(null);
    setAccountHistory([]);
    setSavedRoutes([]);
    setAccountPlanReady(false);
    setAuthDialogOpen(false);
  };
  const addAccountHistory = async (action, detail) => {
    if (!authToken) return;
    const response = await fetch(`${API_BASE_URL}/api/account/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ action, detail }),
    }).catch(() => null);
    if (!response?.ok) return;
    const payload = await response.json();
    setAccountHistory(payload.items ?? []);
  };
  const saveCurrentRoute = async () => {
    if (!authToken || !userSession) {
      setRouteSaveStatus(homeText(language, '请先登录账号，登录后即可保存当前路线。', 'Sign in to save the current route.'));
      setAuthDialogOpen(true);
      return;
    }
    setRouteSaveStatus(homeText(language, '正在保存路线…', 'Saving route…'));
    const defaultName = routeStops.length
      ? `${nameFor(routeStops[0], language)} → ${nameFor(routeStops.at(-1), language)}`
      : homeText(language, '未命名路线', 'Untitled route');
    const response = await fetch(`${API_BASE_URL}/api/account/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: `${defaultName} · ${new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}`,
        route_ids: uniqueValidRouteIds(routeIds),
        locked_ids: uniqueValidRouteIds([...lockedIds]),
        days,
        pace,
        travel_mode: routeTravelPreference,
      }),
    }).catch(() => null);
    if (!response?.ok) {
      setRouteSaveStatus(homeText(language, '路线保存失败，请确认后端服务已启动后重试。', 'Route save failed. Check that the backend is running and try again.'));
      return;
    }
    const payload = await response.json();
    setSavedRoutes(payload.items ?? []);
    setRouteSaveStatus(homeText(language, `路线已保存到 ${userSession.name} 的账号。`, `Route saved to ${userSession.name}'s account.`));
    addAccountHistory('route saved', routeStops.map((stop) => nameFor(stop, language)).join(' -> '));
  };

  const openSavedRoute = (route) => {
    const nextRouteIds = uniqueValidRouteIds(route.route_ids ?? []);
    setRouteIds(nextRouteIds);
    setLockedIds(new Set(uniqueValidRouteIds(route.locked_ids ?? [])));
    if (route.days != null) {
      const savedDays = clampDays(route.days);
      savedDaysOverrideRef.current = savedDays;
      setDays(savedDays);
      setDaysMode('manual');
    }
    if (paceDailyHours[route.pace]) setPace(route.pace);
    if (['AUTO', 'DRIVE', 'WALK'].includes(route.travel_mode)) setRouteTravelPreference(route.travel_mode);
    setSelectedId(nextRouteIds[0] ?? null);
    setActiveRouteGeometry();
    setAuthDialogOpen(false);
    requestAnimationFrame(() => scrollToHomeSection('home-planner'));
  };

  const deleteSavedRoute = async (routeId) => {
    if (!authToken) return;
    if (!window.confirm(homeText(language, '确定删除这条保存路线吗？', 'Delete this saved route?'))) return;
    const response = await fetch(`${API_BASE_URL}/api/account/routes/${routeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    }).catch(() => null);
    if (!response?.ok) return;
    const payload = await response.json();
    setSavedRoutes(payload.items ?? []);
  };

  const commonPageProps = {
    language,
    query,
    setQuery,
    region,
    setRegion,
    kind,
    setKind,
    season,
    setSeason,
    sort,
    setSort,
    preference,
    setPreference,
    preferenceOptions,
    options,
    filteredStops,
    visibleCount,
    routeIds,
    routeStops,
    routeSegments,
    routeRecommendations,
    recommendationMetrics,
    routeGeometry: routeMetricsQuery.data?.routeSignature === routeSignature
      ? routeMetricsQuery.data.geometryCoordinates ?? []
      : [],
    routeGeometrySegments: routeMetricsQuery.data?.routeSignature === routeSignature
      ? (routeMetricsQuery.data.segments ?? []).flatMap((segment) => (
        segment.parts?.length ? segment.parts : [segment]
      ))
      : [],
    routeDiagnostics: routeMetricsQuery.data?.routeSignature === routeSignature
      ? routeMetricsQuery.data.diagnostics ?? null
      : null,
    routeTravelPreference,
    setRouteTravelPreference,
    isRouteLoading: routeMetricsQuery.isFetching,
    routeQuery,
    setRouteQuery,
    routeMatches,
    lockedIds,
    favorites,
    compare,
    selectedId,
    selectedStop,
    userSession,
    accountHistory,
    savedRoutes,
    myReviews,
    days,
    setDays: setManualDays,
    pace,
    setPace,
    optimizeMessage,
    routeSaveStatus,
    setSelectedId,
    onFavorite: (id) => {
      toggleSet(setFavorites, id);
      addAccountHistory('favorite updated', nameFor(landmarks.find((stop) => stop.id === id) ?? {}, language));
    },
    onCompare: (id) => toggleSet(setCompare, id),
    onAddRoute: (id) => {
      addRoute(id);
      addAccountHistory('route updated', nameFor(landmarks.find((stop) => stop.id === id) ?? {}, language));
    },
    onRemove: removeRoute,
    onMove: moveRoute,
    onToggleLock: (id) => toggleSet(setLockedIds, id),
    onOptimize: optimizeRoute,
    onSelectRecommendation: selectRouteRecommendation,
    onSaveRoute: saveCurrentRoute,
    onResetRoute: resetRoute,
    onClearRoute: clearRoute,
    onShowMore: () => setVisibleCount((count) => Math.min(count + 8, filteredStops.length)),
    onCollapse: () => setVisibleCount(12),
    reviewVisibleCount,
    onShowMoreReviews: () => setReviewVisibleCount((count) => Math.min(count + 6, routeStops.length)),
    onCollapseReviews: () => setReviewVisibleCount(6),
    onOpenDetail: (id) => setDetailStopId(id),
    onOpenService: (service) => {
      if (service === 'favorites' || service === 'compare') {
        setServiceDrawer(service);
        return;
      }
      if (service === 'optimize') {
        optimizeRoute();
        scrollToHomeSection('home-planner');
        return;
      }
      if (service === 'days') {
        scrollToHomeSection('home-day-plan');
        return;
      }
      if (service === 'notes') {
        scrollToHomeSection('home-reviews');
        return;
      }
      setAuthDialogOpen(true);
    },
    onSignIn: () => setAuthDialogOpen(true),
    onSignOut: handleSignOut,
    onHelp: () => setOnboardingOpen(true),
    onOpenDrive: openDriveWithCurrentRoute,
    onClassicRoute: applyClassicRoute,
  };

  if (!hasEnteredHome) {
    return (
      <main className={`showcase-home showcase-home--story is-${language}`} style={{ '--concept-accent': activeVersion.accent }}>
        <SemanticParticleStory language={language} onEnterHome={handleEnterHome} />
      </main>
    );
  }

  return (
    <main className={`showcase-home showcase-home--${activeVersion.id} is-${language}`} style={{ '--concept-accent': activeVersion.accent }}>
      <CinematicHomePage {...commonPageProps} setLanguage={setLanguage} onSignIn={() => setAuthDialogOpen(true)} />
      {onboardingOpen && <OnboardingGuide language={language} onClose={closeOnboarding} />}
      {detailStop && (
        <DestinationDetailPage
          language={language}
          stop={detailStop}
          routeStops={routeStops}
          favorites={favorites}
          compare={compare}
          onFavorite={commonPageProps.onFavorite}
          onCompare={commonPageProps.onCompare}
          onAddRoute={commonPageProps.onAddRoute}
          onReviewSaved={setMyReviews}
          onClose={() => setDetailStopId(null)}
        />
      )}
      {serviceDrawer && (
        <TravelServiceDrawer
          language={language}
          mode={serviceDrawer}
          favorites={favorites}
          compare={compare}
          routeIds={routeIds}
          onClose={() => setServiceDrawer(null)}
          onFavorite={commonPageProps.onFavorite}
          onCompare={commonPageProps.onCompare}
          onAddRoute={commonPageProps.onAddRoute}
          onOpenDetail={(id) => {
            setServiceDrawer(null);
            setDetailStopId(id);
          }}
        />
      )}
      {authDialogOpen && (
        <AuthDialog
          language={language}
          mode={authMode}
          setMode={setAuthMode}
          form={authForm}
          setForm={setAuthForm}
          error={authError}
          loading={authLoading}
          userSession={userSession}
          history={accountHistory}
          savedRoutes={savedRoutes}
          onSubmit={handleAuthSubmit}
          onClose={() => setAuthDialogOpen(false)}
          onSignOut={handleSignOut}
          onOpenSavedRoute={openSavedRoute}
          onDeleteSavedRoute={deleteSavedRoute}
        />
      )}
    </main>
  );
}
