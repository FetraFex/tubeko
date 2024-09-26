import React from 'react'
import { useNavigate } from 'react-router-dom'

const Main = () => {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate("/park")
  }

  return (
    <div className='absolute bottom-8 text-white w-full flex justify-center bg-slate-700 lg:top-24'>
        <div className='text-center z-30 px-3 lg:w-1/2'>
          <h1 className='font-nunito text-4xl font-bold lg:text-7xl'>Redefine Your Driving Experience in the Virtual World</h1>
          <p className='mt-3'>Build your dream car with limitless customization, from colors to body.</p>
          <button 
            className='bg-black font-bold border border-2 border-gray-300 rounded-full py-2 px-5 mt-7'
            onClick={handleGetStarted}
            >
              Get Started
          </button>
        </div>
    </div>
  )
}

export default Main