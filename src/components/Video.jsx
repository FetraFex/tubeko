import React from 'react'
import { useState, forwardRef, useImperativeHandle } from 'react';


const Video = forwardRef(({ title, thumbnail, videoId, onComplete, onQueueAfter }, ref) => {


    /***Download information */
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState(0)
    const [progressText, setProgressText] = useState('Waiting for download...');
    const [downloading, setDownloading] = useState({
        status: false,
        type: '', // 'video', 'audio', or 'merge'
        progress: 0
    });


    const handleDownload = async (format) => {
        let progressEventSource = null;

        setProgressText("Starting download...")
        try {
            // 1. Fetch video metadata to pick formats
            let hasAudioOnly = false
            let data = null
            let response = null
            do {
                response = await fetch(`http://localhost:3000/videoInfo?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                data = await response.json();
                console.log(data);
                hasAudioOnly = data.formats.some(format => format.type === 'audio only');
            } while (!hasAudioOnly)

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

            // 2. Listen for server-side progress
            const streamId = Math.random().toString(36).substring(7);
            progressEventSource = new EventSource(
                `http://localhost:3000/download/progress/${streamId}`
            );

            progressEventSource.onmessage = (e) => {
                const { type, data: msg } = JSON.parse(e.data);
                if (type === 'progress') {
                    console.log('Progress:', msg);
                    const match = msg.match(/(\d+(\.\d+)?)%/);
                    const matchspeed = msg.match(/at\s+([\d.]+\s*(?:[KMG]iB\/s))/i);
                    if (match) setProgress(parseFloat(match[1]));
                    if (matchspeed) setSpeed(matchspeed[1]);
                } else if (type === 'error') {
                    console.error('Download error:', msg);
                }
            };

            // 3. Single server-side call: download video + audio, merge, stream back
            setProgressText("Downloading...");
            setDownloading(prev => ({ ...prev, status: true, type: 'video+audio' }));

            const dlResponse = await fetch(
                `http://localhost:3000/download/full?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}&videoItag=${preferredVideoFormat.itag}&audioItag=${preferredAudioFormat.itag}&id=${streamId}`
            );

            if (!dlResponse.ok) {
                const err = await dlResponse.json().catch(() => ({ error: 'Download failed' }));
                throw new Error(err.error || 'Download failed');
            }

            setProgressText("Saving file...");
            setProgress(100);

            // 4. Save the merged file in the browser
            const blob = await dlResponse.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${data.title || 'video'}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            console.log('Download complete');

        } catch (error) {
            console.error('Download error:', error);
            alert('Download failed: ' + error.message);
        } finally {
            if (progressEventSource) progressEventSource.close();
            setDownloading({ status: false, type: '', progress: 0 });
            onComplete();
        }
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
                        <p>{progress.toFixed(1)}%</p>
                        <p>{speed}</p>
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