import { useTerrainData } from '../../hooks/useTerrainData.js';

export function MapSurface() {
  const terrain = useTerrainData();

  if (terrain.status !== 'ready') return null;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.24, 0]} receiveShadow>
        <planeGeometry args={[260, 260, 1, 1]} />
        <meshStandardMaterial color="#5f97bd" roughness={0.96} metalness={0} />
      </mesh>

      <mesh geometry={terrain.geometry} receiveShadow>
        <meshStandardMaterial
          map={terrain.texture}
          color="#ffffff"
          emissive="#244867"
          emissiveIntensity={0.06}
          roughness={0.94}
          metalness={0}
        />
      </mesh>
    </group>
  );
}
