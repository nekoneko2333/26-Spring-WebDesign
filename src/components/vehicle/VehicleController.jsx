import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useKeyboardDrive } from '../../hooks/useKeyboardDrive.js';
import { useTerrainData } from '../../hooks/useTerrainData.js';
import { useAppStore } from '../../state/useAppStore.js';
import { landmarks } from '../../data/landmarks.js';
import { currentRoute, getRoutePointAtProgress, getRouteProfile, getRouteSegmentAtProgress, roadCurve } from '../../data/routes.js';
import { buildSemanticRouteHeightProfile, worldPosToRouteHeight } from '../../data/terrain.js';

const START_PROGRESS = 0;
const BASE_CLEARANCE = 0.22;
const SIMULATION_TIME_SCALE = 1680;
const DISPLAY_SPEED_MULTIPLIER = 4.2;
const EXHIBITION_TARGET_MULTIPLIER = 1.34;
const MAX_REVERSE_KMH = 24;
const ACCEL_KMH_PER_SEC = 82;
const DECEL_KMH_PER_SEC = 66;
const SIMULATED_DAYS = 3;
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
  const terrain = useTerrainData();
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
    const sampledPoints = roadCurve.getPoints(160);
    const roadProfile = buildSemanticRouteHeightProfile(sampledPoints, getRouteSegmentAtProgress, { clearance: 0.055 });

    const terrainAwarePoints = sampledPoints.map((point, index) => new THREE.Vector3(
      point.x,
      roadProfile[index] + BASE_CLEARANCE,
      point.z,
    ));
    return new THREE.CatmullRomCurve3(terrainAwarePoints, false, 'centripetal', 0.08);
  }, [terrain.version]);

  useFrame((_, delta) => {
    const vehicle = bodyRef.current;
    if (!vehicle) return;

    const routeInitKey = `${initialLandmarkId ?? 'start'}-${terrain.version}`;
    if (initializedTargetRef.current !== routeInitKey) {
      progressRef.current = getInitialProgress(initialLandmarkId, routeCurve);
      speedRef.current = 0;
      targetSpeedRef.current = 0;
      steerRef.current = 0;
      initializedTargetRef.current = routeInitKey;
      applyCurvePose(vehicle, routeCurve, progressRef.current, 0);
      setNearbyLandmarkId(getNearbyLandmarkId(currentPoint.x, currentPoint.z));
      setVehicleState({ vehicleSpeed: 0, vehicleSteer: 0, routeContext: getRouteContext(progressRef.current), ...getRouteTimeline(progressRef.current) });
    }

    if (!drivingEnabled) {
      progressRef.current = getInitialProgress(initialLandmarkId, routeCurve);
      speedRef.current = 0;
      targetSpeedRef.current = 0;
      steerRef.current = 0;
      setAutoDrive(false);
      setNearbyLandmarkId(initialLandmarkId ?? null);
      setVehicleState({ vehicleSpeed: 0, vehicleSteer: 0, routeContext: getRouteContext(progressRef.current), ...getRouteTimeline(progressRef.current) });
      applyCurvePose(vehicle, routeCurve, progressRef.current, 0);
      return;
    }

    const routeLocked = focusPanelOpen || modelViewerOpen;
    const routeContext = getRouteContext(progressRef.current);
    const routeSpeedFactor = THREE.MathUtils.clamp(routeContext.profile.speedFactor, 0.2, 1.08);
    const input = controls.current;
    const hasManualInput = input.forward || input.backward;
    if (routeLocked || (hasManualInput && autoDrive)) {
      setAutoDrive(false);
    }

    if (routeLocked) {
      targetSpeedRef.current = 0;
    } else if (autoDrive) {
      targetSpeedRef.current = routeContext.segment.speedLimit * routeSpeedFactor * EXHIBITION_TARGET_MULTIPLIER;
    } else {
      let targetKmh = 0;
      if (input.forward) targetKmh += routeContext.segment.speedLimit * routeSpeedFactor * EXHIBITION_TARGET_MULTIPLIER * (input.boost ? 1.35 : 1);
      if (input.backward) targetKmh -= MAX_REVERSE_KMH;
      targetSpeedRef.current = targetKmh;
    }

    const maxDelta = (Math.abs(targetSpeedRef.current) > Math.abs(speedRef.current) ? ACCEL_KMH_PER_SEC : DECEL_KMH_PER_SEC) * delta;
    speedRef.current = THREE.MathUtils.clamp(targetSpeedRef.current, speedRef.current - maxDelta, speedRef.current + maxDelta);
    if (Math.abs(speedRef.current) < 0.05) speedRef.current = 0;

    const progressDelta = (speedRef.current / Math.max(currentRoute.distanceKm, 1) / 3600) * SIMULATION_TIME_SCALE * delta;

    if (autoDrive && !routeLocked) {
      progressRef.current = (progressRef.current + progressDelta) % 1;
    } else {
      progressRef.current = THREE.MathUtils.clamp(progressRef.current + progressDelta, 0, 0.9995);
    }

    steerRef.current = applyCurvePose(vehicle, routeCurve, progressRef.current, speedRef.current);
    setNearbyLandmarkId(getNearbyLandmarkId(currentPoint.x, currentPoint.z));
    setVehicleState({
      vehicleSpeed: Math.abs(speedRef.current) * DISPLAY_SPEED_MULTIPLIER,
      vehicleSteer: steerRef.current,
      routeContext,
      routeProgress: progressRef.current,
      ...getRouteTimeline(progressRef.current),
    });

    if (speedRef.current !== 0 && !routeLocked) setCameraMode('follow');
  });

  return null;
}

function getRouteTimeline(progress) {
  const dayProgress = THREE.MathUtils.clamp(progress, 0, 0.9999) * SIMULATED_DAYS;
  const routeDay = Math.floor(dayProgress) + 1;
  const localDayProgress = dayProgress % 1;
  return {
    routeProgress: progress,
    routeDay,
    routeHour: 7 + localDayProgress * 12,
  };
}

function getRouteContext(progress) {
  const point = getRoutePointAtProgress(progress);
  const segment = getRouteSegmentAtProgress(progress);
  return {
    point,
    segment,
    profile: getRouteProfile(segment),
  };
}

function getInitialProgress(initialLandmarkId, curve) {
  if (!initialLandmarkId) return START_PROGRESS;
  const landmark = landmarks.find((item) => item.id === initialLandmarkId);
  if (!landmark) return START_PROGRESS;

  landmarkPoint.set(
    landmark.position[0],
    worldPosToRouteHeight(landmark.position[0], landmark.position[2]) + BASE_CLEARANCE,
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

  flatTangent.copy(tangentPoint).setY(0).normalize();
  if (flatTangent.lengthSq() === 0) return 0;

  if (speed >= 0) {
    lookTarget.copy(currentPoint).add(flatTangent);
  } else {
    reverseTangent.copy(flatTangent).multiplyScalar(-1);
    lookTarget.copy(currentPoint).add(reverseTangent);
  }

  vehicle.position.copy(currentPoint);
  vehicle.lookAt(lookTarget);

  flatAheadTangent.copy(aheadTangent).setY(0).normalize();
  if (flatAheadTangent.lengthSq() === 0) return 0;

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
  const trailRef = useRef();
  const headLightRef = useRef();
  const frontLeftRef = useRef();
  const frontRightRef = useRef();
  const rearLeftRef = useRef();
  const rearRightRef = useRef();
  const vehicleSpeed = useAppStore((state) => state.vehicleSpeed);
  const vehicleSteer = useAppStore((state) => state.vehicleSteer);
  const routeContext = useAppStore((state) => state.routeContext);
  const autoDrive = useAppStore((state) => state.autoDrive);
  const wheelSpin = useRef(0);

  useFrame((_, delta) => {
    wheelSpin.current += vehicleSpeed * delta * 0.08;
    const speedRatio = Math.min(vehicleSpeed / 130, 1);
    const roughness = routeContext?.profile?.roughness ?? 0.08;
    const turnLean = routeContext?.profile?.turnLean ?? 1;
    const bodyLean = -vehicleSteer * turnLean * Math.min(0.22 + speedRatio * 0.14, 0.34);
    const bodyPitch = -speedRatio * 0.03 + (autoDrive ? -0.005 : 0);

    if (rootRef.current) {
      rootRef.current.rotation.z += (bodyLean - rootRef.current.rotation.z) * 0.12;
      rootRef.current.rotation.x += (bodyPitch - rootRef.current.rotation.x) * 0.08;
      const roadBuzz = (
        Math.sin(wheelSpin.current * 0.36) * 0.006
        + Math.sin(wheelSpin.current * 0.74 + 1.7) * 0.003
      ) * roughness * Math.min(speedRatio + 0.2, 1);
      rootRef.current.position.y += (roadBuzz - rootRef.current.position.y) * 0.055;
    }

    if (trailRef.current) {
      const trailScale = 0.35 + speedRatio * 1.35;
      trailRef.current.scale.z += (trailScale - trailRef.current.scale.z) * 0.12;
      trailRef.current.position.z += ((-2.35 - speedRatio * 1.1) - trailRef.current.position.z) * 0.12;
      trailRef.current.material.opacity += ((vehicleSpeed > 0.6 ? 0.34 : 0.08) - trailRef.current.material.opacity) * 0.08;
    }

    if (headLightRef.current) {
      headLightRef.current.intensity += ((vehicleSpeed > 0.4 ? 1.35 : 0.62) - headLightRef.current.intensity) * 0.1;
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
          <meshStandardMaterial color={autoDrive ? '#d29b62' : '#b87452'} roughness={0.48} metalness={0.16} />
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
          <meshStandardMaterial color="#fff0c9" emissive="#f8dc9b" emissiveIntensity={0.42} />
        </mesh>
        <pointLight ref={headLightRef} position={[0, 0.55, 2.35]} color="#ffe6a8" distance={13} intensity={0.8} />
        <mesh position={[0, 0.3, -2.18]}>
          <boxGeometry args={[1.45, 0.1, 0.08]} />
          <meshStandardMaterial color="#d35b52" emissive="#d35b52" emissiveIntensity={0.55} />
        </mesh>
        <mesh ref={trailRef} position={[0, 0.16, -2.35]}>
          <planeGeometry args={[1.8, 2.8]} />
          <meshBasicMaterial color="#78bdd0" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
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
