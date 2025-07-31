import express from "express";
import express from "express";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import axios from "axios";
import geminiHandler from "./routes/gemini.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const wss = new WebSocketServer({ noServer: true });
let currentGeminiRequest = null;

wss.on("connection", (ws) => {
  ws.on("message", async (message) => {
    const msg = JSON.parse(message);

    if (msg.type === "stop") {
      if (currentGeminiRequest) {
        currentGeminiRequest.cancel();
        currentGeminiRequest = null;
      }
      return;
    }

    if (msg.type === "audio") {
      ws.send(JSON.stringify({ type: "speaking" }));
      const CancelToken = axios.CancelToken;
      const source = CancelToken.source();
      currentGeminiRequest = source;

      try {
        const { text, audio } = await geminiHandler(msg.data, source.token);
        ws.send(JSON.stringify({ type: "response", text, audio }));
      } catch (err) {
        if (axios.isCancel(err)) console.log("Gemini request canceled");
        else console.error(err);
      }
      currentGeminiRequest = null;
    }
  });
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


