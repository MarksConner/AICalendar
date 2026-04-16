import { accessMicrophone } from "./mic_access";

let activeRecognition: any = null;
let activeAudioTrack: MediaStreamTrack | null = null;
let activeResolve: ((value: string | null) => void) | null = null;
let finalTranscript = "";
let silenceTimer: number | null = null;
let finished = false;

function clearSilenceTimer() {
  if (silenceTimer !== null) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
}

function cleanup() {
  clearSilenceTimer();

  if (activeAudioTrack) {
    activeAudioTrack.stop();
    activeAudioTrack = null;
  }

  activeRecognition = null;
  activeResolve = null;
  finalTranscript = "";
  finished = false;
}

function finish(result: string | null) {
  if (finished) return;
  finished = true;

  const resolve = activeResolve;
  cleanup();

  if (resolve) {
    resolve(result);
  }
}

export async function startMicrophoneInput(): Promise<string | null> {
  if (activeRecognition) {
    return null;
  }

  const audioTrack = await accessMicrophone();
  if (!audioTrack) {
    return null;
  }

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    audioTrack.stop();
    return null;
  }

  activeAudioTrack = audioTrack;
  finalTranscript = "";
  finished = false;

  return new Promise((resolve) => {
    activeResolve = resolve;

    const recognition = new SpeechRecognition();
    activeRecognition = recognition;

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    const restartSilenceTimer = () => {
      clearSilenceTimer();
      silenceTimer = window.setTimeout(() => {
        if (activeRecognition && !finished) {
          activeRecognition.stop();
        }
      }, 10000);
    };

    recognition.onresult = (event: any) => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + " ";
      }

      finalTranscript = transcript.trim();
      restartSilenceTimer();
    };

    recognition.onerror = () => {
      finish(finalTranscript || null);
    };

    recognition.onend = () => {
      finish(finalTranscript || null);
    };

    recognition.start();
    restartSilenceTimer();
  });
}

export function stopMicrophoneInput() {
  if (activeRecognition && !finished) {
    activeRecognition.stop();
  }
}