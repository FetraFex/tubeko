import { faArrowDown, faArrowRight, faCheck, faChevronDown, faDownload, faFileAudio, faFileVideo, faListUl, faX } from '@fortawesome/free-solid-svg-icons'
import { faInstagram, faFacebook, faWhatsapp, faTwitter, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { faClose } from '@fortawesome/free-solid-svg-icons/faClose'
import { faSearch } from '@fortawesome/free-solid-svg-icons/faSearch'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useLayoutEffect, useState, useRef } from 'react'
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

// The spark field is built once, at module scope. Because these element objects keep
// their identity across renders, React skips the whole subtree - which is what stops
// a re-render of the hero from restarting the drift.
const SPARK_FIELD = [
    ...Array.from({ length: 12 }, (_, index) => <Sparkles key={`up-${index}`} direction="up" />),
    ...Array.from({ length: 12 }, (_, index) => <Sparkles key={`down-${index}`} direction="down" />),
]

// The Start Download menu. Scope (one video vs the whole playlist) belongs to the row
// menus, so this one only picks the format the whole playlist downloads in.
const DOWNLOAD_ALL_OPTIONS = [
    { mode: 'video', icon: faFileVideo, label: 'Download all as MP4', hint: 'Video and audio, merged' },
    { mode: 'audio', icon: faFileAudio, label: 'Download all as MP3', hint: 'Audio only, no merge' },
]

// A row is a whole card - thumbnail, progress bar, two menus - so a few hundred of them
// cost far more to mount and to scroll than they are worth while off screen. The list
// mounts one chunk at a time as it is scrolled and never repositions what is mounted, so
// cards keep their natural height even when one grows a notice mid-download.
const RENDER_CHUNK = 40
const LOAD_AHEAD_PX = 320

const Home = () => {
    const isMobileOrTablet = useMediaQuery({query: "(max-width: 1280px)"})
    const [currentIndex, setCurrentIndex] = useState(null);
    const videoRefs = useRef([]);
    const urlInputRef = useRef(null);

    const [downloadQueue, setDownloadQueue] = useState([]);
    const [activeDownload, setActiveDownload] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [videos, setVideos] = useState([])
    const [errorMessage, setErrorMessage] = useState("")

    // Download quality: chosen in the hero, applied to every video below.
    const [quality, setQuality] = useState(DEFAULT_QUALITY)
    const [isQualityOpen, setIsQualityOpen] = useState(false)
    const qualityMenuRef = useRef(null)

    useDismissOnOutsideClick(qualityMenuRef, isQualityOpen, () => setIsQualityOpen(false))

    // 'video' rows download MP4 through handleDownload, 'audio' rows download MP3
    // through handleAudioDownload. The queue carries the mode so one playlist run
    // stays in the format it was started in.
    const [downloadMode, setDownloadMode] = useState('video')
    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false)
    const startMenuRef = useRef(null)

    // Header for the fetched playlist (title, channel, count) and how much of a long
    // list is currently mounted.
    const [playlistInfo, setPlaylistInfo] = useState(null)
    const [renderedCount, setRenderedCount] = useState(RENDER_CHUNK)

    useDismissOnOutsideClick(startMenuRef, isStartMenuOpen, () => setIsStartMenuOpen(false))

    const { language } = useLanguage()

    // The controls (label + headline + input + buttons) are held at the vertical centre
    // of the first screen by a spacer whose height is measured here. Reading the real
    // height keeps that hold correct at every breakpoint and in every language, and
    // because the spacer ignores the results it never moves once a playlist has loaded.
    const heroIntroRef = useRef(null)
    const [heroTopSpacer, setHeroTopSpacer] = useState(0)

    // Follow Us + Scroll to explore: fixed to the bottom corners of the *viewport* so
    // they stay put while the playlist grows the hero. They only exist while the hero
    // still fills the screen, so they fade out instead of floating over Features/Footer.
    const heroRef = useRef(null)
    const [isSocialRowVisible, setIsSocialRowVisible] = useState(true)

    useEffect(() => {
        const hero = heroRef.current
        if (!hero) return

        const update = () => {
            // The hero's end has entered the viewport: nothing but the hero is on screen
            // below, so the hint would start covering the next section.
            setIsSocialRowVisible(hero.getBoundingClientRect().bottom >= window.innerHeight - 1)
        }

        update()
        window.addEventListener('scroll', update, { passive: true })
        window.addEventListener('resize', update)
        // The hero resizes when a playlist (or a thumbnail) loads, which changes whether
        // the row should still be there.
        const observer = new ResizeObserver(update)
        observer.observe(hero)

        return () => {
            window.removeEventListener('scroll', update)
            window.removeEventListener('resize', update)
            observer.disconnect()
        }
    }, [])

    useLayoutEffect(() => {
        const node = heroIntroRef.current
        if (!node) return

        const measure = () => {
            const introHeight = node.getBoundingClientRect().height
            setHeroTopSpacer(Math.max(0, (window.innerHeight - introHeight) / 2))
        }

        measure()
        window.addEventListener('resize', measure)
        // Re-measure when the block itself resizes (breakpoint change, language switch).
        const observer = new ResizeObserver(measure)
        observer.observe(node)

        return () => {
            window.removeEventListener('resize', measure)
            observer.disconnect()
        }
    }, [])

    // The playlist panel shows ten rows and scrolls the rest. Its cap is derived from a
    // real row instead of the viewport, so the panel is the same size on any screen and
    // never grows with the playlist.
    const resultsListRef = useRef(null)
    const [listMaxHeight, setListMaxHeight] = useState(undefined)

    useLayoutEffect(() => {
        const list = resultsListRef.current
        const firstRow = list?.firstElementChild
        if (!firstRow) {
            setListMaxHeight(undefined)
            return
        }

        const ROWS = 10
        const GAP_PX = 24 // matches gap-y-6 below

        const update = () => {
            const rowHeight = firstRow.getBoundingClientRect().height
            if (!rowHeight) return
            const next = Math.round(rowHeight * ROWS + GAP_PX * (ROWS - 1))
            // Ignore sub-pixel churn so the observer cannot feed back into itself.
            setListMaxHeight(prev => (prev !== undefined && Math.abs(prev - next) < 2 ? prev : next))
        }

        update()
        // The first row settles once its thumbnail loads, so keep watching its height.
        const observer = new ResizeObserver(update)
        observer.observe(firstRow)
        return () => observer.disconnect()
    }, [videos])

    // Automatically trigger the download of the first video
    useEffect(() => {
        if (currentIndex !== null && currentIndex < videos.length) {
            videoRefs.current[currentIndex]?.handleDownload();
        }
    }, [currentIndex]);


    // Everything downloads through one queue so two muxes never run at once. The row
    // menus choose the scope, the Start Download menu chooses the format.

    // "This video and everything after it"
    const startDownloadsFromIndex = (startIndex, mode = 'video') => {
        setDownloadMode(mode);
        setDownloadQueue(videos.slice(startIndex).map((_, i) => startIndex + i));
    };

    // "Only this video": the same pipeline with a single entry, so a one-off download
    // cannot end up muxing alongside a playlist download.
    const startSingleDownload = (index, audio = false) => {
        setDownloadMode(audio ? 'audio' : 'video');
        setDownloadQueue([index]);
    };

    // The whole playlist, in the chosen format
    const startDownload = (mode = 'video') => {
        setDownloadMode(mode);
        setDownloadQueue(videos.map((_, index) => index));
    };

    // Process next download whenever the queue changes
    const dispatchedRef = useRef(null) // row already handed to the queue

    useEffect(() => {
        if (downloadQueue.length === 0) {
            dispatchedRef.current = null;
            return;
        }

        const nextIndex = downloadQueue[0];

        // A playlist-wide run reaches rows that are still outside the mounted chunk.
        // Mount that row and let this effect run again once it exists.
        if (!videoRefs.current[nextIndex]) {
            setRenderedCount(count => Math.max(count, nextIndex + 1));
            return;
        }

        // This effect also re-runs when the mounted window grows, so remember the row
        // already handed over; re-dispatching it would restart its progress display.
        if (dispatchedRef.current === nextIndex) return;
        dispatchedRef.current = nextIndex;

        setActiveDownload(nextIndex);

        const row = videoRefs.current[nextIndex];
        if (downloadMode === 'audio') row.handleAudioDownload();
        else row.handleDownload();
    }, [downloadQueue, downloadMode, renderedCount]); // Runs when `downloadQueue` updates


    // Only the row at the head of the queue advances it. A one-off download started by
    // hand on some other row must not consume the next video in a running playlist.
    const handleComplete = (index) => {
        setDownloadQueue(prev => (prev.length > 0 && prev[0] === index ? prev.slice(1) : prev));
    };

    // Mount the next chunk once the panel is scrolled near its end. The panel is a
    // fixed-height scroll container, so this reads as loading more as you scroll.
    const handleListScroll = (event) => {
        const list = event.currentTarget;
        if (list.scrollTop + list.clientHeight < list.scrollHeight - LOAD_AHEAD_PX) return;
        setRenderedCount(count => (count >= videos.length ? count : Math.min(videos.length, count + RENDER_CHUNK)));
    };

    // A playlist can hold more entries than the API hands back (deleted or private
    // videos are skipped), so say so rather than implying the count is the whole list.
    const videoCountLabel = playlistInfo?.itemCount && playlistInfo.itemCount > videos.length
        ? `${videos.length} of ${playlistInfo.itemCount} videos`
        : `${videos.length} ${videos.length === 1 ? 'video' : 'videos'}`;


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
        // Read the field directly instead of from state: keeping the URL out of
        // component state is what stops every keystroke re-rendering the hero
        // (and with it the spark field and the background morph).
        const url = urlInputRef.current?.value.trim() || "";
        if (!url) return;
        setIsLoading(true);
        setVideos([]);
        setPlaylistInfo(null);
        setRenderedCount(RENDER_CHUNK);
        setErrorMessage("");

        try {
            const { listId, videoId } = parseYouTubeInput(url);

            // Both routes answer with a video list plus the header fields, so the panel
            // gets its title, channel and count the same way either way. A single video
            // has no playlist, so its own title stands in for one.
            const applyResponse = (data) => {
                setVideos(data.videos || []);
                setRenderedCount(RENDER_CHUNK);
                setPlaylistInfo(
                    data.playlist ||
                    (data.videos?.[0]
                        ? { title: data.videos[0].title, channel: data.channel || '', itemCount: 1 }
                        : null)
                );
            };

            if (listId) {
                const response = await axios.get(`http://localhost:3000/api/playlist/${listId}`);
                applyResponse(response.data);
                if (!response.data.videos?.length) {
                    setErrorMessage("This playlist has no downloadable videos.");
                }
            } else if (videoId) {
                const response = await axios.get(`http://localhost:3000/api/video/${videoId}`);
                applyResponse(response.data);
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
            {/* min-h-screen (not h-screen): the hero is allowed to grow past the first
                screen so a long playlist has room. That pushes whatever follows the hero
                down the page instead of squeezing the results into the viewport. */}
            <div ref={heroRef} className='bg-default-gradient min-h-screen flex flex-col items-center text-center relative z-0 overflow-hidden'>
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
                {/* Anchored to the middle of the first screen (50vh) rather than the hero's
                    vertical middle: a loaded playlist grows the hero to several screens, and
                    top-1/2 dragged this blob down into the results with it. */}
                <svg
                    className="absolute z-0 top-[50vh] left-0 -translate-x-1/3 -translate-y-1/3"
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

                {/* Holds the controls at the vertical centre of the first screen. Its height
                    comes from JS so it stays right across breakpoints and languages, and it
                    ignores the results on purpose - that is what keeps the controls in place
                    while a long playlist grows the hero downwards. */}
                <div style={{ height: heroTopSpacer }} aria-hidden='true'></div>

                <div ref={heroIntroRef} className='z-50 w-full flex flex-col items-center'>
                    <p className='text-white z-50'>{dictionary[language].stream[0]} <span className='px-2 py-1 bg-white bg-opacity-20 rounded-full'><FontAwesomeIcon color='#72ffce' icon={faDownload} /> {dictionary[language].stream[1]}</span></p>
                    <div className='z-50 w-full justify-center items-center flex flex-col space-y-6 px-2'>
                        <h1 className='text-3xl xl:text-6xl lg:text-4xl font-bold gradient-text hero-title-glow'>{dictionary[language].headline[0]}<br />{dictionary[language].headline[1]}</h1>
                        <div className='flex items-center gap-1 bg-white xl:w-7/12 w-full sm:w-10/12 lg:w-8/12 rounded-full p-1.5 pl-2 pr-2.5 ring-1 ring-white/25 shadow-lg shadow-black/30 transition-shadow duration-300 focus-within:ring-2 focus-within:ring-[#72ffce]/60 focus-within:shadow-[0_0_45px_-8px_rgba(114,255,206,0.6)]'>
                            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5'>
                                <FontAwesomeIcon icon={faSearch} color="#000" className='text-lg xl:text-xl opacity-60' />
                            </div>
                            <input
                                ref={urlInputRef}
                                defaultValue=""
                                type="text"
                                className='z-50 h-11 flex-1 min-w-0 bg-transparent px-2 xl:px-3 text-black text-sm xl:text-lg outline-none placeholder:text-black/40'
                                placeholder={`${dictionary[language].placeholder} 😉`}
                            />
                            <button
                                type='button'
                                onClick={() => {
                                    if (urlInputRef.current) {
                                        urlInputRef.current.value = "";
                                        urlInputRef.current.focus();
                                    }
                                }}
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
                    </div>
                </div>

                {/* The results sit under the controls in normal flow and are sized by their
                    content, so a long playlist makes the hero taller (pushing the section
                    below down) instead of being capped to the viewport or moving the
                    controls above. */}
                <div className='z-50 w-full flex flex-col items-center px-2 pb-24'>
                    {videos.length > 0 && (
                        <>
                            {playlistInfo && (
                                <div className='mt-10 flex w-full items-center gap-4 rounded-2xl border border-[#72ffce]/15 bg-[#08130f]/60 p-4 text-left lg:w-3/5 xl:w-[54%] 2xl:w-[46%]'>
                                    <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#72ffce]/15'>
                                        <FontAwesomeIcon icon={faListUl} className='text-[#a7ffe2]' />
                                    </span>
                                    <div className='min-w-0 flex-1'>
                                        <p className='truncate font-semibold text-white'>{playlistInfo.title}</p>
                                        <p className='truncate text-xs text-white/55'>
                                            {[playlistInfo.channel, videoCountLabel].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                    {renderedCount < videos.length && (
                                        <span className='shrink-0 text-xs text-[#72ffce]/80'>Showing {renderedCount} of {videos.length}</span>
                                    )}
                                </div>
                            )}
                            <div ref={startMenuRef} className='relative mt-8'>
                                <button
                                    type='button'
                                    onClick={() => setIsStartMenuOpen(open => !open)}
                                    aria-expanded={isStartMenuOpen}
                                    aria-haspopup='menu'
                                    className='flex items-center gap-3 rounded-full bg-[#72ffce] px-10 py-2.5 text-lg font-semibold text-black shadow-[0_0_26px_-6px_#72ffce] transition-colors duration-300 hover:bg-[#a7ffe2]'
                                >
                                    <span>Start Download</span>
                                    <FontAwesomeIcon icon={faChevronDown} className={`text-sm transition-transform duration-200 ${isStartMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                    {/* Centred with a negative margin rather than -translate-x-1/2: the
                                        entrance animation writes its own transform, which would
                                        replace a class-based translate. */}
                                    {isStartMenuOpen &&
                                        <motion.div
                                            initial={{ y: '-6px', opacity: 0, scale: 0.97 }}
                                            animate={{ y: '0', opacity: 1, scale: 1 }}
                                            exit={{ y: '-6px', opacity: 0, scale: 0.97 }}
                                            transition={{ duration: 0.16, ease: 'easeOut' }}
                                            className='absolute left-1/2 top-full z-50 mt-2 -ml-32 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#08130f]/90 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl'
                                        >
                                            {DOWNLOAD_ALL_OPTIONS.map((option) => (
                                                <button
                                                    key={option.mode}
                                                    type='button'
                                                    onClick={() => { startDownload(option.mode); setIsStartMenuOpen(false) }}
                                                    className='flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[#72ffce]/10'
                                                >
                                                    <FontAwesomeIcon icon={option.icon} className='mt-0.5 text-sm text-[#a7ffe2]' />
                                                    <span className='flex-1'>
                                                        <span className='block text-sm text-white'>{option.label}</span>
                                                        <span className='block text-xs text-white/45'>{option.hint}</span>
                                                    </span>
                                                </button>
                                            ))}
                                        </motion.div>}
                                </AnimatePresence>
                            </div>
                            <div
                                ref={resultsListRef}
                                onScroll={handleListScroll}
                                style={{ maxHeight: listMaxHeight }}
                                className='mt-5 w-full lg:w-3/5 xl:w-[54%] 2xl:w-[46%] flex custom-scrollbar flex-col gap-y-6 overflow-y-auto'
                            >
                                {videos.slice(0, renderedCount).map((video, index) => (
                                    <Video
                                        key={index}
                                        ref={(el) => (videoRefs.current[index] = el)}
                                        onComplete={() => handleComplete(index)}
                                        title={video.title} thumbnail={video.thumbnail} videoId={video.videoId}
                                        quality={quality}
                                        onDownloadOnly={() => startSingleDownload(index)}
                                        onQueueAfter={() => startDownloadsFromIndex(index)}
                                        onAudioDownloadOnly={() => startSingleDownload(index, true)}
                                        onAudioQueueAfter={() => startDownloadsFromIndex(index, 'audio')}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Fixed to the bottom corners of the viewport - Follow Us on the left, Scroll to
                    explore on the right - so neither a taller hero nor scrolling can move them.
                    The wrapper is click-through; only the two groups take clicks, so the rows
                    behind it stay usable. */}
                <div className={`fixed inset-x-0 bottom-0 z-50 flex pointer-events-none transition-[opacity,visibility] duration-300 ${isSocialRowVisible ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                    <div className='w-full flex justify-between xl:px-36 px-3 sm:px-10 lg:px-20 pb-8'>
                        <div className="flex gap-2 pointer-events-auto">
                            <p className='text-white hidden xl:block'>{dictionary[language].followus}</p>
                            <div className='flex text-white items-center space-x-1'>
                                <FontAwesomeIcon className='bg-white rounded-full p-1 cursor-pointer' icon={faFacebook} color='black' />
                                <FontAwesomeIcon className='bg-white rounded-full p-1 cursor-pointer' icon={faInstagram} color='black' />
                                <FontAwesomeIcon className='bg-white rounded-full p-1 cursor-pointer' icon={faWhatsapp} color='black' />
                                <FontAwesomeIcon className='bg-white rounded-full p-1 cursor-pointer' icon={faXTwitter} color='black' />
                            </div>
                        </div>
                        <div className='flex items-center space-x-1 text-white pointer-events-auto'>
                            <p><span className="font-medium">{ isMobileOrTablet?  dictionary[language].swipe : dictionary[language].scroll }</span> {dictionary[language].explore }</p><FontAwesomeIcon color='#72ffce' icon={faArrowDown} />
                        </div>
                    </div>
                </div>
                {SPARK_FIELD}
                <Media />
            </div>
        </div>
    )
}

export default Home
