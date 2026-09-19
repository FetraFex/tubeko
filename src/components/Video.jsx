import React from 'react'
import { useState, forwardRef, useImperativeHandle } from 'react';
import {
    TOO_LARGE,
    downloadMedia,
    muxToMp4,
    sanitizeFilename,
    saveBlob,
} from '../lib/browserDownload';


const Video = forwardRef(({ title, thumbnail, videoId, onComplete, onQueueAfter }, ref) => {


    /***Download information */
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState('')
    const [size, setSize] = useState({ downloaded: '', total: '' });
    const [eta, setEta] = useState('');
    const [progressText, setProgressText] = useState('Waiting for download...');
    const [downloading, setDownloading] = useState({
        status: false,
        type: '', // 'video', 'audio', or 'merge'
        progress: 0
    });


    const handleDownload = async (format) => {
        setProgressText("Starting download...")
        try {
            // 1. Fetch video metadata to pick formats
            const response = await fetch(`http://localhost:3000/videoInfo?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log(data);

            let preferredVideoFormat = data.formats.find(format => format.quality === "720p" && format.itag == "136");
            let preferredAudioFormat = data.formats.find(format => {
                if (format.type === "audio only") {
                    const qualityValue = parseInt(format.quality.split('.')[0]);
                    return qualityValue === 129 || qualityValue === 128;
                }
                return false;
            });

            // Fallback to highest quality video if 720p not found
            if (!preferredVideoFormat) {
                const videoFormats = data.formats.filter(f => f.type.includes("video"));
                if (videoFormats.length > 0) {
                    preferredVideoFormat = videoFormats.reduce((highest, current) => {
                        const currentQuality = parseInt(current.quality) || 0;
                        const highestQuality = parseInt(highest.quality) || 0;
                        return currentQuality > highestQuality ? current : highest;
                    }, videoFormats[0]);
                }
            }

            // Fallback to highest quality audio if 128/129kbps not found
            if (!preferredAudioFormat) {
                const audioFormats = data.formats.filter(f => f.type === "audio only");
                if (audioFormats.length > 0) {
                    preferredAudioFormat = audioFormats.reduce((highest, current) => {
                        const currentQuality = parseFloat(current.quality) || 0;
                        const highestQuality = parseFloat(highest.quality) || 0;
                        return currentQuality > highestQuality ? current : highest;
                    }, audioFormats[0]);
                }
            }

            if (!preferredVideoFormat || !preferredAudioFormat) {
                const missing = [];
                if (!preferredVideoFormat) missing.push("video");
                if (!preferredAudioFormat) missing.push("audio");
                throw new Error(`Could not find suitable ${missing.join(" and ")} format(s)`);
            }

            console.log("Selected video format:", preferredVideoFormat);
            console.log("Selected audio format:", preferredAudioFormat);

            if (!preferredVideoFormat.url || !preferredAudioFormat.url) {
                throw new Error('The server did not return direct media URLs for these formats');
            }

            setDownloading(prev => ({ ...prev, status: true, type: 'video+audio' }));

            // 2. Both streams are pulled in parallel through the server relay
            //    (~zero server CPU) and muxed here in the browser.
            const label = sanitizeFilename(data.title);
            let blob;

            try {
                setProgressText("Downloading video + audio...");
                const { videoData, audioData } = await downloadMedia({
                    videoUrl: preferredVideoFormat.url,
                    audioUrl: preferredAudioFormat.url,
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
                    title: label,
                    onProgress: setProgress,
                });
            } catch (error) {
                if (error.code !== TOO_LARGE) throw error;

                // Too big to hold in wasm memory, so let the server mux it.
                blob = await downloadOnServer({
                    videoItag: preferredVideoFormat.itag,
                    audioItag: preferredAudioFormat.itag,
                });
            }

            setProgressText("Saving file...");
            setProgress(100);
            setSpeed('');
            setEta('');
            saveBlob(blob, `${label}.mp4`);
            console.log('Download complete');

        } catch (error) {
            console.error('Download error:', error);
            alert('Download failed: ' + error.message);
        } finally {
            setDownloading({ status: false, type: '', progress: 0 });
            onComplete();
        }
    };

    // Fallback for videos that are too large to mux in the browser: the server
    // downloads, merges and streams the finished file back.
    const downloadOnServer = async ({ videoItag, audioItag }) => {
        setProgressText("Large video - merging on the server...");
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
                </div>
                <div className="flex gap-x-3">
                    <button
                        className="text-black font-bold py-2 flex-1 rounded-lg hover:bg-green-300 bg-green-400 transition-all duration-300"
                        onClick={() => onQueueAfter()}>Download MP3</button>
                    <button
                        className="text-black font-bold py-2 flex-1 rounded-lg hover:bg-green-300 bg-green-400 transition-all duration-300"
                        onClick={() => onQueueAfter()}>Download MP4</button>
                </div>
            </div>
        </div>
    )
})

export default Video