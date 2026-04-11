export function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]} visible={false} receiveShadow>
      <planeGeometry args={[260, 260, 1, 1]} />
      <meshStandardMaterial color="#c3d9b8" roughness={0.95} />
    </mesh>
  );
}
