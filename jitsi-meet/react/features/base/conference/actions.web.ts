import { IStore } from '../../app/types';
import { gumPending } from '../media/actions';
import { MEDIA_TYPE, MediaType } from '../media/constants';
import { IGUMPendingState } from '../media/types';
import { createAndAddInitialAVTracks } from '../tracks/actions.web';
import { JitsiConferenceEvents } from '../lib-jitsi-meet';

export * from './actions.any';

/**
 * Starts audio and/or video for the visitor.
 *
 * @param {Array<MediaType>} media - The media types that need to be started.
 * @returns {Function}
 */
export function setupVisitorStartupMedia(media: Array<MediaType>) {
    return (dispatch: IStore['dispatch']) => {
        // Clear the gum pending state in case we have set it to pending since we are starting the
        // conference without tracks.
        dispatch(gumPending([ MEDIA_TYPE.AUDIO, MEDIA_TYPE.VIDEO ], IGUMPendingState.NONE));

        if (media && Array.isArray(media) && media.length > 0) {
            dispatch(createAndAddInitialAVTracks(media));
        }
    };
}


// Define global Vosk WebSocket
let voskSocket: WebSocket | null = null;

/**
 * Converts Float32 audio data to Int16 PCM for Vosk
 */
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
        let s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
}

/**
 * Displays the subtitle text in the Jitsi UI
 */
function updateSubtitle(text: string) {
    let el = document.getElementById('live-subtitle');
    if (!el) {
        el = document.createElement('div');
        el.id = 'live-subtitle';
        el.style.position = 'absolute';
        el.style.bottom = '10%';
        el.style.width = '100%';
        el.style.textAlign = 'center';
        el.style.color = 'white';
        el.style.backgroundColor = 'rgba(0,0,0,0.6)';
        el.style.padding = '8px';
        el.style.fontSize = '18px';
        el.style.zIndex = '9999';
        document.body.appendChild(el);
    }
    el.innerText = text;
}

/**
 * Starts recording mic and sends it to Vosk via WebSocket
 */
function startVoskTranscription() {
    console.log("📡 Attempting to connect to Vosk WebSocket server...");
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        voskSocket = new WebSocket("ws://localhost:2700");

        voskSocket.onopen = () => {
            voskSocket!.send(JSON.stringify({ config: { sample_rate: audioContext.sampleRate } }));
        };

        voskSocket.onmessage = (event) => {
            const result = JSON.parse(event.data);
            if (result.text) {
                updateSubtitle(result.text);
            }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = function (e) {
            const floatData = e.inputBuffer.getChannelData(0);
            const pcmData = floatTo16BitPCM(floatData);
            if (voskSocket?.readyState === WebSocket.OPEN) {
                voskSocket.send(pcmData);
            }
        };
    }).catch(err => {
        console.error("🎙️ Failed to access microphone:", err);
    });
}

/**
 * Binds Vosk transcription to conference lifecycle
 */
export function setupVoskTranscriptionOnConference(conference: any) {
    conference.on('conferenceJoined', () => {
        console.log('✅ Joined conference. Starting Vosk transcription...');
        startVoskTranscription();
    });

    conference.on('conferenceLeft', () => {
        console.log('👋 Left conference. Stopping Vosk transcription...');
        if (voskSocket) {
            voskSocket.close();
            voskSocket = null;
        }
    });
}