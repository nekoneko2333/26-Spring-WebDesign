import * as THREE from 'three';
import { MAP_BOUNDS, worldToLngLat } from './landmarks.js';
import { getRouteSegmentAtProgress, roadCurve } from './routes.js';

const HEIGHT_SCALE = 0.0011;
const DEM_SIZE = 640;
const listeners = new Set();
let terrainState = {
  status: 'idle',
  geometry: null,
  texture: null,
  version: 0,
};
let heightMap = null;
let hmWidth = 0;
let hmHeight = 0;
let loadPromise = null;

function emit() {
  for (const listener of listeners) listener(terrainState);
}

function lonLatToTile(lon, lat, zoom) {
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lon + 180) / 360) * n),
    y: Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n),
  };
}

function lonLatToTileFloat(lon, lat, zoom) {
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  };
}

function demTileUrl(z, x, y) {
  return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
}

function sampleHeight(u, v) {
  if (!heightMap) return 0;
  const x = u * (hmWidth - 1);
  const y = v * (hmHeight - 1);
  const x0 = Math.floor(x);
  const x1 = Math.min(x0 + 1, hmWidth - 1);
  const y0 = Math.floor(y);
  const y1 = Math.min(y0 + 1, hmHeight - 1);
  const fx = x - x0;
  const fy = y - y0;
  const h00 = heightMap[y0 * hmWidth + x0];
  const h10 = heightMap[y0 * hmWidth + x1];
  const h01 = heightMap[y1 * hmWidth + x0];
  const h11 = heightMap[y1 * hmWidth + x1];
  return h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;
}

function sampleRawHeight(raw, width, height, x, y) {
  const sx = THREE.MathUtils.clamp(x, 0, width - 1);
  const sy = THREE.MathUtils.clamp(y, 0, height - 1);
  const x0 = Math.floor(sx);
  const x1 = Math.min(x0 + 1, width - 1);
  const y0 = Math.floor(sy);
  const y1 = Math.min(y0 + 1, height - 1);
  const fx = sx - x0;
  const fy = sy - y0;
  const h00 = raw[y0 * width + x0];
  const h10 = raw[y0 * width + x1];
  const h01 = raw[y1 * width + x0];
  const h11 = raw[y1 * width + x1];
  return h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;
}

function latAtV(v) {
  const mercMin = Math.log(Math.tan(Math.PI / 4 + (MAP_BOUNDS.latMin * Math.PI) / 360));
  const mercMax = Math.log(Math.tan(Math.PI / 4 + (MAP_BOUNDS.latMax * Math.PI) / 360));
  const merc = mercMin + (1 - v) * (mercMax - mercMin);
  return (Math.atan(Math.sinh(merc)) * 180) / Math.PI;
}

function lonAtU(u) {
  return MAP_BOUNDS.lonMin + u * (MAP_BOUNDS.lonMax - MAP_BOUNDS.lonMin);
}

function pointInPolygon(lon, lat, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = ((yi > lat) !== (yj > lat)) && (lon < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

const italyMainlandMask = [
  [6.6, 47.1], [13.2, 47.1], [13.55, 46.3], [12.7, 45.55], [13.25, 44.4],
  [13.05, 43.4], [12.6, 42.4], [13.35, 41.35], [14.75, 40.7], [15.75, 39.45],
  [16.35, 38.35], [15.72, 37.85], [14.78, 38.9], [14.25, 40.58], [12.85, 41.28],
  [11.1, 42.25], [10.4, 43.35], [9.72, 43.72], [8.95, 44.08], [7.55, 44.18],
  [6.78, 45.05],
];

function isLikelyLand(lon, lat) {
  if (pointInPolygon(lon, lat, italyMainlandMask)) return true;
  if (lon >= 12.12 && lon <= 12.34 && lat >= 45.41 && lat <= 45.55) return true;
  if (lon >= 14.12 && lon <= 14.56 && lat >= 40.68 && lat <= 41.12) return true;
  return false;
}

function resampleRawToBounds(raw, rawWidth, rawHeight, tileMin, zoom) {
  const cropped = new Float32Array(DEM_SIZE * DEM_SIZE);
  const globalTileOriginX = tileMin.x * 256;
  const globalTileOriginY = tileMin.y * 256;

  for (let y = 0; y < DEM_SIZE; y += 1) {
    const v = y / (DEM_SIZE - 1);
    const lat = latAtV(v);
    for (let x = 0; x < DEM_SIZE; x += 1) {
      const u = x / (DEM_SIZE - 1);
      const lon = lonAtU(u);
      const tile = lonLatToTileFloat(lon, lat, zoom);
      const px = tile.x * 256 - globalTileOriginX;
      const py = tile.y * 256 - globalTileOriginY;
      cropped[y * DEM_SIZE + x] = sampleRawHeight(raw, rawWidth, rawHeight, px, py);
    }
  }

  return cropped;
}

function smoothHeightMap(source, width, height, passes = 2) {
  let input = source;
  for (let pass = 0; pass < passes; pass += 1) {
    const output = new Float32Array(input.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let total = 0;
        let weightTotal = 0;
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            const sx = THREE.MathUtils.clamp(x + ox, 0, width - 1);
            const sy = THREE.MathUtils.clamp(y + oy, 0, height - 1);
            const weight = ox === 0 && oy === 0 ? 4 : (ox === 0 || oy === 0 ? 2 : 1);
            total += input[sy * width + sx] * weight;
            weightTotal += weight;
          }
        }
        output[y * width + x] = total / weightTotal;
      }
    }
    input = output;
  }
  return input;
}

function loadDemTile(z, tx, ty) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      const out = new Float32Array(img.width * img.height);
      for (let i = 0; i < out.length; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        out[i] = (r * 256 + g + b / 256) - 32768;
      }
      resolve({ data: out, width: img.width, height: img.height, tx, ty });
    };
    img.onerror = () => resolve(null);
    img.src = demTileUrl(z, tx, ty);
  });
}

function paperNoise(x, y) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function inkContour(heightValue, x, y) {
  const wobble = Math.sin(x * 0.033) * 0.012 + Math.cos(y * 0.041) * 0.009;
  const contour = Math.abs((((heightValue + wobble) * 18) % 1) - 0.5);
  return contour < 0.025 ? 1 : 0;
}

function buildStylizedTexture(heightData, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const paper = ctx.createLinearGradient(0, 0, width, height);
  paper.addColorStop(0, '#ead6ad');
  paper.addColorStop(0.48, '#d7bd8c');
  paper.addColorStop(1, '#b99661');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);

  let maxH = 1;
  for (let i = 0; i < heightData.length; i += 1) maxH = Math.max(maxH, heightData[i]);

  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const h = heightData[i] / maxH;
      const p = i * 4;

      const u = x / Math.max(width - 1, 1);
      const v = y / Math.max(height - 1, 1);
      const land = isLikelyLand(lonAtU(u), latAtV(v));

      const grain = (paperNoise(x, y) - 0.5) * 22;
      const fiber = Math.sin(x * 0.16 + y * 0.018) * 4 + Math.cos(y * 0.13) * 3;
      const contourBand = land ? inkContour(h, x, y) : 0;

      if (!land) {
        data[p] = 190 + grain * 0.45;
        data[p + 1] = 174 + grain * 0.42;
        data[p + 2] = 137 + grain * 0.35;
        data[p + 3] = 255;
        continue;
      }

      const shade = h * 42;
      const ink = contourBand * 58;
      data[p] = Math.min(255, 214 - shade - ink + grain + fiber);
      data[p + 1] = Math.min(255, 186 - shade * 0.78 - ink * 0.82 + grain * 0.8 + fiber);
      data[p + 2] = Math.min(255, 132 - shade * 0.5 - ink * 0.65 + grain * 0.55);
      data[p + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#5b3f28';
  ctx.lineWidth = 0.9;
  for (let y = 28; y < height; y += 44) {
    ctx.beginPath();
    for (let x = 0; x <= width; x += 12) {
      const offset = Math.sin(x * 0.028 + y * 0.021) * 3;
      if (x === 0) ctx.moveTo(x, y + offset);
      else ctx.lineTo(x, y + offset);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildGeometry() {
  const segments = 120;
  const geometry = new THREE.PlaneGeometry(MAP_BOUNDS.worldSize, MAP_BOUNDS.worldSize, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const width = segments + 1;
  const routeCorridor = buildRouteCorridorProfile();
  for (let i = 0; i < positions.count; i += 1) {
    const col = i % width;
    const row = Math.floor(i / width);
    const u = col / segments;
    const v = row / segments;
    const x = (u - 0.5) * MAP_BOUNDS.worldSize;
    const z = (v - 0.5) * MAP_BOUNDS.worldSize;
    positions.setY(i, applyRouteCorridorCut(x, z, sampleHeight(u, v), routeCorridor));
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function buildRouteCorridorProfile() {
  const samples = roadCurve.getPoints(220);
  const heights = buildSemanticRouteHeightProfile(samples, getRouteSegmentAtProgress, { clearance: 0.12 });
  return samples.map((point, index) => ({
    x: point.x,
    z: point.z,
    height: heights[index],
    segment: getRouteSegmentAtProgress(index / Math.max(samples.length - 1, 1)),
  }));
}

function applyRouteCorridorCut(worldX, worldZ, terrainHeight, corridor) {
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const sample of corridor) {
    const distance = Math.hypot(worldX - sample.x, worldZ - sample.z);
    if (distance < nearestDistance) {
      nearest = sample;
      nearestDistance = distance;
    }
  }

  if (!nearest) return terrainHeight;

  const isTunnel = nearest.segment?.type === 'tunnel';
  const innerWidth = isTunnel ? 1.45 : 2.25;
  const outerWidth = isTunnel ? 3.2 : 5.2;
  if (nearestDistance >= outerWidth) return terrainHeight;

  const cutTarget = nearest.height - (isTunnel ? 0.2 : 0.16);
  if (terrainHeight <= cutTarget) return terrainHeight;

  const edgeBlend = 1 - THREE.MathUtils.smoothstep(nearestDistance, innerWidth, outerWidth);
  return THREE.MathUtils.lerp(terrainHeight, cutTarget, edgeBlend);
}

export function loadTerrainData() {
  if (terrainState.status === 'ready') return Promise.resolve(terrainState);
  if (loadPromise) return loadPromise;

  terrainState = { ...terrainState, status: 'loading' };
  emit();

  loadPromise = (async () => {
    const zoom = 6;
    const tileMin = lonLatToTile(MAP_BOUNDS.lonMin, MAP_BOUNDS.latMax, zoom);
    const tileMax = lonLatToTile(MAP_BOUNDS.lonMax, MAP_BOUNDS.latMin, zoom);
    const tcX = tileMax.x - tileMin.x + 1;
    const tcY = tileMax.y - tileMin.y + 1;
    const tilePx = 256;

    const results = await Promise.all(
      Array.from({ length: tcX * tcY }, (_, index) => {
        const tx = tileMin.x + (index % tcX);
        const ty = tileMin.y + Math.floor(index / tcX);
        return loadDemTile(zoom, tx, ty);
      }),
    );

    const rawWidth = tcX * tilePx;
    const rawHeight = tcY * tilePx;
    const raw = new Float32Array(rawWidth * rawHeight);

    for (const result of results) {
      if (!result) continue;
      const offX = (result.tx - tileMin.x) * tilePx;
      const offY = (result.ty - tileMin.y) * tilePx;
      for (let row = 0; row < result.height; row += 1) {
        for (let col = 0; col < result.width; col += 1) {
          raw[(offY + row) * rawWidth + (offX + col)] = result.data[row * result.width + col];
        }
      }
    }

    const croppedRaw = resampleRawToBounds(raw, rawWidth, rawHeight, tileMin, zoom);
    hmWidth = DEM_SIZE;
    hmHeight = DEM_SIZE;
    heightMap = new Float32Array(croppedRaw.length);
    for (let i = 0; i < croppedRaw.length; i += 1) {
      heightMap[i] = Math.max(0, croppedRaw[i]) * HEIGHT_SCALE;
    }
    heightMap = smoothHeightMap(heightMap, hmWidth, hmHeight, 3);

    terrainState = {
      status: 'ready',
      geometry: buildGeometry(),
      texture: buildStylizedTexture(heightMap, hmWidth, hmHeight),
      version: terrainState.version + 1,
    };
    loadPromise = null;
    emit();
    return terrainState;
  })();

  return loadPromise;
}

export function subscribeTerrain(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTerrainState() {
  return terrainState;
}

export function worldPosToHeight(worldX, worldZ) {
  const u = THREE.MathUtils.clamp(worldX / MAP_BOUNDS.worldSize + 0.5, 0, 1);
  const v = THREE.MathUtils.clamp(worldZ / MAP_BOUNDS.worldSize + 0.5, 0, 1);
  const { lon, lat } = worldToLngLat(worldX, worldZ);
  const baseHeight = sampleHeight(u, v);
  return isLikelyLand(lon, lat) ? baseHeight : Math.min(baseHeight, 0.02);
}

export function worldPosToRouteHeight(worldX, worldZ, footprint = 4.5) {
  const offsets = [
    [0, 0, 4],
    [footprint, 0, 2],
    [-footprint, 0, 2],
    [0, footprint, 2],
    [0, -footprint, 2],
    [footprint * 0.7, footprint * 0.7, 1],
    [-footprint * 0.7, footprint * 0.7, 1],
    [footprint * 0.7, -footprint * 0.7, 1],
    [-footprint * 0.7, -footprint * 0.7, 1],
  ];

  let total = 0;
  let weightTotal = 0;
  for (const [offsetX, offsetZ, weight] of offsets) {
    total += worldPosToHeight(worldX + offsetX, worldZ + offsetZ) * weight;
    weightTotal += weight;
  }
  return total / weightTotal;
}

export function worldPosToRouteSafeHeight(worldX, worldZ, footprint = 4.5) {
  const offsets = [
    [0, 0],
    [footprint, 0],
    [-footprint, 0],
    [0, footprint],
    [0, -footprint],
    [footprint * 0.7, footprint * 0.7],
    [-footprint * 0.7, footprint * 0.7],
    [footprint * 0.7, -footprint * 0.7],
    [-footprint * 0.7, -footprint * 0.7],
  ];

  let maxHeight = worldPosToHeight(worldX, worldZ);
  for (const [offsetX, offsetZ] of offsets) {
    maxHeight = Math.max(maxHeight, worldPosToHeight(worldX + offsetX, worldZ + offsetZ));
  }

  return Math.max(worldPosToRouteHeight(worldX, worldZ, footprint), maxHeight);
}

export function buildRouteHeightProfile(points, {
  footprint = 4.5,
  clearance = 0.28,
  maxGrade = 0.018,
  smoothPasses = 3,
} = {}) {
  if (points.length === 0) return [];

  const safeHeights = points.map((point) => worldPosToRouteSafeHeight(point.x, point.z, footprint) + clearance);
  let profile = smoothHeightSamples(safeHeights, 10, smoothPasses)
    .map((height, index) => Math.max(height, safeHeights[index]));

  // Build a road deck profile instead of a terrain-following line. Peaks become
  // long ramps while smaller terrain noise is absorbed by embankment/viaduct.
  for (let iteration = 0; iteration < 4; iteration += 1) {
    for (let index = profile.length - 2; index >= 0; index -= 1) {
      const maxDelta = horizontalDistance(points[index], points[index + 1]) * maxGrade;
      profile[index] = Math.max(profile[index], profile[index + 1] - maxDelta, safeHeights[index]);
    }

    for (let index = 1; index < profile.length; index += 1) {
      const maxDelta = horizontalDistance(points[index - 1], points[index]) * maxGrade;
      profile[index] = Math.max(profile[index], profile[index - 1] - maxDelta, safeHeights[index]);
    }

    profile = smoothHeightSamples(profile, 8, 1)
      .map((height, index) => Math.max(height, safeHeights[index]));
  }

  return profile;
}

export function buildSemanticRouteHeightProfile(points, getSegmentAtProgress, {
  footprint = 5.5,
  clearance = 0.16,
} = {}) {
  if (points.length === 0) return [];

  const terrainTrend = smoothHeightSamples(
    points.map((point) => worldPosToRouteHeight(point.x, point.z, footprint)),
    34,
    5,
  );
  const phaseByStyle = {
    flat: 0.2,
    rolling: 1.4,
    mountainPass: 2.8,
    tunnel: 3.3,
  };

  const heights = points.map((point, index) => {
    const progress = points.length <= 1 ? 0 : index / (points.length - 1);
    const segment = getSegmentAtProgress(progress);
    const style = segment?.profile?.elevationStyle ?? 'rolling';
    const segmentStart = segment?.startProgress ?? 0;
    const segmentEnd = segment?.endProgress ?? 1;
    const segmentRange = Math.max(segmentEnd - segmentStart, 0.001);
    const localProgress = THREE.MathUtils.clamp((progress - segmentStart) / segmentRange, 0, 1);
    const ramp = Math.sin(localProgress * Math.PI);
    const longWave = Math.sin((progress * Math.PI * 5.5) + (phaseByStyle[style] ?? 0));

    let height;

    if (style === 'mountainPass') {
      height = terrainTrend[index] + clearance + 0.18 * ramp + longWave * 0.025;
    } else if (style === 'tunnel') {
      height = terrainTrend[index] + clearance * 0.72 + longWave * 0.01;
    } else if (style === 'flat') {
      height = terrainTrend[index] + clearance + longWave * 0.008;
    } else {
      height = terrainTrend[index] + clearance + longWave * 0.018;
    }

    return style === 'tunnel' ? height : Math.max(height, terrainTrend[index] + clearance * 0.8);
  });

  return smoothHeightSamples(heights, 14, 3).map((height, index) => {
    const progress = points.length <= 1 ? 0 : index / (points.length - 1);
    const segment = getSegmentAtProgress(progress);
    const style = segment?.profile?.elevationStyle ?? 'rolling';
    return style === 'tunnel' ? height : Math.max(height, terrainTrend[index] + clearance * 0.75);
  });
}

function horizontalDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function smoothHeightSamples(source, radius, passes) {
  let heights = source;
  for (let pass = 0; pass < passes; pass += 1) {
    heights = heights.map((_, index) => {
      let total = 0;
      let weightTotal = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleIndex = THREE.MathUtils.clamp(index + offset, 0, heights.length - 1);
        const weight = radius + 1 - Math.abs(offset);
        total += heights[sampleIndex] * weight;
        weightTotal += weight;
      }
      return total / weightTotal;
    });
  }
  return heights;
}
