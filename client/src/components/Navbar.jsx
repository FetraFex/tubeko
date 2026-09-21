import { faBars, faCheck, faChevronDown, faGlobe, faHeart } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { AnimatePresence, motion } from 'framer-motion'
import React, { useEffect, useRef, useState } from 'react'
import { useMediaQuery } from "react-responsive"
import { Listbox, Transition } from '@headlessui/react';
import { useLanguage } from '../Context/LanguageContext'
import dictionary from '../Context/Dictionnary'
import Flag from 'react-world-flags';
import { useDismissOnOutsideClick } from '../lib/useDismissOnOutsideClick'

// How far the page has to move before the bar stops being transparent.
const SCROLL_TRIGGER_PX = 16

// Language codes paired with the country flag react-world-flags expects.
const languages = [
  { code: 'en', flag: 'US' },
  { code: 'mg', flag: 'MG' },
  { code: 'fr', flag: 'FR' },
]

const Navbar = () => {
  const isMobileOrTablet = useMediaQuery({ query: "(max-width: 1280px)" })
  const [isMenuOpen, setIsMenuOpen] = useState(isMobileOrTablet ? false : true)
  const { language, setLanguage } = useLanguage()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const languageMenuRef = useRef(null)

  // Dismiss the language panel on an outside click or Escape.
  useDismissOnOutsideClick(languageMenuRef, isDropdownOpen, () => setIsDropdownOpen(false))

  // At the top of the page the bar floats transparently over the hero, where the
  // mint bloom and the dark scrim already give the links something to sit on.
  // The moment the page moves off 0,0 that stops being true - the hero's own
  // content starts sliding underneath the bar - so it switches to a glass
  // surface rather than letting white text land on whatever passes below.
  const [isScrolledFromTop, setIsScrolledFromTop] = useState(false)

  useEffect(() => {
    const sync = () => {
      // Any movement at all counts, not just a full viewport: the bar is only
      // flush with the hero's backdrop at the very top. The small dead zone
      // keeps a fractional scroll position or a trackpad rubber-band from
      // flickering the surface on and off.
      setIsScrolledFromTop(window.scrollY > SCROLL_TRIGGER_PX)
    }

    sync() // a reload part-way down the page starts in the right state
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [])

  return (
    <div className={`fixed top-0 w-full text-white xl:px-36 py-3 sm:px-10 lg:px-20 lg:py-6 px-3 flex justify-between items-center z-50 border-b transition-[background-color,border-color,box-shadow] duration-300 ${isScrolledFromTop ? 'border-white/10 bg-[#04110d]/80 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl' : 'border-transparent bg-transparent'}`}>
      <div className='flex items-center lg:space-x-24'>
        <div className='flex items-center gap-3'>
          <img src='/images/tubeko-lg.png' alt='' className='h-12 xl:h-14 w-auto' />
          <span className='font-sora font-bold gradient-text tracking-[0.18em] leading-none whitespace-nowrap select-none text-xl sm:text-2xl xl:text-3xl'>TUBEKO</span>
        </div>
        <AnimatePresence>
          {isMenuOpen &&
            <motion.ul initial={{ x: "100%", opacity: 0 }} animate={{ x: "0", opacity: 1 }} exit={{ x: "100%", opacity: 0 }} className={`xl:flex gap-8 absolute xl:relative w-full top-full xl:top-auto bg-black xl:bg-transparent left-0 px-3 h-screen xl:h-auto space-y-4 xl:space-y-0 text-end`}>
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
        <div ref={languageMenuRef} className='relative'>
          <button
            type='button'
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm backdrop-blur-md transition-all duration-200 ${isDropdownOpen ? 'border-[#72ffce]/50 bg-white/15' : 'border-white/15 bg-white/10 hover:border-[#72ffce]/40 hover:bg-white/15'}`}
          >
            <FontAwesomeIcon icon={faGlobe} className='text-xs text-[#72ffce]' />
            <span className='font-medium tracking-wide'>{dictionary[language].lang[language]}</span>
            <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] text-white/60 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {isDropdownOpen &&
              <motion.div
                initial={{ y: '-6px', opacity: 0, scale: 0.97 }}
                animate={{ y: '0', opacity: 1, scale: 1 }}
                exit={{ y: '-6px', opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className='absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#08130f]/85 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl'
              >
                {languages.map(({ code, flag }) => (
                  <button
                    key={code}
                    type='button'
                    onClick={() => { setLanguage(code); setIsDropdownOpen(false) }}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150 ${language === code ? 'bg-[#72ffce]/15 text-[#a7ffe2]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
                  >
                    <Flag code={flag} className='w-5 rounded-[3px]' />
                    <span className='flex-1'>{dictionary[language].lang[code]}</span>
                    {language === code && <FontAwesomeIcon icon={faCheck} className='text-xs' />}
                  </button>
                ))}
              </motion.div>}
          </AnimatePresence>
        </div>
        <div className='flex cursor-pointer items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm text-black shadow-lg shadow-black/25 transition-all duration-200 hover:shadow-[0_0_30px_-6px_rgba(114,255,206,0.75)]'>
          <span className='font-medium tracking-wide'>{dictionary[language].donate}</span>
          <FontAwesomeIcon className='text-xs text-[#16b98c]' icon={faHeart} />
        </div>
      </div>
    </div>
  )
}

export default Navbar