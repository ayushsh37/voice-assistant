import { GoogleGenAI, Modality } from '@google/genai';
import pkg from 'wavefile';
const { WaveFile } = pkg;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function geminiHandler(audioBase64) {
  // Convert received audio to PCM 16kHz mono
  const wav = new WaveFile();
  wav.fromBase64(audioBase64);
  wav.toSampleRate(16000);
  wav.toBitDepth("16");
  const pcmBase64 = wav.toBase64();

  const responseQueue = [];
  const session = await ai.live.connect({
    model: "gemini-2.5-flash-preview-native-audio-dialog",
    config: { responseModalities: [Modality.AUDIO] },
    callbacks: {
      onmessage: (msg) => responseQueue.push(msg),
      onclose: () => console.log("Gemini session closed"),
      onerror: (e) => console.error("Gemini error:", e.message)
    }
  });

  // Send user audio to Gemini
  session.sendRealtimeInput({
    audio: {
      data: pcmBase64,
      mimeType: "audio/pcm;rate=16000"
    }
  });

  // Wait for response
  const turns = await new Promise((resolve) => {
    const check = setInterval(() => {
      if (responseQueue.find(m => m.serverContent?.turnComplete)) {
        clearInterval(check);
        resolve(responseQueue);
      }
    }, 100);
  });

  session.close();

  // Combine received audio chunks
  const combinedAudio = turns.reduce((acc, turn) => {
    if (turn.data) {
      const buffer = Buffer.from(turn.data, 'base64');
      const intArray = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Int16Array.BYTES_PER_ELEMENT);
      return acc.concat(Array.from(intArray));
    }
    return acc;
  }, []);

  return {
    text: "Voice response generated",  // (You can parse actual text when supported)
    audio: Buffer.from(new Int16Array(combinedAudio).buffer).toString('base64')
  };
}
