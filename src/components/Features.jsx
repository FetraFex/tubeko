import { fa500px, faYoutube } from '@fortawesome/free-brands-svg-icons'
import { faDownload, faFilm, faLanguage, faLaptop, faMobile, faMusic, faPhone, faTablet, faVideo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useRef, useState } from 'react'

const Features = () => {

  const sectionRef = useRef(null);
  const cursorRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInside, setIsInside] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInside(entry.isIntersecting);
      },
      { threshold: 0.5 } // Activate when 50% of the section is visible
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => {
      if (sectionRef.current) observer.unobserve(sectionRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isInside) {
      cursorRef.current.style.display = "none" 
      return
    };

    cursorRef.current.style.display = "block" 
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isInside]); // Re-run when `isInside` changes

  return (
    <div ref={sectionRef} className='relative min-h-screen bg-custom-gradient flex items-center justify-center'>
      <div
        ref={cursorRef}
        className="absolute w-96 h-96 light-cursor rounded-full pointer-events-none transition-transform duration-75"
        style={{
          left: position.x,
          top: position.y,
          transform: "translate(-50%, -50%)", // Centers the div on the cursor
          position: "fixed",
        }}
      />
      <div>
        <h2 className='text-3xl xl:text-5xl text-white font-bold text-center mb-1 xl:mb-3'>Features</h2>
        <p className="text-gray-400 xl:text-lg text-xs mb-4 text-center">
          Explore the key functionalities that make our service stand out.
        </p>
        <div className="flex flex-col xl:flex-row px-4 xl:space-x-6 space-x-0 space-y-4 xl:space-y-0  mt-5 xl:mt-10">
          <div className="relative flex-1 p-[2px] rounded-lg border-gradient-l cursor-pointer group hover:shadow-2xl hover:shadow-[#72ffce9f] transition-all duration-300">
            <div className="px-4 py-3 xl:p-8 features-card min-h-96 text-white rounded-lg">
              <div className="flex justify-center h-32 items-center gap-2">
                <FontAwesomeIcon icon={faYoutube} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#72ffce] group-hover:text-[#72ffce] bg-transparent -rotate-45 -translate-x-8 group-hover:rotate-0 group-hover:translate-x-0 group-hover:light-icon transition-all duration-300 ' />
                <FontAwesomeIcon icon={faVideo} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#72ffce] group-hover:text-[#72ffce] translate-y-5 group-hover:translate-y-0 transition-all duration-300' />
                <FontAwesomeIcon icon={faMusic} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#72ffce] group-hover:text-[#72ffce] translate-x-6 group-hover:translate-x-0 transition-all duration-300' />
              </div>
              <h4 className="text-2xl font-bold mb-3">1. YouTube Audio & Video</h4>
              <div>
                <ul className="space-y-2 text-gray-300">
                  <li>- Download YouTube videos in MP4 format with multiple resolution options (1080p, 720p, etc)</li>
                  <li>- Extract audio from YouTube videos in MP3 format</li>
                  <li>- Support for single video downloads with processing</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="relative flex-1 p-[2px] rounded-lg border-gradient-c cursor-pointer group hover:shadow-2xl hover:shadow-[#72ffce9f] transition-all duration-300">
            <div className="px-4 py-3 xl:p-8 features-card min-h-96 h-full text-white rounded-lg">
              <div className="flex justify-center h-32 items-center gap-2">
                <FontAwesomeIcon icon={faYoutube} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#72ffce] group-hover:text-[#72ffce] -rotate-45 group-hover:rotate-0 transition-all duration-300' />
                <FontAwesomeIcon icon={faFilm} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#72ffce] group-hover:text-[#72ffce] -translate-y-10 rotate-45 group-hover:translate-y-0 group-hover:rotate-0 transition-all duration-300' />
                <FontAwesomeIcon icon={faDownload} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#72ffce] group-hover:text-[#72ffce] translate-x-4 group-hover:translate-x-0 transition-all duration-300' />
              </div>
              <h4 className="text-2xl font-bold mb-3">2. YouTube Playlist Downloader</h4>
              <div>
                <ul className="space-y-2 text-gray-300">
                  <li>- Download entire YouTube playlists in one click</li>
                  <li>- Choose between video or audio formats</li>
                  <li>- Maintain video order as in the original playlist</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="relative flex-1 p-[2px] rounded-lg border-gradient-r cursor-pointer group hover:shadow-2xl hover:shadow-[#72ffce9f] transition-all duration-300">
            <div className="px-4 py-3 xl:p-8 features-card min-h-96 h-full text-white rounded-lg">
              <div className="flex justify-center h-32 items-center gap-2">
                <FontAwesomeIcon icon={faLanguage} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#72ffce] group-hover:text-[#72ffce] -translate-x-5 -rotate-45 translate-y-5 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:rotate-0 transition-all duration-300' />
                <FontAwesomeIcon icon={faTablet} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#72ffce] group-hover:text-[#72ffce] -translate-x-2 -translate-y-6 -rotate-45 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:rotate-0 transition-all duration-300' />
                <FontAwesomeIcon icon={faLaptop} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#72ffce] group-hover:text-[#72ffce] translate-x-3 translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300'/>
                <FontAwesomeIcon icon={faMobile} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#72ffce] group-hover:text-[#72ffce] translate-x-10 -translate-y-9 rotate-12 group-hover:rotate-0 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300' />
              </div>
              <h4 className="text-2xl font-bold mb-3">3. Extra Functionalities</h4>
              <div>
                <ul className="space-y-2 text-gray-300">
                  <li>- Support for multiple languages</li>
                  <li>- Works on all devices (PC, mobile, tablet)</li>
                  <li>- No registration required, 100% free to use</li>
                </ul>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

export default Features