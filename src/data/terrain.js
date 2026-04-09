import * as THREE from 'three';
import { WORLD_SIZE_UNITS } from './landmarks.js';

const MAP_BOUNDS = {
  lonMin: 6.6,
  lonMax: 18.5,
  latMin: 36.6,
  latMax: 47.1,
  worldSize: WORLD_SIZE_UNITS,
};

const HEIGHT_SCALE = 0.0022;
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

function mercY(lat) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

function lonLatToTile(lon, lat, zoom) {
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lon + 180) / 360) * n),
    y: Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n),
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

function buildStylizedTexture(heightData, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const ocean = ctx.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, '#d9ecfb');
  ocean.addColorStop(0.52, '#c3ddf4');
  ocean.addColorStop(1, '#eaf4fb');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  let maxH = 1;
  for (let i = 0; i < heightData.length; i++) maxH = Math.max(maxH, heightData[i]);

  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const h = heightData[i] / maxH;
      if (h <= 0.02) continue;

      const contour = Math.abs(((h * 30) % 1) - 0.5);
      const contourBand = contour < 0.04 ? 1 : 0;
      const p = i * 4;
      data[p] = Math.min(255, 96 + h * 68 + contourBand * 32);
      data[p + 1] = Math.min(255, 162 + h * 58 + contourBand * 18);
      data[p + 2] = Math.min(255, 104 + h * 34);
      data[p + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildGeometry() {
  const segments = 180;
  const geometry = new THREE.PlaneGeometry(MAP_BOUNDS.worldSize, MAP_BOUNDS.worldSize, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const width = segments + 1;
  for (let i = 0; i < positions.count; i++) {
    const col = i % width;
    const row = Math.floor(i / width);
    const u = col / segments;
    const v = row / segments;
    positions.setY(i, sampleHeight(u, v));
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
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
      })
    );

    hmWidth = tcX * tilePx;
    hmHeight = tcY * tilePx;
    const raw = new Float32Array(hmWidth * hmHeight);

    for (const result of results) {
      if (!result) continue;
      const offX = (result.tx - tileMin.x) * tilePx;
      const offY = (result.ty - tileMin.y) * tilePx;
      for (let row = 0; row < result.height; row++) {
        for (let col = 0; col < result.width; col++) {
          raw[(offY + row) * hmWidth + (offX + col)] = result.data[row * result.width + col];
        }
      }
    }

    heightMap = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      heightMap[i] = Math.max(0, raw[i]) * HEIGHT_SCALE;
    }

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
  return sampleHeight(u, v);
}
