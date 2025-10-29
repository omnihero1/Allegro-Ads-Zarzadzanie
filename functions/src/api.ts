import * as functions from "firebase-functions/v2";
import {defineSecret} from "firebase-functions/params";
import express from "express";
import {adsRouter} from "./routes/ads";
import {authRouter} from "./routes/auth";
import {ordersRouter} from "./routes/orders";
import {adminRouter} from "./routes/admin";
import {advertisingStatsRouter} from "./routes/advertising-stats";
import {accountMappingRouter} from "./routes/account-mapping";
import {billingRouter} from "./routes/billing";

// Define secrets
const allegroClientId = defineSecret("ALLEGRO_CLIENT_ID");
const allegroClientSecret = defineSecret("ALLEGRO_CLIENT_SECRET");

const app = express();

// Set env vars for routes that need them
app.use((req, _res, next) => {
  // Make secrets available to routes via process.env
  process.env.ALLEGRO_CLIENT_ID = allegroClientId.value();
  process.env.ALLEGRO_CLIENT_SECRET = allegroClientSecret.value();
  next();
});

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "https://allegro-ads-management-fe724.web.app",
  "https://allegro-ads-management-fe724.firebaseapp.com",
];

// Custom CORS middleware - set headers on EVERY response
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
      res.setHeader("Access-Control-Max-Age", "86400");
      res.status(204).end();
      return;
    }
  }

  next();
});

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ok: true, timestamp: new Date().toISOString()});
});

// Mount routes
app.use("/ads", adsRouter);
app.use("/auth/allegro", authRouter);
app.use("/orders", ordersRouter);
app.use("/admin", adminRouter);
app.use("/advertising-stats", advertisingStatsRouter);
app.use("/account-mapping", accountMappingRouter);
app.use("/billing", billingRouter);

// Export as Firebase Function - DISABLE built-in CORS, we handle it ourselves
export const api = functions.https.onRequest(
  {
    region: "us-central1",
    memory: "1GiB", // Increased for large order syncs
    timeoutSeconds: 540, // Max timeout (9 minutes)
    secrets: [allegroClientId, allegroClientSecret],
    // DO NOT set cors here - it conflicts with our custom middleware
  },
  app
);

