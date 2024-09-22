import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars} from '@fortawesome/free-solid-svg-icons'
import { Color } from 'three'
import { motion, AnimatePresence } from 'framer-motion'

import {
  slideAnimation,
  fadeAnimation
} from "../config/motion"


const Navbar = () => {
  return (
    <motion.section {...slideAnimation("up")} className="fixed w-full flex justify-between py-3 px-6 bg-transparent text-white z-50">
        <motion.header {...slideAnimation("left")}>NitroSim</motion.header>
        <FontAwesomeIcon icon={faBars} size='2x'className='cursor-pointer'/>
    </motion.section>
  )
}

export default Navbar