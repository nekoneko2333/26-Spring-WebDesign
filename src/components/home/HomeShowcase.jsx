import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { landmarks } from '../../data/landmarks.js';
import liveLandmarksData from '../../../public/data/live-landmarks.json';

const versions = [
  {
    id: 'cinema',
    name: 'Italy Journey',
    accent: '#80d7ff',
    label: { en: 'Journey', zh: '旅程' },
    detail: { en: 'Start planning', zh: '开始规划' },
    title: { en: 'Where do you want to begin?', zh: '你想从哪里开始？' },
    summary: {
      en: 'Pick a city, landmark, or route idea. We will help you turn it into a trip through Italy.',
      zh: '输入城市、景点或一段想法，我们帮你把它变成一条意大利旅程。',
    },
  },
  /*
  {
    id: 'radial',
    name: '08 Radial Navigator',
    accent: '#ff6f91',
    label: { en: 'Radial', zh: '环形导航' },
    detail: { en: 'Central 3D CTA', zh: '中心 3D 入口' },
    title: { en: 'Navigate Around the Core', zh: '围绕 3D 核心规划路线' },
    summary: {
      en: 'A radial navigation shell with the same destination, planner, review, account, route, and drive workflows.',
      zh: '围绕你想去的地方，整理目的地、路线、点评和下一步安排。',
    },
  },
*/];

const storyModelPaths = {
  colosseum: '/models/romes_colosseum.glb',
  pisa: '/models/pisas_tower.glb',
  florence: '/models/santa-maria-del-fiore/source/Santa%20Maria.glb',
};

const liveIndex = new Map((liveLandmarksData.items ?? []).map((item) => [item.id, item]));
const initialRouteIds = ['milan_duomo', 'venice_rialto', 'florence_duomo', 'pisa', 'colosseum', 'pompeii'];
const STORY_PARTICLE_COUNT = 7600;
const STORY_MODEL_SAMPLE_COUNT = 8200;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
const AUTH_TOKEN_KEY = 'web3d_auth_token';

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

const copy = {
  en: {
    switcher: 'Concept styles',
    switcherSub: '04 with full original page workflow',
    language: 'Language',
    nav: [
      ['home', 'Home'],
      ['destinations', 'Destinations'],
      ['planner', 'Plan'],
      ['reviews', 'Reviews'],
      ['drive', 'Drive'],
      ['map', 'Map'],
      ['vr', 'Venice'],
    ],
    cta3d: 'Start driving',
    routeMap: 'View route',
    searchTitle: 'Search & plan',
    searchPlaceholder: 'Search landmarks, cities, regions, or route notes',
    filters: 'Filters',
    region: 'Region',
    type: 'Type',
    season: 'Best season',
    any: 'Any',
    sort: 'Sort',
    featured: 'Featured',
    name: 'Name',
    north: 'North to south',
    model: '3D model first',
    account: 'Account',
    guest: 'Guest mode',
    routeStops: 'Route stops',
    favorites: 'Favorites',
    compared: 'Compared',
    services: 'Travel services',
    destinations: 'Browse stops and build a route',
    showCompare: 'Show compare',
    addRoute: 'Add stop',
    focus: 'Focus',
    compare: 'Compare',
    favorite: 'Favorite',
    background: 'Background',
    routeEditor: 'Route editor',
    addFromSearch: 'Add stop from search',
    optimize: 'Optimize',
    reset: 'Reset',
    lock: 'Lock',
    unlock: 'Unlock',
    remove: 'Remove',
    up: 'Up',
    down: 'Down',
    routePreview: 'Route preview',
    metrics: 'Route metrics',
    itinerary: 'Itinerary generator',
    days: 'Days',
    pace: 'Pace',
    export: 'Export itinerary',
    reviews: 'Destination context and reviews',
    read: 'Read background',
    driveReady: 'Ready to go',
    driveBody: 'Follow your selected route and visit the focused stop.',
    nextStop: 'Next stop',
    weather: 'Live weather',
    kicker: 'Italy travel planner',
    temperature: 'Temperature',
    wind: 'Wind',
    modelPreview: 'Landmarks',
    keyPoints: 'Stops',
    homeQuestion: 'Where should the day begin?',
    homePrompt: 'Try Rome, Florence, Venice, Pisa, or a place you have in mind',
    homeLead: 'Tell us the first place on your mind. We will keep the route, notes, and saved stops close by while you explore.',
    homeSuggestions: 'Places people start with',
  },
  zh: {
    switcher: '首页风格',
    switcherSub: '04，保留原主页完整分页流程',
    language: '语言',
    nav: [
      ['home', '首页'],
      ['destinations', '目的地'],
      ['planner', '行程'],
      ['reviews', '点评'],
      ['drive', '导览'],
      ['map', '地图'],
      ['vr', '威尼斯'],
    ],
    cta3d: '开始导览',
    routeMap: '查看路线',
    searchTitle: '搜索与规划',
    searchPlaceholder: '搜索景点、城市、区域或路线说明',
    filters: '筛选',
    region: '地区',
    type: '体验',
    season: '最佳时间',
    any: '不限',
    sort: '排序',
    featured: '推荐',
    name: '名称',
    north: '从北到南',
    model: '优先 3D 模型',
    account: '账户',
    guest: '游客模式',
    routeStops: '路线停靠点',
    favorites: '收藏',
    compared: '对比',
    services: '旅行服务',
    destinations: '浏览景点并构建路线',
    showCompare: '查看对比',
    addRoute: '加入路线',
    focus: '聚焦',
    compare: '对比',
    favorite: '收藏',
    background: '背景资料',
    routeEditor: '路线编辑器',
    addFromSearch: '从搜索结果加入路线',
    optimize: '优化路线',
    reset: '重置',
    lock: '锁定',
    unlock: '解锁',
    remove: '移除',
    up: '上移',
    down: '下移',
    routePreview: '路线预览',
    metrics: '路线指标',
    itinerary: '行程生成器',
    days: '天数',
    pace: '节奏',
    export: '导出行程',
    reviews: '目的地背景和点评',
    read: '查看背景资料',
    driveReady: '准备出发',
    driveBody: '跟随你选好的路线，查看当前关注的目的地。',
    nextStop: '下一站',
    weather: '实时天气',
    kicker: '意大利旅行规划',
    temperature: '温度',
    wind: '风速',
    modelPreview: '景点',
    keyPoints: '停靠点',
    homeQuestion: '今天从哪一站出发？',
    homePrompt: '试试罗马、佛罗伦萨、威尼斯、比萨，或输入你想去的地方',
    homeLead: '把第一个想去的地方告诉我们。路线、收藏和沿途信息会随时跟上。',
    homeSuggestions: '大家常从这里开始',
  },
};

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

const serviceCopy = {
  en: [
    ['Hotels', 'Stay ideas'],
    ['Tickets', 'Attraction entry'],
    ['Food', 'Restaurant notes'],
    ['Transit', 'Route transfers'],
    ['Weather', 'Trip timing'],
    ['Budget', 'Cost outline'],
    ['Guides', 'City tips'],
    ['AI', 'Smart plan'],
  ],
  zh: [
    ['\u9152\u5e97', '\u4f4f\u5bbf\u63a8\u8350'],
    ['\u95e8\u7968', '\u666f\u70b9\u9884\u7ea6'],
    ['\u7f8e\u98df', '\u9910\u5385\u7075\u611f'],
    ['\u4ea4\u901a', '\u8def\u7ebf\u63a5\u9a73'],
    ['\u5929\u6c14', '\u51fa\u53d1\u53c2\u8003'],
    ['\u9884\u7b97', '\u82b1\u8d39\u4f30\u7b97'],
    ['\u653b\u7565', '\u57ce\u5e02\u8d34\u58eb'],
    ['AI', '\u667a\u80fd\u884c\u7a0b'],
  ],
};
function t(value, language) {
  return value?.[language] ?? value?.en ?? value ?? '';
}

function liveFor(id) {
  return liveIndex.get(id);
}

function nameFor(landmark, language) {
  const live = liveFor(landmark.id);
  return live?.name?.[language] || live?.name?.en || landmark.name;
}

function summaryFor(landmark, language) {
  const live = liveFor(landmark.id);
  return live?.wikipedia?.[language]?.extract || live?.wikipedia?.en?.extract || landmark.description;
}

function imageFor(landmark, language) {
  const live = liveFor(landmark.id);
  return live?.wikipedia?.[language]?.thumbnail || live?.wikipedia?.en?.thumbnail || live?.wikidata?.image || '';
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

function kindText(landmark, language) {
  return kindLabels[language]?.[landmark.modelKind] ?? landmark.modelKind;
}

function seasonText(landmark, language) {
  const season = seasonFor(landmark);
  return seasonLabels[language]?.[season] ?? season;
}

function distanceKm(routeStops) {
  if (routeStops.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < routeStops.length; index += 1) {
    const a = routeStops[index - 1];
    const b = routeStops[index];
    const dx = (a.lon - b.lon) * 78;
    const dy = (a.lat - b.lat) * 111;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.round(total);
}

function segmentDistanceKm(a, b) {
  if (!a || !b) return 0;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
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
      output.splice(start, chunk.length, ...ordered);
    }
    start = end + 1;
  }

  return output;
}

function routeSegmentsFor(routeStops) {
  return routeStops.slice(1).map((stop, index) => {
    const from = routeStops[index];
    const distance = segmentDistanceKm(from, stop);
    return {
      from,
      to: stop,
      distance,
      duration: Math.max(0.4, distance / 72),
    };
  });
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

function sampleSecondGatePoint() {
  const r = Math.random();
  if (r < 0.18) return sampleBox(0, -1.36, 0, 7.1, 0.34, 0.34);
  if (r < 0.34) return sampleBox(0, 1.24, 0, 7.2, 0.3, 0.32);
  if (r < 0.44) return sampleBox(0, 1.56, 0, 6.4, 0.22, 0.28);
  if (r < 0.58) {
    const xs = [-3.0, -1.82, -0.62, 0.62, 1.82, 3.0];
    return sampleBox(xs[Math.floor(Math.random() * xs.length)], -0.18, 0, 0.22, 2.3, 0.24);
  }
  if (r < 0.74) {
    const centers = [-2.35, 0, 2.35];
    const center = centers[Math.floor(Math.random() * centers.length)];
    const angle = Math.PI * Math.random();
    const radius = 0.73 + Math.random() * 0.11;
    return [
      center + Math.cos(angle) * radius,
      -0.52 + Math.sin(angle) * radius * 1.18,
      (Math.random() - 0.5) * 0.2,
    ];
  }
  if (r < 0.86) {
    const x = -3.2 + Math.random() * 6.4;
    return [x, 1.75 - Math.abs(x) * 0.09 + (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.2];
  }
  if (r < 0.94) return sampleBox(0, 0.74, 0, 1.65, 0.16, 0.18);
  return sampleBox((Math.random() < 0.5 ? -1 : 1) * (3.32 + Math.random() * 0.16), 0.22, 0, 0.1, 2.25, 0.18);
}

function createMorphData(count = 5200) {
  const random = new Float32Array(count * 3);
  const target = new Float32Array(count * 3);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const radius = 4.2 + Math.random() * 5.8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    random[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    random[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius * 0.72;
    random[i * 3 + 2] = Math.cos(phi) * radius * 0.8;

    const [x, y, z] = sampleSecondGatePoint();
    target[i * 3] = x;
    target[i * 3 + 1] = y;
    target[i * 3 + 2] = z;
    seeds[i] = Math.random();
  }

  const linkCount = 520;
  const links = new Float32Array(linkCount * 6);
  for (let i = 0; i < linkCount; i += 1) {
    const a = Math.floor(Math.random() * count);
    const b = Math.min(count - 1, a + 1 + Math.floor(Math.random() * 8));
    links.set([target[a * 3], target[a * 3 + 1], target[a * 3 + 2]], i * 6);
    links.set([target[b * 3], target[b * 3 + 1], target[b * 3 + 2]], i * 6 + 3);
  }

  return { random, target, seeds, links };
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

function makeItinerary(routeStops, days) {
  return Array.from({ length: days }, (_, index) => ({
    day: index + 1,
    stops: routeStops.filter((_, stopIndex) => stopIndex % days === index),
  })).map((day, index) => ({
    ...day,
    stops: day.stops.length ? day.stops : [routeStops[index % routeStops.length]].filter(Boolean),
  }));
}

function ParticleField({ version }) {
  const groupRef = useRef(null);
  const materialRef = useRef(null);
  const lineRef = useRef(null);
  const accent = versions.find((item) => item.id === version)?.accent ?? '#80d7ff';
  const morph = useMemo(() => createMorphData(), []);
  const accentColor = useMemo(() => new THREE.Color(accent), [accent]);

  useFrame(({ clock, pointer, camera }) => {
    const elapsed = clock.getElapsedTime();
    const cycle = (elapsed % 13) / 13;
    const gather = THREE.MathUtils.smoothstep(cycle, 0.12, 0.42);
    const scatter = 1 - THREE.MathUtils.smoothstep(cycle, 0.68, 0.94);
    const morphValue = Math.min(gather, scatter);

    if (groupRef.current) {
      groupRef.current.rotation.y = elapsed * 0.085 + pointer.x * 0.18;
      groupRef.current.rotation.x = -0.04 + pointer.y * 0.09;
    }
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = elapsed;
      materialRef.current.uniforms.uMorph.value = morphValue;
      materialRef.current.uniforms.uAccent.value = accentColor;
    }
    if (lineRef.current) lineRef.current.material.opacity = 0.02 + morphValue * 0.12;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 0.45, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, pointer.y * 0.26, 0.05);
    camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={groupRef} position={[0, 0.12, 0]} scale={0.92}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[morph.random, 3]} />
          <bufferAttribute attach="attributes-aTarget" args={[morph.target, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[morph.seeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            uTime: { value: 0 },
            uMorph: { value: 0 },
            uAccent: { value: accentColor },
          }}
          vertexShader={`
            uniform float uTime;
            uniform float uMorph;
            attribute vec3 aTarget;
            attribute float aSeed;
            varying float vAlpha;
            varying float vMorph;

            void main() {
              float delay = smoothstep(0.0, 1.0, uMorph + (aSeed - 0.5) * 0.18);
              vec3 p = mix(position, aTarget, delay);
              float drift = (1.0 - delay) * 0.16;
              p.x += sin(uTime * 0.52 + aSeed * 18.0) * drift;
              p.y += cos(uTime * 0.42 + aSeed * 24.0) * drift;
              p.z += sin(uTime * 0.36 + aSeed * 31.0) * drift;

              vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
              gl_Position = projectionMatrix * mvPosition;
              gl_PointSize = (1.25 + delay * 1.05) * (9.0 / -mvPosition.z);
              vAlpha = 0.28 + delay * 0.52 + sin(aSeed * 21.0 + uTime * 1.2) * 0.08;
              vMorph = delay;
            }
          `}
          fragmentShader={`
            uniform vec3 uAccent;
            varying float vAlpha;
            varying float vMorph;

            void main() {
              vec2 uv = gl_PointCoord - vec2(0.5);
              float d = length(uv);
              float core = smoothstep(0.5, 0.0, d);
              float glow = smoothstep(0.5, 0.12, d) * 0.28;
              vec3 color = mix(vec3(0.46, 0.72, 0.86), uAccent, 0.36 + vMorph * 0.24);
              gl_FragColor = vec4(color, (core + glow) * vAlpha);
            }
          `}
        />
      </points>
      <lineSegments ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[morph.links, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={accent} transparent opacity={0.02} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

function LandmarkMorphCloud({ activeScene }) {
  const groupRef = useRef(null);
  const morphRef = useRef(0);
  const currentRef = useRef(null);
  const data = useMemo(() => createStoryMorphData(), []);
  const activeTarget = data.proceduralTargets[activeScene.id] ?? data.proceduralTargets.intro;
  const shouldAssemble = activeScene.id !== 'intro';
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    currentRef.current = data.random.slice();
    geo.setAttribute('position', new THREE.BufferAttribute(currentRef.current, 3));
    geo.computeBoundingSphere();
    return geo;
  }, [data]);

  useEffect(() => {
    morphRef.current = 0;
  }, [activeTarget, geometry]);

  useFrame(({ clock, pointer, camera }) => {
    const elapsed = clock.getElapsedTime();
    const targetMorph = shouldAssemble ? 1 : 0;
    morphRef.current = THREE.MathUtils.lerp(morphRef.current, targetMorph, 0.055);

    const position = geometry.getAttribute('position');
    const array = position.array;
    const morph = morphRef.current;
    for (let i = 0; i < array.length; i += 3) {
      const seed = data.seeds[i / 3];
      const localMorph = THREE.MathUtils.clamp(morph + (seed - 0.5) * 0.18, 0, 1);
      const loose = 1 - localMorph;
      array[i] = THREE.MathUtils.lerp(data.random[i], activeTarget[i], localMorph) + Math.sin(elapsed * 0.55 + seed * 23) * loose * 0.22;
      array[i + 1] = THREE.MathUtils.lerp(data.random[i + 1], activeTarget[i + 1], localMorph) + Math.cos(elapsed * 0.43 + seed * 31) * loose * 0.18;
      array[i + 2] = THREE.MathUtils.lerp(data.random[i + 2], activeTarget[i + 2], localMorph) + Math.sin(elapsed * 0.38 + seed * 19) * loose * 0.2;
    }
    position.needsUpdate = true;
    geometry.computeBoundingSphere();

    if (groupRef.current) {
      groupRef.current.rotation.y = elapsed * 0.11 + pointer.x * 0.22;
      groupRef.current.rotation.x = -0.08 + pointer.y * 0.1;
    }
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 0.5, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, pointer.y * 0.3, 0.06);
    camera.lookAt(0, 0, 0);
  });

  const xOffset = shouldAssemble ? 1.1 : 0;

  return (
    <group ref={groupRef} position={[xOffset, 0.02, 0]} scale={shouldAssemble ? 1.78 : 1.35}>
      <points geometry={geometry}>
        <pointsMaterial size={0.075} color="#064f82" transparent opacity={0.95} depthWrite={false} blending={THREE.NormalBlending} sizeAttenuation />
      </points>
    </group>
  );
}

function LandmarkMorphFallback({ activeScene }) {
  const groupRef = useRef(null);
  const morphRef = useRef(0);
  const currentRef = useRef(null);
  const data = useMemo(() => createStoryMorphData(3200), []);
  const activeTarget = data.proceduralTargets[activeScene.id] ?? data.proceduralTargets.intro;
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    currentRef.current = data.random.slice();
    geo.setAttribute('position', new THREE.BufferAttribute(currentRef.current, 3));
    geo.computeBoundingSphere();
    return geo;
  }, [data]);

  useEffect(() => {
    morphRef.current = 0;
  }, [activeTarget, geometry]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    morphRef.current = THREE.MathUtils.lerp(morphRef.current, activeScene.id === 'intro' ? 0 : 1, 0.05);
    const position = geometry.getAttribute('position');
    const array = position.array;
    const morph = morphRef.current;
    for (let i = 0; i < array.length; i += 3) {
      const seed = data.seeds[i / 3];
      const localMorph = THREE.MathUtils.clamp(morph + (seed - 0.5) * 0.18, 0, 1);
      const loose = 1 - localMorph;
      array[i] = THREE.MathUtils.lerp(data.random[i], activeTarget[i], localMorph) + Math.sin(elapsed * 0.55 + seed * 23) * loose * 0.22;
      array[i + 1] = THREE.MathUtils.lerp(data.random[i + 1], activeTarget[i + 1], localMorph) + Math.cos(elapsed * 0.43 + seed * 31) * loose * 0.18;
      array[i + 2] = THREE.MathUtils.lerp(data.random[i + 2], activeTarget[i + 2], localMorph);
    }
    position.needsUpdate = true;
    if (groupRef.current) groupRef.current.rotation.y = elapsed * 0.1;
  });

  return (
    <group ref={groupRef} position={[activeScene.id === 'intro' ? 0 : 1.35, 0.02, 0]} scale={activeScene.id === 'intro' ? 1.25 : 1.42}>
      <points geometry={geometry}>
        <pointsMaterial size={0.045} color="#075f91" transparent opacity={0.82} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>
    </group>
  );
}

function SemanticParticleCanvas2D({ activeScene, modelTargets }) {
  const canvasRef = useRef(null);
  const data = useMemo(() => createStoryMorphData(), []);
  const activeTarget = modelTargets?.[activeScene.kind] ?? data.proceduralTargets[activeScene.id] ?? data.proceduralTargets.intro;
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
      const shouldAssemble = activeScene.id !== 'intro';
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
  }, [activeScene.id, data]);

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

function ConceptHeader({ language, setLanguage, activePage, setActivePage }) {
  const c = copy[language];
  return (
    <header className="home-version-picker home-version-picker--single">
      <div className="home-version-picker__head">
        <span>{c.switcher}</span>
        <strong>Italy Journey</strong>
        <div className="home-language-toggle" aria-label={c.language}>
          <button type="button" className={language === 'zh' ? 'is-active' : ''} onClick={() => setLanguage('zh')}>中文</button>
          <button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>EN</button>
        </div>
      </div>
      <nav className="concept-page-tabs" aria-label="Concept pages">
        {c.nav.map(([id, label]) => (
          <button key={id} type="button" className={activePage === id ? 'is-active' : ''} onClick={() => setActivePage(id)}>
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function HomeSidebar({ language, setLanguage, activePage, setActivePage, selectedStop, collapsed, onToggleCollapse, onOpenDrive }) {
  const c = copy[language];
  const handleNav = (id) => {
    if (id === 'map') {
      setActivePage(id);
      return;
    }
    if (id === 'vr') {
      window.location.hash = '#/venice-vr';
      return;
    }
    if (id === 'drive') {
      setActivePage(id);
      return;
    }
    setActivePage(id);
  };

  return (
    <aside className={`home-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="home-sidebar__brand">
        <span>{language === 'zh' ? '意大利旅程' : 'Italy Journey'}</span>
        <strong>{language === 'zh' ? '今天想去哪？' : 'Where to today?'}</strong>
        <button className="home-sidebar__collapse" type="button" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? '>' : '<'}
        </button>
        <div className="home-language-toggle" aria-label={c.language}>
          <button type="button" className={language === 'zh' ? 'is-active' : ''} onClick={() => setLanguage('zh')}>中文</button>
          <button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>EN</button>
        </div>
      </div>
      <nav className="concept-page-tabs" aria-label={language === 'zh' ? '主页分页' : 'Home sections'}>
        {c.nav.map(([id, label], index) => (
          <button key={id} type="button" className={activePage === id ? 'is-active' : ''} data-index={String(index + 1).padStart(2, '0')} aria-label={label} onClick={() => handleNav(id)}>
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function AccountAvatar({ language, userSession, onOpen }) {
  const initials = userSession?.name?.slice(0, 1).toUpperCase() ?? 'A';
  return (
    <button className={`home-account-avatar ${userSession ? 'is-signed-in' : ''}`} type="button" onClick={onOpen} aria-label={language === 'zh' ? '账户' : 'Account'}>
      <span>{initials}</span>
      <strong>{userSession ? userSession.name : (language === 'zh' ? '登录' : 'Sign in')}</strong>
    </button>
  );
}

function AuthDialog({ language, mode, setMode, form, setForm, error, loading, userSession, history, onSubmit, onClose, onSignOut }) {
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

function HomeLanding({ language, query, setQuery, routeStops, onFocus }) {
  const c = copy[language];
  const featuredStops = routeStops.filter((stop) => imageFor(stop, language)).slice(0, 4);

  return (
    <section className="home-landing">
      <div className="home-landing__copy">
        <span>{language === 'zh' ? '开始规划' : 'Start planning'}</span>
        <h1>{c.homeQuestion}</h1>
        <p>{c.homeLead}</p>
        <label className="home-landing-search">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.homePrompt} />
        </label>
      </div>
      <div className="home-landing__gallery" aria-label={c.homeSuggestions}>
        {featuredStops.map((stop) => (
          <button key={stop.id} type="button" onClick={() => onFocus(stop.id)}>
            <img src={imageFor(stop, language)} alt="" loading="eager" />
            <span>{nameFor(stop, language)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Hero({ version, language, routeStops, favorites, onOpenDrive }) {
  const c = copy[language];
  return (
    <section className={`concept-hero concept-hero--${version.id}`}>
      <div className="concept-hero__copy">
        <p className="concept-kicker">{copy[language].kicker}</p>
        <h1>{t(version.title, language)}</h1>
        <p className="concept-summary">{t(version.summary, language)}</p>
        <div className="concept-actions">
          <button className="concept-btn concept-btn--primary" type="button" onClick={() => onOpenDrive()}>{c.cta3d}</button>
          <a className="concept-btn" href="#/v2">{c.routeMap}</a>
          <a className="concept-btn" href="#/venice-vr">Venice VR</a>
        </div>
      </div>
      {version.id === 'radial' ? (
        <div className="concept--radial">
          <div className="radial-core">
            <strong>{c.cta3d}</strong>
            <button className="radial-drive" type="button" onClick={() => onOpenDrive()}>3D</button>
          </div>
          {c.nav.concat([['vr', 'Venice VR'], ['map', c.routeMap]]).map(([id, label], index) => (
            <button key={id} className="radial-node" style={{ '--i': index }} type="button">
              {label}
            </button>
          ))}
        </div>
      ) : (
        <HeroGallery language={language} routeStops={routeStops} onOpenDrive={onOpenDrive} />
      )}
      <StatStrip language={language} routeStops={routeStops} favorites={favorites} />
    </section>
  );
}

function HeroGallery({ language, routeStops, onOpenDrive }) {
  const galleryStops = routeStops.filter((stop) => imageFor(stop, language)).slice(0, 5);
  return (
    <section className="home-hero-gallery" aria-label={copy[language].gallery}>
      {galleryStops.map((stop, index) => (
        <button key={stop.id} type="button" className={`home-hero-gallery__tile home-hero-gallery__tile--${index}`} onClick={() => onOpenDrive(stop.id)}>
          <img src={imageFor(stop, language)} alt="" loading={index === 0 ? 'eager' : 'lazy'} />
          <span>{nameFor(stop, language)}</span>
        </button>
      ))}
    </section>
  );
}

function StatStrip({ language, routeStops, favorites }) {
  const c = copy[language];
  const km = distanceKm(routeStops);
  return (
    <div className="concept-stats">
      <article><strong>{routeStops.length}</strong><span>{c.routeStops}</span></article>
      <article><strong>{favorites.size}</strong><span>{c.favorites}</span></article>
      <article><strong>{km} km</strong><span>{c.metrics}</span></article>
    </div>
  );
}

function HighlightsPanel({ language, routeStops, favorites, compare, routeSegments }) {
  const km = routeSegments.reduce((sum, segment) => sum + segment.distance, 0);
  const hours = routeSegments.reduce((sum, segment) => sum + segment.duration, 0);
  const modelCount = routeStops.filter((stop) => stop.modelPath).length;
  const labels = language === 'zh'
    ? ['智能路线', '3D 覆盖', '收藏/对比']
    : ['Smart route', '3D coverage', 'Saved / compare'];
  const details = language === 'zh'
    ? [
      `${routeStops.length} 个停靠点，约 ${Math.round(km)} km / ${Math.max(1, Math.round(hours))} h`,
      `${modelCount}/${routeStops.length} 个景点有精细模型，其余使用程序化地标`,
      `${favorites.size} 个收藏，${compare.size} 个对比候选`,
    ]
    : [
      `${routeStops.length} stops, about ${Math.round(km)} km / ${Math.max(1, Math.round(hours))} h`,
      `${modelCount}/${routeStops.length} stops include detailed models; others use procedural landmarks`,
      `${favorites.size} saved stops and ${compare.size} compare candidates`,
    ];
  return (
    <section className="home-module home-module--highlights">
      <div className="home-module__head"><span>{language === 'zh' ? '实时概览' : 'Live overview'}</span><strong>{Math.round(km)} km</strong></div>
      <div className="home-highlight-grid">
        {labels.map((label, index) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{index === 0 ? `${Math.round(km)} km` : index === 1 ? `${modelCount}/${routeStops.length}` : `${favorites.size}/${compare.size}`}</strong>
            <p>{details[index]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function JourneyOverviewPanel({ language, routeStops, favorites, compare, routeSegments }) {
  const km = routeSegments.reduce((sum, segment) => sum + segment.distance, 0);
  const hours = routeSegments.reduce((sum, segment) => sum + segment.duration, 0);
  const featuredCount = routeStops.filter((stop) => stop.modelPath).length;
  const labels = language === 'zh'
    ? ['路线概览', '值得停留', '收藏对比']
    : ['Route at a glance', 'Places to linger', 'Saved ideas'];
  const details = language === 'zh'
    ? [
      `${routeStops.length} 个停靠点，约 ${Math.round(km)} km / ${Math.max(1, Math.round(hours))} 小时`,
      `${featuredCount} 个重点景点可深入查看，其余适合作为沿途停靠`,
      `${favorites.size} 个收藏，${compare.size} 个正在对比`,
    ]
    : [
      `${routeStops.length} stops, about ${Math.round(km)} km / ${Math.max(1, Math.round(hours))} h`,
      `${featuredCount} featured stops are ready for a closer look`,
      `${favorites.size} saved stops and ${compare.size} places in comparison`,
    ];

  return (
    <section className="home-module home-module--highlights">
      <div className="home-module__head"><span>{language === 'zh' ? '旅程概览' : 'Trip overview'}</span><strong>{Math.round(km)} km</strong></div>
      <div className="home-highlight-grid">
        {labels.map((label, index) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{index === 0 ? `${Math.round(km)} km` : index === 1 ? featuredCount : `${favorites.size}/${compare.size}`}</strong>
            <p>{details[index]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SearchFilters({ language, query, setQuery, region, setRegion, kind, setKind, season, setSeason, sort, setSort, options }) {
  const c = copy[language];
  return (
    <section className="home-module home-module--search">
      <div className="home-module__head"><span>{c.searchTitle}</span><strong>{c.filters}</strong></div>
      <label className="home-search">
        <span>{c.searchTitle}</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.searchPlaceholder} />
      </label>
      <div className="home-filter-row home-filter-row--wide">
        <SelectField label={c.region} value={region} onChange={setRegion} options={options.regions} anyLabel={c.any} />
        <SelectField label={c.type} value={kind} onChange={setKind} options={options.kinds} anyLabel={c.any} />
        <SelectField label={c.season} value={season} onChange={setSeason} options={options.seasons} anyLabel={c.any} />
        <label>
          <span>{c.sort}</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="featured">{c.featured}</option>
            <option value="name">{c.name}</option>
            <option value="north">{c.north}</option>
            <option value="model">{c.model}</option>
          </select>
        </label>
      </div>
    </section>
  );
}

function SelectField({ label, value, onChange, options, anyLabel }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="any">{anyLabel}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ServicesPanel({ language }) {
  return (
    <section className="home-module home-module--services">
      <div className="home-module__head"><span>{copy[language].services}</span><strong>8</strong></div>
      <div className="home-tool-grid">
        {serviceCopy[language].map(([label, detail]) => (
          <section key={label}><strong>{label}</strong><span>{detail}</span></section>
        ))}
      </div>
    </section>
  );
}

function AccountPanel({ language, favorites, compare, routeStops, userSession, accountHistory = [], onSignIn, onSignOut, onReset }) {
  const c = copy[language];
  const signedIn = Boolean(userSession);
  return (
    <section className="home-module home-module--utility">
      <div className="home-module__head"><span>{c.account}</span><strong>{signedIn ? userSession.name : c.guest}</strong></div>
      <div className="home-tool-grid">
        <section><strong>{routeStops.length}</strong><span>{c.routeStops}</span></section>
        <section><strong>{favorites.size}</strong><span>{c.favorites}</span></section>
        <section><strong>{compare.size}</strong><span>{c.compared}</span></section>
        <button type="button" onClick={signedIn ? onSignOut : onSignIn}>{signedIn ? (language === 'zh' ? '退出' : 'Sign out') : (language === 'zh' ? '登录' : 'Sign in')}</button>
        <button type="button" onClick={onReset}>{language === 'zh' ? '清空路线' : c.reset}</button>
      </div>
      {signedIn && (
        <div className="home-account-history">
          <strong>{language === 'zh' ? '账号历史' : 'Account history'}</strong>
          {accountHistory.slice(0, 4).map((item) => (
            <span key={item.id}>{item.action}</span>
          ))}
        </div>
      )}
    </section>
  );
}

function DestinationCards({ language, stops, favorites, compare, selectedId, visibleCount, onShowMore, onFavorite, onCompare, onAdd, onFocus }) {
  const c = copy[language];
  const visibleStops = stops.slice(0, visibleCount);
  return (
    <section className="home-module home-module--destinations">
      <div className="home-module__head"><span>{c.destinations}</span><strong>{visibleStops.length}/{stops.length}</strong></div>
      <div className="home-destination-grid">
        {visibleStops.map((stop) => (
          <article key={stop.id} className={`home-destination-card ${selectedId === stop.id ? 'is-selected' : ''}`}>
            {imageFor(stop, language) && <img src={imageFor(stop, language)} alt="" loading="lazy" />}
            <div>
              <span>{regionFor(stop)} / {stop.modelKind}</span>
              <strong>{nameFor(stop, language)}</strong>
              <p>{summaryFor(stop, language)}</p>
            </div>
            <div className="home-card-actions">
              <button className={favorites.has(stop.id) ? 'is-on' : ''} type="button" onClick={() => onFavorite(stop.id)}>{c.favorite}</button>
              <button className={compare.has(stop.id) ? 'is-on' : ''} type="button" onClick={() => onCompare(stop.id)}>{c.compare}</button>
              <button type="button" onClick={() => onAdd(stop.id)}>{c.addRoute}</button>
              <button type="button" onClick={() => onFocus(stop.id)}>{c.focus}</button>
            </div>
          </article>
        ))}
      </div>
      {visibleStops.length < stops.length && (
        <button className="home-download-btn" type="button" onClick={onShowMore}>
          {language === 'zh' ? '展示更多景点' : 'Show more destinations'}
        </button>
      )}
    </section>
  );
}

function RouteEditor({ language, routeStops, routeQuery, setRouteQuery, routeMatches, lockedIds, onAdd, onRemove, onMove, onToggleLock, onOptimize, onReset, onOpenDrive }) {
  const c = copy[language];
  return (
    <section className="home-module home-module--planner">
      <div className="home-module__head"><span>{c.routeEditor}</span><strong>{routeStops.length}</strong></div>
      <label className="home-search">
        <span>{c.addFromSearch}</span>
        <input value={routeQuery} onChange={(event) => setRouteQuery(event.target.value)} placeholder={c.searchPlaceholder} />
      </label>
      {routeQuery && (
        <div className="concept-suggestion-list">
          {routeMatches.slice(0, 5).map((stop) => (
            <button key={stop.id} type="button" onClick={() => onAdd(stop.id)}>
              <strong>{nameFor(stop, language)}</strong><span>{regionFor(stop)} / {stop.modelKind}</span>
            </button>
          ))}
        </div>
      )}
      <div className="home-planner-list">
        {routeStops.map((stop, index) => (
          <section key={stop.id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{nameFor(stop, language)}</strong>
            <button type="button" onClick={() => onMove(stop.id, -1)}>{c.up}</button>
            <button type="button" onClick={() => onMove(stop.id, 1)}>{c.down}</button>
            <button type="button" onClick={() => onToggleLock(stop.id)}>{lockedIds.has(stop.id) ? c.unlock : c.lock}</button>
            <button type="button" onClick={() => onRemove(stop.id)}>{c.remove}</button>
          </section>
        ))}
      </div>
      <div className="concept-actions concept-actions--compact">
        <button className="concept-btn" type="button" onClick={onOptimize}>{c.optimize}</button>
        <button className="concept-btn" type="button" onClick={onReset}>{c.reset}</button>
      </div>
    </section>
  );
}

function MapBoard({ language, routeStops, onOpenDrive }) {
  return (
    <section className="home-module home-module--map">
      <div className="home-module__head"><span>{copy[language].routePreview}</span><strong>{routeStops.length}</strong></div>
      <RouteSketchMap language={language} routeStops={routeStops} />
    </section>
  );
}

function MetricsPanel({ language, routeStops, days, pace }) {
  const km = distanceKm(routeStops);
  const hours = Math.max(2, Math.round(km / (pace === 'Fast' ? 82 : pace === 'Relaxed' ? 58 : 70)));
  const modelCount = routeStops.filter((stop) => stop.modelPath).length;
  return (
    <section className="home-module home-module--metrics">
      <div className="home-module__head"><span>{copy[language].metrics}</span><strong>{pace}</strong></div>
      <div className="home-metric-grid">
        <section><strong>{km} km</strong><span>{language === 'zh' ? '预计里程' : 'Estimated distance'}</span></section>
        <section><strong>{hours} h</strong><span>{language === 'zh' ? '驾驶时间' : 'Drive time'}</span></section>
        <section><strong>{routeStops.length}</strong><span>{copy[language].routeStops}</span></section>
        <section><strong>{modelCount}</strong><span>{language === 'zh' ? '模型预览' : 'Model previews'}</span></section>
        <section><strong>{days}</strong><span>{copy[language].days}</span></section>
        <section><strong>{routeStops.length * 4 + 2}</strong><span>{language === 'zh' ? '关键点' : 'Key points'}</span></section>
      </div>
    </section>
  );
}

function ItineraryPanel({ language, routeStops, days, setDays, pace, setPace }) {
  const c = copy[language];
  const itinerary = makeItinerary(routeStops, days);
  return (
    <section className="home-module home-module--itinerary">
      <div className="home-module__head"><span>{c.itinerary}</span><strong>{days}</strong></div>
      <div className="home-planner-controls">
        <label><span>{c.days}</span><input type="number" min="1" max="10" value={days} onChange={(event) => setDays(Number(event.target.value))} /></label>
        <label><span>{c.pace}</span><select value={pace} onChange={(event) => setPace(event.target.value)}><option>Relaxed</option><option>Standard</option><option>Fast</option></select></label>
      </div>
      <div className="home-itinerary-days">
        {itinerary.map((day) => (
          <section key={day.day}>
            <span>{language === 'zh' ? `第 ${day.day} 天` : `Day ${day.day}`}</span>
            <strong>{day.stops.map((stop) => nameFor(stop, language)).join(' / ')}</strong>
            <p>{day.stops.map((stop) => regionFor(stop)).join(' -> ')}</p>
          </section>
        ))}
      </div>
    </section>
  );
}

function ExportPanel({ language, routeStops, days, pace }) {
  const c = copy[language];
  const itinerary = makeItinerary(routeStops, days);
  const text = [
    c.itinerary,
    `${c.pace}: ${pace}`,
    ...itinerary.map((day) => `${language === 'zh' ? `第 ${day.day} 天` : `Day ${day.day}`}: ${day.stops.map((stop) => nameFor(stop, language)).join(' / ')}`),
  ].join('\n');
  return (
    <section className="home-module home-module--export">
      <div className="home-module__head"><span>{c.export}</span><strong>TXT</strong></div>
      <textarea readOnly value={text} aria-label={c.export} />
      <button className="home-download-btn" type="button" onClick={() => downloadTextFile('trip3d-itinerary.txt', text)}>
        {language === 'zh' ? '下载行程' : 'Download itinerary'}
      </button>
    </section>
  );
}

function FocusPanel({ language, stop, onOpenDrive }) {
  const c = copy[language];
  return (
    <section className="home-module home-module--focus">
      <div className="home-module__head"><span>{c.focus}</span><strong>{regionFor(stop)}</strong></div>
      <div className="home-focus-card">
        {imageFor(stop, language) && <img src={imageFor(stop, language)} alt="" loading="lazy" />}
        <span>{stop.modelKind}</span>
        <strong>{nameFor(stop, language)}</strong>
        <p>{summaryFor(stop, language)}</p>
        <dl>
          <div><dt>LAT</dt><dd>{stop.lat.toFixed(3)}</dd></div>
          <div><dt>LON</dt><dd>{stop.lon.toFixed(3)}</dd></div>
          <div><dt>{language === 'zh' ? '查看' : 'View'}</dt><dd>{stop.modelPath ? (language === 'zh' ? '可深入浏览' : 'Closer look') : (language === 'zh' ? '沿途停靠' : 'Route stop')}</dd></div>
        </dl>
      </div>
    </section>
  );
}

function ReviewsPanel({ language, stops, favorites, onFavorite, onOpenDrive }) {
  const c = copy[language];
  return (
    <section className="home-module home-module--reviews">
      <div className="home-module__head"><span>{c.reviews}</span><strong>{stops.length}</strong></div>
      <div className="home-review-list home-review-list--large">
        {stops.slice(0, 12).map((stop) => {
          const url = pageUrlFor(stop, language);
          return (
            <article key={stop.id}>
              {imageFor(stop, language) && <img src={imageFor(stop, language)} alt="" loading="lazy" />}
              <div>
                <strong>{nameFor(stop, language)}</strong>
                <p>{summaryFor(stop, language)}</p>
                <span>{regionFor(stop)} / {seasonFor(stop)} / 4.{8 + (stop.name.length % 2)}</span>
                <div className="home-card-actions">
                  <button type="button" className={favorites.has(stop.id) ? 'is-on' : ''} onClick={() => onFavorite(stop.id)}>{c.favorite}</button>
                  {url && <a href={url} target="_blank" rel="noreferrer">{c.read}</a>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ComparePanel({ language, compareIds, favoriteIds, onOpenDrive }) {
  const c = copy[language];
  const compared = compareIds.map((id) => landmarks.find((stop) => stop.id === id)).filter(Boolean);
  const favorites = favoriteIds.map((id) => landmarks.find((stop) => stop.id === id)).filter(Boolean);
  return (
    <section className="home-module home-module--compare">
      <div className="home-module__head"><span>{c.compare}</span><strong>{compared.length}</strong></div>
      <div className="home-compare-columns">
        <section>
          <span>{c.compare}</span>
          {(compared.length ? compared : landmarks.slice(0, 2)).map((stop) => <button key={stop.id} type="button">{nameFor(stop, language)}</button>)}
        </section>
        <section>
          <span>{c.favorites}</span>
          {(favorites.length ? favorites : landmarks.slice(2, 4)).map((stop) => <button key={stop.id} type="button">{nameFor(stop, language)}</button>)}
        </section>
      </div>
    </section>
  );
}

function WeatherPanel({ language, stop }) {
  const live = liveFor(stop.id);
  const weather = live?.weather;
  return (
    <section className="home-module home-module--weather">
      <div className="home-module__head"><span>{copy[language].weather}</span><strong>{copy[language].nextStop}</strong></div>
      <p>{nameFor(stop, language)}</p>
      <div className="home-metric-grid">
        <section><strong>{weather?.temperatureC != null ? `${Math.round(weather.temperatureC)}°C` : '--'}</strong><span>Temperature</span></section>
        <section><strong>{weather?.windKph != null ? `${Math.round(weather.windKph)} km/h` : '--'}</strong><span>Wind</span></section>
      </div>
    </section>
  );
}

function RouteSchemaPanel({ language, routeStops, routeSegments }) {
  const total = routeSegments.reduce((sum, segment) => sum + segment.distance, 0);
  const hours = routeSegments.reduce((sum, segment) => sum + segment.duration, 0);
  return (
    <section className="home-module home-module--schema">
      <div className="home-module__head">
        <span>{language === 'zh' ? '路线结构' : 'Route schema'}</span>
        <strong>{routeSegments.length}</strong>
      </div>
      <div className="home-schema-summary">
        <section><strong>{Math.round(total)} km</strong><span>{language === 'zh' ? '总里程' : 'Distance'}</span></section>
        <section><strong>{Math.max(1, Math.round(hours))} h</strong><span>{language === 'zh' ? '预计时间' : 'Duration'}</span></section>
        <section><strong>{routeStops.length}</strong><span>{copy[language].routeStops}</span></section>
      </div>
      <div className="home-schema-list">
        {routeSegments.slice(0, 8).map((segment, index) => (
          <article key={`${segment.from.id}-${segment.to.id}`}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{`${nameFor(segment.from, language)} -> ${nameFor(segment.to, language)}`}</strong>
            <small>{Math.round(segment.distance)} km</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function DestinationsPage(props) {
  const { language, filteredStops, favorites, compare, selectedId, routeStops, routeSegments, userSession, visibleCount, onShowMore, onOpenDrive } = props;
  return (
    <section className="concept-page concept-page--destinations">
      <div className="concept-page__aside">
        <SearchFilters {...props} />
        <AccountPanel language={language} favorites={favorites} compare={compare} routeStops={routeStops} userSession={userSession} accountHistory={props.accountHistory} onSignIn={props.onSignIn} onSignOut={props.onSignOut} onReset={props.onResetRoute} />
        <ServicesPanel language={language} />
      </div>
      <div className="concept-page__stack concept-page__stack--wide">
        <JourneyOverviewPanel language={language} routeStops={routeStops} favorites={favorites} compare={compare} routeSegments={routeSegments} />
      <DestinationCards
        language={language}
        stops={filteredStops}
        favorites={favorites}
        compare={compare}
        selectedId={selectedId}
        visibleCount={visibleCount}
        onShowMore={onShowMore}
        onFavorite={props.onFavorite}
        onCompare={props.onCompare}
        onAdd={props.onAddRoute}
        onFocus={props.setSelectedId}
        onOpenDrive={onOpenDrive}
      />
      </div>
    </section>
  );
}

function PlannerPage(props) {
  const { language, routeStops, days, pace, routeSegments, onOpenDrive } = props;
  return (
    <section className="concept-page concept-page--planner">
      <RouteEditor {...props} />
      <div className="concept-page__stack">
        <MapBoard language={language} routeStops={routeStops} onOpenDrive={onOpenDrive} />
        <MetricsPanel language={language} routeStops={routeStops} days={days} pace={pace} />
        <RouteSchemaPanel language={language} routeStops={routeStops} routeSegments={routeSegments} />
      </div>
      <div className="concept-page__stack">
        <ItineraryPanel language={language} routeStops={routeStops} days={days} setDays={props.setDays} pace={pace} setPace={props.setPace} />
        <ExportPanel language={language} routeStops={routeStops} days={days} pace={pace} />
      </div>
    </section>
  );
}

function ReviewsPage(props) {
  const { language, filteredStops, routeStops, favorites, compare, onOpenDrive } = props;
  return (
    <section className="concept-page concept-page--reviews">
      <ReviewsPanel language={language} stops={filteredStops} favorites={favorites} onFavorite={props.onFavorite} onOpenDrive={onOpenDrive} />
      <div className="concept-page__stack">
        <ComparePanel language={language} compareIds={[...compare]} favoriteIds={[...favorites]} onOpenDrive={onOpenDrive} />
        <WeatherPanel language={language} stop={routeStops[0] ?? landmarks[0]} />
        <ServicesPanel language={language} />
      </div>
    </section>
  );
}

function DrivePage(props) {
  const { language, routeStops, selectedStop, favorites, compare, routeSegments, userSession, onOpenDrive } = props;
  return (
    <section className="concept-page concept-page--drive">
      <div className="concept-drive-gateway">
        <p className="concept-kicker">{copy[language].driveReady}</p>
        <h2>{copy[language].cta3d}</h2>
        <p>{copy[language].driveBody}</p>
        <div className="concept-actions">
          <button className="concept-btn concept-btn--primary" type="button" onClick={() => onOpenDrive(selectedStop.id)}>{copy[language].cta3d}</button>
          <a className="concept-btn" href="#/v2">{copy[language].routeMap}</a>
          <a className="concept-btn" href="#/venice-vr">Venice VR</a>
        </div>
        <HeroGallery language={language} routeStops={routeStops} onOpenDrive={onOpenDrive} />
      </div>
      <div className="concept-page__stack">
        <FocusPanel language={language} stop={selectedStop} onOpenDrive={onOpenDrive} />
        <StatStrip language={language} routeStops={routeStops} favorites={favorites} />
        <AccountPanel language={language} favorites={favorites} compare={compare} routeStops={routeStops} userSession={userSession} accountHistory={props.accountHistory} onSignIn={props.onSignIn} onSignOut={props.onSignOut} onReset={props.onResetRoute} />
        <RouteSchemaPanel language={language} routeStops={routeStops} routeSegments={routeSegments} />
      </div>
    </section>
  );
}

function MapPage(props) {
  const { language, routeStops, routeSegments, days, pace, onOpenDrive } = props;
  return (
    <section className="concept-page concept-page--map">
      <MapBoard language={language} routeStops={routeStops} onOpenDrive={onOpenDrive} />
      <div className="concept-page__stack">
        <MetricsPanel language={language} routeStops={routeStops} days={days} pace={pace} />
        <RouteSchemaPanel language={language} routeStops={routeStops} routeSegments={routeSegments} />
      </div>
      <div className="concept-page__stack">
        <WeatherPanel language={language} stop={routeStops[0] ?? landmarks[0]} />
        <ServicesPanel language={language} />
      </div>
    </section>
  );
}

function scrollToHomeSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function homeText(language, zh, en) {
  return language === 'zh' ? zh : en;
}



function HomeHeader({ language, setLanguage, userSession, onAccount }) {
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
      ['home-reviews', 'Reviews'],
      ['home-services', 'Services'],
    ];
  return (
    <header className="cinematic-home-nav">
      <button className="cinematic-home-nav__brand" type="button" onClick={() => scrollToHomeSection('home-hero')}><span>Trip3D</span><strong>{language === 'zh' ? '\u610f\u5927\u5229\u65c5\u884c\u624b\u518c' : 'Italy travel notebook'}</strong></button>
      <nav aria-label={language === 'zh' ? '\u9996\u9875\u5bfc\u822a' : 'Home sections'}>{items.map(([id, label]) => <button key={id} type="button" onClick={() => scrollToHomeSection(id)}>{label}</button>)}<button type="button" onClick={() => scrollToHomeSection('home-account')}>{language === 'zh' ? '\u8d26\u6237' : 'Account'}</button></nav>
      <div className="cinematic-home-nav__tools"><div className="home-language-toggle" aria-label={homeText(language, '\u8bed\u8a00', 'Language')}><button type="button" className={language === 'zh' ? 'is-active' : ''} onClick={() => setLanguage('zh')}>{'\u4e2d\u6587'}</button><button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>EN</button></div><button className="cinematic-home-nav__account" type="button" onClick={onAccount}>{userSession ? userSession.name : (language === 'zh' ? '\u767b\u5f55' : 'Sign in')}</button></div>
    </header>
  );
}

function HomeHero({ language, routeStops, selectedStop, onOpenDrive }) {
  const title = language === 'zh' ? '\u4eca\u5929\u60f3\u53bb\u54ea\uff1f' : 'Where to today?';
  return <section id="home-hero" className="cinematic-section cinematic-hero"><div className="cinematic-hero__copy"><span>{language === 'zh' ? '\u610f\u5927\u5229\u65c5\u884c\u624b\u8bb0' : 'Italy travel notebook'}</span><h1>{title}</h1><p>{language === 'zh' ? '\u7b5b\u9009\u666f\u70b9\uff0c\u5f00\u59cb\u89c4\u5212\uff01' : 'Filter stops and start planning.'}</p><div className="cinematic-actions"><button className="concept-btn concept-btn--primary" type="button" onClick={() => scrollToHomeSection('home-planner')}>{language === 'zh' ? '\u5f00\u59cb\u89c4\u5212\u8def\u7ebf' : 'Start planning'}</button><button className="concept-btn" type="button" onClick={() => scrollToHomeSection('home-3d')}>{language === 'zh' ? '\u8fdb\u51653D\u5bfc\u89c8' : 'Enter 3D guide'}</button></div></div><div className="cinematic-hero__preview" aria-label={language === 'zh' ? '\u8def\u7ebf\u548c3D\u5bfc\u89c8\u9884\u89c8' : 'Route and 3D guide preview'}><div className="cinematic-hero__media">{imageFor(selectedStop, language) && <img src={imageFor(selectedStop, language)} alt="" loading="eager" />}<button type="button" onClick={() => onOpenDrive(selectedStop.id)}>{language === 'zh' ? '\u6253\u5f00 3D Drive' : 'Open 3D Drive'}</button></div><div className="cinematic-hero__route"><span>{language === 'zh' ? '\u5f53\u524d\u8def\u7ebf' : 'Current route'}</span>{routeStops.slice(0, 5).map((stop, index) => <strong key={stop.id}>{index + 1}. {nameFor(stop, language)}</strong>)}</div></div></section>;
}

function HomeStats({ language }) {
  const stats = language === 'zh' ? [['50+', '\u76ee\u7684\u5730'], ['12', '\u63a8\u8350\u8def\u7ebf'], ['3D', '\u5bfc\u89c8\u5165\u53e3'], ['\u672c\u5730', '\u8def\u7ebf\u89c4\u5212']] : [['50+', 'Destinations'], ['12', 'Recommended routes'], ['3D', 'Guide entry'], ['Local', 'Route planning']];
  return <section className="cinematic-stats" aria-label={language === 'zh' ? '\u6570\u636e\u6982\u89c8' : 'Overview stats'}>{stats.map(([value, label]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}</section>;
}

function RouteSketchMap({ language, routeStops }) {
  const stops = routeStops.slice(0, 6);
  const points = stops.map((stop, index) => ({ stop, x: 14 + index * 14 + (index % 2) * 4, y: 68 - index * 8 + (index % 3) * 12 }));
  const path = points.map((point, index) => { if (index === 0) return 'M ' + point.x + ' ' + point.y; const prev = points[index - 1]; const cx = (prev.x + point.x) / 2; const cy = (prev.y + point.y) / 2 + (index % 2 ? -16 : 14); return 'Q ' + cx + ' ' + cy + ' ' + point.x + ' ' + point.y; }).join(' ');
  return <div className="paper-route-map" aria-label={language === 'zh' ? '\u624b\u7ed8\u8def\u7ebf\u5730\u56fe' : 'Hand-drawn route map'}><svg viewBox="0 0 100 100" role="img" aria-hidden="true" preserveAspectRatio="none"><path className="paper-route-map__coast" d="M2 82 C18 74 22 62 35 60 C48 58 52 68 64 60 C76 52 74 36 90 24" /><path className="paper-route-map__river" d="M8 22 C24 30 26 42 42 42 C58 42 64 30 88 38" />{path && <path className="paper-route-map__path" d={path} />}{points.map((point, index) => <g key={point.stop.id} className="paper-route-map__stop"><circle cx={point.x} cy={point.y} r="3.8" /><text x={point.x} y={point.y + 1.6}>{index + 1}</text></g>)}</svg>{points.map((point) => <span key={point.stop.id} style={{ '--x': point.x + '%', '--y': point.y + '%' }}>{nameFor(point.stop, language)}</span>)}</div>;
}

function DestinationSection(props) {
  const { language, query, setQuery, region, setRegion, kind, setKind, season, setSeason, sort, setSort, options, filteredStops, favorites, compare, selectedId, visibleCount, onShowMore, onOpenDetail } = props;
  const visibleStops = filteredStops.slice(0, visibleCount);
  return <section id="home-destinations" className="cinematic-section cinematic-destinations"><div className="cinematic-section__head"><span>{language === 'zh' ? '\u7cbe\u9009\u76ee\u7684\u5730' : 'Featured destinations'}</span><h2>{language === 'zh' ? '\u5148\u9009\u60f3\u505c\u7559\u7684\u5730\u65b9' : 'Choose the places worth a stop'}</h2><p>{language === 'zh' ? '\u4ece\u7ecf\u5178\u57ce\u5e02\u4e0e\u5730\u6807\u4e2d\uff0c\u6311\u9009\u4f60\u60f3\u52a0\u5165\u65c5\u7a0b\u7684\u505c\u9760\u70b9\u3002' : 'Choose the classic cities and landmarks you want to add to the journey.'}</p></div><section className="home-module home-module--search"><div className="home-module__head"><span>{homeText(language, '\u641c\u7d22\u4e0e\u89c4\u5212', 'Search & plan')}</span><strong>{homeText(language, '\u7b5b\u9009', 'Filters')}</strong></div><label className="home-search"><span>{homeText(language, '\u641c\u7d22', 'Search')}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={homeText(language, '\u641c\u7d22\u666f\u70b9\u3001\u57ce\u5e02\u3001\u5730\u533a\u6216\u8def\u7ebf\u8bf4\u660e', 'Search landmarks, cities, regions, or route notes')} /></label><div className="home-filter-row home-filter-row--wide"><SelectField label={homeText(language, '\u5730\u533a', 'Region')} value={region} onChange={setRegion} options={options.regions} anyLabel={homeText(language, '\u4e0d\u9650', 'Any')} /><SelectField label={homeText(language, '\u7c7b\u578b', 'Type')} value={kind} onChange={setKind} options={options.kinds} anyLabel={homeText(language, '\u4e0d\u9650', 'Any')} /><SelectField label={homeText(language, '\u65f6\u95f4', 'Best time')} value={season} onChange={setSeason} options={options.seasons} anyLabel={homeText(language, '\u4e0d\u9650', 'Any')} /><label><span>{homeText(language, '\u6392\u5e8f', 'Sort')}</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">{homeText(language, '\u63a8\u8350', 'Featured')}</option><option value="name">{homeText(language, '\u540d\u79f0', 'Name')}</option><option value="north">{homeText(language, '\u4ece\u5317\u5230\u5357', 'North to south')}</option><option value="model">{homeText(language, '\u4f18\u51483D\u6a21\u578b', '3D model first')}</option></select></label></div></section><div className="cinematic-destination-grid">{visibleStops.map((stop) => { const url = pageUrlFor(stop, language); return <article key={stop.id} className={'cinematic-destination-card ' + (selectedId === stop.id ? 'is-selected' : '')}>{imageFor(stop, language) && <img src={imageFor(stop, language)} alt="" loading="lazy" />}<div className="cinematic-destination-card__body"><strong>{nameFor(stop, language)}</strong><span>{regionText(stop, language)} / {kindText(stop, language)} / 4.{8 + (stop.name.length % 2)}</span><p>{summaryFor(stop, language)}</p></div><div className="home-card-actions"><button className={favorites.has(stop.id) ? 'is-on' : ''} type="button" onClick={() => props.onFavorite(stop.id)}>{homeText(language, '\u6536\u85cf', 'Favorite')}</button><button className={compare.has(stop.id) ? 'is-on' : ''} type="button" onClick={() => props.onCompare(stop.id)}>{homeText(language, '\u5bf9\u6bd4', 'Compare')}</button><button type="button" onClick={() => props.onAddRoute(stop.id)}>{homeText(language, '\u52a0\u5165\u8def\u7ebf', 'Add route')}</button><button type="button" onClick={() => onOpenDetail(stop.id)}>{homeText(language, '\u67e5\u770b\u8be6\u60c5', 'Details')}</button>{url && <a href={url} target="_blank" rel="noreferrer">{homeText(language, '\u80cc\u666f\u8d44\u6599', 'Background')}</a>}</div></article>; })}</div>{visibleStops.length < filteredStops.length && <button className="home-download-btn" type="button" onClick={onShowMore}>{language === 'zh' ? '\u5c55\u793a\u66f4\u591a\u666f\u70b9' : 'Show more destinations'}</button>}</section>;
}


function RoutePlannerSection(props) {
  const { language, routeStops, routeSegments, routeQuery, setRouteQuery, routeMatches, days, setDays, pace, setPace, lockedIds } = props;
  const itinerary = makeItinerary(routeStops, days);
  const exportText = [homeText(language, '\u884c\u7a0b', 'Itinerary'), homeText(language, '\u8282\u594f', 'Pace') + ': ' + pace, ...itinerary.map((day) => 'Day ' + day.day + ': ' + day.stops.map((stop) => nameFor(stop, language)).join(' / '))].join('\n');
  return <section id="home-planner" className="cinematic-section cinematic-route-planner"><div className="cinematic-section__head"><span>{language === 'zh' ? '\u8def\u7ebf\u89c4\u5212' : 'Route planner'}</span><h2>{language === 'zh' ? '\u628a\u505c\u9760\u70b9\u6574\u7406\u6210\u6e05\u695a\u7684\u884c\u7a0b' : 'Turn stops into a readable route'}</h2><p>{language === 'zh' ? '\u8c03\u6574\u987a\u5e8f\u3001\u9501\u5b9a\u91cd\u70b9\u666f\u70b9\uff0c\u8ba9\u8def\u7ebf\u66f4\u7b26\u5408\u4f60\u7684\u65c5\u884c\u8282\u594f\u3002' : 'Adjust the order, lock key stops, and keep the route aligned with your travel pace.'}</p></div><div className="cinematic-route-planner__main"><div className="cinematic-route-planner__controls"><section className="home-module home-module--planner"><div className="home-module__head"><span>{homeText(language, '\u8def\u7ebf\u63a7\u5236', 'Route controls')}</span><strong>{routeStops.length}</strong></div><label className="home-search"><span>{homeText(language, '\u6dfb\u52a0\u666f\u70b9', 'Add stop')}</span><input value={routeQuery} onChange={(event) => setRouteQuery(event.target.value)} placeholder={homeText(language, '\u641c\u7d22\u666f\u70b9\u52a0\u5165\u5f53\u524d\u8def\u7ebf', 'Search stops to add to the route')} /></label>{routeQuery && <div className="concept-suggestion-list">{routeMatches.slice(0, 5).map((stop) => <button key={stop.id} type="button" onClick={() => props.onAddRoute(stop.id)}><strong>{nameFor(stop, language)}</strong><span>{regionFor(stop)} / {stop.modelKind}</span></button>)}</div>}<div className="home-planner-list">{routeStops.map((stop, index) => <section key={stop.id}><span>{String(index + 1).padStart(2, '0')}</span><strong>{nameFor(stop, language)}</strong><button type="button" onClick={() => props.onMove(stop.id, -1)}>{homeText(language, '\u4e0a\u79fb', 'Up')}</button><button type="button" onClick={() => props.onMove(stop.id, 1)}>{homeText(language, '\u4e0b\u79fb', 'Down')}</button><button type="button" onClick={() => props.onToggleLock(stop.id)}>{lockedIds.has(stop.id) ? homeText(language, '\u89e3\u9501', 'Unlock') : homeText(language, '\u9501\u5b9a', 'Lock')}</button><button type="button" onClick={() => props.onRemove(stop.id)}>{homeText(language, '\u79fb\u9664', 'Remove')}</button></section>)}</div><div className="concept-actions concept-actions--compact"><button className="concept-btn" type="button" onClick={props.onOptimize}>{homeText(language, '\u4f18\u5316\u8def\u7ebf', 'Optimize')}</button><button className="concept-btn" type="button" onClick={props.onResetRoute}>{homeText(language, '\u91cd\u7f6e', 'Reset')}</button></div></section><section className="home-module home-module--itinerary-controls"><div className="home-module__head"><span>{homeText(language, '\u6309\u5929\u884c\u7a0b', 'Day itinerary')}</span><strong>{days}</strong></div><div className="home-planner-controls"><label><span>{homeText(language, '\u5929\u6570', 'Days')}</span><input type="number" min="1" max="10" value={days} onChange={(event) => setDays(Number(event.target.value))} /></label><label><span>{homeText(language, '\u8282\u594f', 'Pace')}</span><select value={pace} onChange={(event) => setPace(event.target.value)}><option>Relaxed</option><option>Standard</option><option>Fast</option></select></label></div></section><section className="home-module home-module--export"><div className="home-module__head"><span>{homeText(language, '\u5bfc\u51fa\u884c\u7a0b', 'Export itinerary')}</span><strong>TXT</strong></div><textarea readOnly value={exportText} aria-label={homeText(language, '\u5bfc\u51fa\u884c\u7a0b', 'Export itinerary')} /><button className="home-download-btn" type="button" onClick={() => downloadTextFile('trip3d-itinerary.txt', exportText)}>{homeText(language, '\u4e0b\u8f7d\u884c\u7a0b', 'Download itinerary')}</button></section></div><div className="cinematic-route-planner__visual"><section className="home-module home-module--map"><div className="home-module__head"><span>{homeText(language, '\u8def\u7ebf\u9884\u89c8', 'Route preview')}</span><strong>{routeStops.length}</strong></div><RouteSketchMap language={language} routeStops={routeStops} /></section><section className="home-module home-module--schema"><div className="home-module__head"><span>{homeText(language, '\u7ad9\u70b9\u8fde\u63a5', 'Stop connections')}</span><strong>{routeSegments.length}</strong></div><div className="home-schema-list">{routeSegments.slice(0, 8).map((segment, index) => <article key={segment.from.id + '-' + segment.to.id}><span>{String(index + 1).padStart(2, '0')}</span><strong>{nameFor(segment.from, language) + ' -> ' + nameFor(segment.to, language)}</strong><small>{Math.round(segment.distance)} km</small></article>)}</div></section><section className="home-module home-module--metrics"><div className="home-module__head"><span>{homeText(language, '\u8def\u7ebf\u987a\u5e8f', 'Route order')}</span><strong>{pace}</strong></div><div className="home-metric-grid"><section><strong>{distanceKm(routeStops)} km</strong><span>{homeText(language, '\u9884\u8ba1\u91cc\u7a0b', 'Distance')}</span></section><section><strong>{days}</strong><span>{homeText(language, '\u5929\u6570', 'Days')}</span></section><section><strong>{routeStops.length}</strong><span>{homeText(language, '\u505c\u9760\u70b9', 'Stops')}</span></section><section><strong>{routeStops.filter((stop) => stop.modelPath).length}</strong><span>{homeText(language, '3D\u6a21\u578b', '3D models')}</span></section></div></section></div></div><div className="cinematic-day-grid">{itinerary.map((day) => <article key={day.day}><span>Day {day.day}</span><strong>{day.stops.map((stop, index) => (index + 1) + '. ' + nameFor(stop, language)).join(' / ')}</strong><p>{day.stops.map((stop) => regionText(stop, language)).join(' -> ')}</p></article>)}<article><span>{language === 'zh' ? '\u9501\u5b9a\u666f\u70b9' : 'Locked stops'}</span><strong>{lockedIds.size}</strong><p>{language === 'zh' ? '\u9501\u5b9a\u540e\u7684\u666f\u70b9\u4f1a\u4fdd\u7559\u5728\u4f60\u6307\u5b9a\u7684\u4f4d\u7f6e\u3002' : 'Locked stops stay in the position you choose.'}</p></article></div></section>;
}

function ThreeDGuideSection({ language, selectedStop, routeStops, onOpenDrive }) {
  const entries = language === 'zh' ? [['3D Drive', '\u6cbf\u7740\u5f53\u524d\u8def\u7ebf\u8fdb\u5165\u6c89\u6d78\u5f0f\u9a7e\u9a76\u5bfc\u89c8\u3002', () => onOpenDrive(selectedStop.id), 'button'], ['V2 \u8def\u7ebf\u62d3\u6251\u89c6\u56fe', '\u67e5\u770b\u8def\u7ebf\u7ad9\u70b9\u4e4b\u95f4\u7684\u7a7a\u95f4\u5173\u7cfb\u3002', '#/v2', 'link'], ['Venice VR \u57ce\u5e02\u6f2b\u6e38', '\u8fdb\u5165\u5a01\u5c3c\u65af\u57ce\u5e02\u6f2b\u6e38\u4f53\u9a8c\u3002', '#/venice-vr', 'link']] : [['3D Drive', 'Enter immersive driving guidance along the current route.', () => onOpenDrive(selectedStop.id), 'button'], ['V2 route topology', 'Review the spatial relationship between route stops.', '#/v2', 'link'], ['Venice VR city walk', 'Enter the Venice city walkthrough.', '#/venice-vr', 'link']];
  return <section id="home-3d" className="cinematic-section cinematic-3d"><div className="cinematic-section__head"><span>{language === 'zh' ? '3D\u65c5\u884c\u5bfc\u89c8' : '3D travel guide'}</span><h2>{language === 'zh' ? '\u8fdb\u5165\u53ef\u63a2\u7d22\u7684\u610f\u5927\u5229\u8def\u7ebf' : 'Step into an explorable Italy route'}</h2><p>{language === 'zh' ? '\u4ece\u9a7e\u9a76\u5bfc\u89c8\u3001\u8def\u7ebf\u62d3\u6251\u548c\u57ce\u5e02\u6f2b\u6e38\u4e2d\u9009\u62e9\u4e0b\u4e00\u6b65\u3002' : 'Choose between drive guidance, route topology, and city walkthrough.'}</p></div><div className="cinematic-3d__layout"><div className="cinematic-3d__copy"><strong>{nameFor(selectedStop, language)}</strong><p>{language === 'zh' ? '\u5f53\u524d\u8def\u7ebf\u5305\u542b ' + routeStops.length + ' \u4e2a\u505c\u9760\u70b9\uff0c\u53ef\u76f4\u63a5\u8fdb\u51653D\u5bfc\u89c8\u3002' : 'The current route has ' + routeStops.length + ' stops and is ready for 3D guidance.'}</p></div><div className="cinematic-entry-grid">{entries.map(([title, detail, action, type]) => <article key={title}><strong>{title}</strong><p>{detail}</p>{type === 'button' ? <button type="button" onClick={action}>{language === 'zh' ? '\u8fdb\u5165' : 'Enter'}</button> : <a className="concept-btn" href={action}>{language === 'zh' ? '\u8fdb\u5165' : 'Enter'}</a>}</article>)}</div></div></section>;
}

function FeatureSection({ language, favorites, compare, routeStops, userSession }) {
  const features = language === 'zh' ? [['01', '\u6536\u85cf\u76ee\u7684\u5730', favorites.size + ' \u4e2a\u5df2\u6536\u85cf', '\u4fdd\u7559\u559c\u6b22\u7684\u57ce\u5e02\u4e0e\u5730\u6807'], ['02', '\u666f\u70b9\u5bf9\u6bd4', compare.size + ' \u4e2a\u5bf9\u6bd4\u9879', '\u6bd4\u8f83\u4e0d\u540c\u505c\u9760\u70b9\u7684\u53d6\u820d'], ['03', '\u8def\u7ebf\u81ea\u52a8\u4f18\u5316', '\u6309\u8ddd\u79bb\u8c03\u6574\u672a\u9501\u5b9a\u7ad9\u70b9', '\u8ba9\u884c\u7a0b\u66f4\u987a\u8def'], ['04', '\u6309\u5929\u751f\u6210\u884c\u7a0b', '\u628a\u8def\u7ebf\u62c6\u6210\u6bcf\u5929\u8ba1\u5212', '\u6e05\u695a\u5b89\u6392\u6bcf\u5929\u8282\u594f'], ['05', '\u65c5\u884c\u8d44\u6599\u67e5\u8be2', '\u67e5\u770b\u666f\u70b9\u80cc\u666f\u8d44\u6599', '\u51fa\u53d1\u524d\u4e86\u89e3\u6545\u4e8b'], ['06', '\u672c\u5730\u8d26\u6237\u72b6\u6001', userSession ? userSession.name : '\u6e38\u5ba2\u6a21\u5f0f', '\u4fdd\u5b58\u4f60\u7684\u65c5\u884c\u72b6\u6001']] : [['01', 'Saved destinations', favorites.size + ' saved', 'Keep favorite cities and landmarks'], ['02', 'Compare stops', compare.size + ' compared', 'Compare possible stops'], ['03', 'Route optimization', 'Reorder unlocked stops by distance', 'Keep the route smoother'], ['04', 'Day itinerary', 'Split the route into day plans', 'Plan each day clearly'], ['05', 'Travel notes', 'Read landmark background', 'Know the story before arrival'], ['06', 'Local account', userSession ? userSession.name : 'Guest mode', 'Keep your travel state']];
  return <section id="home-services" className="cinematic-section cinematic-features"><div className="cinematic-section__head"><span>{language === 'zh' ? '\u529f\u80fd\u670d\u52a1' : 'Travel tools'}</span><h2>{language === 'zh' ? '\u89c4\u5212\u65c5\u7a0b\u65f6\u5e38\u7528\u7684\u5165\u53e3' : 'Useful entries while planning'}</h2></div><div className="cinematic-feature-grid">{features.map(([index, title, detail, action]) => <article key={title}><span>{index}</span><strong>{title}</strong><p>{detail}</p><small>{action}</small></article>)}</div></section>;
}

function ReviewSection({ language, stops, visibleCount = 6, onShowMore }) {
  const visibleStops = stops.slice(0, visibleCount);
  return <section id="home-reviews" className="cinematic-section cinematic-reviews"><div className="cinematic-section__head"><span>{language === 'zh' ? '\u65c5\u884c\u8005\u70b9\u8bc4' : 'Traveler reviews'}</span><h2>{language === 'zh' ? '\u65c5\u884c\u8005\u8fd9\u6837\u8bc4\u4ef7' : 'How travelers describe it'}</h2><p>{language === 'zh' ? '\u770b\u770b\u5176\u4ed6\u65c5\u884c\u8005\u5982\u4f55\u89c4\u5212\u4ed6\u4eec\u7684\u610f\u5927\u5229\u8def\u7ebf\u3002' : 'See how other travelers shape their Italy route.'}</p></div><div className="cinematic-review-grid">{visibleStops.map((stop, index) => <article key={stop.id}><p>{summaryFor(stop, language).slice(0, 180)}</p><div>{imageFor(stop, language) && <img src={imageFor(stop, language)} alt="" loading="lazy" />}<span>{language === 'zh' ? '\u65c5\u884c\u8005 ' + (index + 1) : 'Traveler ' + (index + 1)}</span><strong>{nameFor(stop, language)} / 4.{8 + (index % 2)}</strong></div></article>)}</div>{visibleStops.length < stops.length && <button className="home-download-btn cinematic-review-more" type="button" onClick={onShowMore}>{homeText(language, '\u663e\u793a\u66f4\u591a\u8bc4\u4ef7', 'Show more reviews')}</button>}</section>;
}


function TravelNotesSection({ language, stops }) {
  return <section id="home-notes" className="cinematic-section cinematic-notes"><div className="cinematic-section__head"><span>{language === 'zh' ? '\u65c5\u884c\u653b\u7565 / \u80cc\u666f\u8d44\u6599' : 'Travel notes / background'}</span><h2>{language === 'zh' ? '\u51fa\u53d1\u524d\u8bfb\u4e00\u8bfb\u76ee\u7684\u5730\u6545\u4e8b' : 'Read the destination story before you go'}</h2></div><div className="cinematic-notes-grid">{stops.filter((stop) => pageUrlFor(stop, language)).slice(0, 3).map((stop) => <article key={stop.id}>{imageFor(stop, language) && <img src={imageFor(stop, language)} alt="" loading="lazy" />}<span>{regionText(stop, language)}</span><strong>{nameFor(stop, language)}</strong><p>{summaryFor(stop, language).slice(0, 160)}</p><a className="concept-btn" href={pageUrlFor(stop, language)} target="_blank" rel="noreferrer">{homeText(language, '\u67e5\u770b\u8be6\u60c5', 'View details')}</a></article>)}</div></section>;
}

function AccountSummarySection({ language, favorites, routeStops, lockedIds, userSession, onSignIn }) {
  const items = [[language === 'zh' ? '\u5f53\u524d\u6a21\u5f0f' : 'Current mode', userSession ? userSession.name : homeText(language, '\u6e38\u5ba2\u6a21\u5f0f', 'Guest mode')], [language === 'zh' ? '\u5df2\u6536\u85cf\u666f\u70b9' : 'Saved stops', favorites.size], [language === 'zh' ? '\u5f53\u524d\u8def\u7ebf\u666f\u70b9' : 'Route stops', routeStops.length], [language === 'zh' ? '\u5df2\u9501\u5b9a\u666f\u70b9' : 'Locked stops', lockedIds.size]];
  return <section id="home-account" className="cinematic-section cinematic-account-summary"><div className="cinematic-section__head"><span>{homeText(language, '\u8d26\u6237', 'Account')}</span><h2>{language === 'zh' ? '\u8d26\u6237\u4e0e\u6536\u85cf\u72b6\u6001' : 'Account and saved state'}</h2></div><div className="cinematic-account-summary__grid">{items.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}<button type="button" onClick={onSignIn}>{userSession ? (language === 'zh' ? '\u67e5\u770b\u8d26\u6237' : 'View account') : (language === 'zh' ? '\u767b\u5f55' : 'Sign in')}</button></div></section>;
}

function HomeFooter({ language }) {
  const links = [['home-hero', language === 'zh' ? '\u9996\u9875' : 'Home'], ['home-destinations', language === 'zh' ? '\u76ee\u7684\u5730' : 'Destinations'], ['home-planner', language === 'zh' ? '\u8def\u7ebf\u89c4\u5212' : 'Route planner'], ['home-3d', language === 'zh' ? '3D\u5bfc\u89c8' : '3D guide']];
  return <footer className="cinematic-footer"><strong>Trip3D</strong><p>{language === 'zh' ? '\u7528\u624b\u7ed8\u65c5\u884c\u624b\u518c\u7684\u65b9\u5f0f\u89c4\u5212\u610f\u5927\u5229\u8def\u7ebf\u3002' : 'A sketchbook-style planner for Italy routes.'}</p><nav>{links.map(([id, label]) => <button key={id} type="button" onClick={() => scrollToHomeSection(id)}>{label}</button>)}</nav></footer>;
}


function DestinationDetailPage({ language, stop, routeStops, favorites, compare, onFavorite, onCompare, onAddRoute, onClose }) {
  if (!stop) return null;
  const galleryStops = [stop, ...routeStops.filter((item) => item.id !== stop.id), ...landmarks.filter((item) => item.id !== stop.id)].filter((item, index, list) => list.findIndex((match) => match.id === item.id) === index).slice(0, 5);
  const reviews = galleryStops.slice(0, 3);
  const url = pageUrlFor(stop, language);
  return (
    <section className="destination-detail" role="dialog" aria-modal="true" aria-label={homeText(language, '\u76ee\u7684\u5730\u8be6\u60c5', 'Destination details')}>
      <div className="destination-detail__panel">
        <button className="destination-detail__close" type="button" onClick={onClose}>{homeText(language, '\u5173\u95ed', 'Close')}</button>
        <div className="destination-detail__hero">
          <div className="destination-detail__media">{imageFor(stop, language) && <img src={imageFor(stop, language)} alt="" />}</div>
          <div className="destination-detail__copy">
            <span>{regionText(stop, language)} / {kindText(stop, language)} / {seasonText(stop, language)}</span>
            <h2>{nameFor(stop, language)}</h2>
            <p>{summaryFor(stop, language)}</p>
            <div className="destination-detail__actions">
              <button className={favorites.has(stop.id) ? 'is-on' : ''} type="button" onClick={() => onFavorite(stop.id)}>{homeText(language, '\u6536\u85cf', 'Favorite')}</button>
              <button className={compare.has(stop.id) ? 'is-on' : ''} type="button" onClick={() => onCompare(stop.id)}>{homeText(language, '\u5bf9\u6bd4', 'Compare')}</button>
              <button type="button" onClick={() => onAddRoute(stop.id)}>{homeText(language, '\u52a0\u5165\u8def\u7ebf', 'Add route')}</button>
              {url && <a className="concept-btn" href={url} target="_blank" rel="noreferrer">{homeText(language, '\u80cc\u666f\u8d44\u6599', 'Background')}</a>}
            </div>
          </div>
        </div>
        <div className="destination-detail__gallery">{galleryStops.map((item) => <figure key={item.id}>{imageFor(item, language) && <img src={imageFor(item, language)} alt="" loading="lazy" />}<figcaption>{nameFor(item, language)}</figcaption></figure>)}</div>
        <div className="destination-detail__facts">
          <article><span>{homeText(language, '\u6240\u5728\u533a\u57df', 'Region')}</span><strong>{regionText(stop, language)}</strong></article>
          <article><span>{homeText(language, '\u9002\u5408\u65f6\u95f4', 'Best time')}</span><strong>{seasonText(stop, language)}</strong></article>
          <article><span>{homeText(language, '\u5750\u6807', 'Coordinates')}</span><strong>{stop.lat.toFixed(2)}, {stop.lon.toFixed(2)}</strong></article>
          <article><span>{homeText(language, '3D\u5bfc\u89c8', '3D guide')}</span><strong>{stop.modelPath ? homeText(language, '\u53ef\u8fdb\u5165', 'Ready') : homeText(language, '\u8def\u7ebf\u4e2d\u53ef\u89c1', 'Route view')}</strong></article>
        </div>
        <div className="destination-detail__reviews">
          <div className="cinematic-section__head"><span>{homeText(language, '\u7528\u6237\u8bc4\u4ef7', 'Traveler notes')}</span><h2>{homeText(language, '\u5230\u8fc7\u8fd9\u91cc\u7684\u4eba\u600e\u4e48\u8bf4', 'What travelers say')}</h2></div>
          <div className="cinematic-review-grid">{reviews.map((item, index) => <article key={item.id}><p>{summaryFor(item, language).slice(0, 170)}</p><div>{imageFor(item, language) && <img src={imageFor(item, language)} alt="" loading="lazy" />}<span>{language === 'zh' ? '\u7528\u6237 ' + (index + 1) : 'Traveler ' + (index + 1)}</span><strong>{nameFor(item, language)} / 4.{8 + (index % 2)}</strong></div></article>)}</div>
        </div>
      </div>
    </section>
  );
}

function CinematicHomePage(props) {
  const { language, setLanguage, userSession, selectedStop, routeStops, filteredStops, onOpenDrive, onSignIn } = props;
  return (
    <>
      <HomeHeader language={language} setLanguage={setLanguage} userSession={userSession} onAccount={onSignIn} />
      <div className="cinematic-home-page">
        <HomeHero language={language} routeStops={routeStops} selectedStop={selectedStop} onOpenDrive={onOpenDrive} />
        <HomeStats language={language} />
        <DestinationSection {...props} />
        <RoutePlannerSection {...props} />
        <ThreeDGuideSection language={language} selectedStop={selectedStop} routeStops={routeStops} onOpenDrive={onOpenDrive} />
        <FeatureSection language={language} favorites={props.favorites} compare={props.compare} routeStops={routeStops} userSession={userSession} />
        <ReviewSection language={language} stops={filteredStops} visibleCount={props.reviewVisibleCount} onShowMore={props.onShowMoreReviews} />
        <TravelNotesSection language={language} stops={filteredStops} />
        <AccountSummarySection language={language} favorites={props.favorites} routeStops={routeStops} lockedIds={props.lockedIds} userSession={userSession} onSignIn={onSignIn} />
        <HomeFooter language={language} />
      </div>
    </>
  );
}

export function HomeShowcase({ onOpenDrive }) {
  const activeVersion = versions[0];
  const [hasEnteredHome, setHasEnteredHome] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [language, setLanguage] = useState('zh');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('any');
  const [kind, setKind] = useState('any');
  const [season, setSeason] = useState('any');
  const [sort, setSort] = useState('featured');
  const [routeQuery, setRouteQuery] = useState('');
  const [routeIds, setRouteIds] = useState(initialRouteIds);
  const [lockedIds, setLockedIds] = useState(() => new Set());
  const [favorites, setFavorites] = useState(() => new Set());
  const [compare, setCompare] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(initialRouteIds[0]);
  const [days, setDays] = useState(3);
  const [pace, setPace] = useState('Standard');
  const [userSession, setUserSession] = useState(null);
  const [authToken, setAuthToken] = useState(() => window.localStorage.getItem(AUTH_TOKEN_KEY) ?? '');
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [accountHistory, setAccountHistory] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [reviewVisibleCount, setReviewVisibleCount] = useState(6);
  const [detailStopId, setDetailStopId] = useState(null);

  const options = useMemo(() => ({
    regions: [...new Set(landmarks.map(regionFor))].sort(),
    kinds: [...new Set(landmarks.map((stop) => stop.modelKind))].sort(),
    seasons: [...new Set(landmarks.map(seasonFor))].sort(),
  }), []);

  const filteredStops = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = landmarks.filter((stop) => {
      const text = `${stop.name} ${nameFor(stop, language)} ${summaryFor(stop, language)} ${regionFor(stop)} ${stop.modelKind} ${seasonFor(stop)}`.toLowerCase();
      return (!q || text.includes(q))
        && (region === 'any' || regionFor(stop) === region)
        && (kind === 'any' || stop.modelKind === kind)
        && (season === 'any' || seasonFor(stop) === season);
    });
    return [...base].sort((a, b) => {
      if (sort === 'name') return nameFor(a, language).localeCompare(nameFor(b, language));
      if (sort === 'north') return b.lat - a.lat;
      if (sort === 'model') return Number(Boolean(b.modelPath)) - Number(Boolean(a.modelPath));
      return landmarks.findIndex((stop) => stop.id === a.id) - landmarks.findIndex((stop) => stop.id === b.id);
    });
  }, [kind, language, query, region, season, sort]);

  useEffect(() => {
    setVisibleCount(12);
    setReviewVisibleCount(6);
  }, [kind, query, region, season, sort]);

  useEffect(() => {
    if (!authToken) return undefined;
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
      })
      .catch(() => {
        if (cancelled) return;
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        setAuthToken('');
        setUserSession(null);
        setAccountHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const routeStops = useMemo(() => routeIds.map((id) => landmarks.find((stop) => stop.id === id)).filter(Boolean), [routeIds]);
  const routeSegments = useMemo(() => routeSegmentsFor(routeStops), [routeStops]);
  const selectedStop = landmarks.find((stop) => stop.id === selectedId) ?? routeStops[0] ?? landmarks[0];
  const detailStop = landmarks.find((stop) => stop.id === detailStopId);
  const routeMatches = useMemo(() => {
    const q = routeQuery.trim().toLowerCase();
    if (!q) return [];
    return landmarks.filter((stop) => `${stop.name} ${nameFor(stop, language)} ${regionFor(stop)} ${stop.modelKind}`.toLowerCase().includes(q));
  }, [language, routeQuery]);

  const toggleSet = (setter, id) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addRoute = (id) => setRouteIds((current) => current.includes(id) ? current : [...current, id]);
  const removeRoute = (id) => {
    setRouteIds((current) => current.length <= 1 ? current : current.filter((item) => item !== id));
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
    setRouteIds((current) => optimizeRouteIds(current, lockedIds));
  };
  const resetRoute = () => {
    setRouteIds(initialRouteIds);
    setLockedIds(new Set());
  };
  const saveAuthPayload = (payload) => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
    setAuthToken(payload.token);
    setUserSession(payload.user);
    setAccountHistory(payload.history ?? []);
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
      setAuthError(error.message);
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
    options,
    filteredStops,
    visibleCount,
    routeStops,
    routeSegments,
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
    days,
    setDays,
    pace,
    setPace,
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
    onResetRoute: resetRoute,
    onShowMore: () => setVisibleCount((count) => Math.min(count + 8, filteredStops.length)),
    reviewVisibleCount,
    onShowMoreReviews: () => setReviewVisibleCount((count) => Math.min(count + 6, filteredStops.length)),
    onOpenDetail: (id) => setDetailStopId(id),
    onSignIn: () => setAuthDialogOpen(true),
    onSignOut: handleSignOut,
    onOpenDrive,
  };

  if (!hasEnteredHome) {
    return (
      <main className={`showcase-home showcase-home--story is-${language}`} style={{ '--concept-accent': activeVersion.accent }}>
        <SemanticParticleStory language={language} onEnterHome={() => setHasEnteredHome(true)} />
      </main>
    );
  }

  return (
    <main className={`showcase-home showcase-home--${activeVersion.id} is-${language}`} style={{ '--concept-accent': activeVersion.accent }}>
      <CinematicHomePage {...commonPageProps} setLanguage={setLanguage} onSignIn={() => setAuthDialogOpen(true)} />
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
          onClose={() => setDetailStopId(null)}
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
          onSubmit={handleAuthSubmit}
          onClose={() => setAuthDialogOpen(false)}
          onSignOut={handleSignOut}
        />
      )}
    </main>
  );
}
