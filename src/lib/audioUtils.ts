// src/lib/audioUtils.ts

/**
 * Generates a procedural audio buffer and returns a URL to it
 * This is used as a fallback when real audio files can't be loaded
 */
export const generateProceduralAudio = async (
  frequency = 440,
  duration = 30,
  type: OscillatorType = "sine"
): Promise<string> => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const context = new AudioCtx();
    const sampleRate = context.sampleRate;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
    const osc = offlineCtx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(0.5, 0.1);
    gain.gain.linearRampToValueAtTime(0.3, duration * 0.3);
    gain.gain.linearRampToValueAtTime(0, duration);

    osc.connect(gain);
    gain.connect(offlineCtx.destination);
    osc.start(0);
    osc.stop(duration);

    const buffer = await offlineCtx.startRendering();
    const wav = audioBufferToWav(buffer);
    const blob = new Blob([wav], { type: "audio/wav" });
    console.log(`✅ Generated procedural audio URL: ${url.substring(0, 30)}...`);
    return url;
  } catch (e) {
    console.error("Procedural audio generation failed:", e);
    return fallbackSilence;
  }
};

const fallbackSilence = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAA=";

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const view = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  const setUint16 = (d: number) => (view.setUint16(pos, d, true), pos += 2);
  const setUint32 = (d: number) => (view.setUint32(pos, d, true), pos += 4);

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16);
  setUint16(1);
  setUint16(buffer.numberOfChannels);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels);
  setUint16(buffer.numberOfChannels * 2);
  setUint16(16);
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return view.buffer;
}
