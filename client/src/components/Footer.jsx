import React from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFacebook, faInstagram, faWhatsapp, faXTwitter } from '@fortawesome/free-brands-svg-icons'
import { faHeart } from '@fortawesome/free-solid-svg-icons'
import dictionary from '../Context/Dictionnary'
import { useLanguage } from '../Context/LanguageContext'

// The same four networks the hero shows, in the same order.
const socials = [faFacebook, faInstagram, faWhatsapp, faXTwitter]

const Footer = () => {
  const { language } = useLanguage()
  const t = dictionary[language]

  return (
    <footer className='bg-default-gradient pt-44 w-full'>
      {/* The dome's top is a half ellipse, and the way it is drawn matters:

          1. `rounded-[50%_50%_0_0_/_100%_100%_0_0]`, the elliptical form of
             border-radius: 50% of the width across and 100% of the height down,
             so each corner arc is a quarter ellipse spanning half the width and
             the whole height, and the two meet at a single apex point. A fixed
             radius (the original `rounded-t-[2000px]`) is instead scaled down
             by whichever axis binds first, which is what left the straight
             strip across the middle of the top edge.
          2. a height left free to be whatever the design wants. A radius in
             percentages is sized by the box, so the arc is always exactly as
             tall as the box and `aspect-[3/1]` + `min-h-[60vh]` only choose how
             squat the dome is. No height can reintroduce a flat top, and none
             forces the tall pointed arch that a width-derived circle would.

          3. `w-full`, which is load-bearing rather than tidiness. An automatic
             width plus an aspect ratio plus a min-height that wins resolves
             badly: the ratio is then satisfied *from the height*, so the box
             becomes twice as wide as its own height and spills past the page
             (measured 1486px inside a 752px viewport). Pinning the width to 100%
             leaves the ratio deriving only the height, as intended. */}
      <div
        className='w-full bg-[#0F1112] aspect-[3/1] min-h-[60vh] flex flex-col xl:flex-row items-center justify-evenly rounded-[50%_50%_0_0_/_100%_100%_0_0] shadow-[0px_0px_70px_10px] shadow-[#72ffce] '>
        {/* Brand, tagline, and the same four networks under the same label the hero
            uses, so the two social blocks read as one component. */}
        <div className='flex flex-col items-center gap-5'>
          <div className='flex items-center gap-3'>
            <img src='/images/tubeko-lg.png' alt='' className='h-12 xl:h-14 w-auto' />
            <span className='font-sora font-bold gradient-text tracking-[0.18em] leading-none whitespace-nowrap text-2xl xl:text-3xl'>TUBEKO</span>
          </div>
          <p className='max-w-xs text-center text-sm leading-relaxed text-white/60'>{t.stream.join(' ')}</p>
          <div className='flex flex-col items-center gap-3'>
            <p className='text-xs font-semibold uppercase tracking-[0.18em] text-[#a7ffe2]'>{t.followus}</p>
            <div className='flex items-center gap-2'>
              {socials.map((icon, index) => (
                <span
                  key={index}
                  className='flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/70 transition-colors duration-200 hover:border-[#72ffce]/50 hover:text-[#72ffce]'
                >
                  <FontAwesomeIcon icon={icon} className='text-sm' />
                </span>
              ))}
            </div>
          </div>

          {/* Same pill as the navbar's Donate button, and here it keeps the social
              links company rather than standing alone in a slot of its own. */}
          <div className='flex cursor-pointer items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm text-black shadow-lg shadow-black/25 transition-all duration-200 hover:shadow-[0_0_30px_-6px_rgba(114,255,206,0.75)]'>
            <span className='font-medium tracking-wide'>{t.donate}</span>
            <FontAwesomeIcon className='text-xs text-[#16b98c]' icon={faHeart} />
          </div>
        </div>

        {/* Labels rather than links: the sections these name have no anchors, which
            is also how the navbar renders the same four entries. */}
        <nav className='flex flex-col items-center gap-4 xl:items-start'>
          {t.menu.map((item) => (
            <span
              key={item}
              className='text-sm font-medium text-white/70 transition-colors duration-200 hover:text-[#a7ffe2]'
            >
              {item}
            </span>
          ))}
        </nav>
      </div>

      <div className=' bg-[#0c0c0c] flex flex-col-reverse sm:flex-row gap-5 justify-between py-4 text-white xl:px-36 px-3'>
        <p className='text-xs text-white/45 sm:text-sm xl:text-base'>© 2026 Tubeko. {t.copyright}</p>
        <Link
          to='/terms'
          className='text-xs font-medium text-white/45 transition-colors duration-200 hover:text-[#a7ffe2] sm:text-sm xl:text-base'
        >
          {t.termsconditions}
        </Link>
      </div>
    </footer>
  )
}

export default Footer