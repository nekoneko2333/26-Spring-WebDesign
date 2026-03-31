import * as THREE from 'three';
import { scene } from './scene.js';

/**
 * 意大利地图范围（Web Mercator）
 * 经纬度：lon 6.6~18.5, lat 36.6~47.1
 * 世界坐标：240 x 240，中心对齐原点
 */
export const MAP_BOUNDS = {
  lonMin: 6.6,
  lonMax: 18.5,
  latMin: 36.6,
  latMax: 47.1,
  worldSize: 240,
};

const HEIGHT_SCALE = 0.004;

export function lngLatToWorld(lon, lat) {
  const { lonMin, lonMax, latMin, latMax, worldSize } = MAP_BOUNDS;
  const mercY = (l) => Math.log(Math.tan(Math.PI / 4 + (l * Math.PI) / 360));
  const tx = (lon - lonMin) / (lonMax - lonMin);
  const tz = 1 - (mercY(lat) - mercY(latMin)) / (mercY(latMax) - mercY(latMin));
  return new THREE.Vector3((tx - 0.5) * worldSize, 0, (tz - 0.5) * worldSize);
}

function lonLatToTile(lon, lat, zoom) {
  const n = Math.pow(2, zoom);
  const latRad = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lon + 180) / 360) * n),
    y: Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n),
  };
}

function demTileUrl(z, x, y) {
  return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
}

let _heightMap = null;
let _hmWidth = 0;
let _hmHeight = 0;

export function sampleHeight(u, v) {
  if (!_heightMap) return 0;
  const x = u * (_hmWidth - 1);
  const y = v * (_hmHeight - 1);
  const x0 = Math.floor(x), x1 = Math.min(x0 + 1, _hmWidth - 1);
  const y0 = Math.floor(y), y1 = Math.min(y0 + 1, _hmHeight - 1);
  const fx = x - x0, fy = y - y0;
  const h00 = _heightMap[y0 * _hmWidth + x0];
  const h10 = _heightMap[y0 * _hmWidth + x1];
  const h01 = _heightMap[y1 * _hmWidth + x0];
  const h11 = _heightMap[y1 * _hmWidth + x1];
  return h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;
}

export function worldPosToHeight(worldX, worldZ) {
  const { worldSize } = MAP_BOUNDS;
  const u = worldX / worldSize + 0.5;
  const v = worldZ / worldSize + 0.5;
  return sampleHeight(
    Math.max(0, Math.min(1, u)),
    Math.max(0, Math.min(1, v)),
  );
}

function loadDEMTile(z, tx, ty) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      const out = new Float32Array(img.width * img.height);
      for (let i = 0; i < out.length; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        out[i] = (r * 256 + g + b / 256) - 32768;
      }
      resolve({ data: out, width: img.width, height: img.height });
    };
    img.onerror = () => resolve(null);
    img.src = demTileUrl(z, tx, ty);
  });
}

function buildStylizedMapTexture(heightMap, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Dark ocean base
  const ocean = ctx.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, '#08111d');
  ocean.addColorStop(1, '#0b1523');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  // Convert terrain into stylized relief + contour lines
  let maxH = 0;
  for (let i = 0; i < heightMap.length; i++) maxH = Math.max(maxH, heightMap[i]);
  if (maxH <= 0) maxH = 1;

  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const h = heightMap[i] / maxH;

      // low-relief shaded land palette
      const land = h > 0.02;
      if (!land) continue;

      const contour = Math.abs(((h * 24) % 1) - 0.5); // 0..0.5
      const contourBand = contour < 0.03 ? 1 : 0;

      // base land color (cool dark slate with warm highlights)
      let r = 22 + h * 34;
      let g = 30 + h * 44;
      let b = 38 + h * 40;

      // contour accent
      if (contourBand) {
        r += 40;
        g += 34;
        b += 20;
      }

      const p = i * 4;
      data[p] = Math.min(255, r);
      data[p + 1] = Math.min(255, g);
      data[p + 2] = Math.min(255, b);
      data[p + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);

  // subtle vignette for depth
  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.5, width * 0.25, width * 0.5, height * 0.5, width * 0.65);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export async function buildMapGround() {
  const ZOOM = 6;
  const { lonMin, lonMax, latMin, latMax, worldSize } = MAP_BOUNDS;

  const tileMin = lonLatToTile(lonMin, latMax, ZOOM);
  const tileMax = lonLatToTile(lonMax, latMin, ZOOM);
  const tcX = tileMax.x - tileMin.x + 1;
  const tcY = tileMax.y - tileMin.y + 1;

  const TILE_PX = 256;
  const demPromises = [];
  for (let ty = tileMin.y; ty <= tileMax.y; ty++) {
    for (let tx = tileMin.x; tx <= tileMax.x; tx++) {
      demPromises.push(loadDEMTile(ZOOM, tx, ty).then((res) => ({ res, tx, ty })));
    }
  }
  const demResults = await Promise.all(demPromises);

  const hmW = tcX * TILE_PX;
  const hmH = tcY * TILE_PX;
  const heightMapRaw = new Float32Array(hmW * hmH);

  for (const { res, tx, ty } of demResults) {
    if (!res) continue;
    const offX = (tx - tileMin.x) * TILE_PX;
    const offY = (ty - tileMin.y) * TILE_PX;
    for (let row = 0; row < res.height; row++) {
      for (let col = 0; col < res.width; col++) {
        const src = row * res.width + col;
        const dst = (offY + row) * hmW + (offX + col);
        heightMapRaw[dst] = res.data[src];
      }
    }
  }

  _hmWidth = hmW;
  _hmHeight = hmH;
  _heightMap = new Float32Array(hmW * hmH);
  for (let i = 0; i < heightMapRaw.length; i++) {
    _heightMap[i] = Math.max(0, heightMapRaw[i]) * HEIGHT_SCALE;
  }

  const SEG = Math.min(Math.max(hmW, hmH), 512);
  const geo = new THREE.PlaneGeometry(worldSize, worldSize, SEG, SEG);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const vW = SEG + 1;
  for (let i = 0; i < pos.count; i++) {
    const col = i % vW;
    const row = Math.floor(i / vW);
    const u = col / SEG;
    const v = row / SEG;
    pos.setY(i, sampleHeight(u, v));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mapTexture = buildStylizedMapTexture(_heightMap, hmW, hmH);

  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      map: mapTexture,
      roughness: 0.96,
      metalness: 0,
    })
  );
  ground.receiveShadow = true;
  scene.add(ground);
}
