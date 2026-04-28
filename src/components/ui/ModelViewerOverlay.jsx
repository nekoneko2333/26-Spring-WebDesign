import { Canvas } from '@react-three/fiber';
import { Clone, OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Suspense } from 'react';
import { reviewLocales } from '../../data/reviewLocales.js';
import { useWikipediaSummary } from '../../hooks/useWikipediaSummary.js';
import { useAppStore } from '../../state/useAppStore.js';

function ViewerModel({ modelPath }) {
  const { scene } = useGLTF(modelPath);

  return (
    <group position={[0, -0.6, 0]}>
      <Clone object={scene} />
    </group>
  );
}

function PlaceholderViewerModel({ kind }) {
  const color = {
    dome: '#c47b58',
    bridge: '#d7c2a2',
    cathedral: '#e8dfca',
    ruins: '#b99b72',
  }[kind] ?? '#c7a070';

  return (
    <group position={[0, -0.75, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[2.7, 0.7, 1.7]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {kind === 'dome' && (
        <mesh castShadow position={[0, 1.18, 0]}>
          <sphereGeometry args={[0.92, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#b95f46" roughness={0.65} />
        </mesh>
      )}
      {kind === 'bridge' && (
        <mesh castShadow position={[0, 0.98, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.95, 0.16, 10, 24, Math.PI]} />
          <meshStandardMaterial color={color} roughness={0.68} />
        </mesh>
      )}
      {kind === 'cathedral' && [-0.82, 0, 0.82].map((x) => (
        <mesh key={x} castShadow position={[x, 1.25, 0]}>
          <coneGeometry args={[0.22, 1.6, 5]} />
          <meshStandardMaterial color="#f0ead8" roughness={0.58} />
        </mesh>
      ))}
      {kind === 'ruins' && [-1.0, -0.35, 0.4, 1.1].map((x, index) => (
        <mesh key={x} castShadow position={[x, 0.95 + (index % 2) * 0.15, 0]}>
          <cylinderGeometry args={[0.11, 0.13, 1.55 + (index % 2) * 0.28, 8]} />
          <meshStandardMaterial color="#d1b58d" roughness={0.82} />
        </mesh>
      ))}
    </group>
  );
}

export function ModelViewerOverlay({ landmark, isOpen, onClose }) {
  const language = useAppStore((state) => state.language);
  const locale = reviewLocales[language];
  const wiki = useWikipediaSummary(landmark?.id, language);

  if (!landmark) return null;

  const desc = wiki.data?.extract || landmark.description;
  const sourceUrl = wiki.data?.url || null;

  return (
    <div className={`mv-overlay ${isOpen ? 'is-visible' : ''}`} aria-hidden={!isOpen} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="mv-dialog" role="dialog" aria-modal="true" aria-labelledby="mv-title">
        <div className="mv-header">
          <div>
            <p className="mv-tag">{locale.ui.modelPreview}</p>
            <h2 id="mv-title" className="mv-title">{landmark.name}</h2>
          </div>
          <button className="mv-close" aria-label={locale.ui.close} onClick={onClose}>&times;</button>
        </div>

        <div className="mv-canvas">
          <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
            <color attach="background" args={['#0d1828']} />
            <PerspectiveCamera makeDefault position={[0, 1.2, 4]} fov={38} />
            <ambientLight intensity={0.9} color="#f4f7ff" />
            <directionalLight position={[3, 6, 4]} intensity={1.4} color="#fff4e0" />
            <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#c9e4ff" />
            <Suspense fallback={null}>
              {landmark.modelPath ? <ViewerModel modelPath={landmark.modelPath} /> : <PlaceholderViewerModel kind={landmark.modelKind} />}
            </Suspense>
            <OrbitControls enablePan={false} minDistance={1.8} maxDistance={10} target={[0, 0.6, 0]} />
          </Canvas>
        </div>

        <p className="mv-hint">{locale.ui.modelHint}</p>
        <p className="mv-desc">{desc}</p>
        {sourceUrl && (
          <a className="mv-source" href={sourceUrl} target="_blank" rel="noreferrer">
            Wikipedia
          </a>
        )}
      </div>
    </div>
  );
}

useGLTF.preload('/models/colosseum.glb');
useGLTF.preload('/models/leaning_tower_of_pisa.glb');
