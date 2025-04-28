import React from 'react'

const Video = ({ title, thumbnail, videoId }) => {
    return (
        <div className='flex gap-x-10 w-full'>
            <div>
                <img src={thumbnail} alt={title} className='max-h-50 rounded-lg' />
            </div>
            <div className='flex justify-between flex-col flex-1'>
                <div>
                    <h3 className='text-white font-bold text-2xl'>{title}</h3>
                    <h3 className='text-gray-200'>05:48</h3>
                </div>
                <div className="flex gap-x-3">
                    <button className="text-black font-bold py-2 flex-1 rounded-lg hover:bg-green-300 bg-green-400 transition-all duration-300">Download MP3</button>
                    <button className="text-black font-bold py-2 flex-1 rounded-lg hover:bg-green-300 bg-green-400 transition-all duration-300">Download MP4</button>
                </div>
            </div>
        </div>
    )
}

export default Video