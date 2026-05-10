import { forwardRef, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export const AmsterdamAvatar = forwardRef(function AmsterdamAvatar({
  color = '#b98152',
  active = false,
  accent = '#fff1d8',
}, ref) {
  const leftArm = useRef(null);
  const rightArm = useRef(null);
  const leftLeg = useRef(null);
  const rightLeg = useRef(null);
  const head = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const stride = active ? Math.sin(t * 7.5) : Math.sin(t * 1.5) * 0.12;
    const armSwing = active ? stride * 0.58 : stride * 0.2;
    const legSwing = active ? stride * 0.5 : 0;

    if (leftArm.current) leftArm.current.rotation.x = armSwing;
    if (rightArm.current) rightArm.current.rotation.x = -armSwing;
    if (leftLeg.current) leftLeg.current.rotation.x = -legSwing;
    if (rightLeg.current) rightLeg.current.rotation.x = legSwing;
    if (head.current) head.current.rotation.y = Math.sin(t * 1.2) * 0.08;
  });

  return (
    <group ref={ref}>
      <group position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <ringGeometry args={[1.5, 1.86, 56]} />
          <meshBasicMaterial color={color} transparent opacity={0.32} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.95, 56]} />
          <meshBasicMaterial color={color} transparent opacity={0.1} />
        </mesh>
      </group>

      <mesh position={[0, 1.25, 0]} castShadow>
        <capsuleGeometry args={[0.48, 1.08, 8, 18]} />
        <meshStandardMaterial color={color} roughness={0.46} metalness={0.12} />
      </mesh>
      <mesh ref={head} position={[0, 2.22, 0]} castShadow>
        <sphereGeometry args={[0.42, 24, 16]} />
        <meshStandardMaterial color="#233544" roughness={0.42} metalness={0.04} />
      </mesh>
      <mesh position={[0, 1.86, 0.48]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.16, 0.62, 20]} />
        <meshStandardMaterial color={accent} roughness={0.32} metalness={0.08} />
      </mesh>

      <group ref={leftArm} position={[-0.48, 1.5, 0]}>
        <mesh position={[0, -0.36, 0]} rotation={[0.18, 0, 0]} castShadow>
          <capsuleGeometry args={[0.11, 0.76, 6, 12]} />
          <meshStandardMaterial color="#516b74" roughness={0.5} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.48, 1.5, 0]}>
        <mesh position={[0, -0.36, 0]} rotation={[-0.18, 0, 0]} castShadow>
          <capsuleGeometry args={[0.11, 0.76, 6, 12]} />
          <meshStandardMaterial color="#516b74" roughness={0.5} />
        </mesh>
      </group>

      <group ref={leftLeg} position={[-0.22, 0.62, 0]}>
        <mesh position={[0, -0.34, 0]} castShadow>
          <capsuleGeometry args={[0.13, 0.82, 6, 12]} />
          <meshStandardMaterial color="#1d2f37" roughness={0.48} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.22, 0.62, 0]}>
        <mesh position={[0, -0.34, 0]} castShadow>
          <capsuleGeometry args={[0.13, 0.82, 6, 12]} />
          <meshStandardMaterial color="#1d2f37" roughness={0.48} />
        </mesh>
      </group>
    </group>
  );
});
