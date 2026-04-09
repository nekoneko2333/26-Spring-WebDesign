import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Suspense, useCallback, useRef, useState } from 'react';
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

function Experience({ isStarted }) {
  const vehicleRef = useRef(null);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 95, 120]} fov={42} />
      <FollowCamera targetRef={vehicleRef} />

      <Suspense fallback={null}>
        <SceneLights />
        <Physics gravity={[0, -9.81, 0]} timeStep="vary">
          <GroundPlane />
          <VehicleChassis bodyRef={vehicleRef} />
          <VehicleController bodyRef={vehicleRef} drivingEnabled={isStarted} />
        </Physics>

        <MapSurface />
        <TilesLayer />
        <RoadRibbon />
        <LandmarkModels />
      </Suspense>
    </>
  );
}

function DriveExperience({ onClose }) {
  const [isStarted, setIsStarted] = useState(false);
  const handleStart = useCallback(() => setIsStarted(true), []);

  return (
    <AppShell isStarted={isStarted} onStart={handleStart} onClose={onClose}>
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={[THEME.sky]} />
        <fog attach="fog" args={[THEME.haze, 75, 220]} />
        <Experience isStarted={isStarted} />
      </Canvas>
    </AppShell>
  );
}

export default function App() {
  const [driveOpen, setDriveOpen] = useState(false);

  return (
    <>
      <HomePage onOpenDrive={() => setDriveOpen(true)} />
      {driveOpen && <DriveExperience onClose={() => setDriveOpen(false)} />}
    </>
  );
}
