import * as THREE from 'three';
import { scene } from './scene.js';

/**
 * 意大利地图范围（Web Mercator）
 * 经度：6.6 ~ 18.5  纬度：36.6 ~ 47.1
 * 世界坐标：240×240 单位，中心对齐原点
 */
export const MAP_BOUNDS = {
  lonMin: 6.6,
  lonMax: 18.5,
  latMin: 36.6,
  latMax: 47.1,
  worldSize: 240,
};

// 高度夸张系数（意大利最高点约 4800m，缩放到世界坐标后乘以此系数）
const HEIGHT_SCALE = 0.004;

/** 将真实经纬度转换为世界坐标 (x, z) */
export function lngLatToWorld(lon, lat) {
  const { lonMin, lonMax, latMin, latMax, worldSize } = MAP_BOUNDS;
  const mercY    = (l) => Math.log(Math.tan(Math.PI / 4 + (l * Math.PI) / 360));
  const tx = (lon - lonMin) / (lonMax - lonMin);
  const tz = 1 - (mercY(lat) - mercY(latMin)) / (mercY(latMax) - mercY(latMin));
  return new THREE.Vector3((tx - 0.5) * worldSize, 0, (tz - 0.5) * worldSize);
}

/** 经纬度 → 瓦片坐标 */
function lonLatToTile(lon, lat, zoom) {
  const n      = Math.pow(2, zoom);
  const latRad = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lon + 180) / 360) * n),
    y: Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n),
  };
}

/** OpenTopoMap 贴图瓦片 URL */
function topoTileUrl(z, x, y) {
  const sub = ['a', 'b', 'c'][(x + y) % 3];
  return `https://${sub}.tile.opentopomap.org/${z}/${x}/${y}.png`;
}

/**
 * Terrarium 高程瓦片 URL（AWS Open Data，免费无需 key）
 * 编码：elevation = (R * 256 + G + B / 256) - 32768
 */
function demTileUrl(z, x, y) {
  return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
}

// ==================== 全局高程图（供小车采样） ====================
let _heightMap = null;   // Float32Array，行优先
let _hmWidth   = 0;
let _hmHeight  = 0;

/**
 * 给定归一化坐标 (u∈[0,1], v∈[0,1])，双线性插值采样高度（世界单位）。
 * u=0 为西，u=1 为东；v=0 为北，v=1 为南。
 */
export function sampleHeight(u, v) {
  if (!_heightMap) return 0;
  const x  = u * (_hmWidth  - 1);
  const y  = v * (_hmHeight - 1);
  const x0 = Math.floor(x), x1 = Math.min(x0 + 1, _hmWidth  - 1);
  const y0 = Math.floor(y), y1 = Math.min(y0 + 1, _hmHeight - 1);
  const fx = x - x0, fy = y - y0;
  const h00 = _heightMap[y0 * _hmWidth + x0];
  const h10 = _heightMap[y0 * _hmWidth + x1];
  const h01 = _heightMap[y1 * _hmWidth + x0];
  const h11 = _heightMap[y1 * _hmWidth + x1];
  return h00 * (1-fx)*(1-fy) + h10 * fx*(1-fy) + h01 * (1-fx)*fy + h11 * fx*fy;
}

/**
 * 将世界坐标 (x, z) 转换为归一化 UV，再采样高度。
 */
export function worldPosToHeight(worldX, worldZ) {
  const { worldSize } = MAP_BOUNDS;
  const u = worldX / worldSize + 0.5;
  const v = worldZ / worldSize + 0.5;
  return sampleHeight(
    Math.max(0, Math.min(1, u)),
    Math.max(0, Math.min(1, v)),
  );
}

// ==================== 加载单张高程瓦片 → Float32 高度数组 ====================
function loadDEMTile(z, tx, ty) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c   = document.createElement('canvas');
      c.width   = img.width;
      c.height  = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      const out  = new Float32Array(img.width * img.height);
      for (let i = 0; i < out.length; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        // Terrarium 解码公式
        out[i] = (r * 256 + g + b / 256) - 32768;
      }
      resolve({ data: out, width: img.width, height: img.height });
    };
    img.onerror = () => resolve(null);
    img.src = demTileUrl(z, tx, ty);
  });
}

// ==================== 主入口 ====================
export async function buildMapGround() {
  const ZOOM = 6;
  const { lonMin, lonMax, latMin, latMax, worldSize } = MAP_BOUNDS;

  const tileMin = lonLatToTile(lonMin, latMax, ZOOM);
  const tileMax = lonLatToTile(lonMax, latMin, ZOOM);
  const tcX = tileMax.x - tileMin.x + 1;
  const tcY = tileMax.y - tileMin.y + 1;

  // ---------- 1. 并行加载所有高程瓦片 ----------
  const TILE_PX = 256;
  const demPromises = [];
  for (let ty = tileMin.y; ty <= tileMax.y; ty++) {
    for (let tx = tileMin.x; tx <= tileMax.x; tx++) {
      demPromises.push(loadDEMTile(ZOOM, tx, ty).then((res) => ({ res, tx, ty })));
    }
  }
  const demResults = await Promise.all(demPromises);

  // 拼合高程图
  const hmW = tcX * TILE_PX;
  const hmH = tcY * TILE_PX;
  const heightMapRaw = new Float32Array(hmW * hmH); // 单位：米

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

  // 转换为世界单位，存全局供小车采样
  _hmWidth  = hmW;
  _hmHeight = hmH;
  _heightMap = new Float32Array(hmW * hmH);
  for (let i = 0; i < heightMapRaw.length; i++) {
    _heightMap[i] = Math.max(0, heightMapRaw[i]) * HEIGHT_SCALE;
  }

  // ---------- 2. 构建地形网格 ----------
  // 分段数：与高程图等分辨率（clamp 到合理范围）
  const SEG = Math.min(Math.max(hmW, hmH), 512);
  const geo = new THREE.PlaneGeometry(worldSize, worldSize, SEG, SEG);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const vW  = SEG + 1;
  for (let i = 0; i < pos.count; i++) {
    const col = i % vW;
    const row = Math.floor(i / vW);
    const u   = col / SEG;
    const v   = row / SEG;
    const h   = sampleHeight(u, v);
    pos.setY(i, h);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  // ---------- 3. 贴图：OpenTopoMap 等高线图 ----------
  const mapCanvas  = document.createElement('canvas');
  mapCanvas.width  = tcX * TILE_PX;
  mapCanvas.height = tcY * TILE_PX;
  const ctx = mapCanvas.getContext('2d');
  ctx.fillStyle = '#b8d4e8';
  ctx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

  const mapTexture = new THREE.CanvasTexture(mapCanvas);
  mapTexture.colorSpace = THREE.SRGBColorSpace;

  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      map: mapTexture,
      roughness: 0.88,
      metalness: 0.0,
    })
  );
  ground.receiveShadow = true;
  scene.add(ground);

  // 异步加载地图瓦片贴图
  const tilePromises = [];
  for (let tx = tileMin.x; tx <= tileMax.x; tx++) {
    for (let ty = tileMin.y; ty <= tileMax.y; ty++) {
      const px = (tx - tileMin.x) * TILE_PX;
      const py = (ty - tileMin.y) * TILE_PX;
      const p = new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, px, py, TILE_PX, TILE_PX);
          mapTexture.needsUpdate = true;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = topoTileUrl(ZOOM, tx, ty);
      });
      tilePromises.push(p);
    }
  }
  await Promise.all(tilePromises);
}
