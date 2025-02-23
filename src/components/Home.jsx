import { faArrowDown, faArrowRight, faChevronDown, faDownload } from '@fortawesome/free-solid-svg-icons'
import { faClose } from '@fortawesome/free-solid-svg-icons/faClose'
import { faSearch } from '@fortawesome/free-solid-svg-icons/faSearch'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useState } from 'react'
import axios from "axios"
import { motion } from "framer-motion";

const Home = () => {
    const [playlistId, setPlaylistId] = useState("");
    const [videos, setVideos] = useState([])
    const morphVariants = {
        animate: {
            d: [
                "M 0 300 Q 150 100 300 300 T 600 300 T 900 300 T 1200 300 V 800 H 0 Z",
                "M 0 400 Q 200 200 400 400 T 800 400 T 1200 400 V 800 H 0 Z",
                "M 0 300 Q 150 100 300 300 T 600 300 T 900 300 T 1200 300 V 800 H 0 Z"
            ],
            transition: {
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut"
            }
        }
    };

    const handleFetchVideos = async () => {
        try {
            const response = await axios.get(`http://localhost:3000/api/playlist/${playlistId}`)
            console.log(response.data.videos)
        } catch (error) {
            console.log("Error fetching videos: ", error.message);
        }
    }

    return (
        <div className='m h-screen bg-red-300 flex flex-col justify-center items-center text-center relative z-0'>
            <svg className="absolute z-0 top-0 left-1/2 -translate-x-1/2" width="800" height="800" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="m 582.14 726.18 
       c 145.53 -194.04 48.51 -291.06 -242.55 -533.61 
       c -291.06 -339.57 -339.57 -145.53 -339.57 -48.51 
       q 0 145.53 97.02 242.55 
       c 97.02 145.53 194.04 485.1 485.1 339.57 
       z"
                    stroke="none"
                    fill="lightblue"
                    strokeWidth="2"
                />
            </svg>
            <svg
                className="absolute z-0 top-1/2 left-0 -translate-x-1/3 -translate-y-1/3"
                width="800"
                height="800"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="m 325 20 c -175 -50 -275 0 -325 175 c 0 125 75 375 300 300 c 100 -50 200 -150 150 -250 q 0 -75 -75 -175 c -16.6667 -16.6667 -33.3333 -33.3333 -50 -50 z"
                    stroke="none"
                    fill="lightblue"
                    strokeWidth="2"
                />
            </svg>

            <p className='z-50'>Streamline Your <span className='px-2 py-1 bg-slate-400 rounded-full'><FontAwesomeIcon icon={faDownload} /> Downloads</span></p>
            <div className='z-50 w-full justify-center items-center flex flex-col space-y-6'>
                <h1 className='text-6xl font-bold'>Effortlessly Download and Enjoy<br />Your YouTube Playlists</h1>
                <div className='flex bg-blue-600 w-1/2 rounded-full'>
                    <div className='py-4 w-1/12 rounded-s-full flex justify-center'><FontAwesomeIcon icon={faSearch} className='text-2xl' /></div>
                    <div className='w-10/12'><input onChange={(e) => setPlaylistId(e.target.value)} type="text" className='h-full w-full px-5 text-xl' placeholder='Paste the video or the playlist URL here ! 😉' /></div>
                    <div className='py-4 w-1/12 rounded-e-full flex justify-center'><FontAwesomeIcon icon={faClose} className='text-2xl' /></div>
                </div>
                <div className='flex space-x-2'>
                    <button onClick={handleFetchVideos} className='bg-blue-700 pl-4 pr-2 py-2 rounded-xl font-medium flex justify-between items-center space-x-2'><span>Start conversion</span><FontAwesomeIcon className="bg-green-400 p-3 rounded-xl" icon={faArrowRight} /></button>
                    <button className='bg-blue-700 px-4 rounded-xl font-medium border-2'>Quality <FontAwesomeIcon icon={faChevronDown} /></button>
                </div>
            </div>
            <div className='absolute bottom-8 w-full flex justify-between px-36'>
                <div className="flex">
                    <p>Follow Us</p>
                    <div className='flex'>
                        <p>A</p>
                        <p>A</p>
                        <p>A</p>
                        <p>A</p>
                    </div>
                </div>
                <div className='flex items-center space-x-1'>
                    <p><span className="font-medium">Scroll</span> to explore</p><FontAwesomeIcon icon={faArrowDown} />
                </div>
            </div>
        </div>
    )
}

export default Home