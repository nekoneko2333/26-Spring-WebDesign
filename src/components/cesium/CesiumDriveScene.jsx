import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Cartesian3,
  Cartographic,
  buildModuleUrl,
  CameraEventType,
  CallbackProperty,
  Color,
  createOsmBuildingsAsync,
  createWorldImageryAsync,
  createWorldTerrainAsync,
  DistanceDisplayCondition,
  EllipsoidTerrainProvider,
  EllipsoidGeodesic,
  HeadingPitchRange,
  HeightReference,
  Ion,
  JulianDate,
  LabelStyle,
  Matrix4,
  Math as CesiumMath,
  NearFarScalar,
  OpenStreetMapImageryProvider,
  Quaternion,
  Rectangle,
  sampleTerrainMostDetailed,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Transforms,
  VerticalOrigin,
  HeadingPitchRoll,
  Viewer,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useKeyboardDrive } from '../../hooks/useKeyboardDrive.js';
import { useActiveRouteGeo } from '../../hooks/useActiveRouteGeo.js';
import { landmarks } from '../../data/landmarks.js';
import { useAppStore } from '../../state/useAppStore.js';
import { guideClockAtProgress } from '../../lib/itinerarySchedule.js';

buildModuleUrl.setBaseUrl(import.meta.env.DEV ? '/node_modules/cesium/Build/Cesium/' : '/cesium/');

const START_PROGRESS = 0;
const UI_SYNC_INTERVAL_MS = 100;
const PASSED_ROUTE_CHUNK_COUNT = 200;
const DISPLAY_ROUTE_MAX_POINTS = 12000;
const ROUTE_SIMPLIFY_TOLERANCE_DEGREES = 0.000045;
const NORMAL_SPEED_KMH = 100;
const BOOST_SPEED_KMH = 175;
const WALK_SPEED_KMH = 5;
const WALK_BOOST_SPEED_KMH = 7;
const NORMAL_TIME_SCALE = 12;
const BOOST_TIME_SCALE = 24;
const BUILDING_CACHE_BYTES = 128 * 1024 * 1024;
const BUILDING_OVERFLOW_BYTES = 48 * 1024 * 1024;
const ITALY_RECTANGLE = Rectangle.fromDegrees(6.2, 36.1, 19, 47.6);
const DAYLIGHT_TIME = JulianDate.fromIso8601('2026-06-21T10:30:00Z');
const tempGeodesic = new EllipsoidGeodesic();
let landmarkDotImage = null;
let boatMarkerImage = null;

function routePositions(points) {
  return points.map(({ lon, lat }) => Cartesian3.fromDegrees(lon, lat));
}

function isFerryTravelMode(mode) {
  return mode === 'FERRY_DRIVE' || mode === 'FERRY';
}

function buildPolylineRoute(points) {
  const cumulativeKm = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulativeKm[index] = cumulativeKm[index - 1] + distanceKm(points[index - 1], points[index]);
  }
  const totalKm = cumulativeKm[cumulativeKm.length - 1] || 1;
  return {
    points,
    cumulativeKm,
    totalKm,
    sample(progress) {
      if (points.length === 1) return { ...points[0], index: 0 };
      const distance = Math.max(0, Math.min(1, progress)) * totalKm;
      let endIndex = cumulativeKm.findIndex((value) => value >= distance);
      if (endIndex <= 0) endIndex = 1;
      const startIndex = endIndex - 1;
      const segmentKm = Math.max(cumulativeKm[endIndex] - cumulativeKm[startIndex], Number.EPSILON);
      const fraction = (distance - cumulativeKm[startIndex]) / segmentKm;
      return {
        lon: points[startIndex].lon + (points[endIndex].lon - points[startIndex].lon) * fraction,
        lat: points[startIndex].lat + (points[endIndex].lat - points[startIndex].lat) * fraction,
        index: startIndex,
      };
    },
  };
}

function routePointsBetweenProgress(route, startProgress, endProgress) {
  const safeStart = Math.max(0, Math.min(1, startProgress));
  const safeEnd = Math.max(safeStart, Math.min(1, endProgress));
  const start = route.sample(safeStart);
  const end = route.sample(safeEnd);
  const middle = route.points.slice(start.index + 1, end.index + 1);
  const result = [start, ...middle, end];
  return result.length >= 2 ? result : [start, end];
}

function createBoatMarkerImage() {
  if (boatMarkerImage) return boatMarkerImage;
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 72;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineJoin = 'round';
  context.fillStyle = '#fdfbf7';
  context.strokeStyle = '#243642';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(15, 42);
  context.lineTo(81, 42);
  context.lineTo(68, 62);
  context.lineTo(30, 62);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = '#d96b4d';
  context.fillRect(33, 23, 30, 20);
  context.strokeRect(33, 23, 30, 20);
  context.fillStyle = '#79b8cf';
  context.fillRect(39, 28, 8, 7);
  context.fillRect(51, 28, 8, 7);
  context.beginPath();
  context.moveTo(48, 23);
  context.lineTo(48, 7);
  context.stroke();
  boatMarkerImage = canvas;
  return boatMarkerImage;
}

function createWalkingPersonFrame(step = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 176;
  const context = canvas.getContext('2d');
  context.lineCap = 'round';
  context.lineJoin = 'round';

  const outline = '#252525';
  const skin = '#efb38f';
  const coat = '#d94f4f';
  const coatShade = '#b83d3d';
  const trousers = '#364657';
  const shoe = '#20252a';
  const forward = step > 0;

  context.save();
  context.translate(forward ? 0 : canvas.width, 0);
  context.scale(forward ? 1 : -1, 1);

  // Shadow keeps the figure grounded without obscuring the route.
  context.fillStyle = 'rgba(37, 37, 37, 0.18)';
  context.beginPath();
  context.ellipse(64, 163, 34, 7, 0, 0, Math.PI * 2);
  context.fill();

  // Back leg.
  context.strokeStyle = outline;
  context.lineWidth = 17;
  context.beginPath();
  context.moveTo(60, 105);
  context.lineTo(forward ? 45 : 76, 134);
  context.lineTo(forward ? 34 : 82, 157);
  context.stroke();
  context.strokeStyle = trousers;
  context.lineWidth = 11;
  context.stroke();

  // Back arm.
  context.strokeStyle = outline;
  context.lineWidth = 13;
  context.beginPath();
  context.moveTo(53, 66);
  context.lineTo(forward ? 34 : 79, 88);
  context.lineTo(forward ? 29 : 88, 109);
  context.stroke();
  context.strokeStyle = coatShade;
  context.lineWidth = 8;
  context.stroke();

  // Torso and coat.
  context.fillStyle = coat;
  context.strokeStyle = outline;
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(48, 55);
  context.quadraticCurveTo(64, 47, 80, 58);
  context.lineTo(76, 108);
  context.quadraticCurveTo(62, 116, 47, 106);
  context.closePath();
  context.fill();
  context.stroke();
  context.strokeStyle = 'rgba(255,255,255,0.65)';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(64, 57);
  context.lineTo(63, 104);
  context.stroke();

  // Front leg.
  context.strokeStyle = outline;
  context.lineWidth = 18;
  context.beginPath();
  context.moveTo(67, 106);
  context.lineTo(forward ? 82 : 52, 133);
  context.lineTo(forward ? 100 : 42, 154);
  context.stroke();
  context.strokeStyle = trousers;
  context.lineWidth = 12;
  context.stroke();

  // Shoes.
  context.strokeStyle = shoe;
  context.lineWidth = 10;
  context.beginPath();
  context.moveTo(forward ? 94 : 35, 157);
  context.lineTo(forward ? 111 : 48, 158);
  context.moveTo(forward ? 27 : 75, 160);
  context.lineTo(forward ? 42 : 91, 160);
  context.stroke();

  // Front arm and hand.
  context.strokeStyle = outline;
  context.lineWidth = 14;
  context.beginPath();
  context.moveTo(75, 66);
  context.lineTo(forward ? 91 : 43, 87);
  context.lineTo(forward ? 99 : 34, 105);
  context.stroke();
  context.strokeStyle = coat;
  context.lineWidth = 8;
  context.stroke();
  context.fillStyle = skin;
  context.strokeStyle = outline;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(forward ? 101 : 32, 108, 6, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  // Neck and head.
  context.fillStyle = skin;
  context.strokeStyle = outline;
  context.lineWidth = 4;
  context.fillRect(59, 44, 13, 15);
  context.beginPath();
  context.ellipse(65, 30, 17, 20, -0.08, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  // Hair, ear, and face.
  context.fillStyle = '#3a2c28';
  context.beginPath();
  context.arc(62, 24, 18, Math.PI, Math.PI * 1.95);
  context.quadraticCurveTo(75, 12, 82, 28);
  context.lineTo(77, 37);
  context.quadraticCurveTo(72, 22, 49, 24);
  context.closePath();
  context.fill();
  context.strokeStyle = outline;
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = skin;
  context.beginPath();
  context.arc(81, 32, 5, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = outline;
  context.beginPath();
  context.arc(73, 30, 2, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#9b4b3f';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(73, 40);
  context.quadraticCurveTo(77, 42, 80, 39);
  context.stroke();

  context.restore();
  return canvas;
}

function pointToSegmentDistanceSquared(point, start, end) {
  const latitudeScale = Math.cos(CesiumMath.toRadians(point.lat));
  const segmentX = (end.lon - start.lon) * latitudeScale;
  const segmentY = end.lat - start.lat;
  const pointX = (point.lon - start.lon) * latitudeScale;
  const pointY = point.lat - start.lat;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (segmentLengthSquared === 0) return pointX * pointX + pointY * pointY;
  const fraction = Math.max(
    0,
    Math.min(1, (pointX * segmentX + pointY * segmentY) / segmentLengthSquared),
  );
  const dx = pointX - segmentX * fraction;
  const dy = pointY - segmentY * fraction;
  return dx * dx + dy * dy;
}

function simplifyRoutePoints(points, tolerance) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  const toleranceSquared = tolerance * tolerance;

  while (stack.length) {
    const [startIndex, endIndex] = stack.pop();
    let furthestIndex = -1;
    let furthestDistance = toleranceSquared;
    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distance = pointToSegmentDistanceSquared(
        points[index],
        points[startIndex],
        points[endIndex],
      );
      if (distance > furthestDistance) {
        furthestDistance = distance;
        furthestIndex = index;
      }
    }
    if (furthestIndex >= 0) {
      keep[furthestIndex] = 1;
      stack.push([startIndex, furthestIndex], [furthestIndex, endIndex]);
    }
  }

  return points.filter((_, index) => keep[index]);
}

function buildDisplayPoints(route) {
  if (route.points.length <= DISPLAY_ROUTE_MAX_POINTS) return route.points;
  let tolerance = ROUTE_SIMPLIFY_TOLERANCE_DEGREES;
  let simplified = simplifyRoutePoints(route.points, tolerance);
  while (simplified.length > DISPLAY_ROUTE_MAX_POINTS) {
    tolerance *= 1.35;
    simplified = simplifyRoutePoints(route.points, tolerance);
  }
  return simplified;
}

function distanceKm(a, b) {
  tempGeodesic.setEndPoints(
    Cartographic.fromDegrees(a.lon, a.lat),
    Cartographic.fromDegrees(b.lon, b.lat),
  );
  return tempGeodesic.surfaceDistance / 1000;
}

function formatSceneError(error) {
  if (!error) return 'Cesium scene failed to load.';
  return error instanceof Error ? error.message : String(error);
}

function routeHeading(route, progress) {
  const current = route.sample(progress);
  const lookAheadProgress = Math.min(1, progress + Math.max(0.00008, 0.25 / route.totalKm));
  const ahead = route.sample(lookAheadProgress);
  tempGeodesic.setEndPoints(
    Cartographic.fromDegrees(current.lon, current.lat),
    Cartographic.fromDegrees(ahead.lon, ahead.lat),
  );
  return tempGeodesic.startHeading;
}

function landmarkProgress(route, landmark) {
  let bestProgress = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index <= 500; index += 1) {
    const progress = index / 500;
    const point = route.sample(progress);
    const dx = (point.lon - landmark.lon) * Math.cos(CesiumMath.toRadians(landmark.lat));
    const dy = point.lat - landmark.lat;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestProgress = progress;
    }
  }
  return bestProgress;
}

function getVisibleLandmarks(indexedLandmarks, progress) {
  if (!indexedLandmarks.length) return [];
  let nextIndex = indexedLandmarks.findIndex((item) => item.progress >= progress - 0.003);
  if (nextIndex < 0) nextIndex = indexedLandmarks.length - 1;
  return indexedLandmarks
    .filter((_, index) => Math.abs(index - nextIndex) <= 1)
    .map((item) => item.landmark);
}

function getStreamingPressure(queue, wasPaused) {
  const paused = wasPaused ? queue > 70 : queue > 120;
  if (paused) return { level: 'critical', factor: 0, paused: true };
  if (queue > 55) return { level: 'high', factor: 0.3, paused: false };
  if (queue > 18) return { level: 'medium', factor: 0.65, paused: false };
  return { level: 'low', factor: 1, paused: false };
}

function getLandmarkDotImage() {
  if (landmarkDotImage) return landmarkDotImage;
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 48;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, 40, 48);
  context.fillStyle = '#ff4d4d';
  context.strokeStyle = '#ffffff';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(20, 45);
  context.bezierCurveTo(17, 36, 7, 29, 7, 18);
  context.arc(20, 18, 13, Math.PI, 0);
  context.bezierCurveTo(33, 29, 23, 36, 20, 45);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = '#fdfbf7';
  context.strokeStyle = '#2d2d2d';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(20, 18, 6, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  landmarkDotImage = canvas;
  return landmarkDotImage;
}

function cameraProfileForLandmark(landmark) {
  if (landmark?.modelKind === 'mountain') {
    return { clearance: 18000, fallbackHeight: 24000, offsetKm: 0, pitch: -89, topDown: true };
  }
  if (landmark?.modelKind === 'lake' || landmark?.modelKind === 'coast') {
    return { clearance: 2600, fallbackHeight: 5200, offsetKm: 3.2, pitch: -38 };
  }
  return { clearance: 1400, fallbackHeight: 2600, offsetKm: 1.6, pitch: -45 };
}

function offsetCoordinate(lon, lat, heading, distanceKm) {
  const behindHeading = heading + Math.PI;
  const latDelta = Math.cos(behindHeading) * distanceKm / 111.32;
  const lonDelta = Math.sin(behindHeading) * distanceKm / (111.32 * Math.max(0.2, Math.cos(CesiumMath.toRadians(lat))));
  return { lon: lon + lonDelta, lat: lat + latDelta };
}

function headingBetweenCoordinates(from, to) {
  const lat1 = CesiumMath.toRadians(from.lat);
  const lat2 = CesiumMath.toRadians(to.lat);
  const deltaLon = CesiumMath.toRadians(to.lon - from.lon);
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return CesiumMath.zeroToTwoPi(Math.atan2(y, x));
}

function orderedIndexedLandmarks(route) {
  const stops = route.routeIds
    .map((id) => landmarks.find((item) => item.id === id))
    .filter(Boolean)
    .map((landmark, index) => ({
      landmark,
      id: landmark.id,
      index,
      progress: route.stopProgressById?.get(landmark.id) ?? landmarkProgress(route, landmark),
    }));

  let previous = -1;
  stops.forEach((stop, index) => {
    const lowerBound = index === 0 ? 0 : previous + 0.0004;
    stop.progress = Math.min(1, Math.max(stop.progress, lowerBound));
    previous = stop.progress;
  });

  return stops.sort((a, b) => a.progress - b.progress || a.index - b.index);
}

function addLandmarkEntity(viewer, landmark, highlighted, labelSlot = 0) {
  const common = {
    id: `landmark-${landmark.id}`,
    position: Cartesian3.fromDegrees(landmark.lon, landmark.lat),
    billboard: {
      image: getLandmarkDotImage(),
      width: 25,
      height: 30,
      heightReference: HeightReference.RELATIVE_TO_GROUND,
      verticalOrigin: VerticalOrigin.BOTTOM,
      disableDepthTestDistance: 1000000000,
      distanceDisplayCondition: new DistanceDisplayCondition(0, 60000),
      pixelOffset: { x: 0, y: -5 },
    },
    label: {
      text: useAppStore.getState().language === 'zh'
        ? (landmark.localizedNames?.zh ?? landmark.name)
        : (landmark.localizedNames?.en ?? landmark.name),
      font: '700 16px sans-serif',
      fillColor: Color.WHITE,
      outlineColor: Color.fromCssColorString('#18324a'),
      outlineWidth: 5,
      style: LabelStyle.FILL_AND_OUTLINE,
      showBackground: true,
      backgroundColor: Color.fromCssColorString('#263238').withAlpha(0.72),
      backgroundPadding: { x: 7, y: 5 },
      pixelOffset: {
        x: ((labelSlot % 3) - 1) * 22,
        y: -45 - (labelSlot % 2) * 18,
      },
      distanceDisplayCondition: new DistanceDisplayCondition(0, 80000),
      scaleByDistance: new NearFarScalar(1500, 1, 80000, 0.48),
      disableDepthTestDistance: 1000000000,
    },
  };

  if (landmark.modelPath) {
    return viewer.entities.add({
      ...common,
      model: {
        uri: landmark.modelPath,
        minimumPixelSize: highlighted ? 24 : 16,
        maximumScale: 24,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        runAnimations: false,
        color: Color.WHITE,
      },
    });
  }

  return viewer.entities.add(common);
}

export function CesiumDriveScene({ isStarted }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const isStartedRef = useRef(isStarted);
  const route = useActiveRouteGeo();
  const controls = useKeyboardDrive();
  const [streamingState, setStreamingState] = useState({
    queue: 0,
    level: 'low',
    paused: false,
  });
  const [sceneError, setSceneError] = useState('');
  const [freeHeadingDegrees, setFreeHeadingDegrees] = useState(0);
  const cesiumReady = useAppStore((state) => state.cesiumStatus.ready);
  const cameraMode = useAppStore((state) => state.cameraMode);
  const routeKey = `${route.signature}-${useAppStore((state) => state.tourResetToken)}`;
  const setCesiumStatus = useAppStore((state) => state.setCesiumStatus);
  const displayPoints = useMemo(() => buildDisplayPoints(route), [route]);
  const displayRoute = useMemo(() => buildPolylineRoute(displayPoints), [displayPoints]);
  const routeCartesian = useMemo(() => routePositions(displayPoints), [displayPoints]);
  const ferryRouteCartesians = useMemo(() => (
    (route.modeRanges ?? [])
      .filter((range) => isFerryTravelMode(range.travelMode))
      .map((range) => routePositions(
        routePointsBetweenProgress(displayRoute, range.start, range.end),
      ))
  ), [displayRoute, route.modeRanges]);
  const passedRouteChunks = useMemo(() => (
    Array.from({ length: PASSED_ROUTE_CHUNK_COUNT }, (_, index) => routePositions(
      routePointsBetweenProgress(
        displayRoute,
        index / PASSED_ROUTE_CHUNK_COUNT,
        (index + 1) / PASSED_ROUTE_CHUNK_COUNT,
      ),
    ))
  ), [displayRoute]);

  useEffect(() => {
    isStartedRef.current = isStarted;
  }, [isStarted]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    let disposed = false;
    let tickRemove = null;
    let clickHandler = null;
    let buildings = null;
    let currentTileQueue = 0;
    const viewer = new Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      shouldAnimate: false,
      useBrowserRecommendedResolution: true,
    });
    viewerRef.current = viewer;
    viewer.clock.currentTime = JulianDate.clone(DAYLIGHT_TIME);
    viewer.clock.shouldAnimate = false;
    viewer.resolutionScale = window.innerWidth < 900 ? 0.78 : 0.9;
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.globe.enableLighting = false;
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.globe.maximumScreenSpaceError = 5;
    viewer.scene.globe.tileCacheSize = 70;
    viewer.scene.globe.preloadAncestors = true;
    viewer.scene.globe.preloadSiblings = false;
    viewer.scene.globe.loadingDescendantLimit = 20;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.fog.enabled = false;
    viewer.scene.fog.density = 0.00018;
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 12;
    viewer.scene.screenSpaceCameraController.rotateEventTypes = CameraEventType.LEFT_DRAG;
    viewer.scene.screenSpaceCameraController.lookEventTypes = [];
    viewer.scene.screenSpaceCameraController.tiltEventTypes = CameraEventType.RIGHT_DRAG;
    viewer.scene.screenSpaceCameraController.zoomEventTypes = [
      CameraEventType.WHEEL,
      CameraEventType.PINCH,
    ];
    viewer.imageryLayers.removeAll();

    const removeTileListener = viewer.scene.globe.tileLoadProgressEvent.addEventListener((count) => {
      currentTileQueue = count;
    });
    const removeRenderErrorListener = viewer.scene.renderError.addEventListener((_scene, error) => {
      if (!disposed) setSceneError(formatSceneError(error));
    });

    async function initialize() {
      try {
        const token = import.meta.env.VITE_CESIUM_ION_TOKEN?.trim();
        if (token) Ion.defaultAccessToken = token;
        setCesiumStatus({ terrain: 'loading', imagery: 'loading', buildings: 'loading', ready: false, error: '' });

        let terrainProvider;
        let hasDetailedTerrain = false;
        try {
          if (!token) throw new Error('Cesium ion token is not configured.');
          terrainProvider = await createWorldTerrainAsync({
            requestWaterMask: true,
            requestVertexNormals: true,
          });
          hasDetailedTerrain = true;
        } catch {
          terrainProvider = new EllipsoidTerrainProvider();
        }
        if (disposed) return;
        viewer.terrainProvider = terrainProvider;

        let imageryProvider;
        try {
          if (!token) throw new Error('Cesium ion token is not configured.');
          imageryProvider = await createWorldImageryAsync();
        } catch {
          imageryProvider = new OpenStreetMapImageryProvider({
            url: 'https://tile.openstreetmap.org/',
          });
        }
        if (disposed) return;
        const imageryLayer = viewer.imageryLayers.addImageryProvider(imageryProvider);
        imageryLayer.brightness = 1.08;
        imageryLayer.contrast = 1.02;
        imageryLayer.gamma = 1.04;
        setCesiumStatus({ terrain: 'ready', imagery: 'ready' });

        const first = route.sample(START_PROGRESS);
        let startHeight = 0;
        if (hasDetailedTerrain) {
          try {
            const sampled = await sampleTerrainMostDetailed(terrainProvider, [
              Cartographic.fromDegrees(first.lon, first.lat),
            ]);
            if (disposed) return;
            startHeight = Number.isFinite(sampled[0]?.height) ? sampled[0].height : 0;
          } catch {
            startHeight = 0;
          }
        }

        try {
          if (!token) throw new Error('Cesium ion token is not configured.');
          buildings = await createOsmBuildingsAsync({
            cacheBytes: BUILDING_CACHE_BYTES,
            maximumCacheOverflowBytes: BUILDING_OVERFLOW_BYTES,
            maximumScreenSpaceError: 30,
            dynamicScreenSpaceError: true,
            dynamicScreenSpaceErrorFactor: 36,
            progressiveResolutionHeightFraction: 0.2,
            foveatedScreenSpaceError: true,
            foveatedConeSize: 0.15,
            foveatedTimeDelay: 0.6,
            cullRequestsWhileMoving: true,
            cullRequestsWhileMovingMultiplier: 80,
            preloadFlightDestinations: true,
          });
          if (!disposed) {
            viewer.scene.primitives.add(buildings);
            setCesiumStatus({ buildings: 'ready' });
          }
        } catch {
          if (!disposed) setCesiumStatus({ buildings: 'error' });
        }

        viewer.entities.add({
          id: 'route-base-outline',
          polyline: {
            positions: routeCartesian,
            width: 10,
            material: Color.fromCssColorString('#263238').withAlpha(0.72),
            clampToGround: true,
            zIndex: 8,
          },
        });
        viewer.entities.add({
          id: 'route-base',
          polyline: {
            positions: routeCartesian,
            width: 6,
            material: Color.fromCssColorString('#f3e9c2').withAlpha(0.9),
            clampToGround: true,
            zIndex: 9,
          },
        });
        ferryRouteCartesians.forEach((positions, index) => {
          viewer.entities.add({
            id: `route-ferry-${index}`,
            polyline: {
              positions,
              width: 7,
              material: Color.fromCssColorString('#4aa8c7'),
              clampToGround: true,
              zIndex: 10,
            },
          });
        });
        const passedRouteEntities = passedRouteChunks.map((positions, index) => (
          viewer.entities.add({
            id: `route-passed-${index}`,
            polyline: {
              positions,
              width: 6,
              material: Color.fromCssColorString('#df3f3f'),
              clampToGround: true,
              zIndex: 12,
            },
            show: false,
          })
        ));
        let passedRouteHeadPositions = routePositions(
          routePointsBetweenProgress(displayRoute, 0, 0),
        );
        const passedRouteHead = viewer.entities.add({
          id: 'route-passed-head',
          polyline: {
            positions: new CallbackProperty(() => passedRouteHeadPositions, false),
            width: 6,
            material: Color.fromCssColorString('#df3f3f'),
            clampToGround: true,
            zIndex: 13,
          },
          show: false,
        });
        const initialPosition = Cartesian3.fromDegrees(first.lon, first.lat, startHeight + 0.65);
        const initialBoatPosition = Cartesian3.fromDegrees(first.lon, first.lat, 7);
        const walkingFrames = [createWalkingPersonFrame(-1), createWalkingPersonFrame(1)];
        const initialTravelMode = route.travelModeAt(0);
        const startsWalking = initialTravelMode === 'WALK';
        const startsFerry = isFerryTravelMode(initialTravelMode);
        const initialOrientation = Transforms.headingPitchRollQuaternion(
          initialPosition,
          new HeadingPitchRoll(routeHeading(route, 0), 0, 0),
        );
        const vehicle = viewer.entities.add({
          id: 'tour-vehicle',
          position: initialPosition,
          orientation: initialOrientation,
          model: {
            uri: '/models/low-poly_truck_car_drifter.glb',
            scale: 0.18,
            minimumPixelSize: 18,
            maximumScale: 1.4,
            heightReference: HeightReference.NONE,
          },
          show: !startsWalking && !startsFerry,
        });
        const walker = viewer.entities.add({
          id: 'tour-walker',
          position: initialPosition,
          billboard: {
            image: walkingFrames[0],
            width: 58,
            height: 80,
            heightReference: HeightReference.NONE,
            disableDepthTestDistance: 5000,
            scaleByDistance: new NearFarScalar(100, 1.15, 8000, 0.55),
          },
          show: startsWalking,
        });
        const boat = viewer.entities.add({
          id: 'tour-boat',
          position: initialBoatPosition,
          orientation: initialOrientation,
          model: {
            uri: '/models/low-poly_ferry.glb',
            scale: 1.15,
            minimumPixelSize: 56,
            maximumScale: 12,
            heightReference: HeightReference.NONE,
          },
          show: startsFerry,
        });
        const boatMarker = viewer.entities.add({
          id: 'tour-boat-marker',
          position: initialBoatPosition,
          billboard: {
            image: createBoatMarkerImage(),
            width: 62,
            height: 47,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: { x: 0, y: -38 },
            disableDepthTestDistance: 1000000000,
            scaleByDistance: new NearFarScalar(500, 1, 16000, 0.58),
          },
          show: startsFerry,
        });

        const indexedLandmarks = orderedIndexedLandmarks(route);
        const landmarkEntities = new Map();
        const scratchPosition = new Cartesian3();
        const scratchBoatPosition = new Cartesian3();
        const scratchCameraTarget = new Cartesian3();
        const scratchOrientation = new Quaternion();
        const scratchHpr = new HeadingPitchRoll();
        let progress = START_PROGRESS;
        let previousProgress = START_PROGRESS;
        let speedKmh = 0;
        let targetSpeedKmh = 0;
        let effectiveTimeScale = 0;
        let lastTime = performance.now();
        let lastUiSync = 0;
        let visiblePassedChunkCount = 0;
        let lastLandmarkKey = '';
        let smoothedHeading = routeHeading(route, progress);
        let smoothedRange = 1500;
        let walkingFrameIndex = 0;
        let mapModeApplied = false;
        let focusModeId = null;
        let previousCameraMode = 'follow';
        let handledJumpToken = 0;
        let jumpCameraHoldUntil = 0;
        let forcedCurrentStopId = null;
        let forcedCurrentStopUntil = 0;
        let cameraGroundHeight = startHeight;
        let pressure = getStreamingPressure(0, false);

        const applyLandmarks = () => {
          const visible = indexedLandmarks.map((item) => item.landmark);
          const key = visible.map((item) => item.id).join('|');
          if (key === lastLandmarkKey) return;
          lastLandmarkKey = key;
          const visibleIds = new Set(visible.map((item) => item.id));
          for (const [id, entity] of landmarkEntities) {
            if (!visibleIds.has(id)) {
              viewer.entities.remove(entity);
              landmarkEntities.delete(id);
            }
          }
          visible.forEach((landmark, index) => {
            if (!landmarkEntities.has(landmark.id)) {
              landmarkEntities.set(
                landmark.id,
                addLandmarkEntity(viewer, landmark, index === 1, index),
              );
            }
          });
        };


        const currentStopIdForProgress = (routeProgress) => {
          const currentStop = [...indexedLandmarks]
            .reverse()
            .find((stop) => routeProgress >= stop.progress - 0.002);
          return currentStop?.id ?? indexedLandmarks[0]?.id ?? route.routeIds[0] ?? null;
        };

        const terrainHeightCache = new Map();
        const routeHeightCache = new Map();
        const pendingRouteHeightSamples = new Set();
        const getTerrainHeightForCamera = async (lon, lat) => {
          const key = `${lon.toFixed(5)},${lat.toFixed(5)}`;
          if (terrainHeightCache.has(key)) return terrainHeightCache.get(key);
          let height = 0;
          if (hasDetailedTerrain) {
            try {
              const sampled = await sampleTerrainMostDetailed(terrainProvider, [
                Cartographic.fromDegrees(lon, lat),
              ]);
              height = Number.isFinite(sampled[0]?.height) ? sampled[0].height : 0;
            } catch {
              height = 0;
            }
          } else {
            const globeHeight = viewer.scene.globe.getHeight(Cartographic.fromDegrees(lon, lat));
            height = Number.isFinite(globeHeight) ? globeHeight : 0;
          }
          terrainHeightCache.set(key, height);
          return height;
        };
        const getRouteGroundHeight = (lon, lat) => {
          const key = `${lon.toFixed(5)},${lat.toFixed(5)}`;
          const cartographic = Cartographic.fromDegrees(lon, lat);
          const liveHeight = viewer.scene.globe.getHeight(cartographic);
          if (Number.isFinite(liveHeight)) {
            routeHeightCache.set(key, liveHeight);
            return liveHeight;
          }
          if (routeHeightCache.has(key)) return routeHeightCache.get(key);
          if (hasDetailedTerrain && !pendingRouteHeightSamples.has(key)) {
            pendingRouteHeightSamples.add(key);
            sampleTerrainMostDetailed(terrainProvider, [Cartographic.fromDegrees(lon, lat)])
              .then((sampled) => {
                const sampledHeight = Number.isFinite(sampled[0]?.height) ? sampled[0].height : 0;
                routeHeightCache.set(key, sampledHeight);
              })
              .catch(() => {})
              .finally(() => pendingRouteHeightSamples.delete(key));
          }
          return null;
        };
        const flyToLandmark = async (landmark, duration = 0.9) => {
          const profile = cameraProfileForLandmark(landmark);
          const heading = routeHeading(route, progress);
          const cameraCoord = offsetCoordinate(landmark.lon, landmark.lat, heading, profile.offsetKm);
          const terrainHeight = await getTerrainHeightForCamera(
            profile.topDown ? landmark.lon : cameraCoord.lon,
            profile.topDown ? landmark.lat : cameraCoord.lat,
          );
          if (disposed) return;
          const cameraHeading = headingBetweenCoordinates(cameraCoord, landmark);
          viewer.camera.lookAtTransform(Matrix4.IDENTITY);
          viewer.camera.flyTo({
            destination: Cartesian3.fromDegrees(
              profile.topDown ? landmark.lon : cameraCoord.lon,
              profile.topDown ? landmark.lat : cameraCoord.lat,
              Math.max(profile.fallbackHeight, terrainHeight + profile.clearance),
            ),
            orientation: {
              heading: profile.topDown ? 0 : cameraHeading,
              pitch: CesiumMath.toRadians(profile.pitch),
              roll: 0,
            },
            duration,
          });
        };

        clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
        clickHandler.setInputAction((movement) => {
          const picked = viewer.scene.pick(movement.position);
          const entityId = picked?.id?.id;
          if (typeof entityId !== 'string' || !entityId.startsWith('landmark-')) return;
          const landmarkId = entityId.slice('landmark-'.length);
          useAppStore.getState().jumpVehicleToLandmark(landmarkId);
        }, ScreenSpaceEventType.LEFT_CLICK);

        applyLandmarks();
        setCesiumStatus({ ready: true });

        tickRemove = viewer.clock.onTick.addEventListener(() => {
          if (disposed) return;
          const now = performance.now();
          const delta = Math.min((now - lastTime) / 1000, 0.08);
          lastTime = now;
          const state = useAppStore.getState();
          const routeLocked = state.focusPanelOpen || state.modelViewerOpen;
          if (state.vehicleJumpTarget?.token && handledJumpToken !== state.vehicleJumpTarget.token) {
            const jumpStop = indexedLandmarks.find((stop) => stop.id === state.vehicleJumpTarget.landmarkId);
            if (jumpStop) {
              handledJumpToken = state.vehicleJumpTarget.token;
              progress = jumpStop.progress;
              previousProgress = progress;
              forcedCurrentStopId = jumpStop.id;
              forcedCurrentStopUntil = now + 2400;
              speedKmh = 0;
              targetSpeedKmh = 0;
              effectiveTimeScale = 0;
              mapModeApplied = false;
              focusModeId = null;
              jumpCameraHoldUntil = 0;
              smoothedHeading = routeHeading(route, progress);
              smoothedRange = 2500;
              state.setNearbyLandmarkId(jumpStop.id);
              const jumpTravelMode = route.travelModeAt(progress);
              const jumpIsWalking = jumpTravelMode === 'WALK';
              const jumpIsFerry = isFerryTravelMode(jumpTravelMode);
              const jumpClock = guideClockAtProgress(
                state.activeItineraryPlan,
                progress,
                state.itineraryVisitHours,
              );
              state.setVehicleState({
                vehicleSpeed: 0,
                vehicleSteer: 0,
                routeProgress: progress,
                ...jumpClock,
                routeContext: {
                  point: { id: `cesium-${jumpStop.id}`, roadType: '真实道路' },
                  segment: {
                    id: 'cesium-route',
                    type: jumpIsWalking ? 'walk' : jumpIsFerry ? 'ferry' : 'scenic',
                    speedLimit: jumpIsWalking ? WALK_SPEED_KMH : 110,
                    trafficState: 'normal',
                  },
                  profile: {
                    label: jumpIsWalking ? '步行路线' : jumpIsFerry ? '水路 / 轮渡' : 'Cesium 实景路线',
                    surfaceLabel: jumpIsWalking ? '步行道路' : jumpIsFerry ? '水道' : '地形贴合道路',
                    color: '#59666b',
                  },
                  currentStopId: forcedCurrentStopId,
                },
              });
            }
          }
          const input = controls.current;
          const currentTravelMode = route.travelModeAt(progress);
          const isWalking = currentTravelMode === 'WALK';
          const isFerry = isFerryTravelMode(currentTravelMode);
          const hasManualInput = input.forward || input.backward;
          if (routeLocked || (hasManualInput && state.autoDrive)) state.setAutoDrive(false);

          if (!isStartedRef.current || routeLocked || !state.cesiumStatus.ready) {
            targetSpeedKmh = 0;
          } else if (state.autoDrive || input.forward) {
            targetSpeedKmh = isWalking
              ? (input.boost ? WALK_BOOST_SPEED_KMH : WALK_SPEED_KMH)
              : (input.boost ? BOOST_SPEED_KMH : NORMAL_SPEED_KMH);
          } else if (input.backward) {
            targetSpeedKmh = isWalking ? -3 : input.boost ? -36 : -22;
          } else {
            targetSpeedKmh = 0;
          }

          const acceleration = Math.abs(targetSpeedKmh) > Math.abs(speedKmh)
            ? input.boost ? 90 : 40
            : 52;
          const maxDelta = acceleration * delta;
          speedKmh += Math.max(-maxDelta, Math.min(maxDelta, targetSpeedKmh - speedKmh));
          if (Math.abs(speedKmh) < 0.05) speedKmh = 0;

          const buildingQueue = buildings
            ? (buildings.statistics?.numberOfPendingRequests ?? 0)
              + (buildings.statistics?.numberOfTilesProcessing ?? 0)
            : 0;
          pressure = getStreamingPressure(currentTileQueue + buildingQueue, pressure.paused);
          const requestedTimeScale = input.boost ? BOOST_TIME_SCALE : NORMAL_TIME_SCALE;
          const targetTimeScale = requestedTimeScale * state.routePlaybackSpeed * pressure.factor;
          effectiveTimeScale += (targetTimeScale - effectiveTimeScale) * (1 - Math.exp(-delta * 0.8));
          if (pressure.paused && effectiveTimeScale < 0.15) effectiveTimeScale = 0;

          previousProgress = progress;
          progress = Math.max(0, Math.min(
            1,
            progress + (speedKmh / Math.max(route.distanceKm, 1) / 3600) * effectiveTimeScale * delta,
          ));
          const nextPassedChunkCount = Math.min(
            PASSED_ROUTE_CHUNK_COUNT,
            Math.floor(progress * PASSED_ROUTE_CHUNK_COUNT),
          );
          if (nextPassedChunkCount !== visiblePassedChunkCount) {
            if (nextPassedChunkCount > visiblePassedChunkCount) {
              for (let index = visiblePassedChunkCount; index < nextPassedChunkCount; index += 1) {
                passedRouteEntities[index].show = true;
              }
            } else {
              for (let index = nextPassedChunkCount; index < visiblePassedChunkCount; index += 1) {
                passedRouteEntities[index].show = false;
              }
            }
            visiblePassedChunkCount = nextPassedChunkCount;
          }
          const passedHeadStart = Math.min(
            progress,
            visiblePassedChunkCount / PASSED_ROUTE_CHUNK_COUNT,
          );
          passedRouteHeadPositions = routePositions(
            routePointsBetweenProgress(displayRoute, passedHeadStart, progress),
          );
          passedRouteHead.show = progress > 0 && progress < 1;
          if (progress >= 1 && speedKmh > 0) {
            speedKmh = 0;
            state.setAutoDrive(false);
            state.setGuidedTourState({ guidedTourState: 'FINISHED' });
          }

          const point = route.sample(progress);
          const heading = routeHeading(route, progress);
          const routeGroundHeight = getRouteGroundHeight(point.lon, point.lat);
          if (Number.isFinite(routeGroundHeight)) {
            cameraGroundHeight = isFerry ? Math.max(0, routeGroundHeight) : routeGroundHeight;
          }
          const cameraTargetHeight = cameraGroundHeight + 8;
          const movingModelHeight = isFerry ? 0 : Math.max(0, cameraGroundHeight);
          Cartesian3.fromDegrees(
            point.lon,
            point.lat,
            movingModelHeight + 0.8,
            undefined,
            scratchPosition,
          );
          Cartesian3.fromDegrees(point.lon, point.lat, 7, undefined, scratchBoatPosition);
          Cartesian3.fromDegrees(point.lon, point.lat, cameraTargetHeight, undefined, scratchCameraTarget);
          scratchHpr.heading = heading;
          scratchHpr.pitch = 0;
          scratchHpr.roll = 0;
          Transforms.headingPitchRollQuaternion(
            scratchPosition,
            scratchHpr,
            undefined,
            undefined,
            scratchOrientation,
          );
          vehicle.position.setValue(scratchPosition);
          vehicle.orientation.setValue(scratchOrientation);
          vehicle.show = !isWalking && !isFerry;
          walker.position.setValue(scratchPosition);
          walker.show = isWalking;
          boat.position.setValue(scratchBoatPosition);
          boat.orientation.setValue(scratchOrientation);
          boat.show = isFerry;
          boatMarker.position.setValue(scratchBoatPosition);
          boatMarker.show = isFerry;
          if (isWalking) {
            const nextWalkingFrame = Math.floor(now / 280) % walkingFrames.length;
            if (nextWalkingFrame !== walkingFrameIndex) {
              walkingFrameIndex = nextWalkingFrame;
              walker.billboard.image.setValue(walkingFrames[walkingFrameIndex]);
            }
          }

          applyLandmarks();

          const crossedStop = indexedLandmarks.find((stop) => (
            previousProgress < stop.progress
            && progress >= stop.progress
            && !state.arrivedLandmarkIds.includes(stop.id)
          ));
          if (state.autoDrive && crossedStop) {
            speedKmh = 0;
            state.showArrivalNotice(crossedStop.id);
          }

          if (now - lastUiSync >= UI_SYNC_INTERVAL_MS) {
            lastUiSync = now;
            const nextHeading = CesiumMath.toDegrees(viewer.camera.heading);
            setFreeHeadingDegrees((current) => (
              Math.abs(current - nextHeading) < 0.5 ? current : nextHeading
            ));
            const combinedQueue = currentTileQueue + buildingQueue;
            setStreamingState((current) => (
              current.queue === combinedQueue
              && current.level === pressure.level
              && current.paused === pressure.paused
                ? current
                : { queue: combinedQueue, level: pressure.level, paused: pressure.paused }
            ));

            const settled = Math.abs(speedKmh) < 1 || state.cameraMode === 'focus';
            viewer.scene.globe.maximumScreenSpaceError = pressure.level === 'critical'
              ? 7
              : settled ? 2.75 : 5;
            if (buildings) {
              buildings.maximumScreenSpaceError = pressure.level === 'critical'
                ? 42
                : settled ? 20 : 30;
            }

            const currentStopId = now < forcedCurrentStopUntil && forcedCurrentStopId
              ? forcedCurrentStopId
              : currentStopIdForProgress(progress);
            let nearbyLandmark = null;
            let nearbyDistance = Number.POSITIVE_INFINITY;
            for (const { landmark } of indexedLandmarks) {
              const candidateDistance = distanceKm(point, landmark);
              if (candidateDistance < nearbyDistance) {
                nearbyDistance = candidateDistance;
                nearbyLandmark = landmark;
              }
            }
            state.setNearbyLandmarkId(
              now < forcedCurrentStopUntil && forcedCurrentStopId
                ? forcedCurrentStopId
                : nearbyDistance <= 5 ? nearbyLandmark?.id ?? null : null,
            );
            state.setVehicleState({
              vehicleSpeed: Math.abs(speedKmh),
              vehicleSteer: 0,
              routeProgress: progress,
              ...guideClockAtProgress(
                state.activeItineraryPlan,
                progress,
                state.itineraryVisitHours,
              ),
              routeContext: {
                point: { id: `cesium-${point.index}`, roadType: '真实道路' },
                segment: {
                  id: 'cesium-route',
                  type: isWalking ? 'walk' : isFerry ? 'ferry' : 'scenic',
                  speedLimit: isWalking ? WALK_SPEED_KMH : 110,
                  trafficState: 'normal',
                },
                profile: {
                  label: isWalking ? '步行路线' : isFerry ? '水路 / 轮渡' : 'Cesium 实景路线',
                  surfaceLabel: isWalking ? '步行道路' : isFerry ? '水道' : '地形贴合道路',
                  color: '#59666b',
                },
                currentStopId,
              },
            });
          }

          if (state.cameraMode !== previousCameraMode) {
            if (buildings && (state.cameraMode === 'map' || previousCameraMode === 'map')) {
              buildings.trimLoadedTiles();
            }
            previousCameraMode = state.cameraMode;
          }

          if (now < jumpCameraHoldUntil) return;

          if (state.cameraMode === 'map') {
            if (!mapModeApplied) {
              mapModeApplied = true;
              focusModeId = null;
              viewer.camera.lookAtTransform(Matrix4.IDENTITY);
              viewer.camera.flyTo({ destination: ITALY_RECTANGLE, duration: 1.2 });
            }
            return;
          }

          mapModeApplied = false;
          if (state.cameraMode === 'focus' && state.selectedLandmarkId) {
            if (focusModeId !== state.selectedLandmarkId) {
              focusModeId = state.selectedLandmarkId;
              const landmark = landmarks.find((item) => item.id === state.selectedLandmarkId);
              if (landmark) {
                flyToLandmark(landmark, 1.05);
              }
            }
            return;
          }
          focusModeId = null;
          if (state.cameraMode === 'free') {
            viewer.camera.lookAtTransform(Matrix4.IDENTITY);
            return;
          }

          const speedRatio = Math.min(Math.abs(speedKmh) / BOOST_SPEED_KMH, 1);
          const playbackRatio = Math.min(Math.max(state.routePlaybackSpeed ?? 1, 1) / 8, 3);
          const headingDelta = CesiumMath.negativePiToPi(heading - smoothedHeading);
          smoothedHeading += headingDelta * (1 - Math.exp(-delta * (0.85 + playbackRatio * 1.15)));
          const targetRange = 2850 + speedRatio * 1200 + Math.max(0, (state.routePlaybackSpeed ?? 1) - 4) * 100;
          smoothedRange += (targetRange - smoothedRange) * (1 - Math.exp(-delta * (0.75 + playbackRatio * 0.9)));
          viewer.camera.lookAt(
            scratchCameraTarget,
            new HeadingPitchRange(smoothedHeading, CesiumMath.toRadians(-30), smoothedRange),
          );
        });
      } catch (error) {
        if (disposed) return;
        const message = formatSceneError(error);
        setSceneError(message);
        setCesiumStatus({
          terrain: 'error',
          imagery: 'error',
          buildings: 'error',
          ready: false,
          error: message,
        });
      }
    }

    initialize();
    return () => {
      disposed = true;
      if (tickRemove) tickRemove();
      if (clickHandler && !clickHandler.isDestroyed()) clickHandler.destroy();
      removeTileListener();
      removeRenderErrorListener();
      if (buildings && !buildings.isDestroyed()) buildings.trimLoadedTiles();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [controls, displayRoute, ferryRouteCartesians, passedRouteChunks, route, routeCartesian, routeKey, setCesiumStatus]);

  const showInitialLoading = !sceneError && !cesiumReady;
  const showStreamingPause = !sceneError && cesiumReady && streamingState.paused;

  return (
    <div className="cesium-drive-scene">
      <div
        ref={containerRef}
        className="cesium-drive-scene__canvas"
        onContextMenu={(event) => event.preventDefault()}
      />
      <aside className="free-view-compass" aria-label="地图方向">
        <div
          className="free-view-compass__dial"
          style={{ transform: `rotate(${-freeHeadingDegrees}deg)` }}
        >
          <strong className="free-view-compass__north">北</strong>
          <span className="free-view-compass__east">东</span>
          <span className="free-view-compass__south">南</span>
          <span className="free-view-compass__west">西</span>
        </div>
        <i aria-hidden="true" />
        <p>{cameraMode === 'free' ? '左键平移 · 右键旋转' : '地图方向'}</p>
      </aside>
      {(showInitialLoading || showStreamingPause) && (
        <div className={`cesium-drive-scene__loading ${showStreamingPause ? 'is-streaming' : ''}`}>
          <strong>{showStreamingPause ? '正在加载前方地图' : '正在加载意大利地形'}</strong>
          <span>
            {streamingState.queue > 0
              ? `剩余 ${streamingState.queue} 个地图资源`
              : '正在连接 Cesium ion'}
          </span>
        </div>
      )}
      {sceneError && (
        <div className="cesium-drive-scene__error">
          <strong>实景地图加载失败</strong>
          <span>{sceneError}</span>
        </div>
      )}
    </div>
  );
}
