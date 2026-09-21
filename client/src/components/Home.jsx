import { faArrowDown, faArrowRight, faCheck, faChevronDown, faDownload, faX } from '@fortawesome/free-solid-svg-icons'
import { faInstagram, faFacebook, faWhatsapp, faTwitter, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { faClose } from '@fortawesome/free-solid-svg-icons/faClose'
import { faSearch } from '@fortawesome/free-solid-svg-icons/faSearch'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useState, useRef } from 'react'
import axios from "axios"
import { AnimatePresence, motion } from "framer-motion";
import Sparkles from './Sparkles'
import Media from './Media';
import { ClipLoader, DotLoader, CircleLoader, BeatLoader } from "react-spinners";
import Video from './Video';
import { useMediaQuery } from 'react-responsive';
import { useLanguage } from '../Context/LanguageContext';
import dictionary from '../Context/Dictionnary'
import { QUALITY_OPTIONS, DEFAULT_QUALITY, qualityOption } from '../lib/quality'
import { useDismissOnOutsideClick } from '../lib/useDismissOnOutsideClick'

const Home = () => {
    const isMobileOrTablet = useMediaQuery({query: "(max-width: 1280px)"})
    const sparkles = Array.from({ length: 12 });
    const [currentIndex, setCurrentIndex] = useState(null);
    const videoRefs = useRef([]);

    const [downloadQueue, setDownloadQueue] = useState([]);
    const [activeDownload, setActiveDownload] = useState(null);

    const [inputUrl, setInputUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [videos, setVideos] = useState([])
    const [errorMessage, setErrorMessage] = useState("")

    // Download quality: chosen in the hero, applied to every video below.
    const [quality, setQuality] = useState(DEFAULT_QUALITY)
    const [isQualityOpen, setIsQualityOpen] = useState(false)
    const qualityMenuRef = useRef(null)

    useDismissOnOutsideClick(qualityMenuRef, isQualityOpen, () => setIsQualityOpen(false))

      const { language } = useLanguage()

    // Automatically trigger the download of the first video
    useEffect(() => {
        if (currentIndex !== null && currentIndex < videos.length) {
            videoRefs.current[currentIndex]?.handleDownload();
        }
    }, [currentIndex]);


    // Function to start downloading from a specific index
    const startDownloadsFromIndex = (startIndex) => {
        const remainingVideos = videos.slice(startIndex).map((_, i) => startIndex + i);
        console.log(remainingVideos);
        setDownloadQueue(remainingVideos);
    };

    // Function to start the download process
    const startDownload = () => {
        const newQueue = videos.map((_, index) => index);
        setDownloadQueue(newQueue);
    };

    // Process next download whenever the queue changes
    useEffect(() => {
        if (downloadQueue.length > 0) {
            console.log("Misy ao");

            const nextIndex = downloadQueue[0];
            setActiveDownload(nextIndex);
            videoRefs.current[nextIndex]?.handleDownload();
        } else {
            console.log("Tsy misy ao e");
        }
    }, [downloadQueue]); // Runs when `downloadQueue` updates


    // Function to trigger the next video
    const handleComplete = () => {
        setDownloadQueue(prev => prev.slice(1)); // Triggers `useEffect` again
    };


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

    // Pull the playlist/video id out of whatever the user pasted. Handles full
    // URLs, URLs without a protocol, youtu.be links and bare ids.
    const parseYouTubeInput = (rawValue) => {
        const value = (rawValue || "").trim();
        if (!value) return {};

        const looksLikeUrl =
            /^https?:\/\//i.test(value) ||
            /^(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(value);

        if (looksLikeUrl) {
            try {
                const urlObj = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
                const listId = urlObj.searchParams.get("list");
                const videoId = urlObj.searchParams.get("v");

                if (listId) return { listId, videoId };
                if (videoId) return { videoId };
                if (urlObj.hostname === "youtu.be" && urlObj.pathname.length > 1) {
                    return { videoId: urlObj.pathname.slice(1) };
                }

                // Playlist pages keep the id in the query string we already read.
                return {};
            } catch (e) {
                console.log("Could not parse URL, treating input as an id.");
            }
        }

        // Fallback for bare ids: video ids are 11 chars, playlist ids are longer.
        if (/^[A-Za-z0-9_-]{11}$/.test(value)) return { videoId: value };
        return { listId: value };
    };

    const handleFetchVideos = async () => {
        if (!inputUrl) return;
        setIsLoading(true);
        setVideos([]);
        setErrorMessage("");

        try {
            const { listId, videoId } = parseYouTubeInput(inputUrl);

            if (listId) {
                const response = await axios.get(`http://localhost:3000/api/playlist/${listId}`);
                console.log("Next Page token: ", response.data.nextPageToken);
                setVideos(response.data.videos || []);
                if (!response.data.videos?.length) {
                    setErrorMessage("This playlist has no downloadable videos.");
                }
            } else if (videoId) {
                const response = await axios.get(`http://localhost:3000/api/video/${videoId}`);
                setVideos(response.data.videos || []);
            } else {
                setErrorMessage("Could not parse a video or playlist from that link.");
            }
        } catch (error) {
            console.log("Error fetching videos: ", error.message);
            setErrorMessage(
                error.response?.data?.error ||
                "Could not reach the server. Is it running on port 3000?"
            );
        } finally {
            setIsLoading(false);
        }
    }

    // Log videos when they change
    useEffect(() => {
        console.log("Videos updated:", videos)
    }, [videos])

    return (
        <div>
            <div className='bg-default-gradient h-screen  flex flex-col justify-center items-center text-center relative z-0 overflow-hidden '>
                <svg
                    className="absolute z-0 top-0 right-0 translate-x-1/2"
                    width="800"
                    height="800"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <radialGradient id="blob-gradient-a" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#0e6b4f" />
                            <stop offset="100%" stopColor="#0b3f2c77" />
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
                        fill="url(#blob-gradient-a)"
                        strokeWidth="2"
                    />
                </svg>
                <svg
                    className="absolute z-0 top-0 left-1/2 -translate-x-1/2 "
                    width="800"
                    height="800"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <radialGradient id="blob-gradient-b" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#7fe9c4" />
                            <stop offset="100%" stopColor="#0abf72" />
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
                        fill="url(#blob-gradient-b)"
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
                        <radialGradient id="blob-gradient-c" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#7fe9c4" />
                            <stop offset="100%" stopColor="#0abf72" />
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
                        fill="url(#blob-gradient-c)"
                        strokeWidth="2"
                    />
                </svg>
                <div className='absolute inset-0 z-[45] pointer-events-none hero-scrim'></div>
                <div className='absolute backdrop-blur-4xl top-0 z-40 left-0 w-full h-full'></div>

                <p className='text-white z-50'>{dictionary[language].stream[0]} <span className='px-2 py-1 bg-white bg-opacity-20 rounded-full'><FontAwesomeIcon color='#72ffce' icon={faDownload} /> {dictionary[language].stream[1]}</span></p>
                <div className='z-50 w-full justify-center items-center flex flex-col space-y-6 px-2'>
                    <h1 className='text-3xl xl:text-6xl lg:text-4xl font-bold gradient-text hero-title-glow'>{dictionary[language].headline[0]}<br />{dictionary[language].headline[1]}</h1>
                    <div className='flex items-center gap-1 bg-white xl:w-7/12 w-full sm:w-10/12 lg:w-8/12 rounded-full p-1.5 pl-2 pr-2.5 ring-1 ring-white/25 shadow-lg shadow-black/30 transition-shadow duration-300 focus-within:ring-2 focus-within:ring-[#72ffce]/60 focus-within:shadow-[0_0_45px_-8px_rgba(114,255,206,0.6)]'>
                        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5'>
                            <FontAwesomeIcon icon={faSearch} color="#000" className='text-lg xl:text-xl opacity-60' />
                        </div>
                        <input
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            type="text"
                            className='z-50 h-11 flex-1 min-w-0 bg-transparent px-2 xl:px-3 text-black text-sm xl:text-lg outline-none placeholder:text-black/40'
                            placeholder={`${dictionary[language].placeholder} 😉`}
                        />
                        <button
                            type='button'
                            onClick={() => setInputUrl("")}
                            aria-label='Clear the pasted link'
                            className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black/40 transition-colors duration-150 hover:bg-black/5 hover:text-black/70'
                        >
                            <FontAwesomeIcon color="#000" icon={faClose} className='text-base xl:text-lg opacity-60' />
                        </button>
                    </div>
                    <div className='flex items-stretch space-x-4'>
                        <button onClick={handleFetchVideos} className='bg-white text-black hover:scale-105 transition-all duration-200 pl-4 pr-2 py-1 xl:py-2 rounded-xl font-medium flex justify-between items-center space-x-2'>
                            <span>{dictionary[language].button.conversion}</span>
                            {/* A fixed-size, flex-centred badge rather than padding on the SVG: the
                                icon's own aspect ratio made the padded background taller than it was
                                wide, so the mint chip never matched the button's rounded shape. */}
                            <span className='flex h-7 w-7 xl:h-9 xl:w-9 shrink-0 items-center justify-center rounded-full bg-[#72ffce]'>
                                <FontAwesomeIcon icon={faArrowRight} className='text-xs xl:text-sm' />
                            </span>
                        </button>
                        <div ref={qualityMenuRef} className='relative'>
                            <button
                                type='button'
                                onClick={() => setIsQualityOpen(!isQualityOpen)}
                                aria-expanded={isQualityOpen}
                                className='flex h-full cursor-pointer items-center gap-2 rounded-xl border-2 px-4 font-medium text-white transition-colors duration-200 hover:border-[#72ffce]/60 hover:text-[#a7ffe2]'
                            >
                                <span>{dictionary[language].button.quality}</span>
                                <span className='text-[#a7ffe2]'>{qualityOption(quality).label}</span>
                                <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform duration-200 ${isQualityOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {isQualityOpen &&
                                    <motion.div
                                        initial={{ y: '-6px', opacity: 0, scale: 0.97 }}
                                        animate={{ y: '0', opacity: 1, scale: 1 }}
                                        exit={{ y: '-6px', opacity: 0, scale: 0.97 }}
                                        transition={{ duration: 0.16, ease: 'easeOut' }}
                                        className='absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#08130f]/90 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl'
                                    >
                                        {QUALITY_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type='button'
                                                onClick={() => { setQuality(option.value); setIsQualityOpen(false) }}
                                                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150 ${quality === option.value ? 'bg-[#72ffce]/15 text-[#a7ffe2]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
                                            >
                                                <span className='flex-1'>{option.label}</span>
                                                {quality === option.value && <FontAwesomeIcon icon={faCheck} className='text-xs' />}
                                            </button>
                                        ))}
                                    </motion.div>}
                            </AnimatePresence>
                        </div>
                    </div>
                    <div className="h-4 flex items-center">
                        {isLoading && <BeatLoader color="#fff" size={10} />}
                    </div>
                    {!isLoading && errorMessage && (
                        <p className="z-50 max-w-2xl text-[#a7ffe2] bg-black/40 rounded-lg px-4 py-2">
                            {errorMessage}
                        </p>
                    )}
                    {videos.length > 0 && (
                        <div className='w-full flex flex-col items-center gap-y-5'>
                            <button onClick={startDownload} className="rounded-lg hover:bg-[#a7ffe2] transition-all duration-300 bg-[#72ffce] px-8 py-2 text-black font-medium text-lg">Start Download</button>
                            {/* Results sit in the same column as the buttons, so they land directly
                                under them. Capped + scrollable so a long playlist can't push the
                                hero past the viewport its section locks with overflow-hidden. */}
                            <div className='w-full lg:w-2/3 max-h-[38vh] overflow-y-auto flex custom-scrollbar flex-col gap-y-6 pb-2'>
                                {videos.map((video, index) => (
                                    <Video
                                        key={index}
                                        ref={(el) => (videoRefs.current[index] = el)}
                                        onComplete={handleComplete}
                                        title={video.title} thumbnail={video.thumbnail} videoId={video.videoId}
                                        quality={quality}
                                        onQueueAfter={() => startDownloadsFromIndex(index)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className='absolute z-50 bottom-8 w-full flex justify-between xl:px-36 px-3 sm:px-10 lg:px-20'>
                    <div className="flex gap-2">
                        <p className='text-white hidden xl:block'>{dictionary[language].followus}</p>
                        <div className='flex text-white items-center space-x-1'>
                            <FontAwesomeIcon className='bg-white rounded-full p-1 cursor-pointer' icon={faFacebook} color='black' />
                            <FontAwesomeIcon className='bg-white rounded-full p-1 cursor-pointer' icon={faInstagram} color='black' />
                            <FontAwesomeIcon className='bg-white rounded-full p-1 cursor-pointer' icon={faWhatsapp} color='black' />
                            <FontAwesomeIcon className='bg-white rounded-full p-1 cursor-pointer' icon={faXTwitter} color='black' />
                        </div>
                    </div>
                    <div className='flex items-center space-x-1 text-white'>
                        <p><span className="font-medium">{ isMobileOrTablet?  dictionary[language].swipe : dictionary[language].scroll }</span> {dictionary[language].explore }</p><FontAwesomeIcon color='#72ffce' icon={faArrowDown} />
                    </div>
                </div>
                {sparkles.map((_, index) => (
                    <Sparkles key={index} direction="up" />
                ))}
                {sparkles.map((_, index) => (
                    <Sparkles key={index} direction="down" />
                ))}
                <Media />
            </div>
        </div>
    )
}

export default Home