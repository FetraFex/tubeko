import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Line } from '@react-three/drei';
import { Vector3 } from 'three';
import * as YUKA from 'yuka';

function PathFollowing() {
  const meshRef = useRef();

  // Define path points
  const pathPoints = [
    new YUKA.Vector3(0, 0, 0),
    new YUKA.Vector3(5, 0, 5),
    new YUKA.Vector3(10, 0, 0),
    new YUKA.Vector3(15, 0, -5),
  ];

  useEffect(() => {
    // Create YUKA agent
    const vehicle = new YUKA.Vehicle();

    // Create YUKA path
    const path = new YUKA.Path();
    pathPoints.forEach((point) => path.add(point));
    path.loop = true; // Loop the path

    // Add path-following behavior
    const pathFollowBehavior = new YUKA.FollowPathBehavior(path, 1);
    vehicle.steering.add(pathFollowBehavior);

    // Add arrival behavior to avoid overshooting
    // const arriveBehavior = new YUKA.ArriveBehavior(path.current(), 5, 0.5);
    // vehicle.steering.add(arriveBehavior);

    // Set vehicle initial position
    vehicle.position.copy(pathPoints[0]);

    // YUKA EntityManager to update the agent
    const entityManager = new YUKA.EntityManager();
    entityManager.add(vehicle);

    // YUKA update loop
    const time = new YUKA.Time();
    const animate = () => {
      const delta = time.update().getDelta();
      entityManager.update(delta);

      // Update the mesh position and rotation to follow the YUKA agent
      if (meshRef.current) {
        meshRef.current.position.copy(vehicle.position);
        meshRef.current.rotation.y = vehicle.rotation.y;
      }

      requestAnimationFrame(animate);
    };
    animate();
  }, [pathPoints]);

  return (
    <>
      {/* Box representing the YUKA agent */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="orange" />
      </mesh>

      {/* Visualize the path as a line */}
      <Line
        points={pathPoints.map((point) => [point.x, point.y, point.z])} // Convert YUKA.Vector3 to arrays for Line component
        color="blue"
        lineWidth={2}
      />
    </>
  );
}

export default function App() {
  return (
    <div className='h-screen'>
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <PathFollowing />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
