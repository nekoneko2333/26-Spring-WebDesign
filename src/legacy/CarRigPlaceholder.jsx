import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

export function CarRigPlaceholder() {
  const bodyRef = useRef();

  useFrame(({ clock }) => {
    if (!bodyRef.current) return;
    const t = clock.getElapsedTime();
    bodyRef.current.setTranslation({ x: Math.sin(t * 0.18) * 18, y: 1.2, z: Math.cos(t * 0.14) * 14 }, true);
  });

  return (
    <RigidBody ref={bodyRef} colliders={false} type="kinematicPosition">
      <CuboidCollider args={[1.1, 0.45, 2.1]} />
      <group>
        <mesh castShadow position={[0, 0.55, 0]}>
          <boxGeometry args={[2.2, 0.5, 4.2]} />
          <meshStandardMaterial color="#ff6b35" roughness={0.55} />
        </mesh>
        <mesh castShadow position={[0, 1.05, -0.15]}>
          <boxGeometry args={[1.7, 0.55, 2.1]} />
          <meshStandardMaterial color="#ff8c42" roughness={0.45} />
        </mesh>
      </group>
    </RigidBody>
  );
}
