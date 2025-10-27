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

// Helper to get account and access token
async function getAccountToken(accountId: string) {
  const accountDoc = await admin.firestore()
    .collection("allegroAccounts")
    .doc(accountId)
    .get();

  if (!accountDoc.exists) {
    throw new Error("Account not found");
  }

  const accountData = accountDoc.data();
  if (!accountData?.tokens?.access_token) {
    throw new Error("No access token found");
  }

  return {
    account: accountData,
    accessToken: accountData.tokens.access_token,
  };
}

// Get agency clients
app.get("/ads/clients", async (req, res) => {
  try {
    const {accountId, status = "ACTIVE"} = req.query;

    if (!accountId) {
      res.status(400).json({error: "accountId is required"});
      return;
    }

    const {accessToken} = await getAccountToken(accountId as string);

    const statusArray = (status as string).split(",");

    // Fetch all clients using pagination
    const allClients: unknown[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(
        "https://api.allegro.pl/ads/clients",
        {
          params: {
            status: statusArray,
            limit,
            offset,
          },
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/vnd.allegro.beta.v1+json",
          },
        }
      );

      const clients = response.data.clients || [];
      const totalCount = response.data.totalCount || 0;

      allClients.push(...clients);

      offset += clients.length;
      hasMore = offset < totalCount && clients.length > 0;
    }

    res.json({
      clients: allClients,
      count: allClients.length,
      totalCount: allClients.length,
    });
  } catch (error: unknown) {
    console.error("Error fetching clients:", error);
    const errorData = axios.isAxiosError(error) ? error.response?.data : null;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Failed to fetch clients",
      details: errorData || errorMessage,
    });
  }
});

// Get ad groups
app.get("/ads/adgroups", async (req, res) => {
  try {
    const {accountId, adsClientId, campaignId, status = "ACTIVE"} = req.query;

    if (!accountId || !adsClientId) {
      res.status(400).json({error: "accountId and adsClientId are required"});
      return;
    }

    const {accessToken} = await getAccountToken(accountId as string);

    const statusArray = (status as string).split(",");

    const params: Record<string, unknown> = {
      status: statusArray,
      limit: 1000,
      offset: 0,
    };

    if (campaignId) {
      params.campaignId = campaignId;
    }

    const response = await axios.get(
      `https://api.allegro.pl/ads/clients/${adsClientId}/adgroups`,
      {
        params,
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.allegro.public.v1+json",
        },
      }
    );

    res.json(response.data);
  } catch (error: unknown) {
    console.error("Error fetching ad groups:", error);
    const errorData = axios.isAxiosError(error) ? error.response?.data : null;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Failed to fetch ad groups",
      details: errorData || errorMessage,
    });
  }
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

// Export as Firebase Function - DISABLE built-in CORS, we handle it ourselves
export const api = functions.https.onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 60,
    secrets: [allegroClientId, allegroClientSecret],
    // DO NOT set cors here - it conflicts with our custom middleware
  },
  app
);

