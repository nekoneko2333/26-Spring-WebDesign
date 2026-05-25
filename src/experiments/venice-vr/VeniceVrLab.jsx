import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import './venice-vr.css';

const VENICE_MODEL = '/models/venice.glb';
const NAV_GRID_URL = '/models/venice-nav-grid.json';
const WORLD_SCALE = 42;
const METERS_PER_MODEL_UNIT = 247.02;
const SCENE_UNITS_PER_METER = WORLD_SCALE / METERS_PER_MODEL_UNIT;
const PERSON_HEIGHT = 1.6 * SCENE_UNITS_PER_METER;
const PERSON_RADIUS = 0.28 * SCENE_UNITS_PER_METER;
const GROUND_Y = 0.012;

const MODEL_BOUNDS = {
  min: { x: 0, y: -0.009610905063611416, z: 0 },
  max: { x: 22.691758567816578, y: 0.3001077216941471, z: 12.377322853828163 },
  center: { x: 11.345879283908289, y: 0.14524840831526786, z: 6.188661426241907 },
  size: { x: 22.691758567816578, y: 0.3097186267577585, z: 12.377322855172512 },
};

const VENICE_GEO = { center: { lon: 12.3353, lat: 45.4386 } };

const DEFAULT_REFERENCE_PINS = {
  rialto: { x: 0.038362853996892925, z: -1.2239481107094976 },
  'accademia-bridge': { x: -2.045, z: 1.875 },
  scalzi: { x: -4.360312328037477, z: -2.044472058351952 },
};

const REFERENCE_POINTS = [
  { id: 'scalzi', lon: 12.3227238, lat: 45.441159 },
  { id: 'rialto', lon: 12.3359784, lat: 45.4380821 },
  { id: 'accademia-bridge', lon: 12.328924, lat: 45.431657 },
];

const VENICE_POIS = [
  {
    id: 'scalzi',
    name: 'Ponte degli Scalzi',
    lon: 12.3227238,
    lat: 45.441159,
    type: 'bridge',
    duration: 8,
    description: 'A western Grand Canal crossing beside Santa Lucia station.',
  },
  {
    id: 'rialto',
    name: 'Rialto Bridge',
    lon: 12.3359784,
    lat: 45.4380821,
    type: 'bridge',
    duration: 12,
    description: "Venice's classic stone bridge and the route midpoint.",
  },
  {
    id: 'accademia-bridge',
    name: 'Ponte dell Accademia',
    lon: 12.328924,
    lat: 45.431657,
    type: 'bridge',
    duration: 10,
    description: 'A southern bridge with a long view across the Grand Canal.',
  },
  {
    id: 'san-marco',
    name: "St Mark's Basilica",
    lon: 12.3397,
    lat: 45.4346,
    type: 'landmark',
    duration: 18,
    description: 'The ceremonial heart of Venice, close to Piazza San Marco.',
  },
  {
    id: 'doge-palace',
    name: "Doge's Palace",
    lon: 12.3404,
    lat: 45.4337,
    type: 'palace',
    duration: 16,
    description: 'A Gothic palace facing the lagoon and the civic center.',
  },
  {
    id: 'santa-maria-salute',
    name: 'Santa Maria della Salute',
    lon: 12.3342,
    lat: 45.4307,
    type: 'church',
    duration: 12,
    description: 'The domed basilica at the mouth of the Grand Canal.',
  },
  {
    id: 'arsenale',
    name: 'Venetian Arsenal',
    lon: 12.3499,
    lat: 45.4354,
    type: 'district',
    duration: 14,
    description: 'Historic shipyards and a quieter eastern anchor.',
  },
];

const PRESETS = [
  { id: 'classic', name: 'Grand Canal Classic', stops: ['scalzi', 'rialto', 'accademia-bridge', 'santa-maria-salute', 'san-marco'] },
  { id: 'civic', name: 'San Marco Focus', stops: ['rialto', 'san-marco', 'doge-palace', 'santa-maria-salute'] },
  { id: 'east', name: 'Eastward Walk', stops: ['rialto', 'san-marco', 'doge-palace', 'arsenale'] },
];

const DEFAULT_ROUTE = PRESETS[0].stops;

function lngLatToLocalMeters(lon, lat) {
  const metersPerDegree = 111320;
  const centerLatRad = (VENICE_GEO.center.lat * Math.PI) / 180;
  return {
    x: (lon - VENICE_GEO.center.lon) * metersPerDegree * Math.cos(centerLatRad),
    z: (VENICE_GEO.center.lat - lat) * metersPerDegree,
  };
}

function createVisualFit() {
  const controls = REFERENCE_POINTS.map((point) => ({
    source: lngLatToLocalMeters(point.lon, point.lat),
    target: DEFAULT_REFERENCE_PINS[point.id],
  }));
  const sourceCenter = controls.reduce((sum, control) => ({ x: sum.x + control.source.x, z: sum.z + control.source.z }), { x: 0, z: 0 });
  const targetCenter = controls.reduce((sum, control) => ({ x: sum.x + control.target.x, z: sum.z + control.target.z }), { x: 0, z: 0 });
  sourceCenter.x /= controls.length;
  sourceCenter.z /= controls.length;
  targetCenter.x /= controls.length;
  targetCenter.z /= controls.length;

  let a = 0;
  let b = 0;
  let denominator = 0;
  controls.forEach(({ source, target }) => {
    const sx = source.x - sourceCenter.x;
    const sz = source.z - sourceCenter.z;
    const tx = target.x - targetCenter.x;
    const tz = target.z - targetCenter.z;
    a += sx * tx + sz * tz;
    b += sx * tz - sz * tx;
    denominator += sx * sx + sz * sz;
  });
  a /= denominator || 1;
  b /= denominator || 1;

  return {
    a,
    b,
    tx: targetCenter.x - a * sourceCenter.x + b * sourceCenter.z,
    tz: targetCenter.z - b * sourceCenter.x - a * sourceCenter.z,
  };
}

const VISUAL_FIT = createVisualFit();

function geoToModel(lon, lat) {
  const point = lngLatToLocalMeters(lon, lat);
  return {
    x: VISUAL_FIT.a * point.x - VISUAL_FIT.b * point.z + VISUAL_FIT.tx,
    z: VISUAL_FIT.b * point.x + VISUAL_FIT.a * point.z + VISUAL_FIT.tz,
  };
}

function useNavGrid() {
  const [navGrid, setNavGrid] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch(NAV_GRID_URL)
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) setNavGrid(payload);
      })
      .catch(() => {
        if (!cancelled) setNavGrid(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return navGrid;
}

function cellIndex(navGrid, point) {
  const x = point.x + MODEL_BOUNDS.center.x;
  const z = point.z + MODEL_BOUNDS.center.z;
  const u = (x - navGrid.bounds.minX) / (navGrid.bounds.maxX - navGrid.bounds.minX);
  const v = (z - navGrid.bounds.minZ) / (navGrid.bounds.maxZ - navGrid.bounds.minZ);
  return {
    x: THREE.MathUtils.clamp(Math.floor(u * navGrid.width), 0, navGrid.width - 1),
    z: THREE.MathUtils.clamp(Math.floor(v * navGrid.height), 0, navGrid.height - 1),
  };
}

function cellCenter(navGrid, x, z) {
  const worldX = navGrid.bounds.minX + ((x + 0.5) / navGrid.width) * (navGrid.bounds.maxX - navGrid.bounds.minX);
  const worldZ = navGrid.bounds.minZ + ((z + 0.5) / navGrid.height) * (navGrid.bounds.maxZ - navGrid.bounds.minZ);
  return new THREE.Vector3(worldX - MODEL_BOUNDS.center.x, GROUND_Y, worldZ - MODEL_BOUNDS.center.z);
}

function toScenePoint(point) {
  return new THREE.Vector3(point.x * WORLD_SCALE, point.y * WORLD_SCALE, point.z * WORLD_SCALE);
}

function toModelPoint(point) {
  return { x: point.x / WORLD_SCALE, z: point.z / WORLD_SCALE };
}

function isWalkableModelPoint(navGrid, point) {
  if (!navGrid) return true;
  const cell = cellIndex(navGrid, point);
  return Boolean(navGrid.grid[cell.z * navGrid.width + cell.x]?.w);
}

function nearestWalkableCell(navGrid, point) {
  const start = cellIndex(navGrid, point);
  let best = null;
  let bestScore = Infinity;
  for (let radius = 0; radius < 64; radius += 1) {
    for (let z = Math.max(0, start.z - radius); z <= Math.min(navGrid.height - 1, start.z + radius); z += 1) {
      for (let x = Math.max(0, start.x - radius); x <= Math.min(navGrid.width - 1, start.x + radius); x += 1) {
        const cell = navGrid.grid[z * navGrid.width + x];
        if (!cell?.w) continue;
        const score = Math.abs(x - start.x) + Math.abs(z - start.z);
        if (score < bestScore) {
          best = { x, z };
          bestScore = score;
        }
      }
    }
    if (best) return best;
  }
  return start;
}

function isWalkableScenePoint(navGrid, point) {
  return isWalkableModelPoint(navGrid, toModelPoint(point));
}

function hasWalkableModelSegment(navGrid, a, b) {
  if (!navGrid) return true;
  const cellSize = Math.min(
    (navGrid.bounds.maxX - navGrid.bounds.minX) / navGrid.width,
    (navGrid.bounds.maxZ - navGrid.bounds.minZ) / navGrid.height,
  );
  const steps = Math.max(2, Math.ceil(a.distanceTo(b) / (cellSize * 0.65)));
  for (let index = 0; index <= steps; index += 1) {
    const point = a.clone().lerp(b, index / steps);
    if (!isWalkableModelPoint(navGrid, point)) return false;
  }
  return true;
}

function smoothPath(navGrid, points) {
  if (!navGrid || points.length < 3) return points;
  const visible = [];
  let cursor = 0;
  while (cursor < points.length) {
    visible.push(points[cursor]);
    if (cursor === points.length - 1) break;
    let next = points.length - 1;
    while (next > cursor + 1 && !hasWalkableModelSegment(navGrid, points[cursor], points[next])) next -= 1;
    cursor = next;
  }

  let smoothed = visible;
  for (let pass = 0; pass < 2; pass += 1) {
    const result = [smoothed[0]];
    for (let index = 1; index < smoothed.length; index += 1) {
      const previous = smoothed[index - 1];
      const current = smoothed[index];
      const q = previous.clone().lerp(current, 0.35);
      const r = previous.clone().lerp(current, 0.78);
      if (hasWalkableModelSegment(navGrid, result.at(-1), q) && hasWalkableModelSegment(navGrid, q, r)) {
        result.push(q, r);
      } else {
        result.push(current);
      }
    }
    result.push(smoothed.at(-1));
    smoothed = result;
  }
  return smoothed;
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (!this.items.length) return null;
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length && last) {
      this.items[0] = last;
      this.sinkDown(0);
    }
    return first;
  }

  get size() {
    return this.items.length;
  }

  bubbleUp(index) {
    const item = this.items[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.items[parentIndex];
      if (item.score >= parent.score) break;
      this.items[parentIndex] = item;
      this.items[index] = parent;
      index = parentIndex;
    }
  }

  sinkDown(index) {
    const length = this.items.length;
    const item = this.items[index];
    while (true) {
      const leftIndex = index * 2 + 1;
      const rightIndex = leftIndex + 1;
      let swapIndex = null;
      if (leftIndex < length && this.items[leftIndex].score < item.score) swapIndex = leftIndex;
      if (rightIndex < length && this.items[rightIndex].score < (swapIndex === null ? item.score : this.items[leftIndex].score)) swapIndex = rightIndex;
      if (swapIndex === null) break;
      this.items[index] = this.items[swapIndex];
      this.items[swapIndex] = item;
      index = swapIndex;
    }
  }
}

function findPath(navGrid, startPoint, endPoint) {
  if (!navGrid) return [startPoint, endPoint];
  const start = nearestWalkableCell(navGrid, startPoint);
  const end = nearestWalkableCell(navGrid, endPoint);
  const key = (x, z) => `${x},${z}`;
  const open = new MinHeap();
  const startKey = key(start.x, start.z);
  open.push({ x: start.x, z: start.z, id: startKey, score: 0 });
  const cameFrom = new Map();
  const g = new Map([[startKey, 0]]);
  const h = (x, z) => Math.hypot(x - end.x, z - end.z);
  const dirs = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
  ];

  let closest = startKey;
  let closestScore = h(start.x, start.z);

  while (open.size) {
    const next = open.pop();
    if (!next) break;
    const { x: cx, z: cz, id: current } = next;
    if (next.score > (g.get(current) ?? Infinity) + h(cx, cz) + 0.001) continue;
    const currentDistance = h(cx, cz);
    if (currentDistance < closestScore) {
      closestScore = currentDistance;
      closest = current;
    }
    if (cx === end.x && cz === end.z) {
      const cells = [{ x: cx, z: cz }];
      let cursor = current;
      while (cameFrom.has(cursor)) {
        cursor = cameFrom.get(cursor);
        const [x, z] = cursor.split(',').map(Number);
        cells.push({ x, z });
      }
      return cells.reverse().map((cell) => cellCenter(navGrid, cell.x, cell.z));
    }

    for (const [dx, dz, cost] of dirs) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= navGrid.width || nz >= navGrid.height) continue;
      const cell = navGrid.grid[nz * navGrid.width + nx];
      if (!cell?.w) continue;
      if (dx && dz) {
        const sideA = navGrid.grid[cz * navGrid.width + nx];
        const sideB = navGrid.grid[nz * navGrid.width + cx];
        if (!sideA?.w || !sideB?.w) continue;
      }
      const nid = key(nx, nz);
      const tentative = (g.get(current) ?? Infinity) + cost;
      if (tentative < (g.get(nid) ?? Infinity)) {
        cameFrom.set(nid, current);
        g.set(nid, tentative);
        open.push({ x: nx, z: nz, id: nid, score: tentative + h(nx, nz) });
      }
    }
  }
  const cells = [];
  let cursor = closest;
  while (cursor) {
    const [x, z] = cursor.split(',').map(Number);
    cells.push({ x, z });
    cursor = cameFrom.get(cursor);
  }
  return cells.reverse().map((cell) => cellCenter(navGrid, cell.x, cell.z));
}

function measureRoute(points) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += points[index - 1].distanceTo(points[index]);
  return total;
}

function sampleRoute(points, progress) {
  if (!points.length) return { position: new THREE.Vector3(), direction: new THREE.Vector3(0, 0, -1), done: true, total: 0 };
  const total = measureRoute(points);
  const target = Math.max(0, Math.min(progress, total));
  let walked = 0;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    const segment = a.distanceTo(b);
    if (walked + segment >= target || index === points.length - 1) {
      const t = segment > 0 ? (target - walked) / segment : 0;
      const position = a.clone().lerp(b, t);
      const direction = b.clone().sub(a).normalize();
      return { position, direction: direction.lengthSq() ? direction : new THREE.Vector3(0, 0, -1), done: target >= total, total };
    }
    walked += segment;
  }
  return { position: points.at(-1).clone(), direction: new THREE.Vector3(0, 0, -1), done: true, total };
}

function formatMeters(value) {
  if (!Number.isFinite(value)) return '-';
  return value >= 1000 ? `${(value / 1000).toFixed(2)} km` : `${Math.round(value)} m`;
}

function VeniceModel() {
  const { scene } = useGLTF(VENICE_MODEL);
  const model = useMemo(() => scene.clone(true), [scene]);
  return (
    <group
      scale={WORLD_SCALE}
      position={[-MODEL_BOUNDS.center.x * WORLD_SCALE, -MODEL_BOUNDS.min.y * WORLD_SCALE, -MODEL_BOUNDS.center.z * WORLD_SCALE]}
    >
      <primitive object={model} />
    </group>
  );
}

function RouteLine({ points }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(points.length * 3);
    points.forEach((point, index) => {
      arr[index * 3] = point.x;
      arr[index * 3 + 1] = point.y + 0.03;
      arr[index * 3 + 2] = point.z;
    });
    return arr;
  }, [points]);
  if (points.length < 2) return null;
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#f08b4f" transparent opacity={0.95} />
    </line>
  );
}

function PoiMarkers({ pois, selectedId, navGrid, onSelect }) {
  return (
    <>
      {pois.map((poi) => {
        const base = geoToModel(poi.lon, poi.lat);
        const cell = navGrid ? nearestWalkableCell(navGrid, base) : null;
        const position = toScenePoint(cell ? cellCenter(navGrid, cell.x, cell.z) : new THREE.Vector3(base.x, 0.2, base.z));
        const isSelected = poi.id === selectedId;
        return (
          <group key={poi.id} position={position}>
            <mesh>
              <sphereGeometry args={[isSelected ? 1.35 : 0.9, 14, 10]} />
              <meshStandardMaterial color={isSelected ? '#f08b4f' : '#167ca4'} emissive={isSelected ? '#7a2b0d' : '#07324a'} emissiveIntensity={0.28} />
            </mesh>
            <Html center distanceFactor={80} position={[0, 5.4, 0]}>
              <button className={`venice-vr__poi-label ${isSelected ? 'is-active' : ''}`} type="button" onClick={() => onSelect(poi.id)}>
                {poi.name}
              </button>
            </Html>
          </group>
        );
      })}
    </>
  );
}

function AutoTour({ active, routePoints, speed, onProgress, onNearPoi }) {
  const { camera } = useThree();
  const markerRef = useRef(null);
  const progressRef = useRef(0);
  const lastReportRef = useRef(0);
  const lastPoiRef = useRef(null);

  useFrame((_, delta) => {
    if (!routePoints.length) return;
    const total = measureRoute(routePoints);
    if (active) progressRef.current = (progressRef.current + speed * delta) % Math.max(total, 1);
    const sample = sampleRoute(routePoints, progressRef.current);
    const direction = sample.direction;
    if (markerRef.current) {
      markerRef.current.position.copy(sample.position);
      markerRef.current.rotation.y = Math.atan2(direction.x, direction.z);
    }
    if (active) {
      const desiredCamera = sample.position.clone().add(direction.clone().multiplyScalar(-2.2)).add(new THREE.Vector3(0, 0.82, 0));
      const target = sample.position.clone().add(direction.clone().multiplyScalar(4.2));
      target.y += 0.42;
      camera.position.lerp(desiredCamera, 0.08);
      camera.lookAt(target);
    }
    const now = performance.now();
    if (now - lastReportRef.current > 150) {
      lastReportRef.current = now;
      onProgress?.({ meters: progressRef.current, total });
      const nearest = routePoints.find((point) => point.distanceTo(sample.position) < 0.18);
      if (nearest && nearest !== lastPoiRef.current) lastPoiRef.current = nearest;
      onNearPoi?.(sample.position);
    }
  });

  return (
    <group ref={markerRef}>
      <mesh position={[0, PERSON_HEIGHT / 2, 0]}>
        <capsuleGeometry args={[PERSON_RADIUS, PERSON_HEIGHT - PERSON_RADIUS * 2, 5, 10]} />
        <meshStandardMaterial color="#f08b4f" roughness={0.42} />
      </mesh>
    </group>
  );
}

function ManualWalk({ active, start, routePoints, navGrid, speed, onProgress }) {
  const { camera } = useThree();
  const keysRef = useRef(new Set());
  const positionRef = useRef(start.clone());
  const headingRef = useRef(0);
  const avatarRef = useRef(null);

  useEffect(() => {
    positionRef.current.copy(start);
    headingRef.current = 0;
    if (avatarRef.current) avatarRef.current.position.copy(start);
  }, [start]);

  useEffect(() => {
    const down = (event) => {
      if (!active) return;
      keysRef.current.add(event.key.toLowerCase());
    };
    const up = (event) => keysRef.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [active]);

  useFrame((_, delta) => {
    if (!active || !routePoints.length) return;
    const keys = keysRef.current;
    const forward = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    const turn = (keys.has('a') || keys.has('arrowleft') ? 1 : 0) - (keys.has('d') || keys.has('arrowright') ? 1 : 0);
    headingRef.current += turn * delta * 2.4;
    const direction = new THREE.Vector3(Math.sin(headingRef.current), 0, Math.cos(headingRef.current));
    if (forward) {
      const nextPosition = positionRef.current.clone().add(direction.multiplyScalar(forward * speed * delta * 0.32));
      if (isWalkableScenePoint(navGrid, nextPosition)) positionRef.current.copy(nextPosition);
    }
    const nearest = routePoints.reduce((best, point) => (point.distanceTo(positionRef.current) < best.distance ? { point, distance: point.distanceTo(positionRef.current) } : best), { point: routePoints[0], distance: Infinity });
    const guidedPosition = positionRef.current.clone().lerp(nearest.point, 0.035);
    if (nearest.distance > 1.6 && isWalkableScenePoint(navGrid, guidedPosition)) positionRef.current.copy(guidedPosition);
    if (avatarRef.current) {
      avatarRef.current.position.copy(positionRef.current);
      avatarRef.current.rotation.y = headingRef.current;
    }
    const cam = positionRef.current.clone().add(new THREE.Vector3(-Math.sin(headingRef.current) * 2.2, 0.82, -Math.cos(headingRef.current) * 2.2));
    camera.position.lerp(cam, 0.16);
    const lookTarget = positionRef.current.clone().add(new THREE.Vector3(Math.sin(headingRef.current) * 4.2, 0.42, Math.cos(headingRef.current) * 4.2));
    camera.lookAt(lookTarget);
    onProgress?.({ meters: 0, total: measureRoute(routePoints) });
  });

  if (!active) return null;
  return (
    <group ref={avatarRef}>
      <mesh position={[0, PERSON_HEIGHT / 2, 0]}>
        <capsuleGeometry args={[PERSON_RADIUS, PERSON_HEIGHT - PERSON_RADIUS * 2, 5, 10]} />
        <meshStandardMaterial color="#167ca4" />
      </mesh>
    </group>
  );
}

function VeniceScene({ pois, selectedId, routePoints, navGrid, mode, speed, onSelect, onProgress }) {
  const start = routePoints[0] ?? new THREE.Vector3();
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 95, 135]} fov={46} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[12, 24, 14]} intensity={2.1} />
      <Suspense fallback={null}>
        <VeniceModel />
      </Suspense>
      <RouteLine points={routePoints} />
      <PoiMarkers pois={pois} selectedId={selectedId} navGrid={navGrid} onSelect={onSelect} />
      <AutoTour active={mode === 'auto'} routePoints={routePoints} speed={speed} onProgress={onProgress} />
      <ManualWalk active={mode === 'manual'} start={start} routePoints={routePoints} navGrid={navGrid} speed={speed} onProgress={onProgress} />
      {mode === 'free' && <OrbitControls makeDefault target={[0, 0.15, 0]} maxDistance={28} maxPolarAngle={Math.PI * 0.48} />}
    </>
  );
}

function buildRoute(navGrid, routeIds) {
  const stops = routeIds.map((id) => VENICE_POIS.find((poi) => poi.id === id)).filter(Boolean);
  const anchors = stops.map((poi) => {
    const model = geoToModel(poi.lon, poi.lat);
    const cell = navGrid ? nearestWalkableCell(navGrid, model) : null;
    return cell ? cellCenter(navGrid, cell.x, cell.z) : new THREE.Vector3(model.x, 0.18, model.z);
  });
  if (!navGrid || anchors.length < 2) return anchors.map(toScenePoint);
  const points = [];
  for (let index = 1; index < anchors.length; index += 1) {
    const segment = findPath(navGrid, anchors[index - 1], anchors[index]);
    if (index > 1) segment.shift();
    points.push(...segment);
  }
  return smoothPath(navGrid, points).map(toScenePoint);
}

export function VeniceVrLab() {
  const navGrid = useNavGrid();
  const [selectedPoiId, setSelectedPoiId] = useState('rialto');
  const [routeIds, setRouteIds] = useState(DEFAULT_ROUTE);
  const [mode, setMode] = useState('auto');
  const [speed, setSpeed] = useState(7);
  const [progress, setProgress] = useState({ meters: 0, total: 0 });

  const routePoints = useMemo(() => buildRoute(navGrid, routeIds), [navGrid, routeIds]);
  const selectedPoi = VENICE_POIS.find((poi) => poi.id === selectedPoiId) ?? VENICE_POIS[0];
  const routePois = routeIds.map((id) => VENICE_POIS.find((poi) => poi.id === id)).filter(Boolean);
  const totalVisit = routePois.reduce((sum, poi) => sum + poi.duration, 0);

  const toggleStop = (id) => {
    setRouteIds((current) => {
      if (current.includes(id)) return current.length > 2 ? current.filter((item) => item !== id) : current;
      return [...current, id];
    });
  };

  return (
    <main className="venice-tour">
      <header className="venice-tour__topbar">
        <a className="venice-tour__back" href="#/concepts">Back to 04</a>
        <div>
          <span>Immersive city demo</span>
          <strong>Venice Walking Lab</strong>
        </div>
        <div className="venice-tour__modes">
          {['auto', 'manual', 'free'].map((item) => (
            <button key={item} type="button" className={mode === item ? 'is-active' : ''} onClick={() => setMode(item)}>
              {item}
            </button>
          ))}
        </div>
      </header>

      <section className="venice-tour__scene">
        <Canvas dpr={[1, 1.35]} gl={{ antialias: true }}>
          <color attach="background" args={['#edf7f8']} />
          <VeniceScene
            pois={VENICE_POIS}
            selectedId={selectedPoiId}
            routePoints={routePoints}
            navGrid={navGrid}
            mode={mode}
            speed={speed}
            onSelect={setSelectedPoiId}
            onProgress={setProgress}
          />
        </Canvas>
        <div className="venice-tour__hud">
          <span>{mode === 'manual' ? 'Manual walk' : mode === 'auto' ? 'Guided route' : 'Free camera'}</span>
          <strong>{formatMeters(progress.meters)} / {formatMeters(progress.total || measureRoute(routePoints))}</strong>
          <small>{navGrid ? 'Building-only obstacle grid active' : 'Loading walk grid...'}</small>
        </div>
      </section>

      <aside className="venice-tour__panel">
        <p className="venice-tour__eyebrow">Route planner</p>
        <h1>Small Venice tour</h1>
        <p className="venice-tour__lede">A compact route demo over the Venice model. Stops are projected from real coordinates, snapped to a horizontal travel plane, and routed around building blocks. Water is passable for boat-style movement.</p>

        <section className="venice-tour__metrics">
          <article><span>Stops</span><strong>{routeIds.length}</strong></article>
          <article><span>Path</span><strong>{formatMeters(measureRoute(routePoints))}</strong></article>
          <article><span>Visit</span><strong>{totalVisit} min</strong></article>
          <article><span>Grid</span><strong>{navGrid ? `${navGrid.width}x${navGrid.height}` : '-'}</strong></article>
        </section>

        <section className="venice-tour__presets">
          <h2>Preset routes</h2>
          {PRESETS.map((preset) => (
            <button key={preset.id} type="button" onClick={() => setRouteIds(preset.stops)}>
              <strong>{preset.name}</strong>
              <span>{preset.stops.length} stops</span>
            </button>
          ))}
        </section>

        <section className="venice-tour__focus">
          <h2>Selected stop</h2>
          <strong>{selectedPoi.name}</strong>
          <p>{selectedPoi.description}</p>
          <code>{selectedPoi.lon.toFixed(5)}, {selectedPoi.lat.toFixed(5)}</code>
        </section>

        <section className="venice-tour__poi-list">
          <h2>Stops</h2>
          {VENICE_POIS.map((poi) => (
            <button key={poi.id} type="button" className={selectedPoiId === poi.id ? 'is-active' : ''} onClick={() => setSelectedPoiId(poi.id)}>
              <input type="checkbox" checked={routeIds.includes(poi.id)} onChange={() => toggleStop(poi.id)} onClick={(event) => event.stopPropagation()} />
              <span>{poi.type}</span>
              <strong>{poi.name}</strong>
            </button>
          ))}
        </section>

        <section className="venice-tour__controls">
          <h2>Movement</h2>
          <label>
            Speed
            <input type="range" min="2" max="18" step="1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
            <span>{Math.round(speed)}</span>
          </label>
          <p>Manual mode: W/S move, A/D turn. Auto mode follows the planned path.</p>
        </section>
      </aside>
    </main>
  );
}

useGLTF.preload(VENICE_MODEL);
