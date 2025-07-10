import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import Signal from "./models/Signal.js";
import Sensor from "./models/Sensor.js";
import http from "http";
import { Server } from "socket.io";
import axios from "axios";

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

    const savedSignal = await signal.save();

    const sensorLocation = await Sensor.findOne().sort({ createdAt: -1 });
    if (!sensorLocation) {
      const alert = "Signal saved, but no sensor location found.";
      io.emit("new-signal", { signal: savedSignal, alert });
      return res.status(201).json({ signal: savedSignal, alert });
    }

    const radius = 0.01; 
    const lat = sensorLocation.latitude;
    const lon = sensorLocation.longitude;

    const lamin = lat - radius;
    const lamax = lat + radius;
    const lomin = lon - radius;
    const lomax = lon + radius;

    const response = await axios.get("https://opensky-network.org/api/states/all", {
      params: { lamin, lamax, lomin, lomax },
    });

    const flights = (response.data.states || []).map((state) => ({
      latitude: state[6],
      longitude: state[5],
    }));

    const matched = flights.some((plane) =>
      typeof plane.latitude === "number" && typeof plane.longitude === "number"
    );

    const alert = matched
      ? "✅ Aircraft detected nearby — signal aligns with known flight."
      : "⚠️ Unknown aircraft detected — no matching public flight nearby.";

    io.emit("new-signal", { signal: savedSignal, alert });
    res.status(201).json({ signal: savedSignal, alert });

  } catch (err) {
    console.error("POST /signals error:", err.message);
    res.status(500).json({ message: "Failed to process signal", error: err.message });
  }
});


app.get("/signals", async (req, res) => {
  try {
    const signals = await Signal.find().sort({ detectedAt: -1 });
    res.json(signals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/signals", async (req, res) => {
  try {
    await Signal.deleteMany({});
    io.emit("cleared-signals");
    res.status(200).json({ message: "All signals cleared" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Sensors
app.post("/sensors", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const updated = await Sensor.findOneAndUpdate(
      {}, // match any document
      { latitude, longitude, createdAt: new Date() },
      { upsert: true, new: true }
    );

    io.emit("sensor-location-updated", updated);
    res.status(201).json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


app.get("/sensor-location", async (req, res) => {
  try {
    const latestSensor = await Sensor.findOne().sort({ createdAt: -1 });
    res.json(latestSensor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/flights-nearby", async (req, res) => {
  const { latitude, longitude, radius } = req.query;

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  const rad = parseFloat(radius) 

  const lamin = lat - rad;
  const lamax = lat + rad;
  const lomin = lon - rad;
  const lomax = lon + rad;

  try {
    const response = await axios.get("https://opensky-network.org/api/states/all", {
      params: { lamin, lamax, lomin, lomax },
    });

    const flights = response.data.states.map((state) => ({
      icao24: state[0],
      callsign: state[1]?.trim(),
      origin_country: state[2],
      longitude: state[5],
      latitude: state[6],
      altitude: state[13],
    }));

    res.json({ time: response.data.time, flights });
  } catch (error) {
    console.error("OpenSky fetch error:", error.message);
    res.status(500).json({ error: "Failed to fetch flight data" });
  }
});

app.get("/api/recent-flights", async (req, res) => {
  try {
    const sensorLocation = await Sensor.findOne().sort({ createdAt: -1 });
    if (!sensorLocation) {
      return res.status(404).json({ message: "No sensor location available" });
    }

    const radius = 0.5;
    const lamin = sensorLocation.latitude - radius;
    const lamax = sensorLocation.latitude + radius;
    const lomin = sensorLocation.longitude - radius;
    const lomax = sensorLocation.longitude + radius;

    const response = await axios.get("https://opensky-network.org/api/states/all", {
      params: { lamin, lamax, lomin, lomax }
    });

    const flights = (response.data.states || [])
      .filter(state => state[1] && state[13]) 
      .sort((a, b) => (b[4] || 0) - (a[4] || 0)) 
      .slice(0, 5)
      .map(state => ({
        callsign: state[1].trim(),
        altitude: state[13],
        timeSeen: new Date((state[4] || Date.now()) * 1000).toLocaleTimeString(),
        originCountry: state[2]
      }));

    res.json({ flights });
  } catch (err) {
    console.error("Recent flights fetch error:", err);
    res.status(500).json({ message: "Failed to fetch recent flights", error: err.message });
  }
});



server.listen(5000, () => {
  console.log("Server started at http://localhost:5000");
});
