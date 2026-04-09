import { useEffect, useState } from 'react';
import { getTerrainState, loadTerrainData, subscribeTerrain } from '../data/terrain.js';

export function useTerrainData() {
  const [terrain, setTerrain] = useState(() => getTerrainState());

  useEffect(() => {
    const unsubscribe = subscribeTerrain(setTerrain);
    loadTerrainData();
    return unsubscribe;
  }, []);

  return terrain;
}
