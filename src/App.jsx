import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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

function Experience({ isStarted, driveEntry }) {
  const vehicleRef = useRef(null);
  const cameraMode = useAppStore((state) => state.cameraMode);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 95, 120]} fov={42} near={0.00001} far={700} />
      <FollowCamera targetRef={vehicleRef} />

      <Suspense fallback={null}>
        <SceneLights />
        <GroundPlane />
        <VehicleChassis bodyRef={vehicleRef} />
        <VehicleController bodyRef={vehicleRef} drivingEnabled={isStarted} driveEntry={driveEntry} />
        <MapSurface />
        <RoadRibbon />
        {cameraMode === 'focus' && (
          <>
            <TilesLayer />
            <LandmarkModels />
          </>
        )}
      </Suspense>
    </>
  );
}

function DriveExperience({ onClose, driveEntry }) {
  const [isStarted, setIsStarted] = useState(driveEntry?.mode === 'route-start');
  const handleStart = useCallback(() => setIsStarted(true), []);
  const clearLandmark = useAppStore((state) => state.clearLandmark);
  const setCameraMode = useAppStore((state) => state.setCameraMode);

  useLayoutEffect(() => {
    setIsStarted(driveEntry?.mode === 'route-start');
    clearLandmark();
    setCameraMode(driveEntry?.mode === 'route-start' ? 'follow' : 'map');
  }, [clearLandmark, driveEntry, setCameraMode]);

  return (
    <AppShell isStarted={isStarted} onStart={handleStart} onClose={onClose}>
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' }}>
        <color attach="background" args={[THEME.sky]} />
        <fog attach="fog" args={[THEME.haze, 160, 520]} />
        <Experience isStarted={isStarted} driveEntry={driveEntry} />
      </Canvas>
    </AppShell>
  );
}

export default function App() {
  const [driveOpen, setDriveOpen] = useState(false);
  const [driveEntry, setDriveEntry] = useState(null);

  const handleOpenDrive = useCallback(() => {
    setDriveEntry({ mode: 'route-start' });
    setDriveOpen(true);
  }, []);

  const handleCloseDrive = useCallback(() => {
    setDriveOpen(false);
    setDriveEntry(null);
    window.requestAnimationFrame(() => {
      const home = document.getElementById('home-hero');
      if (home) home.scrollIntoView({ block: 'start' });
      else window.scrollTo({ top: 0, left: 0 });
    });
  }, []);

  return (
    <>
      <HomeShowcase onOpenDrive={handleOpenDrive} />
      {driveOpen && <DriveExperience onClose={handleCloseDrive} driveEntry={driveEntry} />}
    </>
  );
}
