import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Text, Edges, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface VectorProp {
  v: [number, number, number];
  color: string;
  label: string;
  showPlane?: boolean;
}

export function CrossProductScene({
  v1,
  v2,
  showResult = false,
}: {
  v1: [number, number, number];
  v2: [number, number, number];
  showResult?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Auto-rotate the scene slowly to appreciate 3D
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.15;
      groupRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.2) * 0.1;
    }
  });

  // Calculate Cross Product
  const cross = useMemo(() => {
    const vec1 = new THREE.Vector3(...v1);
    const vec2 = new THREE.Vector3(...v2);
    const result = new THREE.Vector3().crossVectors(vec1, vec2);
    return [result.x, result.y, result.z] as [number, number, number];
  }, [v1, v2]);

  return (
    <group ref={groupRef}>
      <OrbitControls makeDefault enableZoom={false} />
      
      {/* Lights */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 10]} intensity={1.5} />
      <directionalLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Axis Helper - Custom styled */}
      <group>
        <Line points={[[ -5, 0, 0 ], [ 5, 0, 0 ]]} color="#E5E5E5" lineWidth={1} />
        <Line points={[[ 0, -5, 0 ], [ 0, 5, 0 ]]} color="#E5E5E5" lineWidth={1} />
        <Line points={[[ 0, 0, -5 ], [ 0, 0, 5 ]]} color="#E5E5E5" lineWidth={1} />
      </group>

      {/* Vector 1 (a) */}
      <VectorArrow v={v1} color="#2563EB" label="a" />

      {/* Vector 2 (b) */}
      <VectorArrow v={v2} color="#059669" label="b" />

      {/* Cross Product Vector (a x b) */}
      {showResult && (
        <>
          <VectorArrow v={cross} color="#E11D48" label="a × b" />
          
          {/* Plane showing orthogonality */}
          <mesh position={[0,0,0]} rotation-x={Math.PI/2} visible={false}>
            <planeGeometry args={[10, 10]} />
            <meshBasicMaterial color="#111111" transparent opacity={0.05} depthWrite={false} side={THREE.DoubleSide} />
            <Edges scale={1} threshold={15} color="white" />
          </mesh>
        </>
      )}
    </group>
  );
}

function VectorArrow({ v, color, label }: VectorProp) {
  const endPoint = new THREE.Vector3(...v);
  const length = endPoint.length();
  
  // Calculate orientation for the arrow head
  const arrowHelper = useMemo(() => {
    const dir = endPoint.clone().normalize();
    return new THREE.ArrowHelper(dir, new THREE.Vector3(0,0,0), length, color, 0.4, 0.3);
  }, [v, color, length]);

  return (
    <group>
      <primitive object={arrowHelper} />
      <Text
        position={[v[0] * 1.1, v[1] * 1.1, v[2] * 1.1]}
        fontSize={0.4}
        color={color}
        outlineWidth={0.02}
        outlineColor="#ffffff"
      >
        {label}
      </Text>
    </group>
  );
}
