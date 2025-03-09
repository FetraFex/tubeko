import { faFileAudio, faFileVideo, faMusic } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'

const SupportedFormats = () => {
  return (
    <div className="pb-52 bg-custom-gradient flex">
      <div className='flex-1 flex justify-center items-center space-x-8'>
        <div className='text-white text-center'>
          <FontAwesomeIcon icon={faFileAudio} className='text-9xl'/>
          <h3 className='text-4xl font-bold'>MP3</h3>
        </div>
        <div className='text-white text-center'>
          <FontAwesomeIcon icon={faFileVideo} className='text-9xl'/>
          <h3 className='text-4xl font-bold'>MP4</h3>
        </div>
      </div>
      <div className='flex-1 text-white justify-center flex items-center'>
        <div className="w-2/3 space-y-8">
          <h4 className="text-4xl font-bold text-white mb-3"><FontAwesomeIcon icon={faMusic} /> Supported Formats</h4>

          {/* Description */}
          <p className="text-gray-300 mb-4 text-lg">
            Our platform supports only **MP3** for audio and **MP4** for video to provide the best quality and compatibility across all devices.
            **MP4** is a widely used video format that balances high quality with efficient compression, allowing you to download videos in various resolutions
            like **1080p, 720p, and 480p**. On the other hand, **MP3** is the most popular audio format, offering excellent sound quality with small file sizes,
            making it perfect for music and podcasts. Whether you're downloading videos or extracting audio, these formats ensure smooth playback on any device.
          </p>

          {/* Format List */}
          <ul className="space-y-2 text-gray-300">
            <li>
              <FontAwesomeIcon icon={faFileVideo} className="text-white mr-2 text-2xl" />
              <span className="font-bold text-white">MP4:</span> High-quality video format with multiple resolution options.
            </li>
            <li>
              <FontAwesomeIcon icon={faFileAudio} className="text-white mr-2 text-2xl" />
              <span className="font-bold text-white">MP3:</span> Compressed audio format for clear sound quality.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default SupportedFormats