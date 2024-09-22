import React, { Suspense } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { useGLTF, OrbitControls, PerspectiveCamera, Environment, CubeCamera, Texture } from '@react-three/drei'
import Main from './Main'
import Ground from './Ground'
import { useEffect } from 'react'
import LightBars from './LightBars'
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import FloatingGrid from './FloatingGrid'


function Model ({url, position}){
  const { scene } = useGLTF(url)

  scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
      child.envMapIntensity = 20
    }
  })

  useFrame((state, delta) => {
    let t = state.clock.getElapsedTime()
    const wheels = [
      scene.getObjectByName("Wheel1"),
      scene.getObjectByName("Wheel2"),
      scene.getObjectByName("Wheel3"),
      scene.getObjectByName("Wheel4"),
    ]

    wheels[0].rotation.x = t * 1.5
    wheels[1].rotation.x = t * 1.5
    wheels[2].rotation.x = t * 1.5
    wheels[3].rotation.x = t * 1.5
  })


  return(
    <>
      <OrbitControls 
        target={[0,2,-0.3]} 
        enableZoom={false}
        minPolarAngle={(Math.PI / 2.5)}
        maxPolarAngle={Math.PI / 2.5}
      />
      <PerspectiveCamera makeDefault fov={52} position={[11, 5, 11]}/>
      <ambientLight intensity={1}/>
      <color args={[0.05, 0.05, 0.05]} attach="background"/>
      <pointLight 
        position={[0, 6, 0]}
        intensity={100}
      />
      <pointLight 
        position={[0, 7, -2]}
        intensity={150}
      />
      <pointLight 
        position={[0, 9, 2]}
        intensity={150}
      />
      <pointLight 
        position={[1, 4, -3.8]}
        intensity={50}
        color={[1,0,0]}
      />
      <pointLight 
        position={[-1, 4, -3.8]}
        intensity={50}
        color={[1,0,0]}
      />
      <CubeCamera resolution={256} frames={Infinity} >
        {(texture) => (
          <>
            <Environment map={texture}/>
            <primitive object={scene} scale={0.5} position={position}/>
          </>
        )

        }
      </CubeCamera>
      <LightBars />
      <FloatingGrid />
    </> 
  )
}

const Car = () => {
  return (
    <div className='relative bg-gray-950 h-full z-10'>
      <Main />
      <Suspense fallback={null}>  
        <Canvas shadows>
            <Model url={"/Camaro_Full.glb"} position={[0,3.61,0]}/>
            <Ground />
        </Canvas>
      </Suspense>
    </div>
  )
}

export default Car