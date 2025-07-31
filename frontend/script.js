let ws;
let isAIResponding = false;

document.getElementById("startBtn").addEventListener("click", () => {
  ws = new WebSocket("https://voice-assistant-eij7.onrender.com/"); // update later after deployment

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.type === "response") {
      isAIResponding = false;
      document.getElementById("response").innerText = data.text;
      if (data.audio) playAudio(data.audio);
    } else if (data.type === "speaking") {
      isAIResponding = true;
    }
  };

  startRecording(ws);
});

async function startRecording(socket) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

  mediaRecorder.onstart = () => {
    if (isAIResponding) {
      socket.send(JSON.stringify({ type: "stop" }));
    }
  };

  mediaRecorder.ondataavailable = async (event) => {
    const arrayBuffer = await event.data.arrayBuffer();
    const base64Audio = arrayBufferToBase64(arrayBuffer);
    socket.send(JSON.stringify({ type: "audio", data: base64Audio }));
  };

  mediaRecorder.start(1000);
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function playAudio(base64) {
  const audioBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioContext.decodeAudioData(audioBytes.buffer, (buffer) => {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  });
}
