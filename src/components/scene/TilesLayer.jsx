import { Html } from '@react-three/drei';
import { useMemo, useState } from 'react';
import { TilesAttributionOverlay, TilesRenderer } from '3d-tiles-renderer/r3f';

const tilesUrl = import.meta.env.VITE_GOOGLE_3DTILES_URL;

export function TilesLayer() {
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [tilesError, setTilesError] = useState(false);
  const hasTilesUrl = useMemo(() => Boolean(tilesUrl), []);

  if (!hasTilesUrl) {
    return (
      <Html fullscreen>
        <div style={statusStyleWrap}>
          <div style={statusStyle}>3D tiles disabled: set `VITE_GOOGLE_3DTILES_URL` to enable streamed map data.</div>
        </div>
      </Html>
    );
  }

  return (
    <>
      {!tilesLoaded && !tilesError && (
        <Html fullscreen>
          <div style={statusStyleWrap}>
            <div style={statusStyle}>Loading streamed 3D tiles…</div>
          </div>
        </Html>
      )}

      {tilesError && (
        <Html fullscreen>
          <div style={statusStyleWrap}>
            <div style={statusStyle}>3D tiles failed to load. Falling back to DEM terrain.</div>
          </div>
        </Html>
      )}

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

const statusStyleWrap = {
  position: 'absolute',
  top: 20,
  left: 20,
  pointerEvents: 'none',
};

const statusStyle = {
  padding: '8px 12px',
  borderRadius: '999px',
  background: 'rgba(18, 34, 52, 0.72)',
  color: '#f3f7fb',
  fontFamily: 'Manrope, sans-serif',
  fontSize: '12px',
  letterSpacing: '0.02em',
  boxShadow: '0 8px 24px rgba(8, 18, 30, 0.18)',
};
