import express from "express";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import geminiHandler from "./routes/gemini.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 10000;

const server = app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  ws.on("message", async (message) => {
    try {
      const msg = JSON.parse(message);

      if (msg.type === "stop") return;

      if (msg.type === "audio") {
        ws.send(JSON.stringify({ type: "speaking" }));
        const { text, audio } = await geminiHandler(msg.data);
        ws.send(JSON.stringify({ type: "response", text, audio }));
      }
    } catch (err) {
      console.error("WebSocket message error:", err);
      ws.send(JSON.stringify({ type: "response", text: "Server error", audio: null }));
    }
  });

  ws.on("error", (err) => console.error("WebSocket error:", err));
  ws.on("close", () => console.log("WebSocket closed"));
});

app.get("/", (req, res) => res.send("Backend running"));

const server = app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});


