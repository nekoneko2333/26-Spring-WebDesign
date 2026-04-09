import { Environment, Lightformer } from '@react-three/drei';
import { THEME } from '../../config/theme.js';

export function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.65} color={THEME.hemiSky} />
      <hemisphereLight args={[THEME.hemiSky, THEME.hemiGround, 1.1]} />
      <directionalLight
        castShadow
        position={[42, 58, 24]}
        intensity={1.35}
        color={THEME.sun}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <Environment resolution={128}>
        <Lightformer form="ring" intensity={1.2} color="#fffaf1" scale={12} position={[0, 10, -20]} />
        <Lightformer form="rect" intensity={0.8} color="#dbeeff" scale={[20, 8]} position={[-12, 8, 10]} />
      </Environment>
    </>
  );
}
