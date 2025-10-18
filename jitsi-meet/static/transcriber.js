// window.APP is available globally in Jitsi Meet
APP.conference.addConferenceListener(
    APP.conference.events.CONFERENCE_JOINED,
    () => {
        console.log("✅ Conference joined - initializing audio stream...");

        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            const audioContext = new AudioContext();
            const input = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);

            input.connect(processor);
            processor.connect(audioContext.destination);

            const socket = new WebSocket("ws://localhost:2700");

            socket.onopen = () => console.log("🎤 WebSocket connected to Vosk");
            socket.onmessage = msg => {
                const result = JSON.parse(msg.data);
                if (result.text) {
                    console.log("📝 Transcribed:", result.text);
                    // TODO: send to moderator interface
                }
            };

            processor.onaudioprocess = e => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcm16 = convertFloat32ToInt16(inputData);
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(pcm16);
                }
            };

            function convertFloat32ToInt16(buffer) {
                let l = buffer.length;
                let buf = new Int16Array(l);
                while (l--) {
                    buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
                }
                return buf.buffer;
            }
        });
    }
);
