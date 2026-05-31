import { useMemo, useState } from 'react';
import { TilesAttributionOverlay, TilesRenderer } from '3d-tiles-renderer/r3f';

const tilesUrl = import.meta.env.VITE_GOOGLE_3DTILES_URL;

export function TilesLayer() {
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [tilesError, setTilesError] = useState(false);
  const hasTilesUrl = useMemo(() => Boolean(tilesUrl), []);

  if (!hasTilesUrl) {
    return null;
  }

  return (
    <>
      <TilesRenderer
        url={tilesUrl}
        group={{ rotation: [-Math.PI / 2, 0, 0], scale: 0.0025 }}
        onLoadTileset={() => {
          setTilesLoaded(true);
          setTilesError(false);
        }}
        onLoadError={() => {
          setTilesLoaded(false);
          setTilesError(true);
        }}
      />

      <TilesAttributionOverlay />
    </>
  );
}
