console.log('🧠 Inside Custom Face Script');

// ✅ Wait until Jitsi is ready
function waitForAppReady(callback) {
    const interval = setInterval(() => {
        if (window.APP && APP.conference && APP.conference.isJoined()) {
            clearInterval(interval);
            console.log('✅ APP and Conference are ready!');
            callback(); // Call your tracking function
        }
    }, 1000);
}

const startFaceTracking = async () => {
    console.log("📄 Starting face-api model loading...");

    await faceapi.nets.tinyFaceDetector.loadFromUri('/libs/models');
    await faceapi.nets.faceExpressionNet.loadFromUri('/libs/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/libs/models'); // ⭐ added for higher accuracy

    console.log('✅ Models loaded! Starting detection...');

    const setupCanvasForVideo = (video, index) => {
        const canvasId = `face-canvas-${index}`;
        let canvas = document.getElementById(canvasId);

        if (!canvas) {
            canvas = faceapi.createCanvasFromMedia(video);
            canvas.id = canvasId;
            canvas.style.position = 'absolute';
            canvas.style.zIndex = 9999;
            canvas.style.pointerEvents = 'none';
            document.body.appendChild(canvas);
        }

        const updateCanvasPosition = () => {
            const rect = video.getBoundingClientRect();
            canvas.style.top = `${rect.top + window.scrollY}px`;
            canvas.style.left = `${rect.left + window.scrollX}px`;
            canvas.width = rect.width;
            canvas.height = rect.height;
        };

        updateCanvasPosition();
        window.addEventListener('scroll', updateCanvasPosition);
        window.addEventListener('resize', updateCanvasPosition);

        const ctx = canvas.getContext('2d');

        setInterval(async () => {
            updateCanvasPosition();

            const detections = await faceapi
                .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks() // ⭐ better alignment
                .withFaceExpressions();

            const dims = faceapi.matchDimensions(canvas, video, true);
            const resized = faceapi.resizeResults(detections, dims);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            resized.forEach((resizedResult) => {
                const { detection, expressions } = resizedResult;
                const box = detection.box;

                const emotionColors = {
                    happy: '#27ae60',
                    sad: '#a334dbff',
                    angry: '#e74c3c',
                    surprised: '#f39c12',
                    fearful: '#9b59b6',
                    disgusted: '#8e44ad',
                    neutral: '#00bcd4'
                };

                const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
                const [dominantExpression, confidence] = sorted[0];
                const lineColor = emotionColors[dominantExpression] || '#ffffff';

                // 🧠 Adjustments
                const offsetX = 80; // shift everything right
                const offsetY = 80; // move line slightly lower
                const jawY = box.y + box.height + offsetY + Math.sin(Date.now() / 300) * 2;
                const reduction = box.width * 0.15;
                const jawLeft = box.x + reduction + offsetX;
                const jawRight = box.x + box.width - reduction + offsetX;

                // 🎯 Draw tracking line
                ctx.beginPath();
                ctx.moveTo(jawLeft, jawY);
                ctx.lineTo(jawRight, jawY);
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = 4;
                ctx.stroke();

                // 🎯 Draw expression label
                ctx.font = 'bold 15px Arial';
                ctx.fillStyle = lineColor;
                ctx.fillText(
                    `${dominantExpression.toUpperCase()} (${(confidence * 100).toFixed(1)}%)`,
                    jawLeft + 15,
                    jawY + 20
                );
            });

            if (detections.length > 0) {
                console.log(`📸 Detected ${detections.length} face(s).`);
            }
        }, 1000);
    };

    // Delay until videos are ready
    setTimeout(() => {
        const videos = document.querySelectorAll('video');
        videos.forEach((video, index) => {
            if (video.readyState >= 2) {
                setupCanvasForVideo(video, index);
            }
        });
    }, 3000);
};

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Failed to parse JWT:", e);
        return null;
    }
}

// Start after conference join
waitForAppReady(() => {
    const token = APP.store.getState()['features/base/jwt'].jwt;
    const payload = parseJwt(token);
    const isModerator = payload?.moderator;

    console.log("👤 Is Moderator (from JWT):", isModerator);

    if (!isModerator) {
    console.log("🚫 Disabling Add Participant for non-moderators...");

    const observer = new MutationObserver(() => {
        // Find the "invite" icon by its unique SVG path
        const inviteSvg = document.querySelector(
            'svg path[d^="M17.25 9.75a.75.75"]'
        );

        if (inviteSvg) {
            // climb up until we reach the wrapper div.toolbox-icon
            const toolboxIconDiv = inviteSvg.closest(".toolbox-icon");
            if (toolboxIconDiv) {
                toolboxIconDiv.remove(); // remove entire icon block
                console.log("✅ Invite participant icon removed for non-moderator");
                observer.disconnect();
            }
        }
    });

    // Observe the entire toolbar
    const toolbar = document.querySelector('#new-toolbox') || document.body;
    observer.observe(toolbar, { childList: true, subtree: true });
}
});
