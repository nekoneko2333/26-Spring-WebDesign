import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AmsterdamAvatar } from './AmsterdamAvatar.jsx';
import { clampToBounds, findNearestPoi, lngLatToVector } from './routeUtils.js';

const TURN_SPEED = 2.4;
const CAMERA_HEIGHT = 8.8;
const CAMERA_BACK_OFFSET = 11.5;
const TARGET_HEIGHT = 3.1;
const MOUSE_SENSITIVITY = 0.0042;
const SPRINT_MULTIPLIER = 2.25;
const DASH_SPEED = 34;
const DASH_DURATION = 0.18;
const GRAPPLE_SPEED = 42;
const JUMP_VELOCITY = 9.5;
const GRAVITY = 26;
const GROUND_Y = 0.42;

export function ManualWalkController({
  active,
  startPoi,
  pois,
  center,
  bounds,
  cameraMode = 'follow',
  speedMetersPerSecond = 7,
  grapplePoi = null,
  resetToken,
  onNearestPoi,
}) {
  const { camera } = useThree();
  const keysRef = useRef(new Set());
  const avatarRef = useRef(null);
  const headingRef = useRef(0);
  const cameraYawRef = useRef(Math.PI);
  const cameraPitchRef = useRef(-0.28);
  const velocityRef = useRef(new THREE.Vector3());
  const verticalVelocityRef = useRef(0);
  const positionRef = useRef(new THREE.Vector3());
  const dashTimerRef = useRef(0);
  const grappleTargetRef = useRef(null);
  const grappleLineRef = useRef(null);
  const lastPoiIdRef = useRef(null);

  useEffect(() => {
    const start = startPoi
      ? lngLatToVector(startPoi.lon, startPoi.lat, center, GROUND_Y)
      : new THREE.Vector3(0, GROUND_Y, 0);
    positionRef.current.copy(start);
    headingRef.current = 0;
    cameraYawRef.current = Math.PI;
    cameraPitchRef.current = -0.28;
    velocityRef.current.set(0, 0, 0);
    verticalVelocityRef.current = 0;
    dashTimerRef.current = 0;
    grappleTargetRef.current = null;
    lastPoiIdRef.current = null;
    if (avatarRef.current) avatarRef.current.position.copy(start);
  }, [center, resetToken, startPoi]);

  useEffect(() => {
    const onPointerDown = () => {
      if (!active || document.pointerLockElement) return;
      document.body.requestPointerLock?.();
    };
    const onMouseMove = (event) => {
      if (!active || document.pointerLockElement !== document.body) return;
      cameraYawRef.current -= event.movementX * MOUSE_SENSITIVITY;
      cameraPitchRef.current = THREE.MathUtils.clamp(
        cameraPitchRef.current + event.movementY * MOUSE_SENSITIVITY,
        -0.85,
        0.75,
      );
    };
    const onKeyDown = (event) => {
      if (!active) return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'e', 'q', ' ', 'shift', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        event.preventDefault();
        keysRef.current.add(key);
      }
    };
    const onKeyUp = (event) => {
      keysRef.current.delete(event.key.toLowerCase());
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (document.pointerLockElement === document.body) document.exitPointerLock?.();
    };
  }, [active]);

  useFrame((_, delta) => {
    if (!active) return;

    const keys = keysRef.current;
    const turnInput = (keys.has('a') || keys.has('arrowleft') ? 1 : 0) - (keys.has('d') || keys.has('arrowright') ? 1 : 0);
    const forwardInput = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    const turningFast = keys.has('shift') ? 1.25 : 1;
    headingRef.current += turnInput * TURN_SPEED * turningFast * delta;
    const characterForward = new THREE.Vector3(Math.sin(headingRef.current), 0, Math.cos(headingRef.current));
    const desiredDirection = characterForward.clone().multiplyScalar(forwardInput);

    const grounded = positionRef.current.y <= GROUND_Y + 0.01;
    if (keys.has(' ') && grounded) {
      verticalVelocityRef.current = JUMP_VELOCITY;
      keys.delete(' ');
    }
    if (keys.has('e')) {
      const dashDirection = desiredDirection.lengthSq() > 0 ? desiredDirection.clone().normalize() : characterForward.clone();
      velocityRef.current.copy(dashDirection.multiplyScalar(DASH_SPEED));
      dashTimerRef.current = DASH_DURATION;
      keys.delete('e');
    }
    if (keys.has('q')) {
      const target = grapplePoi
        ? lngLatToVector(grapplePoi.lon, grapplePoi.lat, center, GROUND_Y)
        : positionRef.current.clone().add(characterForward.clone().multiplyScalar(55));
      target.y = GROUND_Y;
      clampToBounds(target, bounds, center);
      grappleTargetRef.current = target;
      keys.delete('q');
    }

    if (grappleTargetRef.current) {
      const toTarget = grappleTargetRef.current.clone().sub(positionRef.current);
      toTarget.y = 0;
      const distance = toTarget.length();
      if (distance < 2.2) {
        grappleTargetRef.current = null;
      } else {
        const grappleVelocity = toTarget.normalize().multiplyScalar(GRAPPLE_SPEED);
        velocityRef.current.lerp(grappleVelocity, 1 - Math.exp(-18 * delta));
        headingRef.current = Math.atan2(velocityRef.current.x, velocityRef.current.z);
      }
    } else if (dashTimerRef.current > 0) {
      dashTimerRef.current = Math.max(0, dashTimerRef.current - delta);
    } else if (desiredDirection.lengthSq() > 0) {
      desiredDirection.normalize();
      const sprint = keys.has('shift') ? SPRINT_MULTIPLIER : 1;
      const desiredVelocity = desiredDirection.multiplyScalar(speedMetersPerSecond * sprint);
      velocityRef.current.lerp(desiredVelocity, 1 - Math.exp(-22 * delta));
    } else {
      velocityRef.current.lerp(new THREE.Vector3(0, 0, 0), 1 - Math.exp(-16 * delta));
    }

    if (velocityRef.current.lengthSq() > 0.0001) {
      positionRef.current.add(velocityRef.current.clone().multiplyScalar(delta));
      clampToBounds(positionRef.current, bounds, center);
    }
    verticalVelocityRef.current -= GRAVITY * delta;
    positionRef.current.y += verticalVelocityRef.current * delta;
    if (positionRef.current.y < GROUND_Y) {
      positionRef.current.y = GROUND_Y;
      verticalVelocityRef.current = 0;
    }

    if (avatarRef.current) {
      avatarRef.current.position.copy(positionRef.current);
      avatarRef.current.rotation.y = headingRef.current;
    }

    const cameraForward = new THREE.Vector3(Math.sin(cameraYawRef.current), 0, Math.cos(cameraYawRef.current));
    if (cameraMode === 'follow') {
      const pitch = cameraPitchRef.current;
      const horizontal = Math.cos(pitch) * CAMERA_BACK_OFFSET;
      const vertical = Math.sin(pitch) * CAMERA_BACK_OFFSET;
      const desiredCamera = positionRef.current
        .clone()
        .add(cameraForward.clone().multiplyScalar(-horizontal))
        .add(new THREE.Vector3(0, CAMERA_HEIGHT + vertical, 0));
      const cameraTarget = positionRef.current
        .clone()
        .add(cameraForward.clone().multiplyScalar(16));
      cameraTarget.y = TARGET_HEIGHT - vertical * 0.75;
      camera.position.lerp(desiredCamera, 1 - Math.exp(-20 * delta));
      camera.lookAt(cameraTarget);
    }

    if (grappleLineRef.current) {
      const target = grappleTargetRef.current;
      grappleLineRef.current.visible = Boolean(target);
      if (target) {
        const positions = grappleLineRef.current.geometry.attributes.position;
        positions.setXYZ(0, positionRef.current.x, positionRef.current.y + 1.8, positionRef.current.z);
        positions.setXYZ(1, target.x, target.y + 1.4, target.z);
        positions.needsUpdate = true;
      }
    }

    const nearest = findNearestPoi(positionRef.current, pois, center, 18);
    const nearestPoiId = nearest?.poi?.id ?? null;
    if (nearestPoiId && nearestPoiId !== lastPoiIdRef.current) {
      lastPoiIdRef.current = nearestPoiId;
      onNearestPoi?.(nearest.poi);
    }
  });

  if (!active) return null;

  return (
    <>
      <AmsterdamAvatar ref={avatarRef} color="#2f7d89" active={active} />
      <line ref={grappleLineRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array(6), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#f6d7a2" transparent opacity={0.78} />
      </line>
    </>
  );
}
