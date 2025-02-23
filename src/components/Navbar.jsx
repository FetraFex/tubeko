import { faChevronDown, faGlobe, faHeart } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'

const Navbar = () => {
  return (
    <div className='fixed top-0 w-full bg-slate-200 px-36 py-6 flex justify-between items-center z-50'>
      <div className='flex space-x-24'>
        <h1>Tubeko</h1>
        <ul className='flex gap-8'>
          <li className='font-semibold'>Home</li>
          <li className='font-semibold'>How to Use/FAQ</li>
          <li className='font-semibold'>Features</li>
          <li className='font-semibold'>Supported Formats</li>
        </ul>
      </div>
      <div className='flex gap-5 items-center'>
        <div className='flex space-x-1 bg-white rounded-xl px-2 py-2'><span><FontAwesomeIcon icon={faGlobe} /></span><p className='font-medium'>English</p><span><FontAwesomeIcon icon={faChevronDown} /></span></div>
        <div className='flex items-center space-x-1 bg-white rounded-xl px-2 py-2'>
          <h4 className='font-medium'>Donate</h4>
          <FontAwesomeIcon className="text-pink-500" icon={faHeart} />
        </div>
      </div>
    </div>
  )
}

export default Navbar