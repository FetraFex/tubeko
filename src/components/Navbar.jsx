import { faBars, faChevronDown, faGlobe, faHeart } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { AnimatePresence, motion } from 'framer-motion'
import React, { useState } from 'react'
import { useMediaQuery } from "react-responsive"

const Navbar = () => {
  const isMobileOrTablet = useMediaQuery({query: "(max-width: 1280px)"})
  const [isMenuOpen, setIsMenuOpen] = useState(isMobileOrTablet? false : true)
  return (
    <div className='fixed top-0 w-full bg-transparent text-white xl:px-36 py-3 px-3 xl:py-6 flex justify-between items-center z-50'>
      <div className='flex lg:space-x-24'>
        <h1>Tubeko</h1>
        <AnimatePresence>
          {isMenuOpen &&
            <motion.ul initial={{x: "100%", opacity:0}} animate={{x: "0", opacity: 1}} exit={{x: "100%",  opacity:0}} className={`xl:flex gap-8 absolute xl:relative w-full top-full bg-black xl:bg-transparent left-0 px-3 h-screen xl:h-auto space-y-4 xl:space-y-0 text-end`}>
              <li className='font-semibold'>Home</li>
              <li className='font-semibold'>How to Use/FAQ</li>
              <li className='font-semibold'>Features</li>
              <li className='font-semibold'>Supported Formats</li>
            </motion.ul>}
        </AnimatePresence>
      </div>
      <div className='block xl:hidden' onClick={() => setIsMenuOpen(!isMenuOpen)}>
        <FontAwesomeIcon icon={faBars} className='text-xl' />
      </div>
      <div className='xl:flex gap-5 hidden'>
        <div className='cursor-pointer bg-opacity-20 flex space-x-1 bg-white rounded-xl px-2 py-2'><span><FontAwesomeIcon icon={faGlobe} /></span><p className='font-medium'>English</p><span><FontAwesomeIcon icon={faChevronDown} /></span></div>
        <div className='flex text-black items-center space-x-1 bg-white rounded-xl px-2 py-2'>
          <h4 className='font-medium'>Donate</h4>
          <FontAwesomeIcon className="text-pink-500" icon={faHeart} />
        </div>
      </div>
    </div>
  )
}

export default Navbar