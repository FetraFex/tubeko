import { OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import React, { useRef, useEffect, useState } from 'react';
import { Line, Box } from '@react-three/drei';
import * as YUKA from 'yuka';

function ParkingModel() {
  const { scene } = useGLTF('Parking.glb');
  return <primitive object={scene} scale={0.1} />;
}

// Component representing a single car following its own path
function PathFollowingCar({ pathPoints }) {
  const meshRef = useRef();
  const [vehicle, setVehicle] = useState(null);
  const [isSpawned, setIsSpawned] = useState(false); // Track if the car is spawned

  useEffect(() => {
    if (isSpawned) {
      // Create YUKA agent (vehicle) when the car is spawned
      const vehicle = new YUKA.Vehicle();

      // Create a unique YUKA path for this car
      const path = new YUKA.Path();
      pathPoints.forEach((point) => path.add(point));
      path.loop = true; // Set to true if you want the car to loop the path

      // Add path-following behavior
      const pathFollowBehavior = new YUKA.FollowPathBehavior(path, 1);
      vehicle.steering.add(pathFollowBehavior);

      // Set initial vehicle position to the first point of the path
      vehicle.position.copy(new YUKA.Vector3(0.2, 0, 7));

      // YUKA EntityManager to update the agent
      const entityManager = new YUKA.EntityManager();
      entityManager.add(vehicle);

      setVehicle(vehicle); // Save the vehicle for updates

      // YUKA update loop
      const time = new YUKA.Time();
      const animate = () => {
        const delta = time.update().getDelta();
        entityManager.update(delta);

        // Update the mesh position and rotation to follow the YUKA agent
        if (meshRef.current) {
          console.log(vehicle.position);
          meshRef.current.position.copy(vehicle.position);
          meshRef.current.rotation.y = vehicle.rotation.y;
        }

        requestAnimationFrame(animate);
      };
      animate();
    }
  }, [isSpawned, pathPoints]); // Only start when isSpawned is true

  useEffect(() => {
    // Simulate delay before spawning the car, or trigger with key press
    setIsSpawned(true); // Set this to `true` when the car is added
  }, []);

  return (
    <>
      {/* Car (box) following the path */}
      {isSpawned && (
        <mesh ref={meshRef} position={[0.2, 0, 7]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      )}

      {/* Visualize the unique path as a line */}
      <Line
        points={pathPoints.map((point) => [point.x, point.y, point.z])} // Convert YUKA.Vector3 to array for Line component
        color="white"
        lineWidth={2}
      />
    </>
  );
}

const Parking = () => {
  const [cars, setCars] = useState([]);

  // Function to handle key press
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'b') {
        // 'b' key spawns a new car with a unique path
        const randomPathPoints = [
          new YUKA.Vector3(0.2, 0, 7),
          new YUKA.Vector3(Math.random() * 4, 0, Math.random() * 7),
        ];

        setCars((prevCars) => [
          ...prevCars,
          { id: prevCars.length + 1, pathPoints: randomPathPoints },
        ]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <div className="h-screen">
      <Canvas>
        <color args={[0.2, 0.2, 0.2]} attach="background" />
        <ambientLight intensity={0.5} />
        <directionalLight position={[0, 10, 5]} />

        {/* Render all cars, each with its own unique path */}
        {cars.map((car) => (
          <PathFollowingCar key={car.id} pathPoints={car.pathPoints} />
        ))}

        <ParkingModel />
        <OrbitControls />
      </Canvas>
    </div>
  );
};

export default Parking;
