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
        let videoProgressEventSource = null;
        let audioProgressEventSource = null;

        setProgressText("Starting download...")
        try {
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

            let preferredVideoFormat = data.formats.find(format => format.quality === "720p");
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

            // Check if we found valid formats before proceeding
            if (!preferredVideoFormat || !preferredAudioFormat) {
                const missing = [];
                if (!preferredVideoFormat) missing.push("video");
                if (!preferredAudioFormat) missing.push("audio");
                throw new Error(`Could not find suitable ${missing.join(" and ")} format(s)`);
            }

            console.log("Selected video format:", preferredVideoFormat);
            console.log("Selected audio format:", preferredAudioFormat);

            // Rest of your download code...
            // Now you can safely use preferredVideoFormat.itag and preferredAudioFormat.itag
            const streamId = Math.random().toString(36).substring(7);
            videoProgressEventSource = new EventSource(
                `http://localhost:3000/download/progress/${streamId}`
            );



            videoProgressEventSource.onmessage = (e) => {
                const { type, data } = JSON.parse(e.data);
                if (type === 'progress') {
                    console.log('Video Download Progress:', data);
                    const match = data.match(/(\d+(\.\d+)?)%/);
                    const matchspeed = data.match(/at\s+([\d.]+\s*(?:[KMG]iB\/s))/i);

                    // Optional parsing of progress details
                    if (match) {
                        const percentage = parseFloat(match[1]);
                        console.log('Progress Percentage:', percentage); // 2.5
                        setProgress(percentage)
                    } else {
                        console.log('Progress percentage not found.');
                    }

                    if (matchspeed) {
                        const speed = matchspeed[1];
                        console.log("Download Speed: ", speed);
                        setSpeed(speed)
                    } else {
                        console.log("Speed not found.");

                    }
                }
                else if (type === 'error') {
                    console.error('Download error:', data);
                }
            };

            // 2. Download video with progress tracking
            setDownloading(prev => ({ ...prev, progress: 30 }));
            const videoResponse = await fetch(
                `http://localhost:3000/download?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}&itag=${preferredVideoFormat.itag}&id=${streamId}`
            );

            const streamAudioId = Math.random().toString(36).substring(7);
            audioProgressEventSource = new EventSource(
                `http://localhost:3000/download/progress/${streamAudioId}`
            );

            audioProgressEventSource.onmessage = (e) => {
                const { type, data } = JSON.parse(e.data);
                if (type === 'progress') {
                    console.log('Video Download Progress:', data);
                    const match = data.match(/(\d+(\.\d+)?)%/);
                    const matchspeed = data.match(/at\s+([\d.]+\s*(?:[KMG]iB\/s))/i);

                    // Optional parsing of progress details
                    if (match) {
                        const percentage = parseFloat(match[1]);
                        console.log('Progress Percentage:', percentage); // 2.5
                        setProgress(percentage)
                    } else {
                        console.log('Progress percentage not found.');
                    }

                    if (matchspeed) {
                        const speed = matchspeed[1];
                        console.log("Download Speed: ", speed);
                        setSpeed(speed)
                    } else {
                        console.log("Speed not found.");

                    }
                }
                else if (type === 'error') {
                    console.error('Download error:', data);
                }
            };

            if (!videoResponse.ok) throw new Error('Video download failed');
            const videoBlob = await videoResponse.blob();

            // Change the progress text to "Downloading audio"
            setProgressText("Downloading audio")
            setProgress(0)

            // 3. Download audio (without progress tracking)
            setDownloading(prev => ({ ...prev, progress: 60 }));
            const audioResponse = await fetch(
                `http://localhost:3000/download/audio?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}&itag=${preferredAudioFormat.itag}&id=${streamAudioId}`
            );
            if (!audioResponse.ok) throw new Error('Audio download failed');
            const audioBlob = await audioResponse.blob();

            console.log("blob video", videoBlob);
            console.log("blob video", audioBlob);

            setProgressText("Merging...")

            const formData = new FormData();
            formData.append('video', videoBlob, 'video.mp4');
            formData.append('audio', audioBlob, 'audio.mp3');
            formData.append('title', 'My Audio File');


            const mergeResponse = await fetch('http://localhost:3000/merge', {
                method: 'POST',
                body: formData
            });

            const mergeResult = await mergeResponse.json();
            if (!mergeResult.success) {
                throw new Error(mergeResult.error || 'Merge failed');
            } else {
                console.log(mergeResult.message);
            }

            // 6. Download merged file
            const mergedResponse = await fetch(
                `http://localhost:3000/download-merged?filename=${mergeResult.filename}`
            );
            if (!mergedResponse.ok) throw new Error('Failed to download merged file');
            const mergedBlob = await mergedResponse.blob();

            async function downloadFileInBackground(mergedBlob, filename) {
                const downloadUrl = window.URL.createObjectURL(mergedBlob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = filename;
                document.body.appendChild(link);

                let downloadStarted = false;

                // Attempting to programmatically trigger the download
                link.click();

                // Check if the download has started using the visibility of the download manager
                try {
                    const controller = new AbortController();
                    const { signal } = controller;

                    // Set a short timeout to test if download starts
                    const response = await fetch(downloadUrl, { signal });

                    if (response.ok) {
                        downloadStarted = true;
                        console.log("✅ Download has started.");
                    } else {
                        console.error("❌ Download failed to start.");
                    }

                    // Clean up the object URL
                    controller.abort();
                } catch (err) {
                    if (err.name === 'AbortError') {
                        if (!downloadStarted) {
                            console.error("❌ Download failed to start. User may not be focused on the page.");
                        }
                    } else {
                        console.error("❌ Error during download check:", err);
                    }
                } finally {
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(downloadUrl);
                }
            }

            // Usage
            downloadFileInBackground(mergedBlob, `${data.title}.mp4`);


        } catch (error) {
            console.error('Download error:', error);
            alert('Download failed. Please try again.');
        } finally {
            // Close all EventSource connections
            if (videoProgressEventSource) {
                videoProgressEventSource.close();
            }

            if (audioProgressEventSource) {
                audioProgressEventSource.close();
            }

            setDownloading({
                status: false,
                type: '',
                progress: 0
            });

            onComplete()

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
                        <div className="relative shadow-[0_4px_12px_#4ade8080]" style={{
                            width: `${progress}%`,
                            background: '#4ade80',
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