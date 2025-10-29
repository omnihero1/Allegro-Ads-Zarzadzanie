/**
 * Advertising statistics routes
 */

import {Router} from "express";
import admin from "firebase-admin";
import {
  fetchAgencyClients,
  syncAdvertisingStatistics,
} from "../advertising-stats/fetcher";

export const advertisingStatsRouter = Router();

/**
 * Get agency clients list
 * GET /advertising-stats/clients?accountId=xxx
 */
advertisingStatsRouter.get("/clients", async (req, res) => {
  try {
    const {accountId} = req.query;

    if (!accountId) {
      return res.status(400).json({error: "accountId is required"});
    }

    console.log(`Fetching agency clients for account ${accountId}`);

    const clients = await fetchAgencyClients(accountId as string);

    return res.json({
      clients,
      count: clients.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch agency clients:", error);
    return res.status(500).json({
      error: "Failed to fetch agency clients",
      details: error.message,
    });
  }
});

/**
 * Trigger advertising statistics sync
 * POST /advertising-stats/sync
 * Body: {
 *   accountId: string,
 *   clientId: string,
 *   dateFrom: "YYYY-MM-DD",
 *   dateTo: "YYYY-MM-DD",
 *   types?: ["SPONSORED_OFFER", "GRAPHIC_AD"]
 * }
 */
advertisingStatsRouter.post("/sync", async (req, res) => {
  try {
    const {
      accountId,
      clientId,
      dateFrom,
      dateTo,
      types = ["SPONSORED_OFFER", "GRAPHIC_AD"],
    } = req.body;

    if (!accountId || !clientId || !dateFrom || !dateTo) {
      return res.status(400).json({
        error: "accountId, clientId, dateFrom, and dateTo are required",
      });
    }

    // Validate date range (max 13 months as per API docs)
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 390) {
      // ~13 months
      return res.status(400).json({
        error: "Date range too large. Maximum 13 months allowed.",
        maxDays: 390,
        requestedDays: daysDiff,
      });
    }

    if (daysDiff < 0) {
      return res.status(400).json({
        error: "dateFrom must be earlier than dateTo",
      });
    }

    console.log(
      `Advertising stats sync triggered for account ${accountId}, ` +
      `client ${clientId}: ${dateFrom} to ${dateTo}`
    );

    // Run sync synchronously
    const result = await syncAdvertisingStatistics(
      accountId,
      clientId,
      dateFrom,
      dateTo,
      types
    );

    console.log(
      `Advertising stats sync completed for client ${clientId}: ` +
      `${result.status}`
    );

    return res.json({
      message: result.status === "success" ?
        "Sync completed successfully" :
        "Sync failed",
      result,
    });
  } catch (error: any) {
    console.error("Error triggering advertising stats sync:", error);
    return res.status(500).json({
      error: "Failed to trigger advertising stats sync",
      details: error.message,
    });
  }
});

/**
 * Get advertising statistics sync logs
 * GET /advertising-stats/sync-logs?accountId=xxx&clientId=xxx&limit=10
 */
advertisingStatsRouter.get("/sync-logs", async (req, res) => {
  try {
    const {accountId, clientId, limit = 10} = req.query;

    const db = admin.firestore();
    let query: FirebaseFirestore.Query = db.collection(
      "advertisingStatsSyncLogs"
    );

    if (accountId) {
      query = query.where("accountId", "==", accountId);
    }

    if (clientId) {
      query = query.where("clientId", "==", clientId);
    }

    const snapshot = await query
      .orderBy("lastSyncAt", "desc")
      .limit(Number(limit))
      .get();

    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      logs,
      count: logs.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch advertising stats sync logs:", error);
    return res.status(500).json({
      error: "Failed to fetch sync logs",
      details: error.message,
    });
  }
});

/**
 * Get advertising statistics from database
 * GET /advertising-stats/data?accountId=xxx&clientId=xxx&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 */
advertisingStatsRouter.get("/data", async (req, res) => {
  try {
    const {accountId, clientId, dateFrom, dateTo, type, limit = 100} = req.query;

    if (!accountId) {
      return res.status(400).json({error: "accountId is required"});
    }

    const db = admin.firestore();
    let query: FirebaseFirestore.Query = db
      .collection("advertisingStatistics")
      .where("accountId", "==", accountId);

    if (clientId) {
      query = query.where("clientId", "==", clientId);
    }

    if (type) {
      query = query.where("type", "==", type);
    }

    if (dateFrom) {
      query = query.where("day", ">=", dateFrom);
    }

    if (dateTo) {
      query = query.where("day", "<=", dateTo);
    }

    const snapshot = await query
      .orderBy("day", "desc")
      .limit(Number(limit))
      .get();

    const stats = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      statistics: stats,
      count: stats.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch advertising statistics:", error);
    return res.status(500).json({
      error: "Failed to fetch advertising statistics",
      details: error.message,
    });
  }
});

