self.onmessage = async (event) => {
    const { videoId } = event.data;

    try {
        const response = await fetch(`http://localhost:3000/videoInfo?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Video Info:', data);

        // Start video download
        const videoResponse = await fetch(
            `http://localhost:3000/download?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}&itag=${data.formats[0].itag}`
        );

        if (!videoResponse.ok) throw new Error('Video download failed');
        const videoBlob = await videoResponse.blob();
        
        self.postMessage({ type: 'progress', message: 'Video downloaded' });

        // Start audio download
        const audioResponse = await fetch(
            `http://localhost:3000/download/audio?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}&itag=${data.formats[1].itag}`
        );

        if (!audioResponse.ok) throw new Error('Audio download failed');
        const audioBlob = await audioResponse.blob();
        
        self.postMessage({ type: 'progress', message: 'Audio downloaded' });

        // Simulate merging (optional, based on your backend)
        const formData = new FormData();
        formData.append('video', videoBlob, 'video.mp4');
        formData.append('audio', audioBlob, 'audio.mp3');
        
        const mergeResponse = await fetch('http://localhost:3000/merge', {
            method: 'POST',
            body: formData
        });

        const mergeResult = await mergeResponse.json();
        if (!mergeResult.success) {
            throw new Error(mergeResult.error || 'Merge failed');
        }

        self.postMessage({ type: 'complete', filename: mergeResult.filename });
    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};
