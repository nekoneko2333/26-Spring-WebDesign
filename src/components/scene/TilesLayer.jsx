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
            <div style={statusStyle}>Loading streamed 3D tiles...</div>
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
  padding: '0 0 8px',
  borderBottom: '1px solid rgba(8, 24, 39, 0.18)',
  background: 'transparent',
  color: '#081827',
  fontFamily: 'Manrope, Noto Sans SC, sans-serif',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};
