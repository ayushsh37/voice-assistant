import axios from "axios";

export default async function geminiHandler(audioBase64, cancelToken) {
  const API_KEY = process.env.GEMINI_API_KEY;
  const response = await axios.post(
    "https://api.gemini.google.com/v1/live",
    {
      model: "gemini-2.5-flash-preview-native-audio-dialog",
      audio: audioBase64,
      output: ["text", "audio"]
    },
    {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cancelToken
    }
  );
  return { text: response.data.text, audio: response.data.audio };
}
