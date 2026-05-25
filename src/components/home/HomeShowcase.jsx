import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { landmarks } from '../../data/landmarks.js';
import liveLandmarksData from '../../../public/data/live-landmarks.json';

const versions = [
  {
    id: 'cinema',
    name: '04 Cinematic Portal',
    accent: '#80d7ff',
    label: { en: 'Cinematic', zh: '电影入口' },
    detail: { en: 'Immersive portal', zh: '沉浸式入口' },
    title: { en: 'Enter the Drive', zh: '进入意大利 3D 自驾旅程' },
    summary: {
      en: 'A cinematic shell for the full travel planner: destinations, route editing, reviews, itinerary generation, live context, and 3D entry.',
      zh: '电影感视觉壳，内部保留完整旅游规划功能：目的地、路线编辑、点评、行程生成、实时信息和 3D 入口。',
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
      zh: '环形导航视觉壳，承载同样的目的地、行程、点评、账户、路线和 3D 导览流程。',
    },
  },
*/];

const storyModelPaths = {
  colosseum: '/models/romes_colosseum.glb',
  pisa: '/models/pisas_tower.glb',
  duomo: '/models/milan_cathedral.glb',
  pantheon: '/models/pantheon.glb',
  trevi: '/models/fontana_di_trevi_-_rome_italy_-_1732.glb',
  florence: '/models/santa-maria-del-fiore/source/Santa%20Maria.glb',
};

const liveIndex = new Map((liveLandmarksData.items ?? []).map((item) => [item.id, item]));
const initialRouteIds = ['milan_duomo', 'venice_rialto', 'florence_duomo', 'pisa', 'colosseum', 'pompeii'];

const storyScenes = [
  {
    id: 'intro',
    kind: 'chaos',
    side: 'center',
    title: { en: 'Particle Landmark Lab', zh: '粒子景点实验室' },
    kicker: { en: 'Scroll to assemble', zh: '向下滚动，粒子开始成像' },
    body: {
      en: 'The first field is deliberately unordered. Every following scene gives the same particles a semantic target so the cloud assembles into a recognizable landmark.',
      zh: '第一屏保持杂乱无章。继续滚动后，同一组粒子会获得明确的三维目标坐标，聚合成可辨认的景点轮廓。',
    },
  },
  {
    id: 'colosseum',
    kind: 'colosseum',
    side: 'right',
    title: { en: 'Colosseum', zh: '罗马斗兽场' },
    kicker: { en: 'Oval amphitheatre point cloud', zh: '椭圆竞技场点云' },
    body: {
      en: 'Particles form stacked oval rings, tier lines, and repeated arch voids so the amphitheatre reads as architecture instead of decoration.',
      zh: '粒子会组成多层椭圆看台、横向层线和连续拱洞，让它看起来像真实斗兽场结构，而不是随机装饰。',
    },
  },
  {
    id: 'pisa',
    kind: 'pisa',
    side: 'left',
    title: { en: 'Leaning Tower of Pisa', zh: '比萨斜塔' },
    kicker: { en: 'Tilted cylinder with stacked arcades', zh: '倾斜圆塔与层叠拱廊' },
    body: {
      en: 'The tower is generated as a tilted cylinder with floor bands, small columns, and a wider base so the lean is visible immediately.',
      zh: '斜塔由倾斜圆柱、楼层环带、细柱和底座组成，第一眼就能看出它的倾斜姿态。',
    },
  },
  {
    id: 'duomo',
    kind: 'duomo',
    side: 'right',
    title: { en: 'Milan Duomo', zh: '米兰主教座堂' },
    kicker: { en: 'Facade, rose window, and spires', zh: '立面、玫瑰窗与尖塔' },
    body: {
      en: 'The target cloud combines a broad cathedral facade, central rose window, roofline, and many spires to give the model a clear gothic silhouette.',
      zh: '目标点云包含宽阔教堂立面、中央玫瑰窗、屋顶轮廓和多根尖塔，用清晰的哥特式剪影提升识别度。',
    },
  },
  {
    id: 'pantheon',
    kind: 'pantheon',
    side: 'left',
    title: { en: 'Pantheon', zh: 'Pantheon' },
    kicker: { en: 'Dome and portico model', zh: 'Dome and portico model' },
    body: {
      en: 'The preview uses the new Pantheon GLB as a real model reference while the particles keep the opening page light and fluid.',
      zh: 'The preview uses the new Pantheon GLB as a real model reference while the particles keep the opening page light and fluid.',
    },
  },
  {
    id: 'trevi',
    kind: 'trevi',
    side: 'right',
    title: { en: 'Trevi Fountain', zh: 'Trevi Fountain' },
    kicker: { en: 'Baroque fountain scan', zh: 'Baroque fountain scan' },
    body: {
      en: 'Trevi is kept as a real model preview rather than a heavy full-page mesh, so the opening still scrolls smoothly.',
      zh: 'Trevi is kept as a real model preview rather than a heavy full-page mesh, so the opening still scrolls smoothly.',
    },
  },
  {
    id: 'florence',
    kind: 'florence',
    side: 'left',
    title: { en: 'Santa Maria del Fiore', zh: 'Santa Maria del Fiore' },
    kicker: { en: 'Florence cathedral asset', zh: 'Florence cathedral asset' },
    body: {
      en: 'The Florence cathedral model is included as an alternate cathedral reference beside the Milan Duomo particle silhouette.',
      zh: 'The Florence cathedral model is included as an alternate cathedral reference beside the Milan Duomo particle silhouette.',
    },
  },
];

const copy = {
  en: {
    switcher: 'Concept styles',
    switcherSub: '04 with full original page workflow',
    language: 'Language',
    nav: [
      ['destinations', 'Destinations'],
      ['planner', 'Route Planner'],
      ['reviews', 'Reviews'],
      ['drive', '3D Drive'],
    ],
    cta3d: 'Open 3D Drive',
    routeMap: 'Route map',
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
    driveReady: '3D drive gateway',
    driveBody: 'Enter the 3D scene with the current route order and focused landmark.',
    nextStop: 'Next stop',
    weather: 'Live weather',
    kicker: 'Web3D / Particles / Route Planner',
    temperature: 'Temperature',
    wind: 'Wind',
    modelPreview: 'Model previews',
    keyPoints: 'Key points',
  },
  zh: {
    switcher: '首页风格',
    switcherSub: '04，保留原主页完整分页流程',
    language: '语言',
    nav: [
      ['destinations', '目的地'],
      ['planner', '行程'],
      ['reviews', '点评'],
      ['drive', '3D 导览'],
    ],
    cta3d: '打开 3D 路线',
    routeMap: '路线地图',
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
    driveReady: '3D 导览入口',
    driveBody: '使用当前路线顺序和聚焦地标进入 3D 场景。',
    nextStop: '下一站',
    weather: '实时天气',
    kicker: 'Web3D / 粒子效果 / 路线规划',
    temperature: '温度',
    wind: '风速',
    modelPreview: '模型预览',
    keyPoints: '关键点',
  },
};

const regionLabels = {
  en: { North: 'North', Central: 'Central', South: 'South', Islands: 'Islands' },
  zh: { North: '北部', Central: '中部', South: '南部', Islands: '岛屿' },
};

const kindLabels = {
  en: {},
  zh: {
    arena: '竞技场',
    bridge: '桥梁',
    castle: '城堡',
    cathedral: '教堂',
    coast: '海岸',
    dome: '穹顶',
    fountain: '喷泉',
    lake: '湖泊',
    monument: '纪念地标',
    mountain: '山地',
    palace: '宫殿',
    ruins: '遗址',
    temple: '神庙',
    tower: '塔楼',
    village: '村镇',
  },
};

const seasonLabels = {
  en: {},
  zh: {
    Spring: '春季',
    Summer: '夏季',
    Autumn: '秋季',
    Morning: '清晨',
    Afternoon: '下午',
    Evening: '夜晚',
    Flexible: '灵活',
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
    ['酒店', '住宿推荐'],
    ['门票', '景点预约'],
    ['美食', '餐厅灵感'],
    ['交通', '路线接驳'],
    ['天气', '出发参考'],
    ['预算', '花费估算'],
    ['攻略', '城市贴士'],
    ['AI', '智能行程'],
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
  if (Math.random() < 0.1) return sampleBox(-0.32, -1.96, 0, 2.15, 0.2, 1.75);
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
  return sampleBox(0, 0, 0, 7, 4, 3);
}

function createStoryMorphData(count = 7600) {
  const random = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const proceduralTargets = {};

  for (let i = 0; i < count; i += 1) {
    const radius = 2.4 + Math.random() * 4.2;
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
  const scale = options.scale ?? 4.6;
  const rotateY = options.rotateY ?? 0;
  const tiltZ = options.tiltZ ?? 0;
  const matrix = new THREE.Matrix4()
    .makeRotationY(rotateY)
    .multiply(new THREE.Matrix4().makeRotationZ(tiltZ));

  const target = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const point = sourcePoints[Math.floor(Math.random() * sourcePoints.length)].clone();
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
  const duomo = useGLTF(storyModelPaths.duomo);
  const pantheon = useGLTF(storyModelPaths.pantheon);
  const trevi = useGLTF(storyModelPaths.trevi);
  const florence = useGLTF(storyModelPaths.florence);

  const targets = useMemo(() => {
    const count = 12000;
    return {
      colosseum: sampleModelPointCloud(colosseum.scene, count, { scale: 6.2, rotateY: -0.32, offsetY: 0.08 }),
      pisa: sampleModelPointCloud(pisa.scene, count, { scale: 5.8, rotateY: 0.18, tiltZ: 0, offsetY: 0.08 }),
      duomo: sampleModelPointCloud(duomo.scene, count, { scale: 6.15, rotateY: -0.08, offsetY: 0.02 }),
      pantheon: sampleModelPointCloud(pantheon.scene, count, { scale: 6.05, rotateY: 0.22, offsetY: -0.02 }),
      trevi: sampleModelPointCloud(trevi.scene, count, { scale: 6.35, rotateY: -0.18, offsetY: -0.04 }),
      florence: sampleModelPointCloud(florence.scene, count, { scale: 6.2, rotateY: 0.22, offsetY: 0.04 }),
    };
  }, [colosseum.scene, pisa.scene, duomo.scene, pantheon.scene, trevi.scene, florence.scene]);

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
  const data = useMemo(() => createStoryMorphData(4200), []);
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
  const data = useMemo(() => createStoryMorphData(12000), []);
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
      dpr = Math.min(window.devicePixelRatio || 1, 2);
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
      morphRef.current = THREE.MathUtils.lerp(morphRef.current, shouldAssemble ? 1 : 0, 0.105);
      const morph = morphRef.current;
      const target = activeTargetRef.current;
      const side = activeScene.side ?? 'center';
      const centerX = width * (side === 'left' ? 0.34 : side === 'right' ? 0.66 : 0.52);
      const centerY = height * 0.5;
      const scale = Math.min(width, height) * (shouldAssemble ? 0.36 : 0.24);
      const rotateY = t * 0.18 + mouseRef.current.x * 0.22;
      const rotateX = -0.08 + mouseRef.current.y * 0.1;
      const cy = Math.cos(rotateY);
      const sy = Math.sin(rotateY);
      const cx = Math.cos(rotateX);
      const sx = Math.sin(rotateX);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(5, 78, 126, 0.76)';

      for (let i = 0; i < data.random.length; i += 3) {
        const seed = data.seeds[i / 3];
        const localMorph = THREE.MathUtils.clamp(morph + (seed - 0.5) * 0.16, 0, 1);
        const loose = 1 - localMorph;
        let x = THREE.MathUtils.lerp(data.random[i], target[i], localMorph) + Math.sin(t * 0.65 + seed * 22) * loose * 0.22;
        let y = THREE.MathUtils.lerp(data.random[i + 1], target[i + 1], localMorph) + Math.cos(t * 0.52 + seed * 30) * loose * 0.18;
        let z = THREE.MathUtils.lerp(data.random[i + 2], target[i + 2], localMorph) + Math.sin(t * 0.4 + seed * 18) * loose * 0.2;

        const rx = x * cy - z * sy;
        const rz = x * sy + z * cy;
        const ry = y * cx - rz * sx;
        const rz2 = y * sx + rz * cx;
        const perspective = 1 / (1 + (rz2 + 3.8) * 0.09);
        const px = centerX + rx * scale * perspective;
        const py = centerY - ry * scale * perspective;
        const radius = (shouldAssemble ? 0.92 : 0.72) * perspective * (0.85 + localMorph * 0.36);

        ctx.globalAlpha = 0.28 + localMorph * 0.58;
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
            <span>{t(scene.kicker, language)}</span>
            <h2>{t(scene.title, language)}</h2>
            <p>{t(scene.body, language)}</p>
            {index === storyScenes.length - 1 && (
              <button className="semantic-story__enter" type="button" onClick={onEnterHome}>
                {language === 'zh' ? '进入 04 主页' : 'Enter 04 Home'}
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
        <strong>04 Cinematic Portal</strong>
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

function Hero({ version, language, routeStops, favorites, onOpenDrive }) {
  const c = copy[language];
  return (
    <section className={`concept-hero concept-hero--${version.id}`}>
      <div className="concept-hero__copy">
        <p className="concept-kicker">Web3D / Particles / Route Planner</p>
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

function AccountPanel({ language, favorites, compare, routeStops, userSession, onSignIn, onSignOut, onReset }) {
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
    </section>
  );
}

function DestinationCards({ language, stops, favorites, compare, selectedId, visibleCount, onShowMore, onFavorite, onCompare, onAdd, onFocus, onOpenDrive }) {
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
              <button type="button" onClick={() => onOpenDrive(stop.id)}>3D</button>
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
        <button className="concept-btn concept-btn--primary" type="button" onClick={onOpenDrive}>{c.cta3d}</button>
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
      <div className="concept-map concept-map--dense">
        <div className="concept-map__route" />
        {routeStops.slice(0, 8).map((stop, index) => (
          <button
            key={stop.id}
            className="concept-pin"
            type="button"
            style={{ '--x': `${16 + index * 10 + (index % 2) * 7}%`, '--y': `${22 + index * 8 + (index % 3) * 5}%`, '--delay': `${index * 0.14}s` }}
            onClick={() => onOpenDrive(stop.id)}
          >
            <span />
            <strong>{nameFor(stop, language)}</strong>
          </button>
        ))}
      </div>
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
          <div><dt>MODEL</dt><dd>{stop.modelPath ? 'GLB' : 'Procedural'}</dd></div>
        </dl>
        <button type="button" onClick={() => onOpenDrive(stop.id)}>{c.cta3d}</button>
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
                  <button type="button" onClick={() => onOpenDrive(stop.id)}>3D</button>
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
          {(compared.length ? compared : landmarks.slice(0, 2)).map((stop) => <button key={stop.id} type="button" onClick={() => onOpenDrive(stop.id)}>{nameFor(stop, language)}</button>)}
        </section>
        <section>
          <span>{c.favorites}</span>
          {(favorites.length ? favorites : landmarks.slice(2, 4)).map((stop) => <button key={stop.id} type="button" onClick={() => onOpenDrive(stop.id)}>{nameFor(stop, language)}</button>)}
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
        <AccountPanel language={language} favorites={favorites} compare={compare} routeStops={routeStops} userSession={userSession} onSignIn={props.onSignIn} onSignOut={props.onSignOut} onReset={props.onResetRoute} />
        <ServicesPanel language={language} />
      </div>
      <div className="concept-page__stack concept-page__stack--wide">
        <HighlightsPanel language={language} routeStops={routeStops} favorites={favorites} compare={compare} routeSegments={routeSegments} />
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
        <AccountPanel language={language} favorites={favorites} compare={compare} routeStops={routeStops} userSession={userSession} onSignIn={props.onSignIn} onSignOut={props.onSignOut} onReset={props.onResetRoute} />
        <RouteSchemaPanel language={language} routeStops={routeStops} routeSegments={routeSegments} />
      </div>
    </section>
  );
}

export function HomeShowcase({ onOpenDrive }) {
  const activeVersion = versions[0];
  const [hasEnteredHome, setHasEnteredHome] = useState(false);
  const [activePage, setActivePage] = useState('destinations');
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
  const [visibleCount, setVisibleCount] = useState(12);

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
  }, [kind, query, region, season, sort]);

  const routeStops = useMemo(() => routeIds.map((id) => landmarks.find((stop) => stop.id === id)).filter(Boolean), [routeIds]);
  const routeSegments = useMemo(() => routeSegmentsFor(routeStops), [routeStops]);
  const selectedStop = landmarks.find((stop) => stop.id === selectedId) ?? routeStops[0] ?? landmarks[0];
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
    days,
    setDays,
    pace,
    setPace,
    setSelectedId,
    onFavorite: (id) => toggleSet(setFavorites, id),
    onCompare: (id) => toggleSet(setCompare, id),
    onAddRoute: addRoute,
    onRemove: removeRoute,
    onMove: moveRoute,
    onToggleLock: (id) => toggleSet(setLockedIds, id),
    onOptimize: optimizeRoute,
    onResetRoute: resetRoute,
    onShowMore: () => setVisibleCount((count) => Math.min(count + 8, filteredStops.length)),
    onSignIn: () => setUserSession({ name: language === 'zh' ? '旅行者' : 'Traveler' }),
    onSignOut: () => setUserSession(null),
    onOpenDrive,
  };

  if (!hasEnteredHome) {
    return (
      <main className="showcase-home showcase-home--story" style={{ '--concept-accent': activeVersion.accent }}>
        <SemanticParticleStory language={language} onEnterHome={() => setHasEnteredHome(true)} />
      </main>
    );
  }

  return (
    <main className={`showcase-home showcase-home--${activeVersion.id}`} style={{ '--concept-accent': activeVersion.accent }}>
      <ConceptHeader
        language={language}
        setLanguage={setLanguage}
        activePage={activePage}
        setActivePage={setActivePage}
      />
      <Hero version={activeVersion} language={language} routeStops={routeStops} favorites={favorites} onOpenDrive={onOpenDrive} />
      {activePage === 'destinations' && <DestinationsPage {...commonPageProps} />}
      {activePage === 'planner' && <PlannerPage {...commonPageProps} />}
      {activePage === 'reviews' && <ReviewsPage {...commonPageProps} />}
      {activePage === 'drive' && <DrivePage {...commonPageProps} />}
    </main>
  );
}
