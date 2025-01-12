import React from 'react'
import Navbar from './navbar'
import Home from './Home'
import HowToUse from './HowToUse'
import Features from './Features'
import SupportedFormats from './SupportedFormats'

const Landing = () => {
  return (
    <div>
        <Navbar />
        <Home />
        <HowToUse />
        <Features />
        <SupportedFormats />
    </div>
  )
}

export default Landing