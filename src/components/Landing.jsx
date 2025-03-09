import React from 'react'
import Navbar from './Navbar'
import Home from './Home'
import HowToUse from './HowToUse'
import Features from './Features'
import SupportedFormats from './SupportedFormats'
import Footer from './Footer'

const Landing = () => {
  return (
    <div>
        <Navbar />
        <Home />
        <Features />
        <SupportedFormats />
        <Footer />
    </div>
  )
}

export default Landing