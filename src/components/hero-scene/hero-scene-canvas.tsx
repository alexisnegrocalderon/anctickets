"use client";

/**
 * ANC: cluster de pulseras y tickets flotando en 3D sobre el video del hero.
 * Reacciona al scroll natural del hero (sin pin adicional, para no competir con el
 * ScrollTrigger de parallax del video en home-motion-effects.tsx): a medida que el
 * hero sale de vista, el cluster se separa y se desvanece.
 */
import { useRef } from "react";
import type { MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useScroll } from "motion/react";
import type { MotionValue } from "motion/react";
import type * as THREE from "three";

type ClusterItem = {
  shape: "card" | "band";
  color: string;
  basePosition: [number, number, number];
  spin: number;
};

const CLUSTER: ClusterItem[] = [
  { shape: "card", color: "#FF206E", basePosition: [1.7, 0.6, 0], spin: 0.25 },
  { shape: "card", color: "#FBFF12", basePosition: [2.5, -0.5, -0.6], spin: -0.18 },
  { shape: "band", color: "#41EAD4", basePosition: [0.9, -1.1, 0.3], spin: 0.3 },
  { shape: "band", color: "#8a8a8a", basePosition: [2.8, 1.2, -0.3], spin: -0.22 },
  { shape: "card", color: "#41EAD4", basePosition: [1.3, 1.5, -0.8], spin: 0.2 },
];

function ClusterMesh({
  item,
  index,
  progress,
}: {
  item: ClusterItem;
  index: number;
  progress: MotionValue<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const p = progress.get();

    group.rotation.x += delta * item.spin;
    group.rotation.y += delta * item.spin * 1.3;

    const spread = 1 + p * 2.4;
    const bob = Math.sin(state.clock.elapsedTime * 0.6 + index) * 0.08;
    group.position.set(
      item.basePosition[0] * spread,
      item.basePosition[1] * spread + bob,
      item.basePosition[2] * spread,
    );

    if (materialRef.current) {
      materialRef.current.opacity = Math.max(0, 1 - p * 1.4);
    }
  });

  return (
    <group ref={groupRef} position={item.basePosition}>
      {item.shape === "card" ? (
        <RoundedBox args={[1.5, 0.95, 0.06]} radius={0.09} smoothness={4}>
          <meshStandardMaterial
            ref={materialRef}
            color={item.color}
            emissive={item.color}
            emissiveIntensity={0.4}
            roughness={0.35}
            metalness={0.1}
            transparent
          />
        </RoundedBox>
      ) : (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.13, 24, 64]} />
          <meshStandardMaterial
            ref={materialRef}
            color={item.color}
            emissive={item.color}
            emissiveIntensity={0.4}
            roughness={0.35}
            metalness={0.1}
            transparent
          />
        </mesh>
      )}
    </group>
  );
}

function Scene({ progress }: { progress: MotionValue<number> }) {
  return (
    <>
      <ambientLight intensity={0.75} />
      <pointLight position={[3, 3, 5]} intensity={35} />
      <pointLight position={[-3, -2, 3]} intensity={15} color="#41EAD4" />
      {CLUSTER.map((item, index) => (
        <ClusterMesh key={index} item={item} index={index} progress={progress} />
      ))}
    </>
  );
}

export default function HeroSceneCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null) as MutableRefObject<HTMLDivElement>;
  const { scrollYProgress } = useScroll({ target: wrapperRef, offset: ["start start", "end start"] });

  return (
    <div ref={wrapperRef} className="pointer-events-none absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} gl={{ alpha: true, antialias: true }} dpr={[1, 1.5]}>
        <Scene progress={scrollYProgress} />
      </Canvas>
    </div>
  );
}
