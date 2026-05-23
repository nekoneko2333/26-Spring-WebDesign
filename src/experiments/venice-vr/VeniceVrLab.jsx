import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Suspense, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import '../amsterdam-vr/amsterdam-vr.css';
import './venice-vr.css';

const VENICE_MODEL = '/models/venice.glb';

const MODEL_BOUNDS = {
  min: { x: 0, y: -0.009610905063611416, z: 0 },
  max: { x: 22.691758567816578, y: 0.3001077216941471, z: 12.377322853828163 },
  center: { x: 11.345879283908289, y: 0.14524840831526786, z: 6.188661426241907 },
  size: { x: 22.691758567816578, y: 0.3097186267577585, z: 12.377322855172512 },
};

const VENICE_GEO = {
  center: { lon: 12.3353, lat: 45.4386 },
  bounds: {
    west: 12.3000,
    east: 12.3706,
    south: 45.4250,
    north: 45.4522,
  },
};

const SATELLITE_FIT_NOTE = 'Manual top-down fit: building mass, flat canal bands, and Grand Canal bridge anchors are matched against the Venice satellite footprint.';

const VISUAL_FIT_CONTROLS = [
  { id: 'rialto', target: { x: 575, y: 320 } },
  { id: 'san-marco', target: { x: 675, y: 425 } },
  { id: 'doge-palace', target: { x: 695, y: 445 } },
  { id: 'accademia', target: { x: 475, y: 430 } },
  { id: 'santa-maria-salute', target: { x: 595, y: 475 } },
  { id: 'arsenale', target: { x: 855, y: 385 } },
];

const VENICE_POIS = [
  {
    id: 'rialto',
    name: 'Rialto Bridge',
    zh: '里亚托桥',
    lon: 12.3359,
    lat: 45.4380,
    type: 'bridge',
    description: 'Historic bridge crossing the Grand Canal.',
  },
  {
    id: 'san-marco',
    name: "St Mark's Basilica",
    zh: '圣马可圣殿',
    lon: 12.3397,
    lat: 45.4346,
    type: 'landmark',
    description: 'Venice landmark on Piazza San Marco.',
  },
  {
    id: 'doge-palace',
    name: "Doge's Palace",
    zh: '总督宫',
    lon: 12.3404,
    lat: 45.4337,
    type: 'palace',
    description: 'Gothic palace beside the lagoon.',
  },
  {
    id: 'accademia',
    name: 'Gallerie dell Accademia',
    zh: '学院美术馆',
    lon: 12.3281,
    lat: 45.4310,
    type: 'museum',
    description: 'Museum and bridge district on the Grand Canal.',
  },
  {
    id: 'santa-maria-salute',
    name: 'Santa Maria della Salute',
    zh: '安康圣母圣殿',
    lon: 12.3342,
    lat: 45.4307,
    type: 'church',
    description: 'Domed basilica at the mouth of the Grand Canal.',
  },
  {
    id: 'arsenale',
    name: 'Venetian Arsenal',
    zh: '威尼斯军械库',
    lon: 12.3499,
    lat: 45.4354,
    type: 'district',
    description: 'Historic shipyard and eastern city anchor.',
  },
];

const DEFAULT_ROUTE = ['rialto', 'san-marco', 'doge-palace', 'santa-maria-salute', 'accademia'];
const GRAND_CANAL_REFERENCE = [
  [12.3204, 45.4349],
  [12.3266, 45.4323],
  [12.3312, 45.4331],
  [12.3359, 45.4380],
  [12.3382, 45.4363],
  [12.3397, 45.4346],
];

function lngLatToModelPlane(lon, lat) {
  const u = (lon - VENICE_GEO.bounds.west) / (VENICE_GEO.bounds.east - VENICE_GEO.bounds.west);
  const v = (VENICE_GEO.bounds.north - lat) / (VENICE_GEO.bounds.north - VENICE_GEO.bounds.south);
  return {
    x: (u - 0.5) * MODEL_BOUNDS.size.x,
    z: (v - 0.5) * MODEL_BOUNDS.size.z,
  };
}

function topDownPixelToModel({ x, y }) {
  return {
    x: (x / 1200 - 0.5) * MODEL_BOUNDS.size.x,
    z: (y / 655 - 0.5) * MODEL_BOUNDS.size.z,
  };
}

function solveLeastSquaresAffine(axis) {
  const controls = VISUAL_FIT_CONTROLS.map((control) => {
    const poi = VENICE_POIS.find((item) => item.id === control.id);
    return {
      source: lngLatToModelPlane(poi.lon, poi.lat),
      target: topDownPixelToModel(control.target),
    };
  });
  const normal = new THREE.Matrix3().set(0, 0, 0, 0, 0, 0, 0, 0, 0);
  const rhs = new THREE.Vector3();

  controls.forEach(({ source, target }) => {
    const row = [source.x, source.z, 1];
    for (let r = 0; r < 3; r += 1) {
      rhs.setComponent(r, rhs.getComponent(r) + row[r] * target[axis]);
      for (let c = 0; c < 3; c += 1) {
        normal.elements[c * 3 + r] += row[r] * row[c];
      }
    }
  });

  return rhs.applyMatrix3(normal.clone().invert());
}

const VISUAL_FIT = {
  x: solveLeastSquaresAffine('x'),
  z: solveLeastSquaresAffine('z'),
};

function applyVisualFit(point) {
  return {
    x: VISUAL_FIT.x.x * point.x + VISUAL_FIT.x.y * point.z + VISUAL_FIT.x.z,
    z: VISUAL_FIT.z.x * point.x + VISUAL_FIT.z.y * point.z + VISUAL_FIT.z.z,
  };
}

function applyCalibration(point, calibration) {
  const visualPoint = applyVisualFit(point);
  const angle = (calibration.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = visualPoint.x * calibration.geoScale;
  const z = visualPoint.z * calibration.geoScale;
  return new THREE.Vector3(
    x * cos - z * sin + calibration.offsetX,
    calibration.poiHeight,
    x * sin + z * cos + calibration.offsetZ,
  );
}

function poiToWorld(poi, calibration) {
  return applyCalibration(lngLatToModelPlane(poi.lon, poi.lat), calibration);
}

function createGrandCanalRoute(calibration) {
  return GRAND_CANAL_REFERENCE.map(([lon, lat]) => applyCalibration(lngLatToModelPlane(lon, lat), calibration));
}

function measureRoute(points) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += points[index - 1].distanceTo(points[index]);
  return total;
}

function sampleRoute(points, progress) {
  if (!points.length) return { position: new THREE.Vector3(), direction: new THREE.Vector3(0, 0, -1), done: true };
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
      return { position, direction, done: target >= total, total };
    }
    walked += segment;
  }
  return { position: points.at(-1).clone(), direction: new THREE.Vector3(0, 0, -1), done: true, total };
}

function VeniceModel({ calibration }) {
  const { scene } = useGLTF(VENICE_MODEL);
  const model = useMemo(() => scene.clone(true), [scene]);

  return (
    <group
      rotation={[0, (calibration.modelRotationDeg * Math.PI) / 180, 0]}
      position={[
        calibration.modelOffsetX - MODEL_BOUNDS.center.x * calibration.modelScale,
        -MODEL_BOUNDS.min.y * calibration.modelScale,
        calibration.modelOffsetZ - MODEL_BOUNDS.center.z * calibration.modelScale,
      ]}
      scale={calibration.modelScale}
    >
      <primitive object={model} />
    </group>
  );
}

function PoiMarkers({ pois, selectedId, calibration, onSelect }) {
  return (
    <>
      {pois.map((poi) => {
        const position = poiToWorld(poi, calibration);
        const isSelected = poi.id === selectedId;
        return (
          <group key={poi.id} position={position}>
            <mesh position={[0, 0.035, 0]}>
              <sphereGeometry args={[isSelected ? 0.045 : 0.028, 14, 10]} />
              <meshStandardMaterial color={isSelected ? '#f08b4f' : '#167ca4'} emissive={isSelected ? '#7a2b0d' : '#07324a'} emissiveIntensity={0.35} />
            </mesh>
            <line>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[new Float32Array([-0.09, 0.04, 0, 0.09, 0.04, 0, 0, 0.04, -0.09, 0, 0.04, 0.09]), 3]} />
              </bufferGeometry>
              <lineBasicMaterial color={isSelected ? '#f08b4f' : '#167ca4'} transparent opacity={0.9} />
            </line>
            <Html center distanceFactor={6} position={[0, 0.24, 0]}>
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

function RouteLine({ points, color = '#0b81aa', opacity = 0.82, yOffset = 0.12 }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(points.length * 3);
    points.forEach((point, index) => {
      arr[index * 3] = point.x;
      arr[index * 3 + 1] = point.y + yOffset;
      arr[index * 3 + 2] = point.z;
    });
    return arr;
  }, [points, yOffset]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  );
}

function VeniceTourController({ active, routePoints, speed, onProgress }) {
  const markerRef = useRef(null);
  const progressRef = useRef(0);
  const lastReportRef = useRef(0);

  useFrame(({ camera }, delta) => {
    if (!routePoints.length) return;
    const total = measureRoute(routePoints);
    if (active) progressRef.current = (progressRef.current + speed * delta) % Math.max(total, 1);
    const sample = sampleRoute(routePoints, progressRef.current);
    const direction = sample.direction.lengthSq() ? sample.direction : new THREE.Vector3(0, 0, -1);

    if (markerRef.current) {
      markerRef.current.position.copy(sample.position);
      markerRef.current.rotation.y = Math.atan2(direction.x, direction.z);
    }

    if (active) {
      const side = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(0.75);
      const cameraPos = sample.position.clone().add(direction.clone().multiplyScalar(-2.8)).add(side).add(new THREE.Vector3(0, 2.2, 0));
      const target = sample.position.clone().add(direction.clone().multiplyScalar(1.8));
      target.y = 0.36;
      camera.position.lerp(cameraPos, 0.08);
      camera.lookAt(target);
    }

    const now = performance.now();
    if (now - lastReportRef.current > 160) {
      lastReportRef.current = now;
      onProgress?.({ meters: progressRef.current, total });
    }
  });

  return (
    <group ref={markerRef}>
      <mesh position={[0, 0.16, 0]}>
        <coneGeometry args={[0.06, 0.16, 4]} />
        <meshStandardMaterial color="#f08b4f" roughness={0.45} />
      </mesh>
    </group>
  );
}

function VeniceScene({ calibration, selectedPoiId, routeIds, tourActive, speed, onProgress, onSelectPoi }) {
  const routePois = routeIds.map((id) => VENICE_POIS.find((poi) => poi.id === id)).filter(Boolean);
  const routePoints = routePois.length > 1
    ? routePois.map((poi) => poiToWorld(poi, calibration))
    : createGrandCanalRoute(calibration);
  const canalPoints = createGrandCanalRoute(calibration);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 18, 26]} fov={42} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[14, 26, 16]} intensity={2.2} />
      <Suspense fallback={null}>
        <VeniceModel calibration={calibration} />
      </Suspense>
      <gridHelper args={[34, 34, '#93b8c7', '#d7e5e8']} position={[0, -0.02, 0]} />
      <RouteLine points={canalPoints} color="#247fa8" opacity={0.38} yOffset={0.018} />
      <RouteLine points={routePoints} color="#f08b4f" opacity={0.9} yOffset={0.032} />
      <PoiMarkers pois={VENICE_POIS} selectedId={selectedPoiId} calibration={calibration} onSelect={onSelectPoi} />
      <VeniceTourController active={tourActive} routePoints={routePoints} speed={speed} onProgress={onProgress} />
      {!tourActive && <OrbitControls makeDefault target={[0, 0, 0]} maxDistance={70} maxPolarAngle={Math.PI * 0.48} />}
    </>
  );
}

function formatMeters(value) {
  if (!Number.isFinite(value)) return '-';
  return value >= 1000 ? `${(value / 1000).toFixed(2)} km` : `${Math.round(value)} m`;
}

function modelPointToMiniMap(point) {
  return {
    x: ((point.x / MODEL_BOUNDS.size.x) + 0.5) * 100,
    y: ((point.z / MODEL_BOUNDS.size.z) + 0.5) * 62,
  };
}

function MiniCalibrationMap({ calibration, selectedPoiId }) {
  const canal = GRAND_CANAL_REFERENCE
    .map(([lon, lat]) => modelPointToMiniMap(applyCalibration(lngLatToModelPlane(lon, lat), { ...calibration, offsetX: 0, offsetZ: 0, poiHeight: 0 })))
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  return (
    <section className="venice-vr__mini-map">
      <h2>Top-down calibration</h2>
      <svg viewBox="0 0 100 62" role="img" aria-label="Venice coordinate calibration preview">
        <rect x="0.8" y="0.8" width="98.4" height="60.4" rx="2" />
        <path className="is-canal" d={canal} />
        {VENICE_POIS.map((poi) => {
          const point = modelPointToMiniMap(applyCalibration(lngLatToModelPlane(poi.lon, poi.lat), { ...calibration, offsetX: 0, offsetZ: 0, poiHeight: 0 }));
          return (
            <g key={poi.id} className={poi.id === selectedPoiId ? 'is-active' : ''}>
              <circle cx={point.x} cy={point.y} r={poi.id === selectedPoiId ? 1.9 : 1.25} />
              <title>{poi.name}</title>
            </g>
          );
        })}
      </svg>
      <p>{SATELLITE_FIT_NOTE} Blue line is the Grand Canal reference; dots are real POI coordinates projected through the same fit.</p>
    </section>
  );
}

export function VeniceVrLab() {
  const [selectedPoiId, setSelectedPoiId] = useState('rialto');
  const [routeIds, setRouteIds] = useState(DEFAULT_ROUTE);
  const [tourActive, setTourActive] = useState(false);
  const [progress, setProgress] = useState({ meters: 0, total: 0 });
  const [speed, setSpeed] = useState(8);
  const [calibration, setCalibration] = useState({
    geoScale: 1,
    rotationDeg: 0,
    offsetX: 0,
    offsetZ: 0,
    poiHeight: 0.34,
    modelScale: 1,
    modelRotationDeg: 0,
    modelOffsetX: 0,
    modelOffsetZ: 0,
  });

  const selectedPoi = VENICE_POIS.find((poi) => poi.id === selectedPoiId) ?? VENICE_POIS[0];

  const updateCalibration = (key, value) => {
    setCalibration((current) => ({ ...current, [key]: Number(value) }));
  };

  const toggleRouteStop = (id) => {
    setRouteIds((current) => {
      if (current.includes(id)) return current.length > 2 ? current.filter((item) => item !== id) : current;
      return [...current, id];
    });
  };

  return (
    <main className="venice-vr">
      <header className="venice-vr__topbar">
        <a className="venice-vr__back" href="#/concepts">Back to 04</a>
        <div className="venice-vr__topbar-title">
          <span>Experimental city roaming</span>
          <strong>Venice VR Lab</strong>
        </div>
        <div className="venice-vr__topbar-actions">
          <button type="button" onClick={() => setTourActive((value) => !value)}>{tourActive ? 'Pause tour' : 'Start tour'}</button>
        </div>
      </header>

      <section className="venice-vr__scene">
        <Canvas dpr={[1, 1.6]} gl={{ antialias: true }}>
          <color attach="background" args={['#eef7f8']} />
          <fog attach="fog" args={['#eef7f8', 110, 360]} />
          <VeniceScene
            calibration={calibration}
            selectedPoiId={selectedPoiId}
            routeIds={routeIds}
            tourActive={tourActive}
            speed={speed}
            onProgress={setProgress}
            onSelectPoi={setSelectedPoiId}
          />
        </Canvas>
        <div className="venice-vr__hud">
          <span>Route progress</span>
          <strong>{formatMeters(progress.meters)} / {formatMeters(progress.total)}</strong>
          <small>Model: /models/venice.glb</small>
        </div>
      </section>

      <aside className="venice-vr__panel">
        <p className="venice-vr__eyebrow">Coordinate binding</p>
        <h1>Venice city model</h1>
        <p>
          This page maps real Venice coordinates onto the local model plane with a manual top-down satellite fit. Use the calibration controls only for final visual trimming.
        </p>

        <section className="venice-vr__metrics">
          <article><span>POIs</span><strong>{VENICE_POIS.length}</strong></article>
          <article><span>Route</span><strong>{routeIds.length}</strong></article>
          <article><span>Fit anchors</span><strong>{VISUAL_FIT_CONTROLS.length}</strong></article>
          <article><span>Speed</span><strong>{speed} m/s</strong></article>
        </section>

        <section className="venice-vr__planner">
          <h2>Selected anchor</h2>
          <p><strong>{selectedPoi.name}</strong><br />{selectedPoi.description}</p>
          <code>{selectedPoi.lon.toFixed(5)}, {selectedPoi.lat.toFixed(5)}</code>
        </section>

        <MiniCalibrationMap calibration={calibration} selectedPoiId={selectedPoiId} />

        <section className="venice-vr__poi-list">
          <h2>Venice POIs</h2>
          {VENICE_POIS.map((poi) => (
            <button key={poi.id} type="button" className={poi.id === selectedPoiId ? 'is-active' : ''} onClick={() => setSelectedPoiId(poi.id)}>
              <span>{poi.type}</span>
              <strong>{poi.name}</strong>
              <small>{poi.lon.toFixed(5)}, {poi.lat.toFixed(5)}</small>
            </button>
          ))}
        </section>

        <section className="venice-vr__route-editor">
          <h2>Route stops</h2>
          {VENICE_POIS.map((poi) => (
            <label key={poi.id}>
              <input type="checkbox" checked={routeIds.includes(poi.id)} onChange={() => toggleRouteStop(poi.id)} />
              {poi.name}
            </label>
          ))}
        </section>

        <section className="venice-vr__calibration">
          <h2>Calibration</h2>
          <label>Geo scale <input type="range" min="0.72" max="1.32" step="0.01" value={calibration.geoScale} onChange={(event) => updateCalibration('geoScale', event.target.value)} /><span>{calibration.geoScale}</span></label>
          <label>Geo rotation <input type="range" min="-180" max="180" step="1" value={calibration.rotationDeg} onChange={(event) => updateCalibration('rotationDeg', event.target.value)} /><span>{calibration.rotationDeg} deg</span></label>
          <label>Geo X <input type="range" min="-8" max="8" step="0.1" value={calibration.offsetX} onChange={(event) => updateCalibration('offsetX', event.target.value)} /><span>{calibration.offsetX}</span></label>
          <label>Geo Z <input type="range" min="-8" max="8" step="0.1" value={calibration.offsetZ} onChange={(event) => updateCalibration('offsetZ', event.target.value)} /><span>{calibration.offsetZ}</span></label>
          <label>POI height <input type="range" min="0.08" max="0.8" step="0.01" value={calibration.poiHeight} onChange={(event) => updateCalibration('poiHeight', event.target.value)} /><span>{calibration.poiHeight}</span></label>
          <label>Model scale <input type="range" min="0.72" max="1.32" step="0.01" value={calibration.modelScale} onChange={(event) => updateCalibration('modelScale', event.target.value)} /><span>{calibration.modelScale}</span></label>
          <label>Model rotation <input type="range" min="-180" max="180" step="1" value={calibration.modelRotationDeg} onChange={(event) => updateCalibration('modelRotationDeg', event.target.value)} /><span>{calibration.modelRotationDeg} deg</span></label>
          <label>Tour speed <input type="range" min="2" max="24" step="1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /><span>{speed} m/s</span></label>
        </section>
      </aside>
    </main>
  );
}

useGLTF.preload(VENICE_MODEL);
