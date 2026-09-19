import React from 'react'
import { useState, forwardRef, useImperativeHandle } from 'react';
import {
    MAX_BROWSER_BYTES,
    TOO_LARGE,
    downloadAudioOnly,
    downloadMedia,
    formatBytes,
    isDirectMedia,
    muxToMp4,
    sanitizeFilename,
    saveBlob,
} from '../lib/browserDownload';


// yt-dlp's format list also contains HLS manifests (.m3u8) whose "media" is a
// few KB of text. Those cannot be merged, so they are never offered to ffmpeg.
const usableFormats = (formats) => (formats || []).filter(isDirectMedia);

// Prefer 720p (itag 136), otherwise the highest resolution on offer.
const selectVideoFormat = (formats) => {
    const direct = usableFormats(formats);
    const preferred = direct.find((format) => format.quality === "720p" && format.itag == "136");
    if (preferred) return preferred;

    const videoFormats = direct.filter(f => f.type.includes("video"));
    if (videoFormats.length === 0) return null;

    return videoFormats.reduce((highest, current) => {
        const currentQuality = parseInt(current.quality) || 0;
        const highestQuality = parseInt(highest.quality) || 0;
        return currentQuality > highestQuality ? current : highest;
    }, videoFormats[0]);
};

// Prefer ~128kbps audio, otherwise the highest bitrate on offer.
const selectAudioFormat = (formats) => {
    const audioFormats = usableFormats(formats).filter(f => f.type === "audio only");
    if (audioFormats.length === 0) return null;

    const preferred = audioFormats.find(format => {
        const qualityValue = parseInt(format.quality.split('.')[0]);
        return qualityValue === 129 || qualityValue === 128;
    });
    if (preferred) return preferred;

    return audioFormats.reduce((highest, current) => {
        const currentQuality = parseFloat(current.quality) || 0;
        const highestQuality = parseFloat(highest.quality) || 0;
        return currentQuality > highestQuality ? current : highest;
    }, audioFormats[0]);
};


const Video = forwardRef(({ title, thumbnail, videoId, onComplete, onQueueAfter }, ref) => {


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
            const preferredVideoFormat = selectVideoFormat(data.formats);
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

            // 2. Both streams are pulled in parallel through the server relay
            //    (~zero server CPU) and muxed here in the browser. yt-dlp gives
            //    exact byte sizes, so a video this tab cannot possibly merge
            //    goes to the server up front rather than after a failed attempt.
            const label = sanitizeFilename(data.title);
            const browserBytes = (preferredVideoFormat.filesizeBytes || 0)
                + (preferredAudioFormat.filesizeBytes || 0);
            let blob;

            if (browserBytes > MAX_BROWSER_BYTES) {
                console.info(`[download] ${formatBytes(browserBytes)} exceeds the ${formatBytes(MAX_BROWSER_BYTES)} browser limit; using the server`);
                setNotice(`This video is ${formatBytes(browserBytes)} - over the ${formatBytes(MAX_BROWSER_BYTES)} browser merge limit, so the server downloaded and merged it.`);

                blob = await downloadOnServer({
                    videoItag: preferredVideoFormat.itag,
                    audioItag: preferredAudioFormat.itag,
                });
            } else {
                try {
                    setProgressText("Downloading video + audio...");
                    const { videoData, audioData } = await downloadMedia({
                        videoUrl: preferredVideoFormat.url,
                        audioUrl: preferredAudioFormat.url,
                        videoSize: preferredVideoFormat.filesizeBytes,
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

                    blob = await muxToMp4({
                        videoData,
                        audioData,
                        onProgress: setProgress,
                    });
                } catch (browserError) {
                    // In-browser merging can be stopped by things the page
                    // cannot fix: a stream the browser could not fetch, a codec
                    // the mp4 muxer refuses, or a video too large for wasm
                    // memory. The server pipeline can always finish it, so use
                    // that rather than failing the download (and stalling the
                    // playlist).
                    const tooLarge = browserError.code === TOO_LARGE;
                    if (tooLarge) {
                        console.info('[download] over the browser size limit; using the server:', browserError.message);
                    } else {
                        console.warn('[download] browser pipeline failed, merging on the server:', browserError);
                    }
                    setNotice(tooLarge
                        ? `${browserError.message} - the server downloaded and merged it.`
                        : `Browser merge failed (${browserError.message}) - the server finished this one.`);

                    blob = await downloadOnServer({
                        videoItag: preferredVideoFormat.itag,
                        audioItag: preferredAudioFormat.itag,
                    });
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
            `http://localhost:3000/download/full?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}&videoItag=${videoItag}&audioItag=${audioItag}`
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Download failed' }));
            throw new Error(err.error || 'Download failed');
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
                        <div className="relative shadow-[0_4px_12px_#00d4ff80]" style={{
                            width: `${progress}%`,
                            background: '#00d4ff',
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
                        className="text-black font-bold py-2 flex-1 rounded-lg hover:bg-green-300 bg-green-400 transition-all duration-300"
                        onClick={handleAudioDownload}>Download MP3</button>
                    <button
                        className="text-black font-bold py-2 flex-1 rounded-lg hover:bg-green-300 bg-green-400 transition-all duration-300"
                        onClick={() => onQueueAfter()}>Download MP4</button>
                </div>
            </div>
        </div>
    )
})

export default Video