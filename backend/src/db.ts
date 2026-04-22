import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/tembleques_camila";

export async function connectDB(): Promise<void> {
  let retries = 5;
  while (retries > 0) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log("[DB] Connected to MongoDB successfully");
      return;
    } catch (error) {
      retries -= 1;
      console.log(`[DB] Connection failed. Retries remaining: ${retries}`);
      if (retries === 0) {
        console.error("[DB] Could not connect to MongoDB:", error);
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}
