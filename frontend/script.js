let ws;
let isRecording = false;

document.getElementById("startBtn").addEventListener("click", () => {
  if (!ws || ws.readyState === WebSocket.CLOSED) {
    ws = new WebSocket("wss://YOUR-BACKEND-URL.onrender.com"); // Replace with your Render backend URL
    ws.onopen = () => {
      console.log("WebSocket connected");
      toggleMic(true);
      startRecording(ws);
    };
    ws.onmessage = handleMessage;
    ws.onerror = (err) => console.error("WebSocket error:", err);
    ws.onclose = () => console.log("WebSocket closed");
  } else {
    toggleMic(true);
    startRecording(ws);
  }
});

function handleMessage(msg) {
  const data = JSON.parse(msg.data);
  if (data.type === "response") {
    document.getElementById("response").innerText = data.text;
    if (data.audio) playAudio(data.audio);
  }
}

function toggleMic(state) {
  const btn = document.getElementById("startBtn");
  const micInd = document.getElementById("micIndicator");
  if (state) {
    btn.textContent = "🛑 Stop Talking";
    btn.classList.remove("mic-off");
    btn.classList.add("mic-on");
    micInd.style.display = "block";
    isRecording = true;
  } else {
    btn.textContent = "🎤 Start Talking";
    btn.classList.remove("mic-on");
    btn.classList.add("mic-off");
    micInd.style.display = "none";
    isRecording = false;
  }
}

async function startRecording(socket) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

  mediaRecorder.onstop = () => toggleMic(false);

  mediaRecorder.ondataavailable = async (event) => {
    if (socket.readyState === WebSocket.OPEN) {
      const arrayBuffer = await event.data.arrayBuffer();
      const base64Audio = arrayBufferToBase64(arrayBuffer);
      socket.send(JSON.stringify({ type: "audio", data: base64Audio }));
      mediaRecorder.stop(); // Stop after one response cycle
    }
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
  const audioBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioContext.decodeAudioData(audioBytes.buffer, (buffer) => {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  });
}
