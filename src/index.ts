import { Hono } from "hono";
import cron from "node-cron";
import { processInvoices } from "./processor";
import "dotenv/config";

const app = new Hono();

app.get("/", (c) => c.text("Invoice Automation Hub is running! 🚀"));

// --- CRON JOB ---
// Default: Every hour
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 * * * *";

cron.schedule(CRON_SCHEDULE, async () => {
  console.log("⏰ Running scheduled invoice check...");
  try {
    await processInvoices();
  } catch (err) {
    console.error("❌ Scheduled check failed:", err);
  }
});

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};
