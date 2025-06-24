import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import Signal from "./models/Signal.js";
import http from "http";
import { Server } from "socket.io";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
});

app.post("/signals", async (req, res) => {
  try {
    const { confidence, detectedAt } = req.body;

    const signal = new Signal({
      confidence,
      detectedAt: detectedAt || Date.now(),
    });

    const saved = await signal.save();
    io.emit("new-signal", saved);
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get("/signals", async (req, res) => {
  try {
    const signals = await Signal.find().sort({ detectedAt: -1 }); // newest first
    res.json(signals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

server.listen(5000, () => {
  console.log("Server started at http://localhost:5000");
});
