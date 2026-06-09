import { useEffect, useState } from 'react';
import { getTerrainState, loadTerrainData, setTerrainRouteCorridor, subscribeTerrain } from '../data/terrain.js';
import { useActiveRoute3d } from './useActiveRoute3d.js';

export function useTerrainData() {
  const [terrain, setTerrain] = useState(() => getTerrainState());
  const activeRoute = useActiveRoute3d();

  useEffect(() => {
    const unsubscribe = subscribeTerrain(setTerrain);
    const load = () => loadTerrainData();
    const idleHandle = 'requestIdleCallback' in window
      ? window.requestIdleCallback(load, { timeout: 700 })
      : window.setTimeout(load, 80);

    return () => {
      unsubscribe();
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(idleHandle);
      else window.clearTimeout(idleHandle);
    };
  }, []);

  useEffect(() => {
    setTerrainRouteCorridor(activeRoute.curve.getPoints(activeRoute.source === 'osrm' ? 240 : 120));
  }, [activeRoute]);

  return terrain;
}
