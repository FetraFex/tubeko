import { faFileAudio, faFileVideo, faMusic } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import { useLanguage } from '../Context/LanguageContext'
import dictionary from '../Context/Dictionnary'

const SupportedFormats = () => {
  const { language } = useLanguage()
  return (
    <div className=" bg-default-gradient flex pt-10 xl:pt-0">
      <div className='flex-1 xl:flex justify-center items-center space-x-8 hidden w-full'>
        <div className='text-white text-center'>
          <FontAwesomeIcon icon={faFileAudio} className='text-9xl text-[#72ffce]'/>
          <h3 className='text-4xl font-bold'>MP3</h3>
        </div>
        <div className='text-white text-center'>
          <FontAwesomeIcon icon={faFileVideo} className='text-9xl text-[#72ffce]'/>
          <h3 className='text-4xl font-bold'>MP4</h3>
        </div>
      </div>
      <div className='flex-1 text-white justify-center flex items-center px-4 bg-[#0F1112] xl:bg-transparent py-7'>
        <div className="xl:w-2/3 w-full sm:w-10/12  xl:space-y-8 space-y-2">
          <h4 className="text-4xl font-bold text-white xl:mb-3 mb-0"><FontAwesomeIcon className='text-[#72ffce]' icon={faMusic} /> {dictionary[language].supportedFormat}</h4>
          {/* Description */}
          <p className="text-gray-300 mb-4 text-lg">
            {dictionary[language].supportedFormatContent}
          </p>
          {/* Format List */}
          <ul className="space-y-2 text-gray-300 hidden xl:block">
            <li>
              <FontAwesomeIcon icon={faFileVideo} className="text-[#72ffce] mr-2 text-2xl" />
              <span className="font-bold text-white">MP4:</span> {dictionary[language].mp4}
            </li>
            <li>
              <FontAwesomeIcon icon={faFileAudio} className="text-[#72ffce] mr-2 text-2xl" />
              <span className="font-bold text-white">MP3:</span> {dictionary[language].mp3}
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default SupportedFormats