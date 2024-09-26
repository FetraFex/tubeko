import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, Text, useGLTF } from "@react-three/drei";
import * as THREE from "three";

function ParkingModel() {
  const { scene } = useGLTF('Parking.glb');
  return <primitive object={scene} scale={0.1} />;
}

// Modified FollowPathBox to load a unique model instance for each object
const FollowPathBox = ({ path, modelUrl , reversePath}) => {
  const { scene: carModel } = useGLTF(modelUrl);
  const meshRef = useRef();
  const textRef = useRef(); // Ref for the text
  const [time, setTime] = useState(0);
  const [quitTime, setQuitTime] = useState(0);
  const [hasArrived, setHasArrived] = useState(false);

  const [waitForNextMove, setWaitForNextMove] = useState(false);

  useEffect(() => {
    if (hasArrived) {
      const timer = setTimeout(() => {
        setWaitForNextMove(true); // After delay, set flag to start next movement
      }, 2000); // 2 seconds delay

      return () => clearTimeout(timer);
    }
  }, [hasArrived]);

  useFrame((state, delta) => {
    if (!hasArrived) {
      const newTime = Math.min(time + delta * 0.1, 1); // Clamp time at 1 (100% of the path)
      setTime(newTime);

      const position = path.getPointAt(newTime);
      if (meshRef.current) {
        meshRef.current.position.copy(position); // Update the mesh position
      }

      if (textRef.current) {
        textRef.current.position.set(position.x, position.y + 1.5, position.z); // Update the text position
      }

      if (newTime >= 1) {
        setHasArrived(true); // Mark as arrived once time reaches the end of the path
      }
    } else if (waitForNextMove) {
      const newTime = Math.min(quitTime + delta * 0.1, 1); // Clamp time at 1 (100% of the new path)
      setQuitTime(newTime);

      const position = reversePath.getPointAt(newTime);
      if (meshRef.current) {
        meshRef.current.position.copy(position); // Update the mesh position
      }

      if (textRef.current) {
        textRef.current.position.set(position.x, position.y + 1.5, position.z); // Update the text position
      }

      if (newTime >= 1) {
        setHasArrived(true); // Mark as arrived at the end of the new path
      }
    }
  });

  const pathPoints = path.getPoints(50); // Get path points to visualize the curve

  return (
    <>
      {/* The text label following the mesh */}
      <Text
        ref={textRef} // Use a ref for the Text
        position={[0, 1.5, 0]} // Initial position, it will be updated in useFrame
        fontSize={0.5}          // Font size of the label
        color="black"           // Text color
        anchorX="center"        // Horizontal alignment of the text
        anchorY="middle"        // Vertical alignment of the text
      >
        Car 1
      </Text>
      
      {/* The moving box */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial color="orange" />
        <primitive object={carModel.clone()} position={[0, 0, 0]} scale={0.45}/>
      </mesh>

      {/* Visualize the path */}
      <Line
        points={pathPoints.map((point) => [point.x, point.y, point.z])}
        color="white"
        lineWidth={2}
      />
    </>
  );
};

const Box = ({ position }) => {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
};

const App = () => {
  const [boxes, setBoxes] = useState([]);
  const [parkingSlots, setParkingSlots] = useState([
    [-2, 0, 4],
    [-2, 0, 2.5],
    [-2, 0, 1],
    [-2, 0, -0.5],
    [-2, 0, -2],
    [-2, 0, -3.5],
    [2, 0, 4],
    [2, 0, 2.5],
    [2, 0, 1],
    [2, 0, -0.5],
    [2, 0, -2],
    [2, 0, -3.5],
  ]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === "Space" && parkingSlots.length > 0) {
        // Get a random slot in the parking
        const randomIndex = Math.floor(Math.random() * parkingSlots.length);
        const randomSlot = parkingSlots[randomIndex];

        // Remove the taken slot from parkingSlots
        setParkingSlots(parkingSlots.filter((_, index) => index !== randomIndex));

        // Define a random path for the new box
        const newPath = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.2, 0, 7),
          new THREE.Vector3(0.2, 0, randomSlot[2]),
          new THREE.Vector3(randomSlot[0], randomSlot[1], randomSlot[2]),
        ]);

        const reversePath = new THREE.CatmullRomCurve3([
          new THREE.Vector3(randomSlot[0], randomSlot[1], randomSlot[2]),
          new THREE.Vector3(0.2, 0, randomSlot[2]),
          new THREE.Vector3(0.2, 0, 7),
        ]);

        // Spawn a new box that follows its own path and load unique model for it
        setBoxes((prevBoxes) => [
          ...prevBoxes,
          { path: newPath, reversePath, modelUrl: 'Car4.glb' },
        ]);
      }
    };

    // Add event listener for key press
    window.addEventListener("keydown", handleKeyDown);

    // Clean up event listener on component unmount
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [parkingSlots]);

  return (
    <div className="h-screen">
      <Canvas>
        <ParkingModel />
        <directionalLight position={[0, 10, 5]} />
        <ambientLight />
        <color args={[0.2, 0.2, 0.2]} attach="background" />
        <pointLight position={[10, 10, 10]} />

        {/* Render all boxes, each following their own path */}
        {boxes.map((box, index) => (
          <FollowPathBox key={index} path={box.path} modelUrl={box.modelUrl} reversePath={box.reversePath} />
        ))}

        {parkingSlots.map((position, index) => (
          <Box key={index} position={position} />
        ))}

        <OrbitControls />
      </Canvas>
    </div>
  );
};

export default App;
