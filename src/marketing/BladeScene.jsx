import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows, Sparkles, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// Keyframes describing where the blade sits at each chapter of the scroll story.
// dullness: 0 = polished/sharp, 1 = fully dulled (problem section)
// stone: 0..1 visibility of the whetstone + sparks (sharpening section)
const KEYFRAMES = [
  { p: 0.0, rotY: 0.85, rotX: 0.08, rotZ: -0.05, x: 1.5, y: 0.1, scale: 0.92, dullness: 0, stone: 0 },
  { p: 0.18, rotY: 0.15, rotX: 0.02, rotZ: 0.02, x: 0.0, y: 0.0, scale: 0.92, dullness: 0.15, stone: 0 },
  { p: 0.32, rotY: -0.25, rotX: -0.05, rotZ: 0.08, x: -0.5, y: -0.05, scale: 0.9, dullness: 1, stone: 0 },
  { p: 0.48, rotY: -0.6, rotX: 0.0, rotZ: -0.35, x: -0.35, y: -0.1, scale: 0.95, dullness: 0.55, stone: 1 },
  { p: 0.62, rotY: 0.3, rotX: 0.05, rotZ: 0.0, x: 0.45, y: 0.05, scale: 0.95, dullness: 0, stone: 0 },
  { p: 0.8, rotY: 0.9, rotX: 0.1, rotZ: -0.1, x: 0.8, y: 0.35, scale: 0.7, dullness: 0, stone: 0 },
  { p: 1.0, rotY: 0.55, rotX: 0.08, rotZ: -0.05, x: 0.0, y: 0.0, scale: 1.15, dullness: 0, stone: 0 },
];

function sampleKeyframes(progress) {
  const p = Math.min(Math.max(progress, 0), 1);
  let a = KEYFRAMES[0];
  let b = KEYFRAMES[KEYFRAMES.length - 1];
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (p >= KEYFRAMES[i].p && p <= KEYFRAMES[i + 1].p) {
      a = KEYFRAMES[i];
      b = KEYFRAMES[i + 1];
      break;
    }
  }
  const span = b.p - a.p || 1;
  const t = (p - a.p) / span;
  const lerp = (k) => a[k] + (b[k] - a[k]) * t;
  return {
    rotY: lerp('rotY'),
    rotX: lerp('rotX'),
    rotZ: lerp('rotZ'),
    x: lerp('x'),
    y: lerp('y'),
    scale: lerp('scale'),
    dullness: lerp('dullness'),
    stone: lerp('stone'),
  };
}

function buildBladeShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-1.4, -0.15);
  shape.lineTo(-1.4, 0.15);
  shape.quadraticCurveTo(-1.1, 0.24, -0.92, 0.22);
  shape.quadraticCurveTo(-0.2, 0.2, 1.3, 0.15);
  shape.quadraticCurveTo(1.55, 0.13, 1.68, 0.0);
  shape.quadraticCurveTo(1.5, -0.1, 1.15, -0.22);
  shape.quadraticCurveTo(0.4, -0.4, -0.3, -0.32);
  shape.quadraticCurveTo(-0.7, -0.27, -0.92, -0.2);
  shape.quadraticCurveTo(-1.15, -0.16, -1.4, -0.15);
  return shape;
}

function Blade({ dullnessRef }) {
  const materialRef = useRef();
  const geometry = useMemo(() => {
    const shape = buildBladeShape();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.012,
      bevelSegments: 4,
      curveSegments: 24,
    });
    geo.center();
    return geo;
  }, []);

  useFrame(() => {
    const d = dullnessRef.current;
    const m = materialRef.current;
    if (!m) return;
    m.roughness = THREE.MathUtils.lerp(0.16, 0.72, d);
    m.metalness = THREE.MathUtils.lerp(1, 0.65, d);
    m.clearcoat = THREE.MathUtils.lerp(0.7, 0.05, d);
    m.color.lerpColors(new THREE.Color('#d7dae0'), new THREE.Color('#9a988f'), d);
  });

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        ref={materialRef}
        color="#d7dae0"
        metalness={1}
        roughness={0.16}
        clearcoat={0.7}
        clearcoatRoughness={0.2}
        envMapIntensity={1.6}
      />
    </mesh>
  );
}

function Bolster() {
  return (
    <mesh position={[-1.42, 0, 0]} castShadow>
      <cylinderGeometry args={[0.19, 0.19, 0.09, 24]} />
      <meshStandardMaterial color="#b8763b" metalness={0.9} roughness={0.32} />
    </mesh>
  );
}

function Handle() {
  return (
    <group position={[-2.1, -0.01, 0]}>
      <RoundedBox args={[1.35, 0.3, 0.16]} radius={0.07} smoothness={4} castShadow>
        <meshStandardMaterial color="#241a14" metalness={0.1} roughness={0.55} />
      </RoundedBox>
      {[-0.45, 0, 0.45].map((x) => (
        <mesh key={x} position={[x, 0, 0.085]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.02, 12]} />
          <meshStandardMaterial color="#b8763b" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Whetstone({ visibility }) {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    ref.current.scale.setScalar(THREE.MathUtils.lerp(0.001, 1, visibility.current));
    ref.current.position.y = THREE.MathUtils.lerp(-1.2, -0.75, visibility.current);
  });
  return (
    <group ref={ref} position={[0, -1.2, -0.3]} rotation={[0, 0.3, 0]}>
      <RoundedBox args={[2.6, 0.28, 0.9]} radius={0.05} smoothness={4} receiveShadow>
        <meshStandardMaterial color="#5c5952" roughness={0.85} metalness={0.02} />
      </RoundedBox>
    </group>
  );
}

function Rig({ progressRef }) {
  const group = useRef();
  const dullnessRef = useRef(0);
  const stoneRef = useRef(0);

  useFrame((_, delta) => {
    const kf = sampleKeyframes(progressRef.current);
    if (!group.current) return;
    const damp = Math.min(1, delta * 4);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, kf.rotY, damp);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, kf.rotX, damp);
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, kf.rotZ, damp);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, kf.x, damp);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, kf.y, damp);
    const s = THREE.MathUtils.lerp(group.current.scale.x, kf.scale, damp);
    group.current.scale.setScalar(s);
    dullnessRef.current = THREE.MathUtils.lerp(dullnessRef.current, kf.dullness, damp);
    stoneRef.current = THREE.MathUtils.lerp(stoneRef.current, kf.stone, damp);
  });

  return (
    <>
      <group ref={group}>
        <Blade dullnessRef={dullnessRef} />
        <Bolster />
        <Handle />
      </group>
      <Whetstone visibility={stoneRef} />
      <SparkleBurst visibility={stoneRef} />
    </>
  );
}

function SparkleBurst({ visibility }) {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = visibility.current > 0.08;
  });
  return (
    <group ref={ref} position={[0, -0.7, 0]}>
      <Sparkles count={40} scale={[1.6, 0.6, 1]} size={2.2} speed={0.6} color="#ffe6a8" opacity={0.9} />
    </group>
  );
}

export default function BladeScene({ progressRef, className = '' }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.2, 5.2], fov: 32 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[3, 4, 3]}
          intensity={1.4}
          color="#fff4e0"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-3, -1, -2]} intensity={0.7} color="#3a5a6b" />
        <Environment resolution={256}>
          <Lightformer intensity={2.2} color="#fff4e0" position={[0, 4, 3]} scale={[6, 3, 1]} form="rect" />
          <Lightformer intensity={0.8} color="#3a5a6b" position={[-4, 1, -2]} scale={[4, 4, 1]} form="rect" />
          <Lightformer intensity={1.3} color="#ffffff" position={[3, -2, 2]} scale={[3, 3, 1]} form="rect" />
          <Lightformer intensity={0.5} color="#f3eee3" position={[0, -3, -4]} scale={[10, 10, 1]} form="rect" />
        </Environment>
        <Rig progressRef={progressRef} />
        <ContactShadows position={[0, -1.35, 0]} opacity={0.45} scale={8} blur={2.4} far={2} color="#14151a" />
      </Canvas>
    </div>
  );
}
