/**
 * Advertising statistics API endpoints
 */

import {Router} from "express";
import * as admin from "firebase-admin";
import {syncAdvertisingStatsForClient} from "../advertising-stats/fetcher";
import axios from "axios";
import {getAccountToken} from "../utils/allegro-api";

// eslint-disable-next-line new-cap
export const advertisingStatsRouter = Router();

/**
 * Get agency clients
 * GET /advertising-stats/clients?accountId=xxx
 */
advertisingStatsRouter.get("/clients", async (req, res) => {
  try {
    const {accountId} = req.query;

    if (!accountId) {
      return res.status(400).json({error: "accountId is required"});
    }

    // Get fresh access token (will refresh if needed)
    const accessToken = await getAccountToken(accountId as string);

    // Fetch clients from Allegro API
    const response = await axios.get(
      "https://api.allegro.pl/advertising-agencies/clients",
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.allegro.public.v1+json",
        },
      }
    );

    return res.json({
      clients: response.data.clients || [],
      count: response.data.clients?.length || 0,
    });
  } catch (error: any) {
    console.error(
      "Failed to fetch agency clients:",
      error?.response?.data || error?.message
    );
    return res.status(error?.response?.status || 500).json({
      error: "Failed to fetch agency clients",
      details: error?.response?.data || error?.message,
    });
  }
});

/**
 * Trigger synchronization of advertising statistics
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
    const {accountId, clientId, dateFrom, dateTo, types} = req.body;

    if (!accountId || !clientId || !dateFrom || !dateTo) {
      return res.status(400).json({
        error: "accountId, clientId, dateFrom, and dateTo are required",
      });
    }

    // Validate date range (max 13 months as per API docs)
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const daysDiff = Math.ceil(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );

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
        error: "dateFrom must be before dateTo",
      });
    }

    // Default types
    const campaignTypes = types || ["SPONSORED_OFFER", "GRAPHIC_AD"];

    console.log(
      `Ad stats sync triggered for client ${clientId}: ` +
      `${dateFrom} to ${dateTo}`
    );

    // Run sync synchronously (Firebase Functions requirement)
    const result = await syncAdvertisingStatsForClient(
      accountId,
      clientId,
      dateFrom,
      dateTo,
      campaignTypes
    );

    console.log(
      `Ad stats sync completed for client ${clientId}: ` +
      `${result.statsCount} records`
    );

    return res.json({
      message: result.status === "success" ?
        "Synchronization completed successfully" :
        "Synchronization failed",
      result,
    });
  } catch (error: any) {
    console.error("Error triggering ad stats sync:", error);
    return res.status(500).json({
      error: "Failed to trigger synchronization",
      details: error.message,
    });
  }
});

/**
 * Get aggregated statistics for ALL clients of an account (for Dashboard)
 * GET /advertising-stats/account-summary?accountId=xxx&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 */
advertisingStatsRouter.get("/account-summary", async (req, res) => {
  try {
    const {accountId, dateFrom, dateTo} = req.query;

    if (!accountId) {
      return res.status(400).json({
        error: "accountId is required",
      });
    }

    const db = admin.firestore();
    let query = db
      .collection("dailyClientAdStats")
      .where("accountId", "==", accountId);

    if (dateFrom && dateTo) {
      query = query
        .where("day", ">=", dateFrom as string)
        .where("day", "<=", dateTo as string);
    }

    const snapshot = await query.get();
    const dailyStats = snapshot.docs.map((doc) => doc.data());

    console.log(
      `Found ${dailyStats.length} daily client ad stats records for account ${accountId}`
    );

    // Aggregate totals across ALL clients
    let totalCost = 0;
    let totalClicks = 0;
    let totalViews = 0;
    let totalAttributionValue = 0;
    let totalAttributionCount = 0;

    for (const dayStat of dailyStats) {
      totalCost += dayStat.combined?.totalCost || 0;
      totalClicks += dayStat.combined?.totalClicks || 0;
      totalViews += dayStat.combined?.totalViews || 0;
      totalAttributionValue += dayStat.combined?.totalAttributionValue || 0;

      // Sum attribution counts from both sponsored and graphic
      totalAttributionCount +=
        (dayStat.sponsoredOffers?.totalAttributionCount || 0) +
        (dayStat.graphicAds?.totalAttributionCount || 0);
    }

    return res.json({
      dateRange: {from: dateFrom, to: dateTo},
      summary: {
        totalCost,
        totalClicks,
        totalViews,
        totalAttributionValue,
        totalAttributionCount,
        roas: totalCost > 0 ? (totalAttributionValue / totalCost) * 100 : 0,
      },
      daysWithData: dailyStats.length,
    });
  } catch (error: any) {
    console.error("Error getting account ad stats summary:", error);
    return res.status(500).json({
      error: "Failed to get account ad stats summary",
      details: error.message,
    });
  }
});

/**
 * Get aggregated client statistics
 * GET /advertising-stats/client-stats?accountId=xxx&clientId=xxx&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 */
advertisingStatsRouter.get("/client-stats", async (req, res) => {
  try {
    const {accountId, clientId, dateFrom, dateTo} = req.query;

    if (!accountId || !clientId) {
      return res.status(400).json({
        error: "accountId and clientId are required",
      });
    }

    const db = admin.firestore();
    let query = db
      .collection("dailyClientAdStats")
      .where("accountId", "==", accountId)
      .where("clientId", "==", clientId);

    if (dateFrom && dateTo) {
      query = query
        .where("day", ">=", dateFrom as string)
        .where("day", "<=", dateTo as string);
    }

    const snapshot = await query.orderBy("day", "asc").get();
    const dailyStats = snapshot.docs.map((doc) => doc.data());

    // Aggregate totals
    let totalCost = 0;
    let totalClicks = 0;
    let totalViews = 0;
    let totalAttributionValue = 0;
    let totalAttributionCount = 0;

    for (const dayStat of dailyStats) {
      totalCost += dayStat.combined?.totalCost || 0;
      totalClicks += dayStat.combined?.totalClicks || 0;
      totalViews += dayStat.combined?.totalViews || 0;
      totalAttributionValue += dayStat.combined?.totalAttributionValue || 0;

      // Sum attribution counts from both sponsored and graphic
      totalAttributionCount +=
        (dayStat.sponsoredOffers?.totalAttributionCount || 0) +
        (dayStat.graphicAds?.totalAttributionCount || 0);
    }

    return res.json({
      dateRange: {from: dateFrom, to: dateTo},
      summary: {
        totalCost,
        totalClicks,
        totalViews,
        totalAttributionValue,
        totalAttributionCount,
        roas: totalCost > 0 ? (totalAttributionValue / totalCost) * 100 : 0,
      },
      dailyStats,
      daysWithData: dailyStats.length,
    });
  } catch (error: any) {
    console.error("Error getting client stats:", error);
    return res.status(500).json({
      error: "Failed to get client statistics",
      details: error.message,
    });
  }
});

/**
 * Get sync logs
 * GET /advertising-stats/sync-logs?accountId=xxx&clientId=xxx&limit=10
 */
advertisingStatsRouter.get("/sync-logs", async (req, res) => {
  try {
    const {accountId, clientId, limit = 10} = req.query;

    if (!accountId) {
      return res.status(400).json({error: "accountId is required"});
    }

    const db = admin.firestore();
    let query: FirebaseFirestore.Query = db
      .collection("advertisingStatsSyncLogs")
      .where("accountId", "==", accountId);

    if (clientId) {
      query = query.where("clientId", "==", clientId);
    }

    query = query.orderBy("lastSyncAt", "desc").limit(Number(limit));

    const snapshot = await query.get();
    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      logs,
      count: logs.length,
    });
  } catch (error: any) {
    console.error("Error getting sync logs:", error);
    return res.status(500).json({
      error: "Failed to get sync logs",
      details: error.message,
    });
  }
});

/**
 * Get top 10 products from Ads (based on attribution value)
 * GET /advertising-stats/top-products?accountId=xxx&clientId=xxx&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 */
advertisingStatsRouter.get("/top-products", async (req, res) => {
  try {
    const {accountId, clientId, dateFrom, dateTo} = req.query;

    if (!accountId || !clientId) {
      return res.status(400).json({
        error: "accountId and clientId are required",
      });
    }

    const db = admin.firestore();
    let query = db
      .collection("advertisingStatistics")
      .where("accountId", "==", accountId)
      .where("clientId", "==", clientId)
      .where("type", "==", "SPONSORED_OFFER"); // Only sponsored offers have offerId

    if (dateFrom && dateTo) {
      query = query
        .where("day", ">=", dateFrom as string)
        .where("day", "<=", dateTo as string);
    }

    const snapshot = await query.get();
    const stats = snapshot.docs.map((doc) => doc.data());

    console.log(
      `Found ${stats.length} sponsored offer stats for top products analysis`
    );

    // Aggregate by offerId
    const productMap = new Map<string, {
      offerId: string;
      adName: string;
      sales: number;
      orders: number;
    }>();

    for (const stat of stats) {
      const offerId = stat.offerId;
      if (!offerId) continue; // Skip if no offerId

      const sales = parseFloat(stat.stats?.totalAttributionValue || "0");
      const orders = stat.stats?.totalAttributionCount || 0;

      if (productMap.has(offerId)) {
        const existing = productMap.get(offerId)!;
        existing.sales += sales;
        existing.orders += orders;
      } else {
        productMap.set(offerId, {
          offerId,
          adName: stat.adName || "Nieznany produkt",
          sales,
          orders,
        });
      }
    }

    // Convert to array and sort by sales
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10); // Top 10

    console.log(`Returning top ${topProducts.length} products from Ads`);

    return res.json({
      dateRange: {from: dateFrom, to: dateTo},
      topProducts,
      totalProducts: productMap.size,
    });
  } catch (error: any) {
    console.error("Error getting top products from Ads:", error);
    return res.status(500).json({
      error: "Failed to get top products from Ads",
      details: error.message,
    });
  }
});
