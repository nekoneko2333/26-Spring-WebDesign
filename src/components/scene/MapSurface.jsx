import { useTerrainData } from '../../hooks/useTerrainData.js';

export function MapSurface() {
  const terrain = useTerrainData();

  if (terrain.status !== 'ready') return null;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.24, 0]} receiveShadow>
        <planeGeometry args={[260, 260, 1, 1]} />
        <meshStandardMaterial color="#23455d" emissive="#071827" emissiveIntensity={0.12} roughness={0.98} metalness={0} />
      </mesh>

      <mesh geometry={terrain.geometry} receiveShadow>
        <meshStandardMaterial
          map={terrain.texture}
          color="#d9e5e2"
          emissive="#102a3c"
          emissiveIntensity={0.1}
          roughness={0.94}
          metalness={0}
        />
      </mesh>
    </group>
  );
}
