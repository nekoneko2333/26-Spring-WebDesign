import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useKeyboardDrive } from '../../hooks/useKeyboardDrive.js';
import { useAppStore } from '../../state/useAppStore.js';
import { landmarks, mockRoutePoints } from '../../data/landmarks.js';
import { worldPosToHeight } from '../../data/terrain.js';

const START_PROGRESS = 0;
const BASE_CLEARANCE = 0.62;
const MANUAL_SPEED = 0.2;
const AUTO_SPEED = 0.12;
const ACCEL = 1.2;
const DECEL = 1.8;
const wheelOffsets = [
  [-0.82, 0.2, 1.22],
  [0.82, 0.2, 1.22],
  [-0.82, 0.2, -1.22],
  [0.82, 0.2, -1.22],
];
const currentPoint = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const tangentPoint = new THREE.Vector3();
const aheadTangent = new THREE.Vector3();
const flatTangent = new THREE.Vector3();
const flatAheadTangent = new THREE.Vector3();
const reverseTangent = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);
const samplePoint = new THREE.Vector3();
const landmarkPoint = new THREE.Vector3();

export function VehicleController({ bodyRef, drivingEnabled, initialLandmarkId }) {
  const controls = useKeyboardDrive();
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const setNearbyLandmarkId = useAppStore((state) => state.setNearbyLandmarkId);
  const setVehicleState = useAppStore((state) => state.setVehicleState);
  const autoDrive = useAppStore((state) => state.autoDrive);
  const setAutoDrive = useAppStore((state) => state.setAutoDrive);
  const focusPanelOpen = useAppStore((state) => state.focusPanelOpen);
  const modelViewerOpen = useAppStore((state) => state.modelViewerOpen);
  const progressRef = useRef(START_PROGRESS);
  const speedRef = useRef(0);
  const targetSpeedRef = useRef(0);
  const steerRef = useRef(0);
  const initializedTargetRef = useRef(null);

  const routeCurve = useMemo(() => {
    const terrainAwarePoints = mockRoutePoints.map(([x, y, z]) => new THREE.Vector3(
      x,
      worldPosToHeight(x, z) + BASE_CLEARANCE + y,
      z,
    ));
    return new THREE.CatmullRomCurve3(terrainAwarePoints, false, 'catmullrom', 0.2);
  }, []);

  useFrame((_, delta) => {
    const vehicle = bodyRef.current;
    if (!vehicle) return;

    if (initializedTargetRef.current !== initialLandmarkId) {
      progressRef.current = getInitialProgress(initialLandmarkId, routeCurve);
      speedRef.current = 0;
      targetSpeedRef.current = 0;
      steerRef.current = 0;
      initializedTargetRef.current = initialLandmarkId;
      applyCurvePose(vehicle, routeCurve, progressRef.current, 0);
      setNearbyLandmarkId(getNearbyLandmarkId(currentPoint.x, currentPoint.z));
      setVehicleState({ vehicleSpeed: 0, vehicleSteer: 0 });
    }

    if (!drivingEnabled) {
      progressRef.current = getInitialProgress(initialLandmarkId, routeCurve);
      speedRef.current = 0;
      targetSpeedRef.current = 0;
      steerRef.current = 0;
      setAutoDrive(false);
      setNearbyLandmarkId(initialLandmarkId ?? null);
      setVehicleState({ vehicleSpeed: 0, vehicleSteer: 0 });
      applyCurvePose(vehicle, routeCurve, progressRef.current, 0);
      return;
    }

    const routeLocked = focusPanelOpen || modelViewerOpen;
    const input = controls.current;
    const hasManualInput = input.forward || input.backward;
    if (routeLocked || (hasManualInput && autoDrive)) {
      setAutoDrive(false);
    }

    if (routeLocked) {
      targetSpeedRef.current = 0;
    } else if (autoDrive) {
      targetSpeedRef.current = AUTO_SPEED;
    } else {
      let inputSpeed = 0;
      if (input.forward) inputSpeed += MANUAL_SPEED * (input.boost ? 1.35 : 1);
      if (input.backward) inputSpeed -= MANUAL_SPEED * 0.82;
      targetSpeedRef.current = inputSpeed;
    }

    const smoothing = Math.abs(targetSpeedRef.current) > Math.abs(speedRef.current) ? ACCEL : DECEL;
    speedRef.current = THREE.MathUtils.lerp(speedRef.current, targetSpeedRef.current, 1 - Math.exp(-smoothing * delta * 4));
    if (Math.abs(speedRef.current) < 0.00002) speedRef.current = 0;

    if (autoDrive && !routeLocked) {
      progressRef.current = (progressRef.current + speedRef.current * delta) % 1;
    } else {
      progressRef.current = THREE.MathUtils.clamp(progressRef.current + speedRef.current * delta, 0, 0.9995);
    }

    steerRef.current = applyCurvePose(vehicle, routeCurve, progressRef.current, speedRef.current);
    setNearbyLandmarkId(getNearbyLandmarkId(currentPoint.x, currentPoint.z));
    setVehicleState({
      vehicleSpeed: Math.abs(speedRef.current) * 100,
      vehicleSteer: steerRef.current,
    });

    if (speedRef.current !== 0 && !routeLocked) setCameraMode('follow');
  });

  return null;
}

function getInitialProgress(initialLandmarkId, curve) {
  if (!initialLandmarkId) return START_PROGRESS;
  const landmark = landmarks.find((item) => item.id === initialLandmarkId);
  if (!landmark) return START_PROGRESS;

  landmarkPoint.set(
    landmark.position[0],
    worldPosToHeight(landmark.position[0], landmark.position[2]) + BASE_CLEARANCE,
    landmark.position[2],
  );

  let closestProgress = START_PROGRESS;
  let closestDistance = Number.POSITIVE_INFINITY;
  const samples = 320;
  for (let index = 0; index <= samples; index += 1) {
    const progress = index / samples;
    curve.getPointAt(progress, samplePoint);
    const distance = samplePoint.distanceTo(landmarkPoint);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestProgress = progress;
    }
  }
  return closestProgress;
}

function applyCurvePose(vehicle, curve, progress, speed) {
  curve.getPointAt(progress, currentPoint);
  curve.getTangentAt(progress, tangentPoint);
  curve.getTangentAt(Math.min((progress + 0.012) % 1, 0.9999), aheadTangent);

  if (speed >= 0) {
    lookTarget.copy(currentPoint).add(tangentPoint);
  } else {
    reverseTangent.copy(tangentPoint).multiplyScalar(-1);
    lookTarget.copy(currentPoint).add(reverseTangent);
  }

  vehicle.position.copy(currentPoint);
  vehicle.lookAt(lookTarget);

  flatTangent.copy(tangentPoint).setY(0).normalize();
  flatAheadTangent.copy(aheadTangent).setY(0).normalize();
  if (flatTangent.lengthSq() === 0 || flatAheadTangent.lengthSq() === 0) return 0;

  const turnAngle = flatTangent.angleTo(flatAheadTangent);
  const turnSign = Math.sign(flatTangent.clone().cross(flatAheadTangent).dot(upAxis)) || 0;
  return THREE.MathUtils.clamp(turnAngle * turnSign * 4.5, -0.42, 0.42);
}

function getNearbyLandmarkId(x, z) {
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
  return closest;
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
    wheelSpin.current += vehicleSpeed * delta * 0.08;
    const speedRatio = Math.min(vehicleSpeed / (MANUAL_SPEED * 100 * 1.35), 1);
    const bodyLean = -vehicleSteer * Math.min(0.22 + speedRatio * 0.14, 0.34);
    const bodyPitch = -speedRatio * 0.03 + (autoDrive ? -0.005 : 0);

    if (rootRef.current) {
      rootRef.current.rotation.z += (bodyLean - rootRef.current.rotation.z) * 0.12;
      rootRef.current.rotation.x += (bodyPitch - rootRef.current.rotation.x) * 0.08;
      rootRef.current.position.y += ((Math.sin(wheelSpin.current * 0.32) * Math.min(speedRatio * 0.035, 0.018)) - rootRef.current.position.y) * 0.08;
    }

    for (const wheel of [rearLeftRef.current, rearRightRef.current]) {
      if (!wheel) continue;
      wheel.rotation.x = wheelSpin.current;
    }
    for (const wheel of [frontLeftRef.current, frontRightRef.current]) {
      if (!wheel) continue;
      wheel.rotation.x = wheelSpin.current;
      wheel.rotation.y += (vehicleSteer * 0.72 - wheel.rotation.y) * 0.14;
    }
  });

  return (
    <group ref={bodyRef} scale={0.24}>
      <group ref={rootRef}>
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
    </group>
  );
}
