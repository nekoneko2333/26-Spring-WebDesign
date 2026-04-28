import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import './amsterdam-vr.css';

const MANIFEST_URL = '/city/amsterdam-museumplein/manifest.json';
const METERS_PER_DEG_LAT = 111_320;
const MATERIALS = {
  base: new THREE.MeshStandardMaterial({ color: '#d8ddd5', roughness: 0.9, metalness: 0.02 }),
  park: new THREE.MeshStandardMaterial({ color: '#8eaf7a', roughness: 0.96 }),
  plaza: new THREE.MeshStandardMaterial({ color: '#d4c4a8', roughness: 0.9 }),
  road: new THREE.MeshStandardMaterial({ color: '#53616a', roughness: 0.78 }),
  path: new THREE.MeshStandardMaterial({ color: '#bcae91', roughness: 0.88 }),
  water: new THREE.MeshStandardMaterial({ color: '#84aeb7', roughness: 0.54, metalness: 0.02 }),
};

function lngLatToLocal(lon, lat, center) {
  const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180);
  return [
    (lon - center.lon) * metersPerDegLon,
    0,
    -(lat - center.lat) * METERS_PER_DEG_LAT,
  ];
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

function PoiMarkers({ pois, center }) {
  return pois.map((poi) => {
    const [x, , z] = lngLatToLocal(poi.lon, poi.lat, center);
    const isPrimary = poi.priority >= 9;
    return (
      <group key={poi.id} position={[x, 0, z]}>
        <mesh position={[0, isPrimary ? 4.2 : 3.2, 0]} castShadow>
          <boxGeometry args={[isPrimary ? 5.4 : 4.2, 2.1, 0.34]} />
          <meshStandardMaterial color={isPrimary ? '#f06b3f' : '#2f7d89'} roughness={0.42} metalness={0.06} />
        </mesh>
        <mesh position={[0, isPrimary ? 3.02 : 2.25, -0.24]} castShadow>
          <boxGeometry args={[isPrimary ? 5.8 : 4.6, 0.24, 0.22]} />
          <meshStandardMaterial color="#f4eee2" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 3.2, 10]} />
          <meshStandardMaterial color="#233544" roughness={0.5} />
        </mesh>
        <Html distanceFactor={95} position={[0, isPrimary ? 4.25 : 3.25, 0.28]} center className="amsterdam-vr-label">
          <strong>{poi.name}</strong>
          <span>{poi.type}</span>
        </Html>
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

function AmsterdamScene({ data }) {
  const center = data.manifest.center;
  const routeName = data.route?.features?.[0]?.properties?.name ?? 'Museumplein route';

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 160, 180]} fov={46} />
      <OrbitControls target={[0, 0, 0]} maxPolarAngle={Math.PI * 0.48} minDistance={35} maxDistance={360} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[80, 140, 80]} intensity={2.1} castShadow />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[260, 190, 1, 1]} />
        <primitive attach="material" object={MATERIALS.base} />
      </mesh>

      <GroundLayers layers={data.groundLayers} center={center} />
      <RouteLine route={data.route} center={center} />
      <PoiMarkers pois={data.pois} center={center} />

      <Suspense fallback={null}>
        <BuildingTiles tiles={data.buildingTiles} />
      </Suspense>

      <Html position={[-116, 4, -82]} className="amsterdam-vr-scene-note">
        <strong>{routeName}</strong>
        <span>{data.buildingTiles.length} local building tiles loaded</span>
      </Html>
    </>
  );
}

export function AmsterdamVrLab() {
  const data = useAmsterdamLabData();
  const layerCount = data.groundLayers?.features?.length ?? 0;

  return (
    <main className="amsterdam-vr">
      <section className="amsterdam-vr__scene" aria-label="Amsterdam Museumplein VR lab">
        {data.status === 'ready' && (
          <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
            <color attach="background" args={['#eef5f2']} />
            <fog attach="fog" args={['#eef5f2', 180, 430]} />
            <AmsterdamScene data={data} />
          </Canvas>
        )}
        {data.status === 'loading' && <div className="amsterdam-vr__state">Loading local Museumplein data...</div>}
        {data.status === 'error' && <div className="amsterdam-vr__state">Failed to load local city data.</div>}
      </section>

      <aside className="amsterdam-vr__panel">
        <a href="#" className="amsterdam-vr__back">Back to Italy guide</a>
        <p className="amsterdam-vr__eyebrow">Isolated experiment</p>
        <h1>Amsterdam Museumplein VR Lab</h1>
        <p>
          Local-first test area for city VR roaming. The scene reads manifest, POIs, route GeoJSON,
          and future GLB building tiles from <code>public/city/amsterdam-museumplein</code>.
        </p>
        <dl>
          <div><dt>Area</dt><dd>Museumplein, Amsterdam</dd></div>
          <div><dt>POIs</dt><dd>{data.pois.length || '-'} curated anchors</dd></div>
          <div><dt>Ground layers</dt><dd>{layerCount || 0} local features</dd></div>
          <div><dt>Building tiles</dt><dd>{data.buildingTiles.length || 0} loaded</dd></div>
        </dl>
      </aside>
    </main>
  );
}
