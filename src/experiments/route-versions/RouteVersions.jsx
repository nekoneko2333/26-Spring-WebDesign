import { useEffect, useMemo, useState } from 'react';
import { landmarks } from '../../data/landmarks.js';
import { currentRoute } from '../../data/routes.js';
import { travelLandmarkMeta } from '../../data/travelGuide.js';
import './routeVersions.css';

const BOUNDS = { lonMin: 6.2, lonMax: 18.8, latMin: 36.4, latMax: 46.5 };
const MAINLAND = [[7.5, 44.1], [7.7, 45.1], [8.6, 45.7], [10.2, 46.2], [12.2, 46.0], [13.6, 45.7], [13.9, 44.8], [13.2, 43.9], [13.0, 43.1], [13.8, 42.6], [14.5, 42.0], [15.0, 41.2], [16.2, 41.9], [18.2, 40.7], [18.5, 39.9], [17.5, 40.1], [16.8, 39.5], [17.2, 38.9], [16.6, 38.7], [16.0, 39.2], [15.6, 40.0], [14.8, 40.6], [14.1, 40.9], [13.4, 41.3], [12.6, 41.7], [12.0, 42.5], [11.3, 43.4], [10.3, 43.9], [9.3, 44.2], [8.5, 44.4], [7.8, 44.5]];
const SARDINIA = [[8.2, 41.2], [9.0, 41.2], [9.6, 40.6], [9.7, 39.7], [9.4, 38.9], [8.7, 38.6], [8.2, 39.1], [8.0, 40.0]];
const SICILY = [[12.4, 38.1], [13.4, 38.2], [15.1, 37.9], [15.7, 37.3], [14.8, 36.8], [13.4, 37.0], [12.5, 37.5]];
const NETWORK = [
  [[9.19, 45.46], [10.99, 45.44], [11.88, 45.41], [12.23, 45.49]],
  [[10.99, 45.44], [11.34, 44.49], [11.25, 43.77], [12.48, 41.91], [14.33, 41.07], [14.49, 40.75]],
  [[11.25, 43.77], [10.40, 43.72], [9.71, 44.15]],
  [[14.49, 40.75], [15.01, 40.42], [16.61, 40.67], [17.24, 40.78]],
  [[13.36, 38.11], [13.59, 37.29], [15.00, 37.75]],
  [[7.69, 45.07], [9.19, 45.46], [9.26, 45.99]],
];

function loadRouteIds() {
  try {
    const raw = window.localStorage.getItem('web3d.route');
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
  } catch {
    // ignore storage failures
  }
  return currentRoute.stops;
}

function project(lon, lat) {
  return {
    x: ((lon - BOUNDS.lonMin) / (BOUNDS.lonMax - BOUNDS.lonMin)) * 100,
    y: (1 - ((lat - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin))) * 100,
  };
}

function pointString(coords) {
  return coords.map(([lon, lat]) => {
    const p = project(lon, lat);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ');
}

function pathFromPolygon(coords) {
  return coords.map(([lon, lat], index) => {
    const p = project(lon, lat);
    return `${index === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }).join(' ').concat(' Z');
}

function projectRouteCoords(routeIds) {
  const routeIdSet = new Set(routeIds);
  const routePoints = currentRoute.points
    .filter((point) => !point.landmarkId || routeIdSet.has(point.landmarkId))
    .map((point) => [point.lon, point.lat]);

  if (routePoints.length >= 2) return routePoints;

  return routeIds
    .map((id) => travelLandmarkMeta[id])
    .filter(Boolean)
    .map((meta) => [meta.lon, meta.lat]);
}

function routePolyline(routeIds) {
  return pointString(projectRouteCoords(routeIds));
}

function localTopologyRouteCoords(topology, routeIds) {
  if (topology?.route?.coordinates?.length) {
    const step = Math.max(1, Math.floor(topology.route.coordinates.length / 1800));
    return topology.route.coordinates.filter((_, index) => index % step === 0);
  }
  return projectRouteCoords(routeIds);
}

function topologyNodes(coords, count = 34) {
  if (!coords.length) return [];
  const step = Math.max(1, Math.floor(coords.length / count));
  return coords
    .filter((_, index) => index % step === 0)
    .slice(0, count)
    .map(([lon, lat], index) => ({ id: `node-${index}`, ...project(lon, lat) }));
}

function topologySegments(coords, count = 18) {
  if (coords.length < 2) return [];
  const step = Math.max(2, Math.floor(coords.length / count));
  const segments = [];
  for (let index = 0; index < coords.length - 1; index += step) {
    const slice = coords.slice(index, Math.min(coords.length, index + step + 1));
    if (slice.length > 1) segments.push(pointString(slice));
  }
  return segments;
}

function simplifyPolygonForSvg(polygon) {
  if (polygon.length <= 80) return polygon;
  const step = Math.max(1, Math.floor(polygon.length / 260));
  const simplified = polygon.filter((_, index) => index % step === 0);
  const first = polygon[0];
  const last = simplified[simplified.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) simplified.push(first);
  return simplified;
}

function fallbackRouteLine(stops) {
  const coords = stops.map((stop) => [stop.meta.lon, stop.meta.lat]);
  return coords.length >= 2 ? pointString(coords) : pointString(NETWORK[1]);
}

function measureProjectedRoute(coords) {
  const points = coords.map(([lon, lat]) => project(lon, lat));
  const distances = points.reduce((out, point, index) => {
    if (index === 0) return [0];
    const previous = points[index - 1];
    const segment = Math.hypot(point.x - previous.x, point.y - previous.y);
    out.push(out[index - 1] + segment);
    return out;
  }, []);
  return { points, distances, total: distances[distances.length - 1] || 1 };
}

function sampleRoutePoint(coords, t) {
  if (!coords.length) return project(12.48, 41.91);
  const { points, distances, total } = measureProjectedRoute(coords);
  const target = ((t % 1) + 1) % 1 * total;
  const index = Math.max(0, distances.findIndex((distance) => distance >= target));
  if (index <= 0) return points[0];
  const previousDistance = distances[index - 1];
  const segmentDistance = distances[index] - previousDistance || 1;
  const localT = (target - previousDistance) / segmentDistance;
  const previous = points[index - 1];
  const next = points[index];
  return {
    x: previous.x + (next.x - previous.x) * localT,
    y: previous.y + (next.y - previous.y) * localT,
  };
}

function routeStopProgress(coords, stops) {
  const { points, distances, total } = measureProjectedRoute(coords);
  return stops.map((stop) => {
    const stopPoint = project(stop.meta.lon, stop.meta.lat);
    let bestIndex = 0;
    let bestDistance = Infinity;
    points.forEach((point, index) => {
      const distance = Math.hypot(point.x - stopPoint.x, point.y - stopPoint.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return (distances[bestIndex] ?? 0) / total;
  });
}

function findActiveStopIndex(progressValues, progress) {
  let active = 0;
  for (let index = 0; index < progressValues.length; index += 1) {
    if (progressValues[index] <= progress + 0.015) active = index;
  }
  return active;
}

function distanceKmBetween(a, b) {
  if (!a || !b) return 0;
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = (Math.sin(dLat / 2) ** 2) + Math.cos(lat1) * Math.cos(lat2) * (Math.sin(dLon / 2) ** 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatKm(value) {
  if (!Number.isFinite(value)) return '0 km';
  return value >= 100 ? `${Math.round(value).toLocaleString('en-US')} km` : `${value.toFixed(1)} km`;
}

function elevationSummary(samples) {
  const values = (samples ?? []).map((sample) => Number(sample.elevation)).filter(Number.isFinite);
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  let gain = 0;
  for (let index = 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    if (delta > 0) gain += delta;
  }
  return { min, max, gain: Math.round(gain) };
}

function getStops(routeIds) {
  return routeIds
    .map((id) => {
      const landmark = landmarks.find((item) => item.id === id);
      const meta = travelLandmarkMeta[id];
      return landmark && meta ? { id, landmark, meta } : null;
    })
    .filter(Boolean);
}

function Topbar({ title, subtitle }) {
  return (
    <div className="route-version-topbar">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="route-version-actions">
        <a href="#">Home</a>
        <a href="#/v2">V2</a>
      </div>
    </div>
  );
}

export function RouteV2Page() {
  const [routeIds] = useState(loadRouteIds);
  const [topology, setTopology] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const stops = useMemo(() => getStops(routeIds), [routeIds]);
  const topologyCoords = useMemo(() => localTopologyRouteCoords(topology, routeIds), [routeIds, topology]);
  const routeLine = useMemo(() => pointString(topologyCoords), [topologyCoords]);
  const displayRouteLine = routeLine || fallbackRouteLine(stops);
  const glow = sampleRoutePoint(topologyCoords, progress);
  const stopProgress = useMemo(() => routeStopProgress(topologyCoords, stops), [topologyCoords, stops]);
  const activeIndex = findActiveStopIndex(stopProgress, progress);
  const activeStop = stops[activeIndex] ?? stops[0];
  const contourGroups = topology?.terrain?.contours ?? [];
  const boundaryPolygons = useMemo(() => (
    topology?.map?.boundary?.map(simplifyPolygonForSvg) ?? []
  ), [topology]);
  const networkNodes = useMemo(() => topologyNodes(topologyCoords), [topologyCoords]);
  const networkSegments = useMemo(() => topologySegments(topologyCoords), [topologyCoords]);
  const elevation = useMemo(() => elevationSummary(topology?.route?.elevationSamples), [topology]);
  const routeProgressPct = Math.round(progress * 100);
  const nextStop = stops[(activeIndex + 1) % Math.max(1, stops.length)] ?? activeStop;
  const nextDistance = activeStop && nextStop ? distanceKmBetween(activeStop.meta, nextStop.meta) : 0;

  useEffect(() => {
    let cancelled = false;
    fetch('/data/italy-route-topology.json')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload) setTopology(payload);
      })
      .catch(() => {
        if (!cancelled) setTopology(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return undefined;
    let frame = 0;
    const startProgress = progress;
    const start = performance.now();
    const tick = (now) => {
      const t = (startProgress + ((now - start) / 22000)) % 1;
      setProgress(t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  const jumpToStop = (index) => {
    if (!stops.length) return;
    setIsPlaying(false);
    setProgress(stopProgress[index] ?? (index / stops.length));
  };

  const stepRoute = (direction) => {
    if (!stops.length) return;
    const nextIndex = (activeIndex + direction + stops.length) % stops.length;
    jumpToStop(nextIndex);
  };

  return (
    <main className="route-version-page route-version-page--modern">
      <div className="route-version-shell">
        <Topbar title="Italy Route V2" subtitle="A clean travel map with real route shape, terrain detail, and stop-by-stop progress." />
        <div className="route-v2-grid">
          <section className="route-v2-map-panel">
            <svg className="route-v2-map" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-label="Italy route topology">
              <defs>
                <linearGradient id="route-v2-temp" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#89b978" />
                  <stop offset="0.52" stopColor="#c8b56d" />
                  <stop offset="1" stopColor="#b2755d" />
                </linearGradient>
                <linearGradient id="route-v2-modern-land" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#eef5ef" />
                  <stop offset="0.45" stopColor="#d6e6d9" />
                  <stop offset="1" stopColor="#c7d8ce" />
                </linearGradient>
                <filter id="route-v2-route-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="#0c5f8f" floodOpacity="0.45" />
                </filter>
              </defs>
              <rect className="route-v2-sea" width="100" height="100" />
              <g className="route-v2-graticule" aria-hidden="true">
                {[12, 24, 36, 48, 60, 72, 84].map((x) => <line key={`x-${x}`} x1={x} y1="0" x2={x} y2="100" />)}
                {[14, 28, 42, 56, 70, 84].map((y) => <line key={`y-${y}`} x1="0" y1={y} x2="100" y2={y} />)}
              </g>
              {boundaryPolygons.length > 0
                ? boundaryPolygons.map((polygon, index) => <path key={index} className="route-v2-land" d={pathFromPolygon(polygon)} />)
                : (
                  <>
                    <path className="route-v2-land" d={pathFromPolygon(MAINLAND)} />
                    <path className="route-v2-land" d={pathFromPolygon(SARDINIA)} />
                    <path className="route-v2-land" d={pathFromPolygon(SICILY)} />
                  </>
                )}
              {contourGroups.length > 0
                ? contourGroups.map((group) => group.lines.map((line, index) => (
                  <polyline key={`${group.level}-${index}`} className="route-v2-contour" data-level={group.level} points={pointString(line.map((point) => [point.lon, point.lat]))} />
                )))
                : [20, 29, 38, 47, 56, 65, 74].map((y) => <path key={y} className="route-v2-contour" d={`M15 ${y} C34 ${y - 8}, 54 ${y + 10}, 84 ${y - 2}`} />)}
              {topology?.route?.coordinates?.length
                ? currentRoute.points.map((point, index, points) => {
                  if (index === 0) return null;
                  const previous = points[index - 1];
                  return <polyline key={point.id} className="route-v2-network" points={pointString([[previous.lon, previous.lat], [point.lon, point.lat]])} />;
                })
                : NETWORK.map((line, index) => <polyline key={index} className="route-v2-network" points={pointString(line)} />)}
              {networkSegments.map((line, index) => <polyline key={`topology-${index}`} className="route-v2-topology-edge" points={line} />)}
              <polyline className="route-v2-route-casing" points={displayRouteLine} />
              <polyline className="route-v2-route" points={displayRouteLine} />
              {networkNodes.map((node) => <circle key={node.id} className="route-v2-topology-node" cx={node.x} cy={node.y} r="0.55" />)}
              {stops.map(({ id, meta }) => {
                const p = project(meta.lon, meta.lat);
                return (
                  <g key={id} className="route-v2-stop-group">
                    <circle className="route-v2-stop" cx={p.x} cy={p.y} r="1.2" />
                    <text x={p.x + 1.8} y={p.y - 1.2}>{meta.city.en}</text>
                  </g>
                );
              })}
              <circle className="route-v2-glow" cx={glow.x} cy={glow.y} r="1.7" />
            </svg>
            <div className="route-v2-map-legend">
              <span><i className="route-v2-key route-v2-key--route" /> Recommended route</span>
              <span><i className="route-v2-key route-v2-key--node" /> Key nodes</span>
              <span><i className="route-v2-key route-v2-key--contour" /> Terrain lines</span>
            </div>
            {activeStop && (
              <aside className="route-v2-pop">
                <div className="route-v2-mini-model"><span /></div>
                <strong>{activeStop.meta.name.en}</strong>
                <p>{activeStop.meta.city.en} / {activeStop.meta.region.en}</p>
              </aside>
            )}
          </section>
          <aside className="route-v2-side">
            <h2>{topology?.route?.distanceKm ? `${topology.route.distanceKm} km` : `${currentRoute.distanceKm} km`}</h2>
            <p>{topology ? 'Route view combines road shape, terrain lines, and selected stops.' : 'Loading route view; showing the default line first.'}</p>
            <div className="route-v2-controls">
              <button type="button" onClick={() => stepRoute(-1)}>Prev</button>
              <button type="button" className="is-primary" onClick={() => setIsPlaying((value) => !value)}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button type="button" onClick={() => stepRoute(1)}>Next</button>
              <input
                aria-label="Route progress"
                type="range"
                min="0"
                max="1000"
                value={Math.round(progress * 1000)}
                onChange={(event) => {
                  setIsPlaying(false);
                  setProgress(Number(event.target.value) / 1000);
                }}
              />
            </div>
            <div className="route-v2-source-stack">
              <span>Map detail: {topology?.map?.boundary?.length ?? 'default'} regions</span>
              <span>Route precision: {topology?.route?.coordinates?.length?.toLocaleString('en-US') ?? currentRoute.points.length} path points</span>
              <span>Terrain layers: {topology?.terrain?.contours?.length ?? 0} groups</span>
            </div>
            <div className="route-v2-insights">
              <article>
                <span>Current progress</span>
                <strong>{routeProgressPct}%</strong>
                <small>{activeStop?.meta.name.en ?? 'Start'} to {nextStop?.meta.name.en ?? 'next stop'}</small>
              </article>
              <article>
                <span>Next leg</span>
                <strong>{formatKm(nextDistance)}</strong>
                <small>{activeStop?.meta.city.en ?? '-'} to {nextStop?.meta.city.en ?? '-'}</small>
              </article>
              <article>
                <span>Terrain range</span>
                <strong>{elevation ? `${Math.round(elevation.min)}-${Math.round(elevation.max)} m` : 'Pending'}</strong>
                <small>{elevation ? `Approx. climb ${elevation.gain.toLocaleString('en-US')} m` : 'Loading elevation profile'}</small>
              </article>
            </div>
            <div className="route-v2-stops">
              {stops.map((stop, index) => (
                <button key={stop.id} className={`route-v2-stop-row ${index === activeIndex ? 'is-active' : ''}`} type="button" onClick={() => jumpToStop(index)}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{stop.meta.name.en}</strong>
                    <small>{stop.meta.city.en} / {stop.meta.type.en}</small>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
