import { faArrowDown, faArrowRight, faChevronDown, faDownload } from '@fortawesome/free-solid-svg-icons'
import { faClose } from '@fortawesome/free-solid-svg-icons/faClose'
import { faSearch } from '@fortawesome/free-solid-svg-icons/faSearch'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useState } from 'react'
import axios from "axios"
import { motion } from "framer-motion";
import Sparkles from './Sparkles'

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
        <div style={{backgroundColor:"#111111"}} className='m h-screen  flex flex-col justify-center items-center text-center relative z-0 overflow-hidden '>
            <svg
                className="absolute z-0 top-0 right-0 translate-x-1/2"
                width="800"
                height="800"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <radialGradient id="radialGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="lightblue" />
                        <stop offset="100%" stopColor="blue" />
                    </radialGradient>
                </defs>
                <motion.path
                    initial={{
                        d: "m 555 719 c 138 -165 21.86 -304.18 -242.55 -533.61 c 17.41 -326.57 -334.59 -142.57 -308.45 -8.39 q 0 145.53 131.14 151.18 c 185 223 191 627 296 601 z"
                    }}
                    animate={{
                        d: [
                            "m 555 719 c 110 -114 138 -516 -242.55 -533.61 c 17.41 -326.57 -334.59 -142.57 -308.45 -8.39 q 0 145.53 102 245 c 185 223 -37.14 602.82 132.86 722.82 z",
                            "m 555 724 c -198 -184 138 -516 -242.55 -533.61 c 17.41 -326.57 -334.59 -142.57 -230.45 111.61 q 0 145.53 102 245 c 185 223 -22 674 353 337 z",
                            "m 555 724 c -198 -184 138 -516 -242.55 -533.61 c 17.41 -326.57 -334.59 -142.57 -230.45 111.61 q 0 145.53 98 398 c 185 223 -22 674 353 337 z"
                        ]
                    }}
                    transition={{
                        duration: 25, // Total animation duration
                        ease: "easeInOut",
                        repeat: Infinity, // Loop animation
                        repeatType: "mirror" // Reverse back and forth
                    }}
                    stroke="none"
                    fill="url(#radialGradient)"
                    strokeWidth="2"
                />
            </svg>
            <svg
                className="absolute z-0 top-0 left-1/2 -translate-x-1/2"
                width="800"
                height="800"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <radialGradient id="radialGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="lightblue" />
                        <stop offset="100%" stopColor="blue" />
                    </radialGradient>
                </defs>
                <motion.path
                    initial={{
                        d: "m 582.14 726.18 c -495.14 -263.18 -79.14 -323.18 -242.55 -533.61 c -291.06 -339.57 -339.57 -145.53 -339.57 -48.51 q 0 145.53 97.02 242.55 c 31.96 148.39 194.04 485.1 485.1 339.57 z"
                    }}
                    animate={{
                        d: [
                            "m 582.14 726.18 c 316.86 -263.18 -79.14 -323.18 -242.55 -533.61 c -291.06 -339.57 -339.57 -145.53 -339.57 -48.51 q 0 145.53 97.02 242.55 c 31.96 148.39 194.04 485.1 485.1 339.57 z",
                            "m 582.14 726.18 c 301.86 -206.18 -249.14 -279.18 -242.55 -533.61 c -77.59 -334.57 -339.57 -145.53 -339.57 -48.51 q 0 145.53 97.02 242.55 c 31.96 148.39 194.04 485.1 485.1 339.57 z",
                            "m 582.14 726.18 c 13.86 -148.18 40.86 -356.18 -242.55 -533.61 c -135.59 -286.57 -339.57 -145.53 -339.57 -48.51 q 0 145.53 97.02 242.55 c 31.96 148.39 194.04 485.1 485.1 339.57 z"
                        ]
                    }}
                    transition={{
                        duration: 15, // Total animation duration
                        ease: "easeInOut",
                        repeat: Infinity, // Loop animation
                        repeatType: "mirror" // Reverse back and forth
                    }}
                    stroke="none"
                    fill="url(#radialGradient)"
                    strokeWidth="2"
                />
            </svg>
            <svg
                className="absolute z-0 top-1/2 left-0 -translate-x-1/3 -translate-y-1/3"
                width="800"
                height="800"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <radialGradient id="radialGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="lightblue" />
                        <stop offset="100%" stopColor="blue" />
                    </radialGradient>
                </defs>
                <motion.path
                    initial={{ d: "m 325 20 c -175 -50 -275 0 -325 175 c 0 125 75 375 300 300 c 100 -50 200 -150 150 -250 q 0 -75 -75 -175 c -16.6667 -16.6667 -33.3333 -33.3333 -50 -50 z" }}
                    animate={{
                        d: [
                            "m 325 20 c -175 -50 -275 0 -277 202 c 0 125 75 375 300 300 c 100 -50 200 -150 134 -210 q 0 -75 -108 -133 c -20 -26 -3 -47 -37 -100 z",
                            "m 310 30 c -180 -60 -280 10 -280 210 c 10 130 80 390 310 310 c 110 -50 190 -140 140 -230 q -10 -80 -100 -140 c -25 -30 -5 -50 -40 -110 z",
                            "m 325 20 c -175 -50 -275 0 -277 202 c 0 125 75 375 300 300 c 100 -50 201 -172 134 -210 q -70 -54 -70 -160 c -20 -26 0 -37 -42 -85 z",
                            "m 325 20 c -175 -50 -275 0 -277 202 c 0 125 75 375 271 291 c 66 -98 103 -117 134 -210 q 19 -90 -34 -185 c -20 -26 -9 -10 -42 -85 z",
                            "m 325 20 c -204 73 -275 0 -277 202 c 0 125 75 375 225 282 c 117 29 188 -122 163 -220 q -99 -102 -11 -153 c 37 -32 27 -68 -16 -93 z",
                            "m 325 20 c -222 -41 -275 0 -277 202 c 0 125 75 375 225 282 c 117 29 97 -118 163 -160 q 48 -92 22 -150 c -29 -32 40 -79 -73 -124 z"
                        ]
                    }}
                    transition={{
                        duration: 20, // Total animation duration
                        ease: "easeInOut",
                        repeat: Infinity, // Loop animation
                        repeatType: "mirror" // Reverse back and forth
                    }}
                    stroke="none"
                    fill="url(#radialGradient)"
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