document.addEventListener('DOMContentLoaded', () => {
    const startRecordingButton = document.getElementById('startRecording');
    const stopRecordingButton = document.getElementById('stopRecording');
    const stopVideoButton = document.getElementById('stopVideo');
    const micVolumeSlider = document.getElementById('micVolume');
    const imageUpload = document.getElementById('imageUpload');
    const realTimeVideoElement = document.getElementById('realTimeVideoElement');
    const canvasElement = document.getElementById('canvasElement');
    const playRecordingButton = document.getElementById('playRecording');

    let mediaRecorder;
    let audioContext;
    let audioInput;
    let gainNode;
    let chunks = [];
    let recordedBlobs = [];
    let stream;
    let canvasStream;
    let imageElement = new Image();
    let animationFrameId;

    async function init() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            realTimeVideoElement.srcObject = stream;

            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioInput = audioContext.createMediaStreamSource(stream);
            gainNode = audioContext.createGain();
            gainNode.gain.value = micVolumeSlider.value;

            audioInput.connect(gainNode);

            const destination = audioContext.createMediaStreamDestination();
            gainNode.connect(destination);

            canvasStream = canvasElement.captureStream();
            const combinedStream = new MediaStream([...canvasStream.getTracks(), ...destination.stream.getAudioTracks()]);

            mediaRecorder = new MediaRecorder(combinedStream);
            mediaRecorder.ondataavailable = handleDataAvailable;
            mediaRecorder.onstop = handleStop;
        } catch (err) {
            console.error('Error accessing media devices.', err);
        }
    }

    startRecordingButton.addEventListener('click', async () => {
        await init();
        if (mediaRecorder) {
            mediaRecorder.start();
            startRecordingButton.disabled = true;
            stopRecordingButton.disabled = false;
            stopVideoButton.disabled = false;
            playRecordingButton.disabled = true;
            drawCanvas();
        } else {
            console.error('MediaRecorder not initialized.');
        }
    });

    stopRecordingButton.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        stopStreams();
        startRecordingButton.disabled = false;
        stopRecordingButton.disabled = true;
        stopVideoButton.disabled = true;
    });

    stopVideoButton.addEventListener('click', () => {
        stopStreams();
        stopVideoButton.disabled = true;
    });

    micVolumeSlider.addEventListener('input', () => {
        if (gainNode) {
            gainNode.gain.value = micVolumeSlider.value;
        }
    });

    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imageElement.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    function handleDataAvailable(event) {
        if (event.data.size > 0) {
            chunks.push(event.data);
        }
    }

    function handleStop() {
        const blob = new Blob(chunks, { type: 'video/webm' });
        recordedBlobs.push(blob);
        playRecordingButton.disabled = false;
        chunks = [];
    }

    playRecordingButton.addEventListener('click', () => {
        const recordedVideo = document.createElement('video');
        recordedVideo.controls = true;
        const superBuffer = new Blob(recordedBlobs, { type: 'video/webm' });
        recordedVideo.src = window.URL.createObjectURL(superBuffer);
        document.body.appendChild(recordedVideo);
        recordedVideo.play();
    });

    function drawCanvas() {
        if (canvasElement && realTimeVideoElement) {
            const context = canvasElement.getContext('2d');
            context.clearRect(0, 0, canvasElement.width, canvasElement.height);
            context.drawImage(realTimeVideoElement, 0, 0, canvasElement.width, canvasElement.height);
            if (imageElement.src) {
                context.drawImage(imageElement, 0, 0, 100, 100);
            }
            animationFrameId = requestAnimationFrame(drawCanvas);
        }
    }

    function stopStreams() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    }
});
