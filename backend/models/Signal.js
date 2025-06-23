import mongoose from "mongoose";

const signalSchema = new mongoose.Schema(
  {
    detectedAt: {
      type: Date,
      default: Date.now, 
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true, 
  }
);

const Signal = mongoose.model("Signal", signalSchema);

export default Signal;