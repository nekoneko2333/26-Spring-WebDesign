import { Canvas } from '@react-three/fiber';
import { Clone, OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Suspense } from 'react';

function ViewerModel({ modelPath }) {
  const { scene } = useGLTF(modelPath);

  return (
    <group position={[0, -0.6, 0]}>
      <Clone object={scene} />
    </group>
  );
}

export function ModelViewerOverlay({ landmark, isOpen, onClose }) {
  if (!landmark) return null;

  return (
    <div className={`mv-overlay ${isOpen ? 'is-visible' : ''}`} aria-hidden={!isOpen} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="mv-dialog" role="dialog" aria-modal="true" aria-labelledby="mv-title">
        <div className="mv-header">
          <div>
            <p className="mv-tag">3D Preview</p>
            <h2 id="mv-title" className="mv-title">{landmark.name}</h2>
          </div>
          <button className="mv-close" aria-label="Close" onClick={onClose}>&times;</button>
        </div>

        <div className="mv-canvas">
          <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
            <color attach="background" args={['#0d1828']} />
            <PerspectiveCamera makeDefault position={[0, 1.2, 4]} fov={38} />
            <ambientLight intensity={0.9} color="#f4f7ff" />
            <directionalLight position={[3, 6, 4]} intensity={1.4} color="#fff4e0" />
            <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#c9e4ff" />
            <Suspense fallback={null}>
              <ViewerModel modelPath={landmark.modelPath} />
            </Suspense>
            <OrbitControls enablePan={false} minDistance={1.8} maxDistance={10} target={[0, 0.6, 0]} />
          </Canvas>
        </div>

        <p className="mv-hint">Drag to rotate · Scroll to zoom</p>
        <p className="mv-desc">{landmark.description}</p>
      </div>
    </div>
  );
}

useGLTF.preload('/models/colosseum.glb');
useGLTF.preload('/models/leaning_tower_of_pisa.glb');
