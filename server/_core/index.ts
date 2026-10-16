import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { sendTelegramEventReminder } from "../telegramReminder";
import { registerEmailOAuthRoutes } from "../emailOAuth";
import { runEmailAiSyncReminder } from "../emailAiReminder";
import { runEmailRetentionReminder } from "../emailRetentionReminder";
import { runDailyQuoteReminder } from "../dailyQuoteReminder";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Minimal CORS: the frontend is hosted on GitHub Pages (cross-origin)
  // while this backend runs on ntpha behind a Cloudflare Tunnel.
  // Without these headers the browser blocks tRPC calls, so auth.me
  // never resolves and the app stays on the login screen.
  const allowedOrigins = (process.env.CORS_ORIGINS || "https://tanphap.github.io")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    if (origin && (allowedOrigins.includes("*") || allowedOrigins.includes(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        (req.headers["access-control-request-headers"] as string) || "Authorization, Content-Type"
      );
      res.setHeader("Access-Control-Max-Age", "86400");
      res.status(204).end();
      return;
    }
    next();
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerEmailOAuthRoutes(app);
  app.post("/api/scheduled/telegram-event-reminder", sendTelegramEventReminder);
  app.post("/api/scheduled/email-ai-sync", runEmailAiSyncReminder);
  app.post("/api/scheduled/email-retention", runEmailRetentionReminder);
  app.post("/api/scheduled/daily-ai-quote", runDailyQuoteReminder);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
