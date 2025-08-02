let ws, audioContext, mediaStream, sourceNode, recorderNode;
let isRecording = false;
let recordedChunks = [];
const sampleRate = 16000;

document.getElementById("startBtn").addEventListener("click", async () => {
  if (!ws || ws.readyState === WebSocket.CLOSED) {
    ws = new WebSocket("wss://voice-assistant-x36v.onrender.com");
    ws.onopen = () => { console.log("WebSocket connected"); startRecording(); };
    ws.onmessage = handleMessage;
    ws.onerror = (err) => console.error("WebSocket error:", err);
    ws.onclose = () => console.log("WebSocket closed");
  } else {
    if (!isRecording) startRecording();
    else stopRecording();
  }
});

function handleMessage(msg) {
  const data = JSON.parse(msg.data);
  if (data.type === "response") {
    document.getElementById("response").innerText = data.text;
    if (data.audio) playAudio(data.audio);
  }
}

async function startRecording() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
  await audioContext.audioWorklet.addModule("recorder-processor.js");

  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  sourceNode = audioContext.createMediaStreamSource(mediaStream);

  recorderNode = new AudioWorkletNode(audioContext, "recorder-processor");
  recorderNode.port.onmessage = (event) => recordedChunks.push(event.data);

  // Only connect source to recorder node (no speaker feedback)
  sourceNode.connect(recorderNode);

  document.getElementById("startBtn").textContent = "🛑 Stop Talking";
  isRecording = true;
}

function stopRecording() {
  sourceNode.disconnect();
  recorderNode.disconnect();
  mediaStream.getTracks().forEach(track => track.stop());

  // Merge Float32 samples
  const buffer = flattenArray(recordedChunks, recordedChunks.reduce((a, b) => a + b.length, 0));
  const wavBuffer = encodeWAV(buffer, sampleRate);
  const base64Audio = arrayBufferToBase64(wavBuffer);

  console.log("Sending audio length:", base64Audio.length);
  ws.send(JSON.stringify({ type: "audio", data: base64Audio }));

  recordedChunks = [];
  document.getElementById("startBtn").textContent = "🎤 Start Talking";
  isRecording = false;
}

function flattenArray(channelBuffer, length) {
  const result = new Float32Array(length);
  let offset = 0;
  channelBuffer.forEach(chunk => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
}

function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeUTFBytes(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeUTFBytes(view, 8, "WAVE");
  writeUTFBytes(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeUTFBytes(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
}

function writeUTFBytes(view, offset, string) {
  for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function playAudio(base64) {
  const audioBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioContext.decodeAudioData(audioBytes.buffer, (buffer) => {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  });
}