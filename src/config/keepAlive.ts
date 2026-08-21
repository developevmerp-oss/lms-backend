import cron from "node-cron";
import https from "https";
import http from "http";

/**
 * Keeps the Render free-tier server warm by pinging itself every 10 minutes.
 * Without this, Render spins the server down after ~15 minutes of inactivity,
 * causing 30-60 second cold starts on the next request.
 */
export const startKeepAlive = () => {
  const backendUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL;

  if (!backendUrl) {
    console.log("[KeepAlive] No BACKEND_URL set — skipping keep-alive (local dev mode)");
    return;
  }

  const healthUrl = `${backendUrl}/api/health`;
  console.log(`[KeepAlive] Starting keep-alive ping every 10 min ? ${healthUrl}`);

  // Ping every 10 minutes
  cron.schedule("*/10 * * * *", () => {
    const isHttps = healthUrl.startsWith("https");
    const lib = isHttps ? https : http;

    const req = lib.get(healthUrl, (res) => {
      console.log(`[KeepAlive] Ping OK — status: ${res.statusCode} at ${new Date().toISOString()}`);
    });

    req.on("error", (err) => {
      console.warn(`[KeepAlive] Ping failed: ${err.message}`);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.warn("[KeepAlive] Ping timed out after 10s");
    });
  });
};
