import mongoose from "mongoose";

const sensorSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Sensor = mongoose.model("Sensor", sensorSchema);


export default Sensor;
