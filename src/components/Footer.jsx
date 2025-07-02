import { height } from '@fortawesome/free-solid-svg-icons/faClose'
import React from 'react'

const Footer = () => {
  return (
    <div className='bg-custom-gradient pt-44 h-[80vh] w-full'>
      <div
        className='bg-[#0F1112] h-full flex flex-col xl:flex-row items-center justify-evenly rounded-t-[2000px] shadow-[0px_0px_70px_10px] shadow-[#60e0b3] '>
        <div className=''>
          <h2 className='text-2xl font-bold text-white'>Tubeko</h2>
        </div>
        <div className='flex gap-20 items-center'>
          <div className='text-white space-y-3'>
            <h1 className='font-bold'>Social Media</h1>
            <p>LinkedIn</p>
            <p>Instagram</p>
            <p>Facebook</p>
          </div>
          <div className='text-white space-y-3'>
            <p className='font-medium'>Home</p>
            <p className='font-medium'>How to Use/FAQ</p>
            <p className='font-medium'>Features</p>
            <p className='font-medium'>Supported Formats</p>
          </div>
        </div>
      </div>
      <div className=' bg-[#0c0c0c] flex flex-col-reverse sm:flex-row gap-5 justify-between py-4 text-white xl:px-36 px-3'>
        <p className='text-xs sm:text-sm xl:text-base'>© 2025 Tubeko. All rights reserved.</p>
        <p className='font-medium cursor-pointer'>Terms & conditions | Privacy Policy</p>
      </div>
    </div>
  )
}

export default Footer