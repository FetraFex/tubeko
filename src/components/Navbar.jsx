import React from 'react'

const Navbar = () => {
  return (
    <div className='fixed top-0 w-full bg-slate-200 px-36 py-10 flex justify-between z-50'>
      <div className='flex space-x-24'>
        <h1>Tubeko</h1>
        <ul className='flex gap-8'>
          <li>Home</li>
          <li>How to Use/FAQ</li>
          <li>Features</li>
          <li>Supported Formats</li>
        </ul>
      </div>
      <div className='flex gap-8'>
        <div>English</div>
        <div>
          <h4>Start a challenge</h4>
        </div>
      </div>
    </div>
  )
}

export default Navbar