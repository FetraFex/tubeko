import { faBars, faChevronDown, faGlobe, faHeart } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { AnimatePresence, motion } from 'framer-motion'
import React, { useState } from 'react'
import { useMediaQuery } from "react-responsive"
import { Listbox, Transition } from '@headlessui/react';
import { useLanguage } from '../Context/LanguageContext'
import dictionary from '../Context/Dictionnary'
import Flag from 'react-world-flags';

const Navbar = () => {
  const isMobileOrTablet = useMediaQuery({ query: "(max-width: 1280px)" })
  const [isMenuOpen, setIsMenuOpen] = useState(isMobileOrTablet ? false : true)
  const { language, setLanguage } = useLanguage()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <div className='fixed top-0 w-full bg-transparent text-white xl:px-36 py-3 sm:px-10 lg:px-20 lg:py-6 px-3  flex justify-between items-center z-50'>
      <div className='flex lg:space-x-24'>
        <h1>Tubeko</h1>
        <AnimatePresence>
          {isMenuOpen &&
            <motion.ul initial={{ x: "100%", opacity: 0 }} animate={{ x: "0", opacity: 1 }} exit={{ x: "100%", opacity: 0 }} className={`xl:flex gap-8 absolute xl:relative w-full top-full bg-black xl:bg-transparent left-0 px-3 h-screen xl:h-auto space-y-4 xl:space-y-0 text-end`}>
              <li className='font-semibold'>{dictionary[language].menu[0]}</li>
              <li className='font-semibold'>{dictionary[language].menu[1]}</li>
              <li className='font-semibold'>{dictionary[language].menu[2]}</li>
              <li className='font-semibold'>{dictionary[language].menu[3]}</li>
            </motion.ul>}
        </AnimatePresence>
      </div>
      <div className='block xl:hidden' onClick={() => setIsMenuOpen(!isMenuOpen)}>
        <FontAwesomeIcon icon={faBars} className='text-xl' />
      </div>
      <div className='xl:flex gap-5 hidden relative'>
        <div className='cursor-pointer bg-opacity-20 hover:bg-opacity-30 transition-all duration-150 flex space-x-1 bg-white rounded-xl px-2 py-2' onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
          <span><FontAwesomeIcon icon={faGlobe} /></span><p className='font-medium'>English</p><span><FontAwesomeIcon icon={faChevronDown} /></span>
          <AnimatePresence>
            {isDropdownOpen &&
              <motion.div initial={{ y: "-10%", opacity: 0 }} animate={{ y: "0", opacity: 1 }} exit={{ y: "-10%", opacity: 0 }} className='flex flex-col rounded-xl absolute top-full mt-2 bg-black bg-opacity-40 left-0'>
                <div onClick={() => setLanguage("en")} className=" hover:bg-white hover:bg-opacity-10 transition-all duration-200 rounded-xl px-8 py-3 flex gap-2">
                  <Flag code='US' className='w-5' />
                  <p>{dictionary[language].lang.en}</p>
                </div>
                <div onClick={() => setLanguage("mg")} className=" hover:bg-white hover:bg-opacity-10 transition-all duration-200 rounded-xl px-8 py-3 flex gap-2">
                  <Flag code='MG' className='w-5' />
                  <p>{dictionary[language].lang.mg}</p>
                </div>
                <div onClick={() => setLanguage("fr")} className=" hover:bg-white hover:bg-opacity-10 transition-all duration-200 rounded-xl px-8 py-3 flex gap-2">
                  <Flag code='FR' className='w-5' />
                  <p>{dictionary[language].lang.fr}</p>
                </div>
              </motion.div>}s
          </AnimatePresence>
        </div>
        <div className='flex text-black items-center space-x-1 bg-white rounded-xl px-2 py-2'>
          <h4 className='font-medium'>{dictionary[language].donate}</h4>
          <FontAwesomeIcon className="text-pink-500" icon={faHeart} />
        </div>
      </div>
    </div>
  )
}

export default Navbar