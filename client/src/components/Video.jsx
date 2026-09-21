import React from 'react'
import { useState, forwardRef, useImperativeHandle } from 'react';
import {
    MAX_BROWSER_BYTES,
    TOO_LARGE,
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


const Video = forwardRef(({ title, thumbnail, videoId, quality, onComplete, onQueueAfter }, ref) => {


    /***Download information */
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState('')
    const [size, setSize] = useState({ downloaded: '', total: '' });
    const [eta, setEta] = useState('');
    const [progressText, setProgressText] = useState('Waiting for download...');
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


    // Metadata for the current video: title plus every downloadable format.
    const fetchFormats = async () => {
        const response = await fetch(`http://localhost:3000/videoInfo?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    };

    // Audio-only download: pulls just the audio stream and saves it as m4a.
    // No video, and no mux step - the stream is already AAC.
    const handleAudioDownload = async () => {
        if (downloading.status) return;
        setError('');
        setNotice('');
        setProgressText("Starting audio download...");
        setProgress(0);
        setSize({ downloaded: '', total: '' });
        setSpeed('');
        setEta('');
        setDownloading(prev => ({ ...prev, status: true, type: 'audio' }));

        try {
            const data = await fetchFormats();
            const audioFormat = selectAudioFormat(data.formats);

            if (!audioFormat) throw new Error('Could not find a suitable audio format');
            if (!audioFormat.url) throw new Error('The server did not return a direct media URL for this format');

            setProgressText("Downloading audio...");
            const audioData = await downloadAudioOnly({
                audioUrl: audioFormat.url,
                expectedSize: audioFormat.filesizeBytes,
                onProgress: ({ percent, downloaded, total, speed: rate, eta }) => {
                    setProgress(percent);
                    setSize({ downloaded, total });
                    setSpeed(rate);
                    setEta(eta);
                },
            });

            setProgressText("Saving file...");
            setProgress(100);
            setSpeed('');
            setEta('');
            saveBlob(new Blob([audioData], { type: 'audio/mp4' }), `${sanitizeFilename(data.title)}.m4a`);
        } catch (error) {
            console.error('Audio download error:', error);
            setError(error.message || 'Audio download failed');
        } finally {
            setDownloading({ status: false, type: '', progress: 0 });
        }
    };

    const handleDownload = async () => {
        // The playlist queue and the row buttons both call this, and two muxes
        // at once would share one ffmpeg instance.
        if (downloading.status) return;
        setProgressText("Starting download...")
        setError('');
        setNotice('');
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
                setProgressText("Downloading video + audio...");
                const { videoData, audioData } = await downloadMedia({
                    videoUrl: videoFormat.url,
                    audioUrl: preferredAudioFormat.url,
                    videoSize: videoFormat.filesizeBytes,
                    audioSize: preferredAudioFormat.filesizeBytes,
                    onProgress: ({ percent, downloaded, total, speed: rate, eta }) => {
                        setProgress(percent);
                        setSize({ downloaded, total });
                        setSpeed(rate);
                        setEta(eta);
                    },
                });

                setProgressText("Merging video and audio...");
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

            setProgressText("Saving file...");
            setProgress(100);
            setSpeed('');
            setEta('');
            saveBlob(blob, `${label}.mp4`);
            console.log('Download complete');

        } catch (error) {
            console.error('Download error:', error);
            // Inline, not alert(): the queue must keep advancing unattended.
            setError(error.message || 'Download failed');
        } finally {
            setDownloading({ status: false, type: '', progress: 0 });
            onComplete();
        }
    };

    // Fallback for anything the browser cannot finish (too large for wasm
    // memory, a stream it could not fetch, a codec ffmpeg.wasm refuses): the
    // server downloads, merges and streams the finished file back.
    const downloadOnServer = async ({ videoItag, audioItag }) => {
        setProgressText("Merging on the server...");
        setProgress(0);
        setSize({ downloaded: '', total: '' });

        const response = await fetch(
            `http://localhost:3000/download/full?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}&videoItag=${videoItag}&audioItag=${audioItag}&quality=${encodeURIComponent(quality)}`
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
        handleDownload
    }));

    return (
        <div className='flex gap-x-10 w-full'>
            <div>
                <img src={thumbnail} alt={title} className='max-h-50 rounded-lg' />
            </div>
            <div className='flex justify-between flex-col flex-1'>
                <div>
                    <h3 className='text-white font-bold text-xl'>{title}</h3>
                    <h3 className='text-gray-200'>05:48</h3>
                </div>
                <div className='w-full'>
                    <h3 className="text-white">{progressText}</h3>
                    <div className='bg-[#636363] h-[6px] relative'>
                        <div className="relative shadow-[0_4px_12px_#72ffce80]" style={{
                            width: `${progress}%`,
                            background: '#72ffce',
                            height: '100%',
                            transition: 'width 0.2s ease-in-out'
                        }}>
                            {/* Shining effect */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <div className="shining-effect"></div>
                            </div>
                        </div>

                    </div>
                    <div className="flex justify-between text-white">
                        <p>
                            {progress.toFixed(1)}%
                            {size.total ? ` · ${size.downloaded ? `${size.downloaded} / ` : ''}${size.total}` : ''}
                        </p>
                        <p>{speed}{eta ? ` · ETA ${eta}` : ''}</p>
                    </div>
                    {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
                    {notice && <p className="text-amber-300 text-sm mt-1">{notice}</p>}
                </div>
                <div className="flex gap-x-3">
                    <button
                        className="text-black font-bold py-2 flex-1 rounded-lg hover:bg-[#a7ffe2] bg-[#72ffce] transition-all duration-300"
                        onClick={handleAudioDownload}>Download MP3</button>
                    <button
                        className="text-black font-bold py-2 flex-1 rounded-lg hover:bg-[#a7ffe2] bg-[#72ffce] transition-all duration-300"
                        onClick={() => onQueueAfter()}>Download MP4</button>
                </div>
            </div>
        </div>
    )
})

export default Video