import mongoose from "mongoose";

const DB_CONNECT_RETRIES = Number(process.env.DB_CONNECT_RETRIES || 20);
const DB_RETRY_DELAY_MS = Number(process.env.DB_RETRY_DELAY_MS || 3000);

export async function connectDB(): Promise<void> {
  let retries = DB_CONNECT_RETRIES;
  while (retries > 0) {
    try {
      await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/tembleques_camila");
      console.log("[DB] Connected to MongoDB successfully");
      return;
    } catch (error) {
      retries -= 1;
      const reason = error instanceof Error ? error.message : String(error);
      console.log(`[DB] Connection failed. Retries remaining: ${retries}. Reason: ${reason}`);
      if (retries === 0) {
        console.error("[DB] Could not connect to MongoDB:", error);
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, DB_RETRY_DELAY_MS));
    }
  }
}
