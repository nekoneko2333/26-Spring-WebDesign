import * as THREE from 'three';
import { landmarks, lngLatToWorld } from './landmarks.js';

const landmarkById = new Map(landmarks.map((landmark) => [landmark.id, landmark]));

function routePoint({
  id,
  lon,
  lat,
  landmarkId = null,
  roadType,
  speedLimit,
  trafficState,
  surface = 'asphalt',
  bridge = false,
  tunnel = false,
  layer = 0,
  scenic = false,
}) {
  const position = lngLatToWorld(lon, lat);
  return {
    id,
    lon,
    lat,
    z: null,
    landmarkId,
    roadType,
    speedLimit,
    trafficState,
    surface,
    bridge,
    tunnel,
    layer,
    scenic,
    position,
  };
}

export const currentRoute = {
  id: 'mock_italy_north_to_south',
  name: 'Milan to Pompeii heritage drive',
  source: 'curated_osm_style_waypoints',
  distanceKm: 920,
  durationHours: 10.8,
  notes: 'Mock route schema shaped for future OSM, DEM, traffic-aware polyline, and PostGIS data.',
  stops: ['milan_duomo', 'venice_rialto', 'florence_duomo', 'pisa', 'colosseum', 'pompeii'],
  points: [
    routePoint({ id: 'milan_entry', lon: 9.1878, lat: 45.4668, roadType: 'urban', speedLimit: 50, trafficState: 'slow' }),
    routePoint({ id: 'milan_duomo', lon: landmarkById.get('milan_duomo').lon, lat: landmarkById.get('milan_duomo').lat, landmarkId: 'milan_duomo', roadType: 'urban', speedLimit: 30, trafficState: 'slow' }),
    routePoint({ id: 'a4_milan_east', lon: 9.3658, lat: 45.522, roadType: 'motorway', speedLimit: 120, trafficState: 'normal' }),
    routePoint({ id: 'a4_brescia', lon: 10.211, lat: 45.541, roadType: 'motorway', speedLimit: 130, trafficState: 'normal' }),
    routePoint({ id: 'verona_corridor', lon: 10.993, lat: 45.438, roadType: 'motorway', speedLimit: 130, trafficState: 'normal', scenic: true }),
    routePoint({ id: 'padova_corridor', lon: 11.875, lat: 45.406, roadType: 'motorway', speedLimit: 120, trafficState: 'normal' }),
    routePoint({ id: 'venice_approach', lon: 12.228, lat: 45.493, roadType: 'primary', speedLimit: 70, trafficState: 'slow' }),
    routePoint({ id: 'venice_rialto', lon: 12.236, lat: 45.491, landmarkId: 'venice_rialto', roadType: 'urban_gateway', speedLimit: 30, trafficState: 'slow' }),
    routePoint({ id: 'padova_south', lon: 11.878, lat: 45.353, roadType: 'motorway', speedLimit: 110, trafficState: 'normal' }),
    routePoint({ id: 'bologna_pass', lon: 11.343, lat: 44.494, roadType: 'motorway', speedLimit: 110, trafficState: 'normal' }),
    routePoint({ id: 'apennine_ridge', lon: 11.278, lat: 44.04, roadType: 'mountain_motorway', speedLimit: 90, trafficState: 'normal', tunnel: true, layer: -1, scenic: true }),
    routePoint({ id: 'florence_north', lon: 11.245, lat: 43.837, roadType: 'urban', speedLimit: 50, trafficState: 'slow' }),
    routePoint({ id: 'florence_duomo', lon: landmarkById.get('florence_duomo').lon, lat: landmarkById.get('florence_duomo').lat, landmarkId: 'florence_duomo', roadType: 'urban', speedLimit: 30, trafficState: 'slow' }),
    routePoint({ id: 'empoli_corridor', lon: 10.947, lat: 43.719, roadType: 'primary', speedLimit: 70, trafficState: 'normal' }),
    routePoint({ id: 'pisa_west', lon: 10.515, lat: 43.706, roadType: 'primary', speedLimit: 70, trafficState: 'normal' }),
    routePoint({ id: 'pisa', lon: landmarkById.get('pisa').lon, lat: landmarkById.get('pisa').lat, landmarkId: 'pisa', roadType: 'urban', speedLimit: 30, trafficState: 'slow' }),
    routePoint({ id: 'florence_return', lon: 11.255, lat: 43.769, roadType: 'primary', speedLimit: 70, trafficState: 'normal' }),
    routePoint({ id: 'arezzo_corridor', lon: 11.879, lat: 43.463, roadType: 'motorway', speedLimit: 110, trafficState: 'normal', scenic: true }),
    routePoint({ id: 'orvieto_corridor', lon: 12.108, lat: 42.72, roadType: 'motorway', speedLimit: 110, trafficState: 'normal', scenic: true }),
    routePoint({ id: 'rome_ring', lon: 12.48, lat: 41.91, roadType: 'ring_road', speedLimit: 90, trafficState: 'traffic_jam' }),
    routePoint({ id: 'colosseum', lon: landmarkById.get('colosseum').lon, lat: landmarkById.get('colosseum').lat, landmarkId: 'colosseum', roadType: 'urban', speedLimit: 30, trafficState: 'slow' }),
    routePoint({ id: 'a1_valmontone', lon: 12.918, lat: 41.779, roadType: 'motorway', speedLimit: 110, trafficState: 'normal' }),
    routePoint({ id: 'a1_cassino', lon: 13.82, lat: 41.49, roadType: 'motorway', speedLimit: 110, trafficState: 'normal' }),
    routePoint({ id: 'caserta_corridor', lon: 14.332, lat: 41.073, roadType: 'motorway', speedLimit: 110, trafficState: 'normal' }),
    routePoint({ id: 'naples_approach', lon: 14.285, lat: 40.86, roadType: 'urban_motorway', speedLimit: 80, trafficState: 'slow' }),
    routePoint({ id: 'pompeii', lon: landmarkById.get('pompeii').lon, lat: landmarkById.get('pompeii').lat, landmarkId: 'pompeii', roadType: 'urban', speedLimit: 30, trafficState: 'normal' }),
  ],
};

export const routeWorldPoints = currentRoute.points.map((point) => new THREE.Vector3(
  point.position[0],
  0,
  point.position[2],
));

export const roadCurve = new THREE.CatmullRomCurve3(routeWorldPoints, false, 'centripetal', 0.15);

const cumulativeRouteDistances = routeWorldPoints.reduce((distances, point, index) => {
  if (index === 0) return [0];
  const previous = routeWorldPoints[index - 1];
  return [...distances, distances[index - 1] + point.distanceTo(previous)];
}, []);

const totalRouteDistance = cumulativeRouteDistances[cumulativeRouteDistances.length - 1] || 1;

function progressAtPointId(pointId) {
  const index = currentRoute.points.findIndex((point) => point.id === pointId);
  if (index < 0) return 0;
  return cumulativeRouteDistances[index] / totalRouteDistance;
}

export const routeTrafficColors = {
  free: '#75b88a',
  normal: '#75b88a',
  slow: '#d8a84f',
  traffic_jam: '#b75a50',
};

export const trafficProfiles = {
  free: { speedFactor: 1.08, label: 'Free flow' },
  normal: { speedFactor: 1, label: 'Normal traffic' },
  slow: { speedFactor: 0.62, label: 'Slow traffic' },
  traffic_jam: { speedFactor: 0.34, label: 'Traffic jam' },
};

export const routeExperienceProfiles = {
  city: {
    label: 'City streets',
    surfaceLabel: 'asphalt / stone edge',
    speedFactor: 0.78,
    roughness: 0.035,
    turnLean: 1.04,
    curveIntensity: 0.82,
    elevationStyle: 'flat',
    color: '#687783',
  },
  motorway: {
    label: 'Autostrada',
    surfaceLabel: 'smooth asphalt',
    speedFactor: 1,
    roughness: 0.018,
    turnLean: 0.7,
    curveIntensity: 0.46,
    elevationStyle: 'flat',
    color: '#77848b',
  },
  scenic: {
    label: 'Scenic primary road',
    surfaceLabel: 'rolling asphalt',
    speedFactor: 0.86,
    roughness: 0.032,
    turnLean: 1.02,
    curveIntensity: 0.86,
    elevationStyle: 'rolling',
    color: '#7b8f76',
  },
  mountain: {
    label: 'Apennine mountain pass',
    surfaceLabel: 'graded mountain road',
    speedFactor: 0.76,
    roughness: 0.04,
    turnLean: 1.22,
    curveIntensity: 1.16,
    elevationStyle: 'mountainPass',
    color: '#6f7f74',
  },
  bridge: {
    label: 'Lagoon access road',
    surfaceLabel: 'low coastal roadway',
    speedFactor: 0.74,
    roughness: 0.018,
    turnLean: 0.82,
    curveIntensity: 0.52,
    elevationStyle: 'flat',
    color: '#8ea7b4',
  },
  tunnel: {
    label: 'Mountain tunnel',
    surfaceLabel: 'covered roadway',
    speedFactor: 0.72,
    roughness: 0.02,
    turnLean: 0.72,
    curveIntensity: 0.38,
    elevationStyle: 'tunnel',
    color: '#3f4753',
  },
  ringRoad: {
    label: 'Rome ring road',
    surfaceLabel: 'urban arterial',
    speedFactor: 0.68,
    roughness: 0.036,
    turnLean: 0.88,
    curveIntensity: 0.72,
    elevationStyle: 'flat',
    color: '#806f68',
  },
};

const segmentSeed = [
  { id: 'milan_city', from: 'milan_entry', to: 'milan_duomo', type: 'city', trafficState: 'slow', speedLimit: 30, description: 'dense historic arrival' },
  { id: 'a4_lombardy', from: 'milan_duomo', to: 'venice_approach', type: 'motorway', trafficState: 'normal', speedLimit: 130, description: 'long northern autostrada corridor' },
  { id: 'venice_lagoon', from: 'venice_approach', to: 'venice_rialto', type: 'city', trafficState: 'slow', speedLimit: 30, description: 'Venice mainland gateway near Mestre' },
  { id: 'veneto_emilia', from: 'venice_rialto', to: 'bologna_pass', type: 'motorway', trafficState: 'free', speedLimit: 120, description: 'flat motorway between Veneto and Emilia' },
  { id: 'apennine_crossing', from: 'bologna_pass', to: 'apennine_ridge', type: 'mountain', trafficState: 'normal', speedLimit: 90, description: 'broad mountain-grade climb' },
  { id: 'apennine_tunnel', from: 'apennine_ridge', to: 'florence_duomo', type: 'tunnel', trafficState: 'normal', speedLimit: 80, description: 'simplified tunnel descent toward Florence' },
  { id: 'tuscany_west', from: 'florence_duomo', to: 'pisa', type: 'scenic', trafficState: 'normal', speedLimit: 70, description: 'rolling Tuscan primary road' },
  { id: 'tuscany_to_rome', from: 'pisa', to: 'rome_ring', type: 'scenic', trafficState: 'normal', speedLimit: 80, description: 'long scenic countryside transfer' },
  { id: 'rome_arrival', from: 'rome_ring', to: 'colosseum', type: 'ringRoad', trafficState: 'traffic_jam', speedLimit: 50, description: 'busy metropolitan approach' },
  { id: 'a1_campania', from: 'colosseum', to: 'naples_approach', type: 'motorway', trafficState: 'normal', speedLimit: 110, description: 'southbound motorway run' },
  { id: 'pompeii_arrival', from: 'naples_approach', to: 'pompeii', type: 'city', trafficState: 'slow', speedLimit: 30, description: 'urban arrival near the ruins' },
];

export const routeSegments = segmentSeed.map((segment) => {
  const profile = routeExperienceProfiles[segment.type] ?? routeExperienceProfiles.scenic;
  return {
    ...segment,
    profile,
    startProgress: progressAtPointId(segment.from),
    endProgress: progressAtPointId(segment.to),
  };
});

export function getRoutePointAtProgress(progress) {
  const clampedProgress = THREE.MathUtils.clamp(progress, 0, 0.9999);
  const segmentIndex = Math.min(
    Math.floor(clampedProgress * (currentRoute.points.length - 1)),
    currentRoute.points.length - 2,
  );
  return currentRoute.points[segmentIndex];
}

export function getRouteSegmentAtProgress(progress) {
  const clampedProgress = THREE.MathUtils.clamp(progress, 0, 0.9999);
  return routeSegments.find((segment) => (
    clampedProgress >= segment.startProgress && clampedProgress < segment.endProgress
  )) ?? routeSegments[routeSegments.length - 1];
}

export function getRouteProfile(segment) {
  const experienceProfile = segment?.profile ?? routeExperienceProfiles.scenic;
  const trafficProfile = trafficProfiles[segment?.trafficState] ?? trafficProfiles.normal;
  return {
    ...experienceProfile,
    roadLabel: experienceProfile.label,
    trafficLabel: trafficProfile.label,
    speedFactor: experienceProfile.speedFactor * trafficProfile.speedFactor,
    roughness: experienceProfile.roughness,
    turnLean: experienceProfile.turnLean,
  };
}
