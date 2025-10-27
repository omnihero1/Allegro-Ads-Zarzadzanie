import * as functions from "firebase-functions/v2";
import {defineSecret} from "firebase-functions/params";
import express from "express";
import * as admin from "firebase-admin";
import axios from "axios";

// Define secrets
const allegroClientId = defineSecret("ALLEGRO_CLIENT_ID");
const allegroClientSecret = defineSecret("ALLEGRO_CLIENT_SECRET");

const app = express();

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

// Get accounts from Firestore
app.get("/auth/allegro/accounts", async (_req, res) => {
  try {
    const accountsSnapshot = await admin.firestore()
      .collection("allegroAccounts")
      .get();

    const accounts = accountsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({accounts});
  } catch (error: unknown) {
    console.error("Error fetching accounts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({error: "Failed to fetch accounts", details: errorMessage});
  }
});

// Device flow - start
app.post("/auth/allegro/device/start", async (req, res) => {
  try {
    const clientId = allegroClientId.value();
    const clientSecret = allegroClientSecret.value();

    const deviceRes = await axios.post(
      `https://allegro.pl/auth/oauth/device?client_id=${clientId}`,
      {},
      {
        auth: {username: clientId, password: clientSecret},
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    res.json(deviceRes.data);
  } catch (error: unknown) {
    console.error("Device flow start error:", error);
    const errorData = axios.isAxiosError(error) ? error.response?.data : null;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({
      error: "Device flow start failed",
      details: errorData || errorMessage,
    });
  }
});

// Device flow - poll
app.post("/auth/allegro/device/poll", async (req, res) => {
  try {
    const {device_code} = req.body;
    const clientId = allegroClientId.value();
    const clientSecret = allegroClientSecret.value();

    const data = new URLSearchParams();
    data.set("grant_type", "urn:ietf:params:oauth:grant-type:device_code");
    data.set("device_code", device_code);

    const tokenRes = await axios.post(
      "https://allegro.pl/auth/oauth/token",
      data,
      {
        auth: {username: clientId, password: clientSecret},
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    // Get user info
    const userInfo = await axios.get("https://api.allegro.pl/me", {
      headers: {
        "Authorization": `Bearer ${tokenRes.data.access_token}`,
        "Accept": "application/vnd.allegro.public.v1+json",
      },
    });

    // Save to Firestore
    const accountData = {
      id: userInfo.data.id.toString(),
      name: userInfo.data.login,
      email: userInfo.data.email,
      status: "active",
      tokens: tokenRes.data,
      lastRefresh: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await admin.firestore()
      .collection("allegroAccounts")
      .doc(accountData.id)
      .set(accountData, {merge: true});

    console.log(`Account saved: ${accountData.email}`);

    res.json({ok: true, account: accountData});
  } catch (error: unknown) {
    console.error("Device flow poll error:", error);
    const errorData = axios.isAxiosError(error) ? error.response?.data : null;

    // Check for specific error codes
    const errorCode = errorData?.details?.error || errorData?.error;
    if (errorCode === "authorization_pending" || errorCode === "slow_down") {
      res.status(202).json(errorData);
      return;
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({
      error: "Device flow poll failed",
      details: errorData || errorMessage,
    });
  }
});

// Export as Firebase Function
export const api = functions.https.onRequest(
  {
    region: "us-central1",
    cors: allowedOrigins,
    memory: "512MiB",
    timeoutSeconds: 60,
    secrets: [allegroClientId, allegroClientSecret],
  },
  app
);

