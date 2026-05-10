import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { AutoTourController } from './AutoTourController.jsx';
import { ManualWalkController } from './ManualWalkController.jsx';
import {
  buildWalkGraph,
  lngLatToLocal,
  measurePolyline,
  planRouteBetweenPois,
  samplePolyline,
} from './routeUtils.js';
import './amsterdam-vr.css';

const MANIFEST_URL = '/city/amsterdam-museumplein/manifest.json';
const amsterdamCopy = {
  en: {
    back: 'Back to Italy guide',
    topEyebrow: 'Local city VR',
    title: 'Amsterdam Museumplein',
    layerLabel: 'Amsterdam scene layers',
    layers: {
      buildings: 'Buildings',
      ground: 'Ground',
      route: 'Route',
      labels: 'Labels',
    },
    status: {
      loading: 'Loading local Museumplein data...',
      error: 'Failed to load local city data.',
      planned: 'Auto tour active',
      paused: 'Auto tour paused',
      arrived: 'Route complete',
      idle: 'Route ready',
      manual: 'Manual walk mode',
    },
    panel: {
      eyebrow: 'Isolated experiment',
      heading: 'Amsterdam Museumplein VR Lab',
      body: 'Local-first test area for city VR roaming. The scene reads manifest, POIs, route GeoJSON, and future GLB building tiles from public city assets.',
    },
    metrics: {
      area: 'Area',
      pois: 'POIs',
      groundLayers: 'Ground layers',
      buildingTiles: 'Building tiles',
      routeLength: 'Route length',
      visitTime: 'Visit time',
      curatedAnchors: 'curated anchors',
      localFeatures: 'local features',
      loaded: 'loaded',
      minutes: 'min',
    },
    planner: {
      eyebrow: 'Route planner',
      start: 'Start',
      mode: 'Mode',
      walk: 'Walk',
      manual: 'Manual',
      camera: 'Camera',
      followCamera: 'Follow',
      freeCamera: 'Free',
      destination: 'Destination',
      network: 'OSM network',
      progress: 'Progress',
      speed: 'Speed',
      tourSpeed: 'Movement speed',
      manualHint: 'Manual controls: mouse rotates camera only; W/S move by character facing, A/D turns character, Space jumps, Shift sprints, E dashes, Q grapples.',
      startTour: 'Start Tour',
      resumeTour: 'Resume Tour',
      manualWalk: 'Manual Walk',
      pause: 'Pause',
      reset: 'Reset',
      ariaProgress: 'Route progress',
    },
    focus: {
      eyebrow: 'Selected anchor',
      priority: 'Priority',
    },
    poiList: 'Museumplein points of interest',
    source: {
      eyebrow: 'Pipeline',
      items: [
        '3DBAG CityJSON converted to local GLB tiles.',
        'OpenStreetMap extract converted to local ground GeoJSON.',
        'Curated POIs and hand-authored loop route kept in public assets.',
      ],
    },
    sceneNote: 'local building tiles loaded',
    language: 'Language',
    english: 'EN',
    chinese: '中文',
  },
  zh: {
    back: '返回意大利导览',
    topEyebrow: '本地城市 VR',
    title: '阿姆斯特丹 Museumplein',
    layerLabel: '阿姆斯特丹场景图层',
    layers: {
      buildings: '建筑',
      ground: '地面',
      route: '路线',
      labels: '标签',
    },
    status: {
      loading: '正在加载 Museumplein 本地数据...',
      error: '本地城市数据加载失败。',
      planned: '自动漫游中',
      paused: '自动漫游已暂停',
      arrived: '路线已完成',
      idle: '路线已就绪',
      manual: '自由移动模式',
    },
    panel: {
      eyebrow: '独立实验',
      heading: '阿姆斯特丹 Museumplein VR 实验室',
      body: '这是一个独立的城市漫游测试区。场景会读取本地清单、兴趣点、路线 GeoJSON、地面图层和 GLB 建筑瓦片。',
    },
    metrics: {
      area: '区域',
      pois: '兴趣点',
      groundLayers: '地面图层',
      buildingTiles: '建筑瓦片',
      routeLength: '路线长度',
      visitTime: '游览时间',
      curatedAnchors: '个标记点',
      localFeatures: '个本地要素',
      loaded: '个已加载',
      minutes: '分钟',
    },
    planner: {
      eyebrow: '路线规划',
      start: '起点',
      mode: '模式',
      walk: '步行',
      manual: '手动',
      camera: '视角',
      followCamera: '跟随',
      freeCamera: '自由',
      destination: '终点',
      network: 'OSM 路网',
      progress: '进度',
      speed: '速度',
      tourSpeed: '移动速度',
      manualHint: '自由移动：鼠标只控制视角；W/S 按人物朝向前后移动，A/D 转身，Space 跳跃，Shift 冲刺，E 闪身，Q 钩锁。',
      startTour: '开始漫游',
      resumeTour: '继续漫游',
      manualWalk: '自由移动',
      pause: '暂停',
      reset: '重置',
      ariaProgress: '路线进度',
    },
    focus: {
      eyebrow: '当前标记点',
      priority: '优先级',
    },
    poiList: 'Museumplein 兴趣点',
    source: {
      eyebrow: '数据流程',
      items: [
        '3DBAG CityJSON 已转换为本地 GLB 建筑瓦片。',
        'OpenStreetMap 数据已转换为本地地面 GeoJSON。',
        '兴趣点和环线路线都保存在 public 资源目录中。',
      ],
    },
    sceneNote: '个本地建筑瓦片已加载',
    language: '语言',
    english: 'EN',
    chinese: '中文',
  },
};

const poiCopy = {
  zh: {
    types: {
      museum: '博物馆',
      performance: '演出场馆',
      park: '公园',
    },
    descriptions: {
      rijksmuseum: '位于 Museumplein 北侧的荷兰国家博物馆，主要展示荷兰艺术与历史。',
      'van-gogh-museum': '位于 Museumplein 西侧，专门收藏和展示梵高作品的博物馆。',
      'stedelijk-museum': '位于 Museumplein 西南侧的现代与当代艺术博物馆。',
      concertgebouw: '面向 Museumplein 的皇家音乐厅，是南侧重要文化地标。',
      'vondelpark-edge': '通向 Vondelpark 的西侧绿色入口，让漫游路线有更柔和的公共空间过渡。',
    },
  },
};

const MATERIALS = {
  base: new THREE.MeshStandardMaterial({ color: '#d8ddd5', roughness: 0.9, metalness: 0.02 }),
  park: new THREE.MeshStandardMaterial({ color: '#8eaf7a', roughness: 0.96 }),
  plaza: new THREE.MeshStandardMaterial({ color: '#d4c4a8', roughness: 0.9 }),
  road: new THREE.MeshStandardMaterial({ color: '#53616a', roughness: 0.78 }),
  path: new THREE.MeshStandardMaterial({ color: '#bcae91', roughness: 0.88 }),
  water: new THREE.MeshStandardMaterial({ color: '#84aeb7', roughness: 0.54, metalness: 0.02 }),
};

function formatMeters(value) {
  if (!Number.isFinite(value)) return '-';
  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
}

function getPoiType(poi, language) {
  return poiCopy[language]?.types?.[poi.type] ?? poi.type;
}

function getPoiDescription(poi, language) {
  return poiCopy[language]?.descriptions?.[poi.id] ?? poi.description;
}

function measureRouteMeters(route, center) {
  if (!route?.points) return 0;
  return measurePolyline(route.points);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return response.json();
}

function useAmsterdamLabData() {
  const [state, setState] = useState({
    status: 'loading',
    manifest: null,
    pois: [],
    route: null,
    groundLayers: null,
    buildingTiles: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const manifest = await fetchJson(MANIFEST_URL);
        const [pois, route, groundLayers, buildingTilePayload] = await Promise.all([
          fetchJson(manifest.files.pois),
          fetchJson(manifest.files.route),
          fetchJson(manifest.files.groundLayers),
          fetchJson(manifest.files.buildingTiles),
        ]);
        if (cancelled) return;
        setState({
          status: 'ready',
          manifest,
          pois,
          route,
          groundLayers,
          buildingTiles: buildingTilePayload.tiles ?? [],
        });
      } catch (error) {
        if (cancelled) return;
        setState((current) => ({ ...current, status: 'error', error }));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function localPoints(coordinates, center, y = 0.08) {
  return coordinates.map(([lon, lat]) => {
    const [x, , z] = lngLatToLocal(lon, lat, center);
    return new THREE.Vector3(x, y, z);
  });
}

function ThickLine({ coordinates, center, color = '#e36f3d', width = 2, y = 0.16 }) {
  const points = useMemo(() => localPoints(coordinates, center, y), [center, coordinates, y]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  if (points.length < 2) return null;
  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} linewidth={width} />
    </line>
  );
}

function RouteLine({ route, center }) {
  const coordinates = route?.features?.[0]?.geometry?.coordinates ?? [];
  return <ThickLine coordinates={coordinates} center={center} color="#f06b3f" width={3} y={0.34} />;
}

function PlannedRoute({ points, progressMeters }) {
  const fullGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const travelledPoints = useMemo(() => {
    if (!points.length) return [];
    const sample = samplePolyline(points, progressMeters);
    const out = points.slice(0, sample.segmentIndex + 1).map((point) => point.clone());
    out.push(sample.position);
    return out;
  }, [points, progressMeters]);
  const travelledGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(travelledPoints), [travelledPoints]);

  if (points.length < 2) return null;
  const start = points[0];
  const end = points[points.length - 1];

  return (
    <group>
      <line geometry={fullGeometry}>
        <lineBasicMaterial color="#b98152" transparent opacity={0.24} />
      </line>
      {travelledPoints.length >= 2 && (
        <line geometry={travelledGeometry}>
          <lineBasicMaterial color="#f6d7a2" transparent opacity={0.7} />
        </line>
      )}
      <RouteGoldParticles points={points} />
      <RoutePin point={start} color="#2f7d89" />
      <RoutePin point={end} color="#f06b3f" />
    </group>
  );
}

function RouteGoldParticles({ points }) {
  const groupRef = useRef(null);
  const count = Math.min(42, Math.max(14, Math.floor(measurePolyline(points) / 18)));
  const seeds = useMemo(() => (
    Array.from({ length: count }, (_, index) => ({
      offset: index / count,
      speed: 0.035 + (index % 5) * 0.006,
      scale: 0.12 + (index % 4) * 0.035,
    }))
  ), [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current || points.length < 2) return;
    const total = measurePolyline(points);
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, index) => {
      const seed = seeds[index];
      const sample = samplePolyline(points, ((seed.offset + t * seed.speed) % 1) * total);
      child.position.copy(sample.position);
      child.position.y += 0.36 + Math.sin(t * 4 + index) * 0.08;
      const pulse = seed.scale * (1.1 + Math.sin(t * 6 + index) * 0.28);
      child.scale.setScalar(pulse);
    });
  });

  return (
    <group ref={groupRef}>
      {seeds.map((seed, index) => (
        <mesh key={index} scale={seed.scale}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color={index % 3 === 0 ? '#fff7c7' : '#f3bc52'} transparent opacity={0.78} />
        </mesh>
      ))}
    </group>
  );
}

function RoutePin({ point, color }) {
  if (!point) return null;
  return (
    <group position={[point.x, point.y, point.z]}>
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.48, 20, 14]} />
        <meshStandardMaterial color={color} roughness={0.42} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 1.25, 12]} />
        <meshStandardMaterial color="#233544" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 1.08, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function PolygonLayer({ feature, center }) {
  const coordinates = feature.geometry.coordinates?.[0] ?? [];
  const shape = useMemo(() => {
    const projected = coordinates.map(([lon, lat]) => {
      const [x, , z] = lngLatToLocal(lon, lat, center);
      return new THREE.Vector2(x, z);
    });
    return new THREE.Shape(projected);
  }, [center, coordinates]);

  const geometry = useMemo(() => {
    const next = new THREE.ShapeGeometry(shape);
    next.rotateX(Math.PI / 2);
    return next;
  }, [shape]);

  const kind = feature.properties?.kind ?? 'plaza';
  return (
    <mesh geometry={geometry} position={[0, 0.06, 0]} receiveShadow>
      <primitive attach="material" object={MATERIALS[kind] ?? MATERIALS.plaza} />
    </mesh>
  );
}

function stripGeometryFromLine(coordinates, center, width = 6, y = 0.18) {
  const points = localPoints(coordinates, center, y);
  const vertices = [];
  const faces = [];

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[Math.max(index - 1, 0)];
    const next = points[Math.min(index + 1, points.length - 1)];
    const direction = new THREE.Vector3().subVectors(next, previous);
    if (direction.lengthSq() === 0) direction.set(1, 0, 0);
    direction.normalize();
    const normal = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(width / 2);
    vertices.push(
      current.x + normal.x, current.y, current.z + normal.z,
      current.x - normal.x, current.y, current.z - normal.z,
    );
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const base = index * 2;
    faces.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
}

function LineSurface({ feature, center }) {
  const geometry = useMemo(() => stripGeometryFromLine(
    feature.geometry.coordinates,
    center,
    feature.properties?.width ?? 6,
    0.18,
  ), [center, feature]);
  const kind = feature.properties?.kind ?? 'road';

  return (
    <mesh geometry={geometry} receiveShadow>
      <primitive attach="material" object={MATERIALS[kind] ?? MATERIALS.road} />
    </mesh>
  );
}

function GroundLayers({ layers, center }) {
  const features = layers?.features ?? [];
  const polygons = features.filter((feature) => feature.geometry?.type === 'Polygon');
  const lines = features.filter((feature) => feature.geometry?.type === 'LineString');

  return (
    <>
      {polygons.map((feature) => <PolygonLayer key={feature.properties?.id} feature={feature} center={center} />)}
      {lines.map((feature) => <LineSurface key={feature.properties?.id} feature={feature} center={center} />)}
    </>
  );
}

function PoiMarkers({ pois, center, selectedPoiId, showLabels, language, onSelectPoi }) {
  return pois.map((poi) => {
    const [x, , z] = lngLatToLocal(poi.lon, poi.lat, center);
    const isPrimary = poi.priority >= 9;
    const isSelected = poi.id === selectedPoiId;
    return (
      <group key={poi.id} position={[x, 0, z]} onClick={(event) => { event.stopPropagation(); onSelectPoi(poi.id); }}>
        <mesh position={[0, isPrimary ? 4.2 : 3.2, 0]} scale={isSelected ? [1.16, 1.16, 1.16] : [1, 1, 1]} castShadow>
          <boxGeometry args={[isPrimary ? 5.4 : 4.2, 2.1, 0.34]} />
          <meshStandardMaterial color={isSelected ? '#b98152' : (isPrimary ? '#f06b3f' : '#2f7d89')} roughness={0.42} metalness={0.06} />
        </mesh>
        <mesh position={[0, isPrimary ? 3.02 : 2.25, -0.24]} castShadow>
          <boxGeometry args={[isPrimary ? 5.8 : 4.6, 0.24, 0.22]} />
          <meshStandardMaterial color="#f4eee2" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 3.2, 10]} />
          <meshStandardMaterial color="#233544" roughness={0.5} />
        </mesh>
        {showLabels && (
          <Html distanceFactor={95} position={[0, isPrimary ? 4.25 : 3.25, 0.28]} center className="amsterdam-vr-label">
            <strong>{poi.name}</strong>
            <span>{getPoiType(poi, language)}</span>
          </Html>
        )}
      </group>
    );
  });
}

function tintBuildingScene(scene, tileId) {
  const palette = ['#d5c7ad', '#c9d1c8', '#d8d2c1', '#c7d5d6', '#d6c2b3'];
  const hash = String(tileId ?? '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const color = palette[hash % palette.length];
  scene.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.84,
      metalness: 0.02,
    });
  });
}

function BuildingTile({ tile }) {
  const gltf = useGLTF(tile.url);
  useMemo(() => tintBuildingScene(gltf.scene, tile.id), [gltf.scene, tile.id]);
  return (
    <primitive
      object={gltf.scene}
      position={tile.position ?? [0, 0, 0]}
      rotation={tile.rotation ?? [0, 0, 0]}
      scale={tile.scale ?? 1}
    />
  );
}

function BuildingTiles({ tiles }) {
  if (!tiles.length) return null;
  return tiles.map((tile) => <BuildingTile key={tile.id ?? tile.url} tile={tile} />);
}

function AmsterdamScene({
  data,
  copy,
  language,
  plannedRoute,
  selectedPoiId,
  showBuildings,
  showGround,
  showRoute,
  showLabels,
  cameraMode,
  tourMode,
  tourResetToken,
  routeProgress,
  tourSpeed,
  onTourProgress,
  onTourNearestPoi,
  onTourArrive,
  onSelectPoi,
}) {
  const center = data.manifest.center;
  const selectedPoi = data.pois.find((poi) => poi.id === selectedPoiId) ?? data.pois[0];
  const cameraTarget = selectedPoi ? lngLatToLocal(selectedPoi.lon, selectedPoi.lat, center) : [0, 0, 0];
  const routePoints = plannedRoute?.points ?? [];
  const startPoi = data.pois.find((poi) => poi.id === plannedRoute?.startPoi?.id) ?? data.pois[0];

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 160, 180]} fov={46} />
      <OrbitControls
        key={selectedPoi?.id ?? 'overview'}
        enabled={cameraMode === 'free' || !['planned', 'manual'].includes(tourMode)}
        target={[cameraTarget[0], 0, cameraTarget[2]]}
        maxPolarAngle={Math.PI * 0.48}
        minDistance={35}
        maxDistance={360}
      />
      <ambientLight intensity={0.75} />
      <directionalLight position={[80, 140, 80]} intensity={2.1} castShadow />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[260, 190, 1, 1]} />
        <primitive attach="material" object={MATERIALS.base} />
      </mesh>

      {showGround && <GroundLayers layers={data.groundLayers} center={center} />}
      {showRoute && <PlannedRoute points={routePoints} progressMeters={routeProgress.progressMeters} />}
      <PoiMarkers pois={data.pois} center={center} selectedPoiId={selectedPoiId} showLabels={showLabels} language={language} onSelectPoi={onSelectPoi} />
      <AutoTourController
        routePoints={routePoints}
        pois={data.pois}
        center={center}
        mode={tourMode}
        cameraMode={cameraMode}
        speedMetersPerSecond={tourSpeed}
        resetToken={tourResetToken}
        onProgress={onTourProgress}
        onNearestPoi={onTourNearestPoi}
        onArrive={onTourArrive}
      />
      <ManualWalkController
        active={tourMode === 'manual'}
        startPoi={startPoi}
        pois={data.pois}
        center={center}
        bounds={data.manifest.bounds}
        cameraMode={cameraMode}
        speedMetersPerSecond={tourSpeed}
        grapplePoi={selectedPoi}
        resetToken={tourResetToken}
        onNearestPoi={onTourNearestPoi}
      />

      {showBuildings && (
        <Suspense fallback={null}>
          <BuildingTiles tiles={data.buildingTiles} />
        </Suspense>
      )}

      <Html position={[-116, 4, -82]} className="amsterdam-vr-scene-note">
        <strong>{plannedRoute?.startPoi?.name ?? 'Rijksmuseum'} {'->'} {plannedRoute?.destinationPoi?.name ?? '-'}</strong>
        <span>{data.buildingTiles.length} {copy.sceneNote}</span>
      </Html>
    </>
  );
}

export function AmsterdamVrLab() {
  const data = useAmsterdamLabData();
  const [language, setLanguage] = useState('zh');
  const [selectedPoiId, setSelectedPoiId] = useState('rijksmuseum');
  const [destinationPoiId, setDestinationPoiId] = useState('van-gogh-museum');
  const [showBuildings, setShowBuildings] = useState(true);
  const [showGround, setShowGround] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [cameraMode, setCameraMode] = useState('follow');
  const [tourMode, setTourMode] = useState('idle');
  const [tourSpeed, setTourSpeed] = useState(7);
  const [tourResetToken, setTourResetToken] = useState(0);
  const [routeProgress, setRouteProgress] = useState({ progressMeters: 0, totalMeters: 0, percent: 0, mode: 'idle' });
  const layerCount = data.groundLayers?.features?.length ?? 0;
  const selectedPoi = data.pois.find((poi) => poi.id === selectedPoiId) ?? data.pois[0];
  const walkGraph = useMemo(() => {
    if (!data.manifest || !data.groundLayers) return null;
    return buildWalkGraph(data.groundLayers, data.manifest.center);
  }, [data.groundLayers, data.manifest]);
  const plannedRoute = useMemo(() => {
    if (!walkGraph || !data.manifest) return null;
    return planRouteBetweenPois(walkGraph, data.pois, 'rijksmuseum', destinationPoiId, data.manifest.center);
  }, [data.manifest, data.pois, destinationPoiId, walkGraph]);
  const routeMeters = plannedRoute?.distanceMeters ?? 0;
  const totalVisitMinutes = data.pois.reduce((sum, poi) => sum + (poi.visitDurationMin ?? 0), 0);
  const routeName = data.route?.features?.[0]?.properties?.name ?? 'Museumplein loop';
  const copy = amsterdamCopy[language] ?? amsterdamCopy.en;
  const routePercent = Math.round((routeProgress.percent || 0) * 100);
  const tourStatusLabel = tourMode === 'planned'
    ? copy.status.planned
    : tourMode === 'paused'
      ? copy.status.paused
      : tourMode === 'arrived'
        ? copy.status.arrived
        : tourMode === 'manual'
          ? copy.status.manual
          : copy.status.idle;

  const startTour = useCallback(() => {
    setShowRoute(true);
    setTourMode('planned');
  }, []);

  const startManualWalk = useCallback(() => {
    setTourMode('manual');
    setTourResetToken((value) => value + 1);
  }, []);

  const pauseTour = useCallback(() => {
    setTourMode('paused');
  }, []);

  const resetTour = useCallback(() => {
    setTourMode('idle');
    setTourResetToken((value) => value + 1);
    setRouteProgress({ progressMeters: 0, totalMeters: routeMeters, percent: 0, mode: 'idle' });
    setSelectedPoiId('rijksmuseum');
  }, [routeMeters]);

  useEffect(() => {
    setTourMode('idle');
    setTourResetToken((value) => value + 1);
    setRouteProgress({ progressMeters: 0, totalMeters: routeMeters, percent: 0, mode: 'idle' });
    setSelectedPoiId(destinationPoiId);
  }, [destinationPoiId, routeMeters]);

  const handleTourProgress = useCallback((nextProgress) => {
    setRouteProgress(nextProgress);
  }, []);

  const handleTourNearestPoi = useCallback((poi) => {
    setSelectedPoiId(poi.id);
  }, []);

  const handleTourArrive = useCallback(() => {
    setTourMode((current) => (current === 'planned' ? 'arrived' : current));
  }, []);

  return (
    <main className={`amsterdam-vr ${language === 'zh' ? 'is-zh' : ''}`}>
      <header className="amsterdam-vr__topbar">
        <a href="#/" className="amsterdam-vr__back">{copy.back}</a>
        <div className="amsterdam-vr__topbar-title">
          <span>{copy.topEyebrow}</span>
          <strong>{copy.title}</strong>
        </div>
        <div className="amsterdam-vr__topbar-actions">
          <div className="amsterdam-vr__language" role="group" aria-label={copy.language}>
            <button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>{copy.english}</button>
            <button type="button" className={language === 'zh' ? 'is-active' : ''} onClick={() => setLanguage('zh')}>{copy.chinese}</button>
          </div>
          <div className="amsterdam-vr__layer-toggles" role="group" aria-label={copy.layerLabel}>
            <button type="button" className={showBuildings ? 'is-active' : ''} onClick={() => setShowBuildings((value) => !value)}>{copy.layers.buildings}</button>
            <button type="button" className={showGround ? 'is-active' : ''} onClick={() => setShowGround((value) => !value)}>{copy.layers.ground}</button>
            <button type="button" className={showRoute ? 'is-active' : ''} onClick={() => setShowRoute((value) => !value)}>{copy.layers.route}</button>
            <button type="button" className={showLabels ? 'is-active' : ''} onClick={() => setShowLabels((value) => !value)}>{copy.layers.labels}</button>
          </div>
        </div>
      </header>

      <section className="amsterdam-vr__scene" aria-label="Amsterdam Museumplein VR lab">
        {data.status === 'ready' && (
          <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
            <color attach="background" args={['#eef5f2']} />
            <fog attach="fog" args={['#eef5f2', 180, 430]} />
            <AmsterdamScene
              data={data}
              copy={copy}
              language={language}
              plannedRoute={plannedRoute}
              selectedPoiId={selectedPoi?.id}
              showBuildings={showBuildings}
              showGround={showGround}
              showRoute={showRoute}
              showLabels={showLabels}
              cameraMode={cameraMode}
              tourMode={tourMode}
              tourResetToken={tourResetToken}
              routeProgress={routeProgress}
              tourSpeed={tourSpeed}
              onTourProgress={handleTourProgress}
              onTourNearestPoi={handleTourNearestPoi}
              onTourArrive={handleTourArrive}
              onSelectPoi={setSelectedPoiId}
            />
          </Canvas>
        )}
        {data.status === 'loading' && <div className="amsterdam-vr__state">{copy.status.loading}</div>}
        {data.status === 'error' && <div className="amsterdam-vr__state">{copy.status.error}</div>}
        <div className="amsterdam-vr__hud" aria-live="polite">
          <span>{data.status === 'ready' ? tourStatusLabel : data.status}</span>
          <strong>Rijksmuseum {'->'} {plannedRoute?.destinationPoi?.name ?? routeName}</strong>
          <small>{formatMeters(routeProgress.progressMeters)} / {formatMeters(routeMeters)} / {routePercent}%</small>
        </div>
      </section>

      <aside className="amsterdam-vr__panel">
        <p className="amsterdam-vr__eyebrow">{copy.panel.eyebrow}</p>
        <h1>{copy.panel.heading}</h1>
        <p>{copy.panel.body}</p>

        <dl className="amsterdam-vr__metrics">
          <div><dt>{copy.metrics.area}</dt><dd>Museumplein, Amsterdam</dd></div>
          <div><dt>{copy.metrics.pois}</dt><dd>{data.pois.length || '-'} {copy.metrics.curatedAnchors}</dd></div>
          <div><dt>{copy.metrics.groundLayers}</dt><dd>{layerCount || 0} {copy.metrics.localFeatures}</dd></div>
          <div><dt>{copy.metrics.buildingTiles}</dt><dd>{data.buildingTiles.length || 0} {copy.metrics.loaded}</dd></div>
          <div><dt>{copy.metrics.routeLength}</dt><dd>{formatMeters(routeMeters)}</dd></div>
          <div><dt>{copy.metrics.visitTime}</dt><dd>{totalVisitMinutes || 0} {copy.metrics.minutes}</dd></div>
        </dl>

        <section className="amsterdam-vr__planner">
          <div className="amsterdam-vr__planner-head">
            <div>
              <p className="amsterdam-vr__eyebrow">{copy.planner.eyebrow}</p>
              <h2>Rijksmuseum {'->'} {plannedRoute?.destinationPoi?.name ?? '-'}</h2>
            </div>
            <strong>{formatMeters(routeMeters)}</strong>
          </div>
          <div className="amsterdam-vr__progress" aria-label={copy.planner.ariaProgress}>
            <span style={{ width: `${routePercent}%` }} />
          </div>
          <div className="amsterdam-vr__planner-grid">
            <div><dt>{copy.planner.start}</dt><dd>Rijksmuseum</dd></div>
            <div><dt>{copy.planner.destination}</dt><dd>{plannedRoute?.destinationPoi?.name ?? '-'}</dd></div>
            <div><dt>{copy.planner.mode}</dt><dd>{tourMode === 'manual' ? copy.planner.manual : copy.planner.walk}</dd></div>
            <div><dt>{copy.planner.camera}</dt><dd>{cameraMode === 'free' ? copy.planner.freeCamera : copy.planner.followCamera}</dd></div>
            <div><dt>{copy.planner.network}</dt><dd>{walkGraph?.featureCount ?? 0} / {walkGraph?.nodes?.size ?? 0}</dd></div>
            <div><dt>{copy.planner.progress}</dt><dd>{routePercent}%</dd></div>
            <div><dt>{copy.planner.speed}</dt><dd>{tourSpeed} m/s</dd></div>
          </div>
          <label className="amsterdam-vr__select">
            <span>{copy.planner.destination}</span>
            <select value={destinationPoiId} onChange={(event) => setDestinationPoiId(event.target.value)}>
              {data.pois.filter((poi) => poi.id !== 'rijksmuseum').map((poi) => (
                <option key={poi.id} value={poi.id}>{poi.name}</option>
              ))}
            </select>
          </label>
          <label className="amsterdam-vr__speed">
            <span>{copy.planner.tourSpeed}</span>
            <input
              type="range"
              min="3"
              max="12"
              step="1"
              value={tourSpeed}
              onChange={(event) => setTourSpeed(Number(event.target.value))}
            />
          </label>
          <div className="amsterdam-vr__planner-actions">
            <button type="button" className="is-primary" onClick={startTour} disabled={!plannedRoute?.points?.length}>
              {tourMode === 'paused' ? copy.planner.resumeTour : copy.planner.startTour}
            </button>
            <button type="button" onClick={startManualWalk}>{copy.planner.manualWalk}</button>
            <button type="button" onClick={() => setCameraMode((value) => (value === 'follow' ? 'free' : 'follow'))}>
              {cameraMode === 'follow' ? copy.planner.freeCamera : copy.planner.followCamera}
            </button>
            <button type="button" onClick={pauseTour} disabled={tourMode !== 'planned'}>{copy.planner.pause}</button>
            <button type="button" onClick={resetTour}>{copy.planner.reset}</button>
          </div>
          <p className="amsterdam-vr__hint">{copy.planner.manualHint}</p>
        </section>

        {selectedPoi && (
          <section className="amsterdam-vr__focus">
            <p className="amsterdam-vr__eyebrow">{copy.focus.eyebrow}</p>
            <h2>{selectedPoi.name}</h2>
            <p>{getPoiDescription(selectedPoi, language)}</p>
            <div className="amsterdam-vr__chips">
              <span>{getPoiType(selectedPoi, language)}</span>
              <span>{selectedPoi.visitDurationMin} {copy.metrics.minutes}</span>
              <span>{copy.focus.priority} {selectedPoi.priority}</span>
            </div>
          </section>
        )}

        <section className="amsterdam-vr__poi-list" aria-label={copy.poiList}>
          {data.pois.map((poi) => (
            <button
              key={poi.id}
              type="button"
              className={poi.id === selectedPoi?.id ? 'is-active' : ''}
              onClick={() => {
                setSelectedPoiId(poi.id);
                if (poi.id !== 'rijksmuseum') setDestinationPoiId(poi.id);
              }}
            >
              <span>{getPoiType(poi, language)}</span>
              <strong>{poi.name}</strong>
            </button>
          ))}
        </section>

        <section className="amsterdam-vr__source">
          <p className="amsterdam-vr__eyebrow">{copy.source.eyebrow}</p>
          <ul>
            {copy.source.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </aside>
    </main>
  );
}
