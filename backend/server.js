import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import Signal from "./models/Signal.js";

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is ready howu");
});

app.post("/signals", async (req, res) => {
  try {
    const { confidence, detectedAt } = req.body;

    const signal = new Signal({
      confidence,
      detectedAt: detectedAt || Date.now(),
    });

    const saved = await signal.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.listen(5000, () => {
  console.log("Server started at http://localhost:5000");
});
