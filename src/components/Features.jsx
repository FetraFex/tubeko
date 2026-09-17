import { fa500px, faYoutube } from '@fortawesome/free-brands-svg-icons'
import { faDownload, faFilm, faLanguage, faLaptop, faMobile, faMusic, faPhone, faTablet, faVideo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../Context/LanguageContext'
import dictionary from '../Context/Dictionnary'

const Features = () => {

  const sectionRef = useRef(null);
  const cursorRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInside, setIsInside] = useState(false);
  const { language } = useLanguage()

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
    <div ref={sectionRef} className='relative min-h-screen bg-custom-gradient flex items-center justify-center sm:px-10 lg:px-20 xl:px-36'>
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
        <h2 className='text-3xl xl:text-5xl text-white font-bold text-center mb-1 xl:mb-3'>{dictionary[language].features}</h2>
        <p className="text-gray-400 xl:text-lg text-xs mb-4 text-center">
          {dictionary[language].featureDescription}
        </p>
        <div className="flex flex-col xl:flex-row px-4 xl:space-x-6 space-x-0 space-y-4 xl:space-y-0  mt-5 xl:mt-10">
          <div className="relative flex-1 p-[2px] rounded-lg border-gradient-l cursor-pointer group hover:shadow-2xl hover:shadow-[#ff003c9f] transition-all duration-300">
            <div className="px-4 py-3 xl:p-8 features-card min-h-96 text-white rounded-lg">
              <div className="flex justify-center h-32 items-center gap-2">
                <FontAwesomeIcon icon={faYoutube} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#ff003c] group-hover:text-[#ff003c] bg-transparent -rotate-45 -translate-x-8 group-hover:rotate-0 group-hover:translate-x-0 group-hover:light-icon transition-all duration-300 ' />
                <FontAwesomeIcon icon={faVideo} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#ff003c] group-hover:text-[#ff003c] translate-y-5 group-hover:translate-y-0 transition-all duration-300' />
                <FontAwesomeIcon icon={faMusic} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#ff003c] group-hover:text-[#ff003c] translate-x-6 group-hover:translate-x-0 transition-all duration-300' />
              </div>
              <h4 className="text-2xl font-bold mb-3">{dictionary[language].featuresCard[0].title}</h4>
              <div>
                <ul className="space-y-2 text-gray-300">
                  <li>{dictionary[language].featuresCard[0].content[0]}</li>
                  <li>{dictionary[language].featuresCard[0].content[1]}</li>
                  <li>{dictionary[language].featuresCard[0].content[2]}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="relative flex-1 p-[2px] rounded-lg border-gradient-c cursor-pointer group hover:shadow-2xl hover:shadow-[#ff003c9f] transition-all duration-300">
            <div className="px-4 py-3 xl:p-8 features-card min-h-96 h-full text-white rounded-lg">
              <div className="flex justify-center h-32 items-center gap-2">
                <FontAwesomeIcon icon={faYoutube} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#ff003c] group-hover:text-[#ff003c] -rotate-45 group-hover:rotate-0 transition-all duration-300' />
                <FontAwesomeIcon icon={faFilm} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#ff003c] group-hover:text-[#ff003c] -translate-y-10 rotate-45 group-hover:translate-y-0 group-hover:rotate-0 transition-all duration-300' />
                <FontAwesomeIcon icon={faDownload} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#ff003c] group-hover:text-[#ff003c] translate-x-4 group-hover:translate-x-0 transition-all duration-300' />
              </div>
              <h4 className="text-2xl font-bold mb-3">{dictionary[language].featuresCard[1].title}</h4>
              <div>
                <ul className="space-y-2 text-gray-300">
                  <li>{dictionary[language].featuresCard[1].content[0]}</li>
                  <li>{dictionary[language].featuresCard[1].content[1]}</li>
                  <li>{dictionary[language].featuresCard[1].content[2]}</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="relative flex-1 p-[2px] rounded-lg border-gradient-r cursor-pointer group hover:shadow-2xl hover:shadow-[#ff003c9f] transition-all duration-300">
            <div className="px-4 py-3 xl:p-8 features-card min-h-96 h-full text-white rounded-lg">
              <div className="flex justify-center h-32 items-center gap-2">
                <FontAwesomeIcon icon={faLanguage} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#ff003c] group-hover:text-[#ff003c] -translate-x-5 -rotate-45 translate-y-5 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:rotate-0 transition-all duration-300' />
                <FontAwesomeIcon icon={faTablet} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#ff003c] group-hover:text-[#ff003c] -translate-x-2 -translate-y-6 -rotate-45 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:rotate-0 transition-all duration-300' />
                <FontAwesomeIcon icon={faLaptop} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#ff003c] group-hover:text-[#ff003c] translate-x-3 translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300' />
                <FontAwesomeIcon icon={faMobile} size="2xl" className='text-gray-400 group-hover:drop-shadow-[0_0px_8px_#ff003c] group-hover:text-[#ff003c] translate-x-10 -translate-y-9 rotate-12 group-hover:rotate-0 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300' />
              </div>
              <h4 className="text-2xl font-bold mb-3">{dictionary[language].featuresCard[2].title}</h4>
              <div>
                <ul className="space-y-2 text-gray-300">
                  <li>{dictionary[language].featuresCard[2].content[0]}</li>
                  <li>{dictionary[language].featuresCard[2].content[1]}</li>
                  <li>{dictionary[language].featuresCard[2].content[2]}</li>
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