import React from 'react'
import Navbar from './navbar'
import Car from './Car'

const Landing = () => {
  return (
    <div className="bg-gray-300 h-screen">
        <Navbar/>
        <Car />
    </div>
  )
}

export default Landing