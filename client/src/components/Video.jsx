import React from 'react'
import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { faChevronDown, faCircleCheck, faDownload, faListUl, faPause, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AnimatePresence, motion } from 'framer-motion';
import {
    MAX_BROWSER_BYTES,
    TOO_LARGE,
    audioToMp3,
    createTransferControl,
    downloadAudioOnly,
    downloadMedia,
    formatBytes,
    muxToMp4,
    sanitizeFilename,
    saveBlob,
} from '../lib/browserDownload';
import {
    selectAudioFormat,
    selectVideoFormatThatFits,
    totalBytes,
} from '../lib/formatSelection';
import { fallbackNotice, qualityOption, resolveVideoQuality } from '../lib/quality';
import { useDismissOnOutsideClick } from '../lib/useDismissOnOutsideClick';
import { API } from '../lib/api';

// Shared by both entries of the row's download menu. Mirrors the hero's quality selector
// so the two menus read as the same control.
const MENU_ITEM =
    'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/75 transition-colors duration-150 hover:bg-[#72ffce]/10 hover:text-white';

// Every aborted fetch surfaces as an AbortError, and a stop raised between two
// stages is built to look the same, so one check covers both.
const isAbort = (error) => error?.name === 'AbortError' || !!error?.aborted;
const stopError = () => new DOMException('The download was stopped', 'AbortError');


const Video = forwardRef(({ title, thumbnail, videoId, duration, quality, onComplete, onStopped, hasQueueAfter, onDownloadOnly, onQueueAfter, onAudioDownloadOnly, onAudioQueueAfter }, ref) => {


    /***Download information */
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState('')
    const [size, setSize] = useState({ downloaded: '', total: '' });
    const [eta, setEta] = useState('');
    const [progressText, setProgressText] = useState('Waiting for download...');
    // True once the file has been handed to the browser. The row keeps this final
    // status instead of sitting on "Saving file..." after the download is over.
    const [completed, setCompleted] = useState(false);
    // The card itself, handed to the playlist so a button can scroll the panel to
    // whichever row is downloading.
    const cardRef = useRef(null);
    // Pause/resume/stop for the transfer in flight. It lives in a ref because it is
    // never rendered - it is the object the download functions talk to.
    const controlRef = useRef(null);
    const [paused, setPaused] = useState(false);
    // 'network' while bytes are moving (pausable and stoppable), 'processing' while
    // ffmpeg or the server is finishing the file (stoppable only - neither can be
    // held half way), 'idle' otherwise.
    const [stage, setStage] = useState('idle');
    // Stopping this video and stopping the whole run are different enough to ask,
    // but only when there is a run to stop.
    const [stopPrompt, setStopPrompt] = useState(false);
    // The line to put back when a pause is released (it differs between MP3 and MP4).
    const transferTextRef = useRef('');
    // Shown inline instead of an alert(): a modal alert would freeze the whole
    // playlist queue until it was dismissed.
    const [error, setError] = useState('');
    // Non-fatal information, e.g. "the browser could not merge this one, the
    // server finished it instead".
    const [notice, setNotice] = useState('');
    // Reasons accumulate instead of overwriting: a quality fallback and a
    // browser-size fallback can both apply to the same download, and showing
    // only the last one hides the other.
    const addNotice = (text) => setNotice((prev) => (prev ? `${prev} ${text}` : text));
    const [downloading, setDownloading] = useState({
        status: false,
        type: '', // 'video', 'audio', or 'merge'
        progress: 0
    });
    // Per-row menus: download just this video/audio, or this one and everything below.
    const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
    const downloadMenuRef = useRef(null);

    const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
    const audioMenuRef = useRef(null);

    useDismissOnOutsideClick(downloadMenuRef, isDownloadMenuOpen, () => setIsDownloadMenuOpen(false));
    useDismissOnOutsideClick(audioMenuRef, isAudioMenuOpen, () => setIsAudioMenuOpen(false));



    // Metadata for the current video: title plus every downloadable format.
    const fetchFormats = async () => {
        const response = await fetch(`${API}/videoInfo?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    };

    // Every byte-moving stage goes through this, so the pause button is only ever
    // offered while there is a stream that can actually be held.
    const startTransfer = (text) => {
        transferTextRef.current = text;
        setStage('network');
        setProgressText(text);
    };

    // A stage that cannot be held any more releases a pause pressed a moment too
    // late, rather than leaving the row claiming to be paused while it merges.
    const beginProcessing = () => {
        controlRef.current?.resume();
        setPaused(false);
        setStage('processing');
    };

    // Pause holds the stream where it is; resume carries on with the same one.
    const togglePause = () => {
        const control = controlRef.current;
        if (!control) return;
        if (control.paused) {
            control.resume();
            setPaused(false);
            setProgressText(transferTextRef.current || 'Downloading...');
        } else {
            control.pause();
            setPaused(true);
            setProgressText('Paused');
        }
    };

    // Nothing else is waiting, so "stop" can only mean this one video: asking would
    // be a click with no decision behind it.
    const requestStop = () => {
        if (!hasQueueAfter) doStop('one');
        else setStopPrompt(true);
    };

    const doStop = (scope) => {
        setStopPrompt(false);
        controlRef.current?.stop();
        setProgressText('Stopping...');
        // Whether the rest of the run ends with this video is the playlist's call to
        // make, not this row's.
        onStopped?.(scope);
    };

    // A stopped transfer reaches the same catch as a failure. It is not one, so the
    // row says so instead of showing an error banner.
    const reportStopped = () => {
        console.info('[download] stopped on request');
        transferTextRef.current = '';
        setProgress(0);
        setSize({ downloaded: '', total: '' });
        setSpeed('');
        setEta('');
        setCompleted(false);
        setProgressText('Download stopped');
    };

    // Audio-only download: pulls just the audio stream, re-encodes it to mp3
    // and saves that. No video, and no mux step - there is only one stream.
    const handleAudioDownload = async () => {
        if (downloading.status) return;
        setError('');
        setNotice('');
        setProgressText("Starting audio download...");
        setCompleted(false);
        setPaused(false);
        setStopPrompt(false);
        setStage('idle');
        setProgress(0);
        setSize({ downloaded: '', total: '' });
        setSpeed('');
        setEta('');
        const control = createTransferControl();
        controlRef.current = control;
        setDownloading(prev => ({ ...prev, status: true, type: 'audio' }));

        try {
            const data = await fetchFormats();
            const audioFormat = selectAudioFormat(data.formats);

            if (!audioFormat) throw new Error('Could not find a suitable audio format');
            if (!audioFormat.url) throw new Error('The server did not return a direct media URL for this format');

            startTransfer("Downloading audio...");
            const audioData = await downloadAudioOnly({
                audioUrl: audioFormat.url,
                control,
                expectedSize: audioFormat.filesizeBytes,
                onProgress: ({ percent, downloaded, total, speed: rate, eta }) => {
                    setProgress(percent);
                    setSize({ downloaded, total });
                    setSpeed(rate);
                    setEta(eta);
                },
            });

            // The stream arrives as AAC, which has to be re-encoded: the
            // download is already complete and playable, so a failed conversion
            // is not worth losing it over - keep the m4a and say why.
            setProgressText("Converting to MP3...");
            beginProcessing();
            setProgress(0);
            setSize({ downloaded: '', total: '' });
            setSpeed('');
            setEta('');

            const label = sanitizeFilename(data.title);
            let blob;
            let filename = `${label}.mp3`;
            try {
                blob = await audioToMp3({ audioData, onProgress: setProgress });
            } catch (conversionError) {
                console.warn('[audio] mp3 conversion failed, saving the original m4a:', conversionError);
                addNotice(`Could not convert this one to MP3 (${conversionError.message}), so it was saved as M4A instead.`);
                blob = new Blob([audioData], { type: 'audio/mp4' });
                filename = `${label}.m4a`;
            }

            beginProcessing();
            // Stopping during the conversion cannot interrupt ffmpeg, so the check is
            // made here instead: the file is dropped rather than saved.
            if (control.stopped) throw stopError();
            setProgressText("Saving file...");
            setProgress(100);
            setSpeed('');
            setEta('');
            saveBlob(blob, filename);
            // saveBlob is synchronous: by the time it returns the browser already has
            // the file, so the row can say so rather than staying on the save step.
            setProgressText("Download complete");
            setCompleted(true);
        } catch (error) {
            if (control.stopped || isAbort(error)) {
                reportStopped();
            } else {
                console.error('Audio download error:', error);
                setError(error.message || 'Audio download failed');
            }
        } finally {
            setStage('idle');
            setPaused(false);
            setStopPrompt(false);
            controlRef.current = null;
            setDownloading({ status: false, type: '', progress: 0 });
            // Keeps a playlist-wide MP3 run advancing. A one-off audio download either
            // finds the queue empty or another row at its head, and leaves it alone.
            onComplete();
        }
    };

    const handleDownload = async () => {
        // The playlist queue and the row buttons both call this, and two muxes
        // at once would share one ffmpeg instance.
        if (downloading.status) return;
        setProgressText("Starting download...")
        setCompleted(false);
        setPaused(false);
        setStopPrompt(false);
        setStage('idle');
        setError('');
        setNotice('');
        const control = createTransferControl();
        controlRef.current = control;
        setDownloading(prev => ({ ...prev, status: true, type: 'video+audio' }));
        try {
            // 1. Fetch video metadata to pick formats
            const data = await fetchFormats();

            // The requested quality decides the starting format; when the video
            // has nothing at that resolution the resolver reports what it fell
            // back to, which is surfaced below rather than silently applied.
            const resolution = resolveVideoQuality(data.formats, quality);
            let preferredVideoFormat = resolution.format;
            const qualityFallback = fallbackNotice(resolution);
            if (qualityFallback) addNotice(qualityFallback);

            const preferredAudioFormat = selectAudioFormat(data.formats);

            if (!preferredVideoFormat || !preferredAudioFormat) {
                const missing = [];
                if (!preferredVideoFormat) missing.push("video");
                if (!preferredAudioFormat) missing.push("audio");
                throw new Error(`Could not find suitable ${missing.join(" and ")} format(s)`);
            }

            if (!preferredVideoFormat.url || !preferredAudioFormat.url) {
                throw new Error('The server did not return direct media URLs for these formats');
            }

            // 2. Pick the stream to download. yt-dlp gives exact byte sizes, so
            //    a video this tab cannot merge is spotted up front rather than
            //    after a failed attempt.
            const label = sanitizeFilename(data.title);
            const audioBytes = preferredAudioFormat.filesizeBytes || 0;
            let browserBytes = totalBytes([preferredVideoFormat, preferredAudioFormat]);
            let blob;

            // A video above the limit does not have to leave the browser: the
            // same video exists at lower resolutions, and a smaller one can be
            // downloaded and merged here. Only when nothing fits at all does
            // the server take over.
            if (browserBytes > MAX_BROWSER_BYTES) {
                // `below` bounds the search by the quality that was actually
                // asked for. Without it the size fallback picks the largest
                // resolution that fits, which can sit *above* the request when
                // a higher-resolution format happens to encode smaller.
                const smaller = selectVideoFormatThatFits(data.formats, audioBytes, MAX_BROWSER_BYTES, preferredVideoFormat);
                if (smaller) {
                    const smallerBytes = totalBytes([smaller, preferredAudioFormat]);
                    console.info(`[download] ${formatBytes(browserBytes)} exceeds the ${formatBytes(MAX_BROWSER_BYTES)} browser limit; downloading ${smaller.quality} (${formatBytes(smallerBytes)}) in the browser instead`);
                    addNotice(`${formatBytes(browserBytes)} is over the ${formatBytes(MAX_BROWSER_BYTES)} browser merge limit, so this one downloads at ${smaller.quality} (${formatBytes(smallerBytes)}) instead.`);
                    preferredVideoFormat = smaller;
                    browserBytes = smallerBytes;
                }
            }

            // Both streams are pulled in parallel through the server relay
            // (~zero server CPU) and muxed here.
            const downloadInBrowser = async (videoFormat) => {
                startTransfer("Downloading video + audio...");
                const { videoData, audioData } = await downloadMedia({
                    videoUrl: videoFormat.url,
                    audioUrl: preferredAudioFormat.url,
                    videoSize: videoFormat.filesizeBytes,
                    audioSize: preferredAudioFormat.filesizeBytes,
                    control,
                    onProgress: ({ percent, downloaded, total, speed: rate, eta }) => {
                        setProgress(percent);
                        setSize({ downloaded, total });
                        setSpeed(rate);
                        setEta(eta);
                    },
                });

                setProgressText("Merging video and audio...");
                beginProcessing();
                setProgress(0);
                setSize({ downloaded: '', total: '' });
                setSpeed('');
                setEta('');

                return muxToMp4({
                    videoData,
                    audioData,
                    onProgress: setProgress,
                });
            };

            if (browserBytes > MAX_BROWSER_BYTES) {
                console.info(`[download] ${formatBytes(browserBytes)} exceeds the ${formatBytes(MAX_BROWSER_BYTES)} browser limit and nothing smaller fits; using the server`);
                addNotice(`This video is ${formatBytes(browserBytes)} and no smaller version fits the ${formatBytes(MAX_BROWSER_BYTES)} browser merge limit, so the server downloaded and merged it.`);

                blob = await downloadOnServer({
                    videoItag: preferredVideoFormat.itag,
                    audioItag: preferredAudioFormat.itag,
                });
            } else {
                try {
                    blob = await downloadInBrowser(preferredVideoFormat);
                } catch (browserError) {
                    // A stop must not read as a browser failure: without this the
                    // server would be asked to download what was just cancelled.
                    if (control.stopped) throw browserError;
                    // yt-dlp leaves the size out for some formats, so a stream
                    // can turn out to be over the limit only once it is already
                    // arriving. One retry at a lower resolution keeps the
                    // download in the browser; after that the server finishes it.
                    const smaller = browserError.code === TOO_LARGE
                        ? selectVideoFormatThatFits(data.formats, audioBytes, MAX_BROWSER_BYTES, preferredVideoFormat)
                        : null;

                    let failure = browserError;
                    let retriedAt = '';

                    if (smaller) {
                        console.info(`[download] ${browserError.message}; retrying at ${smaller.quality} in the browser`);
                        retriedAt = smaller.quality;
                        try {
                            blob = await downloadInBrowser(smaller);
                        } catch (retryError) {
                            // Same rule as above: a stop is not a retry that failed,
                            // so it must not land on the server either.
                            if (control.stopped || isAbort(retryError)) throw retryError;
                            failure = retryError;
                            retriedAt = '';
                        }
                    }

                    if (!blob) {
                        // In-browser merging can be stopped by things the page
                        // cannot fix: a stream it could not fetch, a codec the
                        // mp4 muxer refuses, or a video with no version small
                        // enough for wasm memory. The server pipeline can always
                        // finish it, so use that rather than failing the
                        // download (and stalling the playlist).
                        const tooLarge = failure.code === TOO_LARGE;
                        if (tooLarge) {
                            console.info('[download] nothing small enough for the browser; using the server:', failure.message);
                        } else {
                            console.warn('[download] browser pipeline failed, merging on the server:', failure);
                        }
                        addNotice(tooLarge
                            ? `${failure.message} and no smaller version fits - the server downloaded and merged it.`
                            : `Browser merge failed (${failure.message}) - the server finished this one.`);

                        blob = await downloadOnServer({
                            videoItag: preferredVideoFormat.itag,
                            audioItag: preferredAudioFormat.itag,
                        });
                    } else if (retriedAt) {
                        addNotice(`This one was too large for the browser, so it downloaded at ${retriedAt} instead.`);
                    }
                }
            }

            setStage('processing');
            if (control.stopped) throw stopError();
            setProgressText("Saving file...");
            setProgress(100);
            setSpeed('');
            setEta('');
            saveBlob(blob, `${label}.mp4`);
            // saveBlob is synchronous: the file is in the browser's hands by now, so the
            // row reports the finished state instead of holding on "Saving file...".
            setProgressText("Download complete");
            setCompleted(true);
            console.log('Download complete');

        } catch (error) {
            if (control.stopped || isAbort(error)) {
                reportStopped();
            } else {
                console.error('Download error:', error);
                // Inline, not alert(): the queue must keep advancing unattended.
                setError(error.message || 'Download failed');
            }
        } finally {
            setStage('idle');
            setPaused(false);
            setStopPrompt(false);
            controlRef.current = null;
            setDownloading({ status: false, type: '', progress: 0 });
            onComplete();
        }
    };

    // Fallback for anything the browser cannot finish (too large for wasm
    // memory, a stream it could not fetch, a codec ffmpeg.wasm refuses): the
    // server downloads, merges and streams the finished file back.
    const downloadOnServer = async ({ videoItag, audioItag }) => {
        // The server assembles this one, so there are no bytes here to hold: it can
        // be stopped, not paused.
        setStage('processing');
        setProgressText("Merging on the server...");
        setProgress(0);
        setSize({ downloaded: '', total: '' });
        setSpeed('');
        setEta('');

        const response = await fetch(
            `${API}/download/full?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}&videoItag=${videoItag}&audioItag=${audioItag}&quality=${encodeURIComponent(quality)}`,
            { signal: controlRef.current?.signal }
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Download failed' }));
            throw new Error(err.error || 'Download failed');
        }

        // The server re-resolves the formats itself when the itags it was given
        // no longer exist, so it reports what it actually delivered. 'best'
        // names no resolution to miss, so only a specific request is compared.
        const delivered = response.headers.get('X-Delivered-Quality');
        const requested = qualityOption(quality);
        if (delivered && requested.height && delivered !== requested.label) {
            addNotice(`The server could not use ${requested.label} for this video and delivered ${delivered} instead.`);
        }

        setProgressText("Saving file...");
        return response.blob();
    };

    useImperativeHandle(ref, () => ({
        handleDownload,
        // The playlist queue reaches for this one when the run was started in audio mode.
        handleAudioDownload,
        // The playlist reads this to scroll the panel to whichever row is running.
        getElement: () => cardRef.current
    }));

    return (
        <div ref={cardRef} className='playlist-card flex gap-x-5 w-full text-left rounded-2xl border border-[#72ffce]/15 bg-[#08130f]/70 p-4 shadow-[0_18px_40px_-26px_rgba(0,0,0,0.95)] transition-colors duration-300 hover:border-[#72ffce]/40 hover:bg-[#08130f]/90'>
            <div className='shrink-0 self-start overflow-hidden rounded-xl ring-1 ring-white/10'>
                {/* decoding=async plus lazy loading: a long playlist is hundreds of
                    thumbnails, and decoding them all up front is what made scrolling
                    stutter even when the rows themselves were cheap to paint. */}
                <img src={thumbnail} alt={title} loading='lazy' decoding='async' className='w-60 rounded-xl' />
            </div>
            <div className='flex min-w-0 justify-between flex-col flex-1'>
                <div>
                    <h3 className='text-white font-semibold text-base leading-snug sm:text-lg line-clamp-2'>{title}</h3>
                    {/* The length comes from the API; a row whose lookup failed simply
                        drops the clock rather than showing a made-up one. */}
                    {duration && <h3 className='mt-1 text-xs text-[#a7ffe2]/70'>{duration}</h3>}
                </div>
                <div className='w-full'>
                    <h3 className={`flex items-center gap-2 text-xs uppercase tracking-[0.14em] ${completed ? 'text-[#72ffce]' : 'text-[#a7ffe2]/80'}`}>
                        {completed && <FontAwesomeIcon icon={faCircleCheck} />}
                        {progressText}
                    </h3>
                    <div className='mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10'>
                        <div className="relative h-full rounded-full bg-gradient-to-r from-[#16b98c] to-[#72ffce] shadow-[0_0_14px_#72ffce80]" style={{
                            width: `${progress}%`,
                            height: '100%',
                            transition: 'width 0.2s ease-in-out'
                        }}>
                            {/* Shining effect */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <div className="shining-effect"></div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between text-[11px] text-white/55">
                        <p>
                            {progress.toFixed(1)}%
                            {size.total ? ` · ${size.downloaded ? `${size.downloaded} / ` : ''}${size.total}` : ''}
                        </p>
                        <p>{speed}{eta ? ` · ETA ${eta}` : ''}</p>
                    </div>
                    {error && <p className="mt-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">{error}</p>}
                    {notice && <p className="mt-2 rounded-lg border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200">{notice}</p>}
                    {/* Pause and Stop for the transfer in flight. Pause only exists while
                        bytes are moving: a merge or a server-side assembly cannot be held
                        half way, and a button that did nothing would be worse than none. */}
                    <AnimatePresence>
                        {downloading.status && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                className='mt-3 flex flex-wrap items-center gap-2'
                            >
                                {stage === 'network' && (
                                    <button
                                        type='button'
                                        onClick={togglePause}
                                        className='flex items-center gap-2 rounded-full border border-[#72ffce]/35 px-3.5 py-1.5 text-xs font-medium text-[#a7ffe2] transition-colors duration-150 hover:border-[#72ffce]/70 hover:bg-[#72ffce]/10 hover:text-white'
                                    >
                                        <FontAwesomeIcon icon={paused ? faPlay : faPause} className='text-[11px]' />
                                        <span>{paused ? 'Resume' : 'Pause'}</span>
                                    </button>
                                )}
                                <button
                                    type='button'
                                    onClick={requestStop}
                                    className='flex items-center gap-2 rounded-full border border-red-400/35 px-3.5 py-1.5 text-xs font-medium text-red-200 transition-colors duration-150 hover:border-red-400/70 hover:bg-red-500/10 hover:text-white'
                                >
                                    <FontAwesomeIcon icon={faStop} className='text-[11px]' />
                                    <span>Stop</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {/* Stopping one video and stopping the whole run are different enough
                        to ask, but inline: a modal would sit over the playlist the rest of
                        the run has to keep working through. */}
                    <AnimatePresence>
                        {stopPrompt && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                className='mt-3 rounded-xl border border-red-400/25 bg-red-500/10 p-3'
                            >
                                <p className='text-xs text-red-200'>Stop this download?</p>
                                <div className='mt-2 flex flex-wrap gap-2'>
                                    <button
                                        type='button'
                                        onClick={() => doStop('one')}
                                        className='rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white'
                                    >
                                        Just this one
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => doStop('all')}
                                        className='rounded-full bg-red-500/80 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 hover:bg-red-500'
                                    >
                                        Stop the whole run
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => setStopPrompt(false)}
                                        className='rounded-full px-3 py-1.5 text-xs font-medium text-white/50 transition-colors duration-150 hover:text-white'
                                    >
                                        Keep downloading
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div className="mt-4 flex gap-x-3">
                    <div ref={audioMenuRef} className="relative flex-1">
                        <button
                            type='button'
                            onClick={() => setIsAudioMenuOpen(open => !open)}
                            aria-expanded={isAudioMenuOpen}
                            aria-haspopup='menu'
                            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#72ffce] px-4 py-2 text-sm font-semibold text-black shadow-[0_0_22px_-6px_#72ffce] transition-colors duration-300 hover:bg-[#a7ffe2]"
                        >
                            <span>Download MP3</span>
                            <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform duration-200 ${isAudioMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {/* Mirrors the MP4 menu, but stays inside the card so it is never
                            clipped by the list's overflow-y-auto. */}
                        <AnimatePresence>
                            {isAudioMenuOpen &&
                                <motion.div
                                    initial={{ y: '6px', opacity: 0, scale: 0.97 }}
                                    animate={{ y: '0', opacity: 1, scale: 1 }}
                                    exit={{ y: '6px', opacity: 0, scale: 0.97 }}
                                    transition={{ duration: 0.16, ease: 'easeOut' }}
                                    className='absolute bottom-full right-0 z-50 mb-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#08130f]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl'
                                >
                                    <button
                                        type='button'
                                        onClick={() => { setIsAudioMenuOpen(false); onAudioDownloadOnly(); }}
                                        className={MENU_ITEM}
                                    >
                                        <FontAwesomeIcon icon={faDownload} className='text-xs text-[#a7ffe2]' />
                                        <span className='flex-1'>Only this audio</span>
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => { setIsAudioMenuOpen(false); onAudioQueueAfter(); }}
                                        className={MENU_ITEM}
                                    >
                                        <FontAwesomeIcon icon={faListUl} className='text-xs text-[#a7ffe2]' />
                                        <span className='flex-1'>This audio and everything after</span>
                                    </button>
                                </motion.div>}
                        </AnimatePresence>
                    </div>

                    <div ref={downloadMenuRef} className="relative flex-1">
                        <button
                            type='button'
                            onClick={() => setIsDownloadMenuOpen(open => !open)}
                            aria-expanded={isDownloadMenuOpen}
                            aria-haspopup='menu'
                            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#72ffce] px-4 py-2 text-sm font-semibold text-black shadow-[0_0_22px_-6px_#72ffce] transition-colors duration-300 hover:bg-[#a7ffe2]"
                        >
                            <span>Download MP4</span>
                            <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform duration-200 ${isDownloadMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {/* Opens upwards: the row lives in a scrolling list, and a menu that
                            grew below the card would be clipped by that container. */}
                        <AnimatePresence>
                            {isDownloadMenuOpen &&
                                <motion.div
                                    initial={{ y: '6px', opacity: 0, scale: 0.97 }}
                                    animate={{ y: '0', opacity: 1, scale: 1 }}
                                    exit={{ y: '6px', opacity: 0, scale: 0.97 }}
                                    transition={{ duration: 0.16, ease: 'easeOut' }}
                                    className='absolute bottom-full right-0 z-50 mb-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#08130f]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl'
                                >
                                    <button
                                        type='button'
                                        onClick={() => { setIsDownloadMenuOpen(false); onDownloadOnly(); }}
                                        className={MENU_ITEM}
                                    >
                                        <FontAwesomeIcon icon={faDownload} className='text-xs text-[#a7ffe2]' />
                                        <span className='flex-1'>Only this video</span>
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => { setIsDownloadMenuOpen(false); onQueueAfter(); }}
                                        className={MENU_ITEM}
                                    >
                                        <FontAwesomeIcon icon={faListUl} className='text-xs text-[#a7ffe2]' />
                                        <span className='flex-1'>This video and everything after</span>
                                    </button>
                                </motion.div>}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
})

export default Video