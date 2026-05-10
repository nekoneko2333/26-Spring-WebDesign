import * as THREE from 'three';

export const METERS_PER_DEG_LAT = 111_320;

export function lngLatToLocal(lon, lat, center) {
  const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180);
  return [
    (lon - center.lon) * metersPerDegLon,
    0,
    -(lat - center.lat) * METERS_PER_DEG_LAT,
  ];
}

export function lngLatToVector(lon, lat, center, y = 0) {
  const [x, , z] = lngLatToLocal(lon, lat, center);
  return new THREE.Vector3(x, y, z);
}

export function geoJsonRouteToLocalPoints(route, center, y = 0.34) {
  const coordinates = route?.features?.[0]?.geometry?.coordinates ?? [];
  return coordinates.map(([lon, lat]) => lngLatToVector(lon, lat, center, y));
}

export function measurePolyline(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += points[index - 1].distanceTo(points[index]);
  }
  return total;
}

export function samplePolyline(points, distanceMeters) {
  if (!Array.isArray(points) || points.length === 0) {
    return {
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, -1),
      progressMeters: 0,
      totalMeters: 0,
      segmentIndex: 0,
      done: true,
    };
  }

  if (points.length === 1) {
    return {
      position: points[0].clone(),
      direction: new THREE.Vector3(0, 0, -1),
      progressMeters: 0,
      totalMeters: 0,
      segmentIndex: 0,
      done: true,
    };
  }

  const totalMeters = measurePolyline(points);
  const clamped = Math.max(0, Math.min(distanceMeters, totalMeters));
  let travelled = 0;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segmentLength = start.distanceTo(end);
    const nextTravelled = travelled + segmentLength;

    if (clamped <= nextTravelled || index === points.length - 1) {
      const localDistance = clamped - travelled;
      const t = segmentLength > 0 ? localDistance / segmentLength : 0;
      const position = start.clone().lerp(end, t);
      const direction = end.clone().sub(start);
      if (direction.lengthSq() === 0) direction.set(0, 0, -1);
      direction.normalize();

      return {
        position,
        direction,
        progressMeters: clamped,
        totalMeters,
        segmentIndex: index - 1,
        done: clamped >= totalMeters,
      };
    }

    travelled = nextTravelled;
  }

  const last = points[points.length - 1];
  const previous = points[points.length - 2];
  const direction = last.clone().sub(previous).normalize();
  return {
    position: last.clone(),
    direction,
    progressMeters: totalMeters,
    totalMeters,
    segmentIndex: points.length - 2,
    done: true,
  };
}

export function findNearestPoi(position, pois, center, radiusMeters = 18) {
  if (!position || !Array.isArray(pois) || !center) return null;
  let best = null;
  let bestDistance = Infinity;

  for (const poi of pois) {
    const poiPosition = lngLatToVector(poi.lon, poi.lat, center, position.y);
    const distance = poiPosition.distanceTo(position);
    if (distance < bestDistance) {
      best = poi;
      bestDistance = distance;
    }
  }

  if (!best || bestDistance > radiusMeters) return null;
  return { poi: best, distanceMeters: bestDistance };
}

function coordinateKey(lon, lat) {
  return `${Number(lon).toFixed(7)},${Number(lat).toFixed(7)}`;
}

function isRoutableFeature(feature) {
  if (feature?.geometry?.type !== 'LineString') return false;
  const kind = feature.properties?.kind;
  const highway = feature.properties?.highway;
  if (kind === 'water') return false;
  if (kind === 'path' || kind === 'road') return true;
  return Boolean(highway && highway !== 'motorway' && highway !== 'trunk');
}

export function buildWalkGraph(layers, center) {
  const features = layers?.features?.filter(isRoutableFeature) ?? [];
  const nodes = new Map();
  const edges = new Map();

  function ensureNode([lon, lat]) {
    const key = coordinateKey(lon, lat);
    if (!nodes.has(key)) {
      nodes.set(key, {
        id: key,
        lon,
        lat,
        position: lngLatToVector(lon, lat, center, 0.42),
      });
      edges.set(key, []);
    }
    return nodes.get(key);
  }

  function addEdge(a, b, feature) {
    const distance = a.position.distanceTo(b.position);
    if (!Number.isFinite(distance) || distance <= 0) return;
    const payload = {
      to: b.id,
      distance,
      featureId: feature.properties?.id,
      kind: feature.properties?.kind,
      highway: feature.properties?.highway,
    };
    edges.get(a.id).push(payload);
    edges.get(b.id).push({ ...payload, to: a.id });
  }

  for (const feature of features) {
    const coordinates = feature.geometry.coordinates ?? [];
    for (let index = 1; index < coordinates.length; index += 1) {
      const a = ensureNode(coordinates[index - 1]);
      const b = ensureNode(coordinates[index]);
      addEdge(a, b, feature);
    }
  }

  return {
    nodes,
    edges,
    featureCount: features.length,
  };
}

export function findNearestGraphNode(graph, lon, lat, center) {
  if (!graph?.nodes?.size) return null;
  const target = lngLatToVector(lon, lat, center, 0.42);
  let best = null;
  let bestDistance = Infinity;

  for (const node of graph.nodes.values()) {
    const distance = node.position.distanceTo(target);
    if (distance < bestDistance) {
      best = node;
      bestDistance = distance;
    }
  }

  return best ? { node: best, distanceMeters: bestDistance } : null;
}

function reconstructPath(cameFrom, currentId, graph) {
  const ids = [currentId];
  let cursor = currentId;
  while (cameFrom.has(cursor)) {
    cursor = cameFrom.get(cursor);
    ids.push(cursor);
  }
  ids.reverse();
  return ids.map((id) => graph.nodes.get(id)?.position?.clone()).filter(Boolean);
}

export function planRouteBetweenPois(graph, pois, startPoiId, destinationPoiId, center) {
  const startPoi = pois.find((poi) => poi.id === startPoiId);
  const destinationPoi = pois.find((poi) => poi.id === destinationPoiId);
  if (!startPoi || !destinationPoi || !graph?.nodes?.size) return null;

  const start = findNearestGraphNode(graph, startPoi.lon, startPoi.lat, center);
  const destination = findNearestGraphNode(graph, destinationPoi.lon, destinationPoi.lat, center);
  if (!start?.node || !destination?.node) return null;

  const open = new Set([start.node.id]);
  const cameFrom = new Map();
  const gScore = new Map([[start.node.id, 0]]);
  const fScore = new Map([[start.node.id, start.node.position.distanceTo(destination.node.position)]]);

  while (open.size > 0) {
    let currentId = null;
    let currentScore = Infinity;
    for (const id of open) {
      const score = fScore.get(id) ?? Infinity;
      if (score < currentScore) {
        currentId = id;
        currentScore = score;
      }
    }

    if (!currentId) break;
    if (currentId === destination.node.id) {
      const path = reconstructPath(cameFrom, currentId, graph);
      return {
        startPoi,
        destinationPoi,
        points: path,
        distanceMeters: measurePolyline(path),
        startSnapMeters: start.distanceMeters,
        destinationSnapMeters: destination.distanceMeters,
        graphNodeCount: graph.nodes.size,
        graphFeatureCount: graph.featureCount,
      };
    }

    open.delete(currentId);
    const current = graph.nodes.get(currentId);
    for (const edge of graph.edges.get(currentId) ?? []) {
      const tentative = (gScore.get(currentId) ?? Infinity) + edge.distance;
      if (tentative >= (gScore.get(edge.to) ?? Infinity)) continue;
      cameFrom.set(edge.to, currentId);
      gScore.set(edge.to, tentative);
      const next = graph.nodes.get(edge.to);
      const heuristic = next && current ? next.position.distanceTo(destination.node.position) : 0;
      fScore.set(edge.to, tentative + heuristic);
      open.add(edge.to);
    }
  }

  return null;
}

export function clampToBounds(position, bounds, center, paddingMeters = 4) {
  if (!bounds || !center) return position;
  const west = lngLatToVector(bounds.west, center.lat, center, position.y).x + paddingMeters;
  const east = lngLatToVector(bounds.east, center.lat, center, position.y).x - paddingMeters;
  const north = lngLatToVector(center.lon, bounds.north, center, position.y).z + paddingMeters;
  const south = lngLatToVector(center.lon, bounds.south, center, position.y).z - paddingMeters;
  position.x = Math.min(Math.max(position.x, Math.min(west, east)), Math.max(west, east));
  position.z = Math.min(Math.max(position.z, Math.min(north, south)), Math.max(north, south));
  return position;
}
