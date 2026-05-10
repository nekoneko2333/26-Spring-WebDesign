import { useEffect, useMemo, useState } from 'react';
import { landmarks } from '../../data/landmarks.js';
import { currentRoute } from '../../data/routes.js';
import { travelLandmarkMeta } from '../../data/travelGuide.js';
import { useRouteMetrics } from '../../hooks/useRouteMetrics.js';
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

function routePolyline(routeMetrics, routeIds) {
  const osrm = routeMetrics.data?.geometryCoordinates;
  if (osrm?.length) return osrm.map(([lon, lat]) => {
    const p = project(lon, lat);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ');

  return routeIds.map((id) => {
    const meta = travelLandmarkMeta[id];
    if (!meta) return null;
    const p = project(meta.lon, meta.lat);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).filter(Boolean).join(' ');
}

function fallbackRouteLine(stops) {
  const coords = stops.map((stop) => [stop.meta.lon, stop.meta.lat]);
  return coords.length >= 2 ? pointString(coords) : pointString(NETWORK[1]);
}

function sampleRoutePoint(routeMetrics, routeIds, t) {
  const coords = routeMetrics.data?.geometryCoordinates;
  if (coords?.length) {
    const index = Math.min(coords.length - 1, Math.floor(t * (coords.length - 1)));
    return project(coords[index][0], coords[index][1]);
  }
  const ids = routeIds.filter((id) => travelLandmarkMeta[id]);
  if (!ids.length) return project(12.48, 41.91);
  const index = Math.min(ids.length - 1, Math.floor(t * Math.max(ids.length - 1, 1)));
  const meta = travelLandmarkMeta[ids[index]];
  return project(meta.lon, meta.lat);
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
        <a href="#/v3">V3</a>
      </div>
    </div>
  );
}

export function RouteV2Page() {
  const [routeIds] = useState(loadRouteIds);
  const [progress, setProgress] = useState(0);
  const routeMetrics = useRouteMetrics(routeIds);
  const stops = useMemo(() => getStops(routeIds), [routeIds]);
  const routeLine = routePolyline(routeMetrics, routeIds);
  const displayRouteLine = routeLine || fallbackRouteLine(stops);
  const glow = sampleRoutePoint(routeMetrics, routeIds, progress);
  const activeStop = stops[Math.min(stops.length - 1, Math.floor(progress * stops.length))] ?? stops[0];

  useEffect(() => {
    let frame = 0;
    let start = performance.now();
    const tick = (now) => {
      const t = ((now - start) / 22000) % 1;
      setProgress(t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="route-version-page">
      <div className="route-version-shell">
        <Topbar title="Italy Route V2" subtitle="Aerial route topology, contour-driven terrain mood, and point-based travel." />
        <div className="route-v2-grid">
          <section className="route-v2-map-panel">
            <svg className="route-v2-map" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-label="Italy route topology">
              <defs>
                <linearGradient id="route-v2-temp" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#89b978" />
                  <stop offset="0.52" stopColor="#c8b56d" />
                  <stop offset="1" stopColor="#b2755d" />
                </linearGradient>
              </defs>
              <rect className="route-v2-sea" width="100" height="100" />
              <path className="route-v2-land" d={pathFromPolygon(MAINLAND)} />
              <path className="route-v2-land" d={pathFromPolygon(SARDINIA)} />
              <path className="route-v2-land" d={pathFromPolygon(SICILY)} />
              {[20, 29, 38, 47, 56, 65, 74].map((y) => <path key={y} className="route-v2-contour" d={`M15 ${y} C34 ${y - 8}, 54 ${y + 10}, 84 ${y - 2}`} />)}
              {NETWORK.map((line, index) => <polyline key={index} className="route-v2-network" points={pointString(line)} />)}
              <polyline className="route-v2-route" points={displayRouteLine} />
              {stops.map(({ id, meta }) => {
                const p = project(meta.lon, meta.lat);
                return <circle key={id} className="route-v2-stop" cx={p.x} cy={p.y} r="1.2" />;
              })}
              <circle className="route-v2-glow" cx={glow.x} cy={glow.y} r="1.7" />
            </svg>
            {activeStop && (
              <aside className="route-v2-pop">
                <div className="route-v2-mini-model"><span /></div>
                <strong>{activeStop.meta.name.en}</strong>
                <p>{activeStop.meta.city.en} / {activeStop.meta.region.en}</p>
              </aside>
            )}
          </section>
          <aside className="route-v2-side">
            <h2>{routeMetrics.data?.distanceKm ? `${routeMetrics.data.distanceKm} km` : 'Route'}</h2>
            <p>The light point follows the planned route. Landmarks stay off the map until the route reaches them.</p>
            <div className="route-v2-stops">
              {stops.map((stop, index) => (
                <div key={stop.id} className="route-v2-stop-row">
                  <span>{index + 1}</span>
                  <div>
                    <strong>{stop.meta.name.en}</strong>
                    <small>{stop.meta.city.en} / {stop.meta.type.en}</small>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export function RouteV3Page() {
  const [routeIds] = useState(loadRouteIds);
  const [steer, setSteer] = useState(0);
  const stops = useMemo(() => getStops(routeIds), [routeIds]);
  const left = stops.filter((_, index) => index % 2 === 0).slice(0, 4);
  const right = stops.filter((_, index) => index % 2 === 1).slice(0, 4);
  const roadStyle = { transform: `translateX(calc(-50% + ${steer * -28}px)) skewX(${steer * -1.5}deg)` };
  const carStyle = { transform: `translateX(calc(-50% + ${steer * 54}px)) rotate(${steer * 4}deg)` };

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === 'a' || event.key === 'ArrowLeft') {
        setSteer(-1);
      }
      if (key === 'd' || event.key === 'ArrowRight') {
        setSteer(1);
      }
    };
    const onKeyUp = (event) => {
      const key = event.key.toLowerCase();
      if (key === 'a' || key === 'd' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        setSteer(0);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const pressLeft = () => setSteer(-1);
  const pressRight = () => setSteer(1);
  const releaseSteer = () => setSteer(0);

  return (
    <main className="route-v3-page">
      <div className="route-version-shell">
        <Topbar title="Italy Route V3" subtitle="Abstract first-person route browser with no terrain and no map load." />
        <section className="route-v3-stage" data-steer={steer}>
          <div className="route-v3-horizon" />
          <div className="route-v3-curve" />
          <div className="route-v3-road" style={roadStyle} />
          <div className="route-v3-car" style={carStyle} aria-label="Route vehicle">
            <span />
          </div>
          <div className="route-v3-controls" aria-label="Steering controls">
            <button
              className={steer < 0 ? 'is-active' : ''}
              type="button"
              onPointerDown={pressLeft}
              onPointerUp={releaseSteer}
              onPointerCancel={releaseSteer}
              onPointerLeave={releaseSteer}
            >
              A
            </button>
            <button
              className={steer > 0 ? 'is-active' : ''}
              type="button"
              onPointerDown={pressRight}
              onPointerUp={releaseSteer}
              onPointerCancel={releaseSteer}
              onPointerLeave={releaseSteer}
            >
              D
            </button>
          </div>
          <div className="route-v3-tabs route-v3-tabs--left">
            {left.map((stop) => <InfoTab key={stop.id} stop={stop} />)}
          </div>
          <div className="route-v3-tabs route-v3-tabs--right">
            {right.map((stop) => <InfoTab key={stop.id} stop={stop} />)}
          </div>
        </section>
        <article className="route-v3-panel">
          <h2>Route sketch</h2>
          <p>This version keeps only a smooth symbolic road, two broad turns, and side panels for browsing route landmarks.</p>
        </article>
      </div>
    </main>
  );
}

function InfoTab({ stop }) {
  return (
    <article className="route-v3-tab">
      <strong>{stop.meta.name.en}</strong>
      <span>{stop.meta.city.en} / {stop.meta.type.en}</span>
    </article>
  );
}
