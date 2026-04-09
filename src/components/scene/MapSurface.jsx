import { useTerrainData } from '../../hooks/useTerrainData.js';

export function MapSurface() {
  const terrain = useTerrainData();

  if (terrain.status !== 'ready') return null;

  return (
    <mesh geometry={terrain.geometry} receiveShadow>
      <meshStandardMaterial
        map={terrain.texture}
        color="#ffffff"
        emissive="#1e3853"
        emissiveIntensity={0.09}
        roughness={0.92}
        metalness={0}
        flatShading
      />
    </mesh>
  );
}
