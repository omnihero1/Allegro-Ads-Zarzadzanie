import {Router} from "express";
import {syncBillingForAccount} from "../billing/fetcher";

// eslint-disable-next-line new-cap
const billingRouter = Router();

/**
 * Trigger synchronization of billing entries
 * POST /billing/sync
 * Body: {
 *   accountId: string,
 *   dateFrom: "YYYY-MM-DD",
 *   dateTo: "YYYY-MM-DD"
 * }
 */
billingRouter.post("/sync", async (req, res) => {
  try {
    const {accountId, dateFrom, dateTo} = req.body;

    if (!accountId || !dateFrom || !dateTo) {
      return res.status(400).json({
        error: "accountId, dateFrom, and dateTo are required",
      });
    }

    // Validate date range (max 1 year)
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const daysDiff = Math.ceil(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff > 365) {
      return res.status(400).json({
        error: "Date range too large. Maximum 1 year (365 days) allowed.",
        maxDays: 365,
        requestedDays: daysDiff,
      });
    }

    if (daysDiff < 0) {
      return res.status(400).json({
        error: "dateFrom must be before dateTo",
      });
    }

    console.log(
      `Billing sync triggered for account ${accountId}: ${dateFrom} to ${dateTo}`
    );

    // Run sync
    const result = await syncBillingForAccount(accountId, dateFrom, dateTo);

    console.log(
      `Billing sync completed for account ${accountId}: ${result.entriesCount} entries`
    );

    return res.json({
      message:
        result.status === "success" ?
          "Synchronization completed successfully" :
          "Synchronization failed",
      result,
    });
  } catch (error: any) {
    console.error("Error triggering billing sync:", error);
    return res.status(500).json({
      error: "Failed to sync billing entries",
      details: error?.response?.data || error?.message,
    });
  }
});

/**
 * Get billing sync logs for an account
 * GET /billing/sync-logs?accountId=xxx&limit=10
 */
billingRouter.get("/sync-logs", async (req, res) => {
  try {
    const {accountId, limit = "10"} = req.query;

    if (!accountId) {
      return res.status(400).json({
        error: "accountId is required",
      });
    }

    const admin = await import("firebase-admin");
    const db = admin.firestore();

    const logsSnapshot = await db
      .collection("billingSyncLogs")
      .where("accountId", "==", accountId)
      .orderBy("lastSyncAt", "desc")
      .limit(parseInt(limit as string, 10))
      .get();

    const logs = logsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      lastSyncAt: doc.data().lastSyncAt?.toDate(),
      lastSuccessfulSyncAt: doc.data().lastSuccessfulSyncAt?.toDate(),
    }));

    return res.json({logs});
  } catch (error: any) {
    console.error("Error fetching billing sync logs:", error);
    return res.status(500).json({
      error: "Failed to fetch billing sync logs",
      details: error.message,
    });
  }
});

/**
 * Get daily billing statistics for an account
 * GET /billing/daily-stats?accountId=xxx&dateFrom=2024-01-01&dateTo=2024-01-31
 */
billingRouter.get("/daily-stats", async (req, res) => {
  try {
    const {accountId, dateFrom, dateTo} = req.query;

    if (!accountId || !dateFrom || !dateTo) {
      return res.status(400).json({
        error: "accountId, dateFrom, and dateTo are required",
      });
    }

    const admin = await import("firebase-admin");
    const db = admin.firestore();

    const statsSnapshot = await db
      .collection("dailyBillingStats")
      .where("accountId", "==", accountId)
      .where("day", ">=", dateFrom)
      .where("day", "<=", dateTo)
      .orderBy("day", "asc")
      .get();

    const stats = statsSnapshot.docs.map((doc) => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));

    // Calculate totals
    const totals = stats.reduce(
      (acc, stat: any) => ({
        totalCost: acc.totalCost + (stat.totalCost || 0),
        listingFees: acc.listingFees + (stat.listingFees || 0),
        commissions: acc.commissions + (stat.commissions || 0),
        promotions: acc.promotions + (stat.promotions || 0),
        otherFees: acc.otherFees + (stat.otherFees || 0),
        entriesCount: acc.entriesCount + (stat.entriesCount || 0),
      }),
      {
        totalCost: 0,
        listingFees: 0,
        commissions: 0,
        promotions: 0,
        otherFees: 0,
        entriesCount: 0,
      }
    );

    return res.json({
      stats,
      totals,
      count: stats.length,
    });
  } catch (error: any) {
    console.error("Error fetching daily billing stats:", error);
    return res.status(500).json({
      error: "Failed to fetch daily billing stats",
      details: error.message,
    });
  }
});

export {billingRouter};

