import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { AmsterdamAvatar } from './AmsterdamAvatar.jsx';
import { findNearestPoi, samplePolyline } from './routeUtils.js';

const CAMERA_HEIGHT = 13.5;
const CAMERA_BACK_OFFSET = 28;
const CAMERA_SIDE_OFFSET = 4;
const TARGET_HEIGHT = 5.2;
const TARGET_FORWARD_OFFSET = 30;

export function AutoTourController({
  routePoints,
  pois,
  center,
  mode,
  cameraMode = 'follow',
  speedMetersPerSecond = 7,
  resetToken,
  onProgress,
  onNearestPoi,
  onArrive,
}) {
  const { camera } = useThree();
  const progressRef = useRef(0);
  const lastReportRef = useRef(0);
  const lastPoiIdRef = useRef(null);
  const markerRef = useRef(null);
  const headingRef = useRef(new THREE.Vector3(0, 0, -1));
  const routeTotal = useMemo(() => samplePolyline(routePoints, Number.POSITIVE_INFINITY).totalMeters, [routePoints]);

  useEffect(() => {
    progressRef.current = 0;
    lastReportRef.current = 0;
    lastPoiIdRef.current = null;
    const sample = samplePolyline(routePoints, 0);
    if (markerRef.current) markerRef.current.position.copy(sample.position);
    onProgress?.({ progressMeters: 0, totalMeters: routeTotal, percent: 0, mode: 'idle' });
  }, [onProgress, resetToken, routePoints, routeTotal]);

  useFrame((_, delta) => {
    if (!routePoints?.length) return;

    if (mode === 'planned' && cameraMode === 'follow') {
      progressRef.current = Math.min(routeTotal, progressRef.current + speedMetersPerSecond * delta);
    }

    const sample = samplePolyline(routePoints, progressRef.current);
    headingRef.current.lerp(sample.direction, 0.12).normalize();

    if (markerRef.current) {
      markerRef.current.position.copy(sample.position);
      markerRef.current.rotation.y = Math.atan2(headingRef.current.x, headingRef.current.z);
    }

    if (mode === 'planned') {
      const side = new THREE.Vector3(-headingRef.current.z, 0, headingRef.current.x).multiplyScalar(CAMERA_SIDE_OFFSET);
      const desiredCamera = sample.position
        .clone()
        .add(headingRef.current.clone().multiplyScalar(-CAMERA_BACK_OFFSET))
        .add(side)
        .add(new THREE.Vector3(0, CAMERA_HEIGHT, 0));
      const desiredTarget = sample.position.clone().add(headingRef.current.clone().multiplyScalar(TARGET_FORWARD_OFFSET));
      desiredTarget.y = TARGET_HEIGHT;

      camera.position.lerp(desiredCamera, 0.16);
      camera.lookAt(desiredTarget);
    }

    const now = performance.now();
    if (now - lastReportRef.current > 140 || sample.done) {
      lastReportRef.current = now;
      onProgress?.({
        progressMeters: sample.progressMeters,
        totalMeters: sample.totalMeters,
        percent: sample.totalMeters > 0 ? sample.progressMeters / sample.totalMeters : 0,
        mode,
        segmentIndex: sample.segmentIndex,
      });

      const nearest = findNearestPoi(sample.position, pois, center, 22);
      const nearestPoiId = nearest?.poi?.id ?? null;
      if (nearestPoiId && nearestPoiId !== lastPoiIdRef.current) {
        lastPoiIdRef.current = nearestPoiId;
        onNearestPoi?.(nearest.poi);
      }
    }

    if (mode === 'planned' && sample.done) {
      onArrive?.();
    }
  });

  if (!routePoints?.length || mode === 'manual') return null;

  return (
    <AmsterdamAvatar ref={markerRef} color="#b98152" active={mode === 'planned'} />
  );
}
