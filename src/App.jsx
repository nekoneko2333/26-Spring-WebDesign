import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell.jsx';
import { HomeShowcase } from './components/home/HomeShowcase.jsx';
import { SceneLights } from './components/scene/SceneLights.jsx';
import { GroundPlane } from './components/scene/GroundPlane.jsx';
import { FollowCamera } from './components/camera/FollowCamera.jsx';
import { MapSurface } from './components/scene/MapSurface.jsx';
import { RoadRibbon } from './components/scene/RoadRibbon.jsx';
import { TilesLayer } from './components/scene/TilesLayer.jsx';
import { LandmarkModels } from './components/landmarks/LandmarkModels.jsx';
import { VehicleController, VehicleChassis } from './components/vehicle/VehicleController.jsx';
import { THEME } from './config/theme.js';
import { useAppStore } from './state/useAppStore.js';
import { VeniceVrLab } from './experiments/venice-vr/VeniceVrLab.jsx';
import { RouteV2Page } from './experiments/route-versions/RouteVersions.jsx';

function Experience({ isStarted, initialLandmarkId }) {
  const vehicleRef = useRef(null);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 95, 120]} fov={42} />
      <FollowCamera targetRef={vehicleRef} />

      <Suspense fallback={null}>
        <SceneLights />
        <GroundPlane />
        <VehicleChassis bodyRef={vehicleRef} />
        <VehicleController bodyRef={vehicleRef} drivingEnabled={isStarted} initialLandmarkId={initialLandmarkId} />
        <MapSurface />
        <TilesLayer />
        <RoadRibbon />
        <LandmarkModels />
      </Suspense>
    </>
  );
}

function DriveExperience({ onClose, initialLandmarkId }) {
  const [isStarted, setIsStarted] = useState(Boolean(initialLandmarkId));
  const handleStart = useCallback(() => setIsStarted(true), []);
  const clearLandmark = useAppStore((state) => state.clearLandmark);
  const openLandmarkFocus = useAppStore((state) => state.openLandmarkFocus);
  const setCameraMode = useAppStore((state) => state.setCameraMode);

  useEffect(() => {
    setIsStarted(Boolean(initialLandmarkId));
    if (initialLandmarkId) {
      openLandmarkFocus(initialLandmarkId);
      return;
    }
    clearLandmark();
    setCameraMode('map');
  }, [clearLandmark, initialLandmarkId, openLandmarkFocus, setCameraMode]);

  return (
    <AppShell isStarted={isStarted} onStart={handleStart} onClose={onClose}>
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={[THEME.sky]} />
        <fog attach="fog" args={[THEME.haze, 75, 220]} />
        <Experience isStarted={isStarted} initialLandmarkId={initialLandmarkId} />
      </Canvas>
    </AppShell>
  );
}

function HomeCompareSwitch({ active, onChange }) {
  return (
    <div className="home-compare-switch" aria-label="Home version switch">
      <button type="button" className={active === 'showcase' ? 'is-active' : ''} onClick={() => onChange('showcase')}>
        04
      </button>
      <button type="button" className={active === 'legacy' ? 'is-active' : ''} onClick={() => onChange('legacy')}>
        原主页
      </button>
    </div>
  );
}

function LegacyHomeSnapshot({ onOpenDrive, onOpenVenice }) {
  return (
    <main className="legacy-home-snapshot">
      <aside className="legacy-home-snapshot__sidebar">
        <strong>Italy Drive</strong>
        <button type="button">Destinations</button>
        <button type="button">Route Planner</button>
        <button type="button">Reviews</button>
        <button type="button">3D Drive</button>
      </aside>
      <section className="legacy-home-snapshot__hero">
        <div>
          <span>Web3D travel planner</span>
          <h1>Italy route dashboard</h1>
          <p>旧主页对比视图：保留原来的侧栏、搜索、服务、路线面板和 3D 入口信息结构，用于和 04 首页快速对照。</p>
          <div className="legacy-home-snapshot__actions">
            <button type="button" onClick={() => onOpenDrive()}>Open 3D Drive</button>
            <button type="button" onClick={onOpenVenice}>Venice VR</button>
            <a href="#/v2">V2 Map</a>
          </div>
        </div>
        <div className="legacy-home-snapshot__panel">
          <label>
            <span>Search & plan</span>
            <input value="Rome, Florence, Venice" readOnly />
          </label>
          <div className="legacy-home-snapshot__stats">
            <article><span>Stops</span><strong>6</strong></article>
            <article><span>Distance</span><strong>1,260 km</strong></article>
            <article><span>Days</span><strong>3</strong></article>
          </div>
        </div>
      </section>
      <section className="legacy-home-snapshot__grid">
        {['Destinations', 'Route editor', 'Reviews', 'Travel services', 'Account', 'Model previews'].map((item) => (
          <article key={item}>
            <span>{item}</span>
            <strong>{item === 'Route editor' ? 'Editable stop order' : 'Original module'}</strong>
            <p>旧主页模块对比占位，方便观察信息密度和布局节奏。</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export default function App() {
  const [hashRoute, setHashRoute] = useState(() => window.location.hash);
  const [driveOpen, setDriveOpen] = useState(false);
  const [initialLandmarkId, setInitialLandmarkId] = useState(null);
  const [homeVariant, setHomeVariant] = useState('showcase');

  useEffect(() => {
    const onHashChange = () => setHashRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleOpenDrive = useCallback((landmarkId = null) => {
    setInitialLandmarkId(landmarkId);
    setDriveOpen(true);
  }, []);

  const handleCloseDrive = useCallback(() => {
    setDriveOpen(false);
    setInitialLandmarkId(null);
  }, []);

  const handleOpenVenice = useCallback(() => {
    setDriveOpen(false);
    setInitialLandmarkId(null);
    window.location.hash = '#/venice-vr';
  }, []);

  if (hashRoute === '#/venice-vr') {
    return <VeniceVrLab />;
  }

  if (hashRoute === '#/v2') {
    return <RouteV2Page />;
  }

  return (
    <>
      <HomeCompareSwitch active={homeVariant} onChange={setHomeVariant} />
      {homeVariant === 'showcase' ? (
        <HomeShowcase onOpenDrive={handleOpenDrive} />
      ) : (
        <LegacyHomeSnapshot onOpenDrive={handleOpenDrive} onOpenVenice={handleOpenVenice} />
      )}
      {driveOpen && <DriveExperience onClose={handleCloseDrive} initialLandmarkId={initialLandmarkId} />}
    </>
  );
}
