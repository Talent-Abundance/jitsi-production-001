let ws;
let audioContext;
let processor;
let input;

export async function startTranscription(stream) {
    ws = new WebSocket('ws://localhost:2700');

    ws.onopen = () => {
        console.log('🧠 Connected to Vosk server');
        ws.send(JSON.stringify({ config: { sample_rate: 16000 } }));
    };

    ws.onmessage = (event) => {
        const result = JSON.parse(event.data);
        if (result.text) {
            console.log("📝 Transcript:", result.text);
            // Dispatch to Redux store or display in UI
        }
    };

    audioContext = new AudioContext({ sampleRate: 16000 });
    input = audioContext.createMediaStreamSource(stream);
    processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0);
        const int16 = convertFloat32ToInt16(data);
        ws.send(int16);
    };

    input.connect(processor);
    processor.connect(audioContext.destination);
}

function convertFloat32ToInt16(buffer) {
    let l = buffer.length;
    let buf = new Int16Array(l);
    while (l--) {
        buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
    }
    return buf.buffer;
}

export function stopTranscription() {
    processor?.disconnect();
    input?.disconnect();
    ws?.close();
}
