'use client';

import { useRef, useSyncExternalStore } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Grid, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Hero scene: a faceted pearl ornament "printed" bottom-up by a laser line (clipping
// plane), then floating over a build-plate grid. Fully procedural — no assets to fetch.

const PRINT_SECONDS = 3.2;
const BOTTOM = -1.45;
const TOP = 1.75;

// Keeps geometry below the plane's height visible; the height rises as it "prints".
// Module-level because the page renders a single hero scene.
const CLIP = new THREE.Plane(new THREE.Vector3(0, -1, 0), BOTTOM);
const CLIPPING = [CLIP];

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

function Ornament({ accent, reduced }: { accent: string; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const laser = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);

  useFrame((state, delta) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = Math.min(1, (state.clock.elapsedTime - start.current) / PRINT_SECONDS);
    const eased = 1 - Math.pow(1 - t, 3);
    const height = reduced ? TOP : BOTTOM + (TOP - BOTTOM) * eased;
    CLIP.constant = height;

    if (laser.current) {
      laser.current.position.y = height;
      const material = laser.current.material as THREE.MeshBasicMaterial;
      material.opacity = reduced ? 0 : t < 1 ? 0.9 : Math.max(0, material.opacity - delta * 1.5);
    }
    if (group.current && !reduced) group.current.rotation.y += delta * 0.35;
  });

  return (
    <group>
      <group ref={group}>
        <mesh castShadow>
          <icosahedronGeometry args={[1.15, 1]} />
          <meshPhysicalMaterial
            color="#f4f5f7"
            roughness={0.28}
            metalness={0.15}
            clearcoat={1}
            clearcoatRoughness={0.2}
            iridescence={0.9}
            iridescenceIOR={1.4}
            flatShading
            clippingPlanes={CLIPPING}
          />
        </mesh>
        {/* Cap and hanging loop */}
        <mesh position={[0, 1.22, 0]}>
          <cylinderGeometry args={[0.2, 0.24, 0.22, 24]} />
          <meshStandardMaterial color="#c9ccd2" metalness={0.9} roughness={0.25} clippingPlanes={CLIPPING} />
        </mesh>
        <mesh position={[0, 1.47, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.16, 0.035, 12, 40]} />
          <meshStandardMaterial color="#c9ccd2" metalness={0.9} roughness={0.25} clippingPlanes={CLIPPING} />
        </mesh>
      </group>

      {/* Laser print head line */}
      <mesh ref={laser} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.28, 1.32, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.9} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function OrbitRings({ accent, reduced }: { accent: string; reduced: boolean }) {
  const ring = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ring.current && !reduced) {
      ring.current.rotation.z += delta * 0.12;
      ring.current.rotation.x += delta * 0.05;
    }
  });
  return (
    <group ref={ring} rotation={[1.1, 0, 0.4]}>
      <mesh>
        <torusGeometry args={[2.05, 0.006, 8, 160]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[0.5, 0.3, 0]}>
        <torusGeometry args={[2.45, 0.004, 8, 160]} />
        <meshBasicMaterial color={accent} transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function Hero3D({ accent = '#5B7CFF' }: { accent?: string }) {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="relative h-full w-full" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.6, 5.6], fov: 38 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, localClippingEnabled: true }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} />
        <pointLight position={[-3, 1, -2]} intensity={28} color={accent} distance={10} />
        <pointLight position={[2.5, -1.5, 2]} intensity={10} color="#ffffff" distance={8} />

        <Float speed={reduced ? 0 : 1.4} rotationIntensity={reduced ? 0 : 0.25} floatIntensity={reduced ? 0 : 0.6}>
          <Ornament accent={accent} reduced={reduced} />
        </Float>
        <OrbitRings accent={accent} reduced={reduced} />

        <Grid
          position={[0, -1.75, 0]}
          args={[20, 20]}
          cellSize={0.35}
          cellThickness={0.6}
          cellColor="#2a2d35"
          sectionSize={1.75}
          sectionThickness={1}
          sectionColor="#3b4252"
          fadeDistance={11}
          fadeStrength={1.5}
          infiniteGrid
        />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} minPolarAngle={1} maxPolarAngle={1.9} />
      </Canvas>
    </div>
  );
}
