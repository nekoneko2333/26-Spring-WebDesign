import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell.jsx';
import { HomePage } from './components/home/HomePage.jsx';
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
import { AmsterdamVrLab } from './experiments/amsterdam-vr/AmsterdamVrLab.jsx';

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

export default function App() {
  const [hashRoute, setHashRoute] = useState(() => window.location.hash);
  const [driveOpen, setDriveOpen] = useState(false);
  const [initialLandmarkId, setInitialLandmarkId] = useState(null);

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

  if (hashRoute === '#/amsterdam-vr') {
    return <AmsterdamVrLab />;
  }

  return (
    <>
      <HomePage onOpenDrive={handleOpenDrive} />
      {driveOpen && <DriveExperience onClose={handleCloseDrive} initialLandmarkId={initialLandmarkId} />}
    </>
  );
}
