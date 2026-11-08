import mongoose from "mongoose";
import { config } from "./env.js";

let isConnected = false;

export async function connectDB() {
  if (!config.mongoUri) {
    console.log("[MongoDB] No MONGODB_URI provided in .env. Running with in-memory store.");
    return false;
  }

  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 6000,
    });

    isConnected = true;
    console.log(`[MongoDB] Connected successfully to: ${config.mongoUri.replace(/:([^:@]{1,})@/, ":****@")}`);
    return true;
  } catch (err) {
    console.warn(`[MongoDB] Could not connect to MongoDB (${err.message}).`);
    console.warn("[MongoDB] Operating in high-speed in-memory store mode.");
    isConnected = false;
    return false;
  }
}

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export default mongoose;

