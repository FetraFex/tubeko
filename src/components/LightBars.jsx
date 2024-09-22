import { useFrame } from '@react-three/fiber'
import React from 'react'
import { useRef } from 'react'

const LightBars = () => {
    const itemsRef = useRef([])

    useFrame((state)=>{
        let elapsed = state.clock.getElapsedTime()

        for (let i = 0; i < itemsRef.current.length; i++) {
            let mesh = itemsRef.current[i]

            let z = (i - 5) * 5 + ((elapsed * 0.4) % 5) * 2
            mesh.position.set(0,0,-z)           
        }
    })
    return (
        <>
            {[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map((v, i) =>(
                <mesh
                    castShadow
                    receiveShadow
                    position={[0, 0, 0]}
                    key={i}
                    ref={(el) => (itemsRef.current[i] = el)}
                >
                    <torusGeometry args={[17, 0.05, 16, 100]} />
                    <meshStandardMaterial emissive={[1, 1, 1]} color={[0,0,0]}/>
                </mesh>
            ))}
        </>
  )
}

export default LightBars