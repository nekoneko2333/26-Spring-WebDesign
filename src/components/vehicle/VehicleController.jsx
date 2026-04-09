import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useKeyboardDrive } from '../../hooks/useKeyboardDrive.js';
import { useAppStore } from '../../state/useAppStore.js';
import { landmarks, roadCurve } from '../../data/landmarks.js';
import { worldPosToHeight } from '../../data/terrain.js';

const MAX_SPEED = 18;
const BOOST_SPEED = 28;
const ACCEL = 22;
const BRAKE = 28;
const DRAG = 6;
const MAX_STEER = 1.8;
const MIN_STEER = 0.55;
const START_POS = { x: -30, y: 1.15, z: 30 };
const BASE_CLEARANCE = 0.78;
const wheelOffsets = [
  [-0.82, 0.2, 1.22],
  [0.82, 0.2, 1.22],
  [-0.82, 0.2, -1.22],
  [0.82, 0.2, -1.22],
];

export function VehicleController({ bodyRef, drivingEnabled }) {
  const controls = useKeyboardDrive();
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const setNearbyLandmarkId = useAppStore((state) => state.setNearbyLandmarkId);
  const setVehicleState = useAppStore((state) => state.setVehicleState);
  const autoDrive = useAppStore((state) => state.autoDrive);
  const setAutoDrive = useAppStore((state) => state.setAutoDrive);
  const speedRef = useRef(0);
  const angleRef = useRef(0);
  const steerVisualRef = useRef(0);
  const autoDriveT = useRef(0);
  const tempPoint = useRef(new THREE.Vector3());
  const lookAtPoint = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (!body) return;

    const input = controls.current;
    const pos = body.translation();

    if (!drivingEnabled) {
      speedRef.current = 0;
      angleRef.current = 0;
      steerVisualRef.current = 0;
      body.setTranslation({ x: START_POS.x, y: worldPosToHeight(START_POS.x, START_POS.z) + BASE_CLEARANCE, z: START_POS.z }, true);
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      setNearbyLandmarkId(null);
      setVehicleState({ vehicleSpeed: 0, vehicleSteer: 0 });
      return;
    }

    const hasManualInput = input.forward || input.backward || input.left || input.right;
    if (autoDrive && roadCurve) {
      if (hasManualInput) {
        setAutoDrive(false);
      } else {
        const autoSpeed = 15;
        const length = roadCurve.getLength();
        autoDriveT.current = (autoDriveT.current + (autoSpeed * delta) / length) % 1;
        roadCurve.getPointAt(autoDriveT.current, tempPoint.current);
        roadCurve.getPointAt((autoDriveT.current + 0.01) % 1, lookAtPoint.current);
        angleRef.current = Math.atan2(lookAtPoint.current.x - tempPoint.current.x, lookAtPoint.current.z - tempPoint.current.z);
        speedRef.current = autoSpeed;
        steerVisualRef.current *= 0.9;
        const autoY = worldPosToHeight(tempPoint.current.x, tempPoint.current.z) + BASE_CLEARANCE;
        body.setTranslation({ x: tempPoint.current.x, y: autoY, z: tempPoint.current.z }, true);
        body.setRotation({ x: 0, y: Math.sin(angleRef.current / 2), z: 0, w: Math.cos(angleRef.current / 2) }, true);
        setCameraMode('follow');
        setVehicleState({ vehicleSpeed: speedRef.current, vehicleSteer: steerVisualRef.current });
        updateNearbyLandmark(tempPoint.current.x, tempPoint.current.z, setNearbyLandmarkId);
        return;
      }
    }

    const maxSpeed = input.boost ? BOOST_SPEED : MAX_SPEED;
    if (input.forward && !input.backward) speedRef.current = Math.min(speedRef.current + ACCEL * delta, maxSpeed);
    else if (input.backward && !input.forward) speedRef.current = Math.max(speedRef.current - BRAKE * delta, -maxSpeed * 0.5);
    else if (speedRef.current > 0) speedRef.current = Math.max(0, speedRef.current - DRAG * delta);
    else if (speedRef.current < 0) speedRef.current = Math.min(0, speedRef.current + DRAG * delta);

    const speedRatio = Math.min(Math.abs(speedRef.current) / MAX_SPEED, 1);
    const steerRate = MAX_STEER + (MIN_STEER - MAX_STEER) * speedRatio;
    const steerDir = speedRef.current >= 0 ? 1 : -1;
    let steerInput = 0;
    if (input.left) steerInput += 1;
    if (input.right) steerInput -= 1;
    if (steerInput !== 0) angleRef.current += steerRate * steerDir * steerInput * delta;
    steerVisualRef.current += ((steerInput * 0.48) - steerVisualRef.current) * 0.15;

    const driftFactor = 0.16 * speedRatio;
    const nextX = pos.x + Math.sin(angleRef.current) * speedRef.current * delta;
    const nextZ = pos.z + Math.cos(angleRef.current) * speedRef.current * delta;
    const easedX = THREE.MathUtils.lerp(pos.x, nextX, 1 - driftFactor);
    const easedZ = THREE.MathUtils.lerp(pos.z, nextZ, 1 - driftFactor);
    const terrainY = worldPosToHeight(easedX, easedZ) + BASE_CLEARANCE;
    body.setTranslation({ x: easedX, y: terrainY, z: easedZ }, true);
    body.setRotation({ x: 0, y: Math.sin(angleRef.current / 2), z: 0, w: Math.cos(angleRef.current / 2) }, true);

    if (Math.abs(speedRef.current) > 0.1) setCameraMode('follow');
    updateNearbyLandmark(easedX, easedZ, setNearbyLandmarkId);
    setVehicleState({ vehicleSpeed: speedRef.current, vehicleSteer: steerVisualRef.current });
  });

  return null;
}

function updateNearbyLandmark(x, z, setNearbyLandmarkId) {
  let closest = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const landmark of landmarks) {
    const dx = landmark.position[0] - x;
    const dz = landmark.position[2] - z;
    const distance = Math.hypot(dx, dz);
    if (distance <= landmark.triggerRadius && distance < closestDistance) {
      closest = landmark.id;
      closestDistance = distance;
    }
  }
  setNearbyLandmarkId(closest);
}

export function VehicleChassis({ bodyRef }) {
  const rootRef = useRef();
  const frontLeftRef = useRef();
  const frontRightRef = useRef();
  const rearLeftRef = useRef();
  const rearRightRef = useRef();
  const vehicleSpeed = useAppStore((state) => state.vehicleSpeed);
  const vehicleSteer = useAppStore((state) => state.vehicleSteer);
  const autoDrive = useAppStore((state) => state.autoDrive);
  const wheelSpin = useRef(0);

  useFrame((_, delta) => {
    wheelSpin.current += vehicleSpeed * delta * 1.7;
    const suspensionBob = Math.sin(performance.now() * 0.012) * Math.min(Math.abs(vehicleSpeed) * 0.004, 0.05);
    const bodyLean = -vehicleSteer * Math.min(Math.abs(vehicleSpeed) * 0.015, 0.12);

    if (rootRef.current) {
      rootRef.current.position.y = suspensionBob;
      rootRef.current.rotation.z += (bodyLean - rootRef.current.rotation.z) * 0.12;
      rootRef.current.rotation.x += ((vehicleSpeed * -0.003) - rootRef.current.rotation.x) * 0.08;
    }

    for (const wheel of [rearLeftRef.current, rearRightRef.current]) {
      if (!wheel) continue;
      wheel.rotation.x = wheelSpin.current;
    }
    for (const wheel of [frontLeftRef.current, frontRightRef.current]) {
      if (!wheel) continue;
      wheel.rotation.x = wheelSpin.current;
      wheel.rotation.y += (vehicleSteer - wheel.rotation.y) * 0.18;
    }
  });

  return (
    <RigidBody ref={bodyRef} colliders={false} type="kinematicPosition">
      <CuboidCollider args={[0.58, 0.22, 1.12]} />
      <group ref={rootRef} scale={0.42}>
        <mesh castShadow position={[0, 0.58, -0.02]}>
          <boxGeometry args={[2.16, 0.46, 4.12]} />
          <meshStandardMaterial color={autoDrive ? '#c08958' : '#b87452'} roughness={0.58} metalness={0.08} />
        </mesh>
        <mesh castShadow position={[0, 1.06, -0.16]}>
          <boxGeometry args={[1.62, 0.54, 2.02]} />
          <meshStandardMaterial color="#c48a63" roughness={0.46} metalness={0.06} />
        </mesh>
        <mesh castShadow position={[0, 0.84, 0.22]}>
          <boxGeometry args={[1.48, 0.34, 1.48]} />
          <meshStandardMaterial color="#dfe8ef" roughness={0.2} metalness={0.1} opacity={0.75} transparent />
        </mesh>
        <mesh castShadow position={[0, 0.32, 1.82]}>
          <boxGeometry args={[1.68, 0.16, 0.12]} />
          <meshStandardMaterial color="#fff0c9" emissive="#f8dc9b" emissiveIntensity={0.12} />
        </mesh>
        {wheelOffsets.map((offset, index) => {
          const ref = [frontLeftRef, frontRightRef, rearLeftRef, rearRightRef][index];
          return (
            <group key={offset.join('-')} ref={ref} position={offset}>
              <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.34, 0.34, 0.26, 20]} />
                <meshStandardMaterial color="#1c2233" roughness={0.84} />
              </mesh>
              <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.16, 0.16, 0.28, 20]} />
                <meshStandardMaterial color="#e8e0d0" roughness={0.32} metalness={0.2} />
              </mesh>
            </group>
          );
        })}
      </group>
    </RigidBody>
  );
}
