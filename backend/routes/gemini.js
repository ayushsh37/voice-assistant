import express from "express";
import multer from "multer";
import WavDecoder from "wav-decoder";
import session from "../geminiSession.js"; // assuming you have session initialized separately

const router = express.Router();
const upload = multer();

router.post("/send-audio", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const buffer = req.file.buffer;

    // Decode WAV
    const decoded = await WavDecoder.decode(buffer);
    const samples = decoded.channelData[0];

    // Convert Float32 [-1,1] → Int16 PCM
    const pcmInt16 = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      pcmInt16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Convert PCM to Base64
    const pcmBase64 = Buffer.from(pcmInt16.buffer).toString("base64");

    // Send to Gemini as PCM
    await session.sendRealtimeInput({
      audio: {
        data: pcmBase64,
        mimeType: "audio/pcm;rate=16000"
      }
    });

    res.status(200).json({ success: true, message: "Audio processed and sent to Gemini" });
  } catch (error) {
    console.error("Error processing audio:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
