/**
 * Orders API endpoints
 */

import {Router} from "express";
import * as admin from "firebase-admin";
import {syncOrdersForAccount} from "../orders/fetcher";

// eslint-disable-next-line new-cap
export const ordersRouter = Router();

/**
 * Get orders grouped by month
 * GET /orders/by-month?accountId=xxx
 */
ordersRouter.get("/by-month", async (req, res) => {
  try {
    const {accountId} = req.query;

    if (!accountId) {
      return res.status(400).json({error: "accountId is required"});
    }

    const db = admin.firestore();
    const snapshot = await db
      .collection("orders")
      .where("accountId", "==", accountId)
      .get();

    console.log(`Found ${snapshot.size} total orders for account ${accountId}`);

    // Group by month
    const byMonth: {
      [month: string]: {
        count: number;
        totalValue: number;
        totalItems: number;
      };
    } = {};

    for (const doc of snapshot.docs) {
      const order = doc.data();
      const boughtAt = order.boughtAt;

      if (!boughtAt) continue;

      // Extract YYYY-MM from boughtAt
      const month = boughtAt.substring(0, 7); // "2025-10"

      if (!byMonth[month]) {
        byMonth[month] = {count: 0, totalValue: 0, totalItems: 0};
      }

      byMonth[month].count++;

      const amount = parseFloat(order.summary?.totalToPay?.amount || "0");
      byMonth[month].totalValue += amount;

      for (const item of order.lineItems || []) {
        byMonth[month].totalItems += item.quantity || 0;
      }
    }

    // Sort by month (descending)
    const sorted = Object.entries(byMonth)
      .map(([month, data]) => ({
        month,
        ...data,
        totalValue: parseFloat(data.totalValue.toFixed(2)),
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return res.json({
      accountId,
      totalOrders: snapshot.size,
      byMonth: sorted,
    });
  } catch (error: any) {
    console.error("Failed to get orders by month:", error);
    return res.status(500).json({
      error: "Failed to get orders by month",
      details: error.message,
    });
  }
});

/**
 * Count orders in database (for debugging)
 * GET /orders/count?accountId=xxx&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 */
ordersRouter.get("/count", async (req, res) => {
  try {
    const {accountId, dateFrom, dateTo} = req.query;

    if (!accountId) {
      return res.status(400).json({error: "accountId is required"});
    }

    const db = admin.firestore();
    let query: FirebaseFirestore.Query = db
      .collection("orders")
      .where("accountId", "==", accountId);

    if (dateFrom && dateTo) {
      // Need to filter by boughtAt date range
      const fromDate = new Date(dateFrom as string).toISOString();
      const toDate = new Date(dateTo as string);
      toDate.setHours(23, 59, 59, 999);
      const toDateStr = toDate.toISOString();

      console.log(`Counting orders from ${fromDate} to ${toDateStr}`);

      // Firestore requires index for this query
      query = query
        .where("boughtAt", ">=", fromDate)
        .where("boughtAt", "<=", toDateStr);
    }

    const snapshot = await query.get();
    const orders = snapshot.docs.map((doc) => doc.data());

    // Calculate totals
    let totalValue = 0;
    let totalItems = 0;

    for (const order of orders) {
      const amount = parseFloat(order.summary?.totalToPay?.amount || "0");
      totalValue += amount;

      for (const item of order.lineItems || []) {
        totalItems += item.quantity || 0;
      }
    }

    return res.json({
      count: orders.length,
      totalValue: totalValue.toFixed(2),
      totalItems,
      currency: orders[0]?.summary?.totalToPay?.currency || "PLN",
      dateRange: {from: dateFrom, to: dateTo},
    });
  } catch (error: any) {
    console.error("Failed to count orders:", error);
    return res.status(500).json({
      error: "Failed to count orders",
      details: error.message,
    });
  }
});

/**
 * Get dashboard statistics for date range
 * GET /orders/dashboard-stats?accountId=xxx&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 */
ordersRouter.get("/dashboard-stats", async (req, res) => {
  try {
    const {accountId, dateFrom, dateTo} = req.query;

    if (!accountId) {
      return res.status(400).json({error: "accountId is required"});
    }

    const db = admin.firestore();

    // Default to last 7 days if no dates provided
    let from = dateFrom as string;
    let to = dateTo as string;

    if (!from || !to) {
      const now = new Date();
      to = now.toISOString().split("T")[0];
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      from = weekAgo.toISOString().split("T")[0];
    }

    console.log(`Getting dashboard stats for ${accountId}: ${from} to ${to}`);

    // Query daily stats
    const statsSnapshot = await db
      .collection("dailyOrderStats")
      .where("accountId", "==", accountId)
      .where("date", ">=", from)
      .where("date", "<=", to)
      .orderBy("date", "asc")
      .get();

    const dailyStats = statsSnapshot.docs.map((doc) => doc.data());

    // Aggregate totals
    let totalSales = 0;
    let totalOrders = 0;
    let totalItemsSold = 0;
    const productSales: {
      [offerId: string]: {name: string; sku?: string; quantity: number; sales: number};
    } = {};

    const salesPerDay: Array<{date: string; sales: number; orders: number}> =
      [];

    for (const dayStat of dailyStats) {
      totalSales += dayStat.totalSales || 0;
      totalOrders += dayStat.ordersCount || 0;
      totalItemsSold += dayStat.totalItemsSold || 0;

      salesPerDay.push({
        date: dayStat.date,
        sales: dayStat.totalSales || 0,
        orders: dayStat.ordersCount || 0,
      });

      // Aggregate product sales
      for (const product of dayStat.topProducts || []) {
        if (!productSales[product.offerId]) {
          productSales[product.offerId] = {
            name: product.offerName,
            sku: product.offerSku,
            quantity: 0,
            sales: 0,
          };
        }
        productSales[product.offerId].quantity += product.quantity;
        productSales[product.offerId].sales += product.sales;
      }
    }

    // Sort products and get top 10
    const topProducts = Object.entries(productSales)
      .map(([offerId, data]) => ({
        offerId,
        offerName: data.name,
        offerSku: data.sku,
        quantity: data.quantity,
        sales: data.sales,
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    return res.json({
      dateRange: {from, to},
      summary: {
        totalSales,
        totalOrders,
        totalItemsSold,
      },
      salesPerDay,
      topProducts,
      daysWithData: dailyStats.length,
    });
  } catch (error: any) {
    console.error("Error getting dashboard stats:", error);
    return res.status(500).json({
      error: "Failed to get dashboard stats",
      details: error.message,
    });
  }
});

/**
 * Get recent orders
 * GET /orders/recent?accountId=xxx&limit=20
 */
ordersRouter.get("/recent", async (req, res) => {
  try {
    const {accountId, limit = "20"} = req.query;

    if (!accountId) {
      return res.status(400).json({error: "accountId is required"});
    }

    const db = admin.firestore();
    const ordersSnapshot = await db
      .collection("orders")
      .where("accountId", "==", accountId)
      .orderBy("boughtAt", "desc")
      .limit(parseInt(limit as string))
      .get();

    const orders = ordersSnapshot.docs.map((doc) => doc.data());

    return res.json({
      orders,
      count: orders.length,
    });
  } catch (error: any) {
    console.error("Error getting recent orders:", error);
    return res.status(500).json({
      error: "Failed to get recent orders",
      details: error.message,
    });
  }
});

/**
 * Get sync logs
 * GET /orders/sync-logs?accountId=xxx&limit=10
 */
ordersRouter.get("/sync-logs", async (req, res) => {
  try {
    const {accountId, limit = "10"} = req.query;

    if (!accountId) {
      return res.status(400).json({error: "accountId is required"});
    }

    const db = admin.firestore();
    const logsSnapshot = await db
      .collection("orderSyncLogs")
      .where("accountId", "==", accountId)
      .orderBy("lastSyncAt", "desc")
      .limit(parseInt(limit as string))
      .get();

    const logs = logsSnapshot.docs.map((doc) => ({
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
 * Trigger manual sync
 * POST /orders/sync
 * Body: { accountId: string, hoursBack?: number }
 */
ordersRouter.post("/sync", async (req, res) => {
  try {
    const {accountId, hoursBack = 24} = req.body;

    if (!accountId) {
      return res.status(400).json({error: "accountId is required"});
    }

    console.log(
      `Manual sync triggered for account ${accountId} (${hoursBack}h back)`
    );

    // Run sync synchronously (Firebase Functions don't support background tasks)
    const result = await syncOrdersForAccount(accountId, hoursBack);

    console.log(`Manual sync completed for ${accountId}:`, result.status);

    return res.json({
      message: result.status === "success" ?
        "Sync completed successfully" :
        "Sync failed",
      result,
    });
  } catch (error: any) {
    console.error("Error triggering sync:", error);
    return res.status(500).json({
      error: "Failed to trigger sync",
      details: error.message,
    });
  }
});

/**
 * Trigger sync with custom date range (synchronous, limited to 30 days)
 * POST /orders/sync-range
 * Body: { accountId: string, dateFrom: "YYYY-MM-DD", dateTo: "YYYY-MM-DD" }
 */
ordersRouter.post("/sync-range", async (req, res) => {
  try {
    const {accountId, dateFrom, dateTo} = req.body;

    if (!accountId || !dateFrom || !dateTo) {
      return res.status(400).json({
        error: "accountId, dateFrom, and dateTo are required",
      });
    }

    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    // Calculate hours between dates
    const hoursBack = Math.ceil(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60)
    );

    // Limit to 30 days (720 hours) to avoid timeout
    if (hoursBack > 720) {
      return res.status(400).json({
        error: "Date range too large. Maximum 30 days allowed.",
        maxDays: 30,
        requestedHours: hoursBack,
      });
    }

    console.log(
      `Range sync triggered for ${accountId}: ${dateFrom} to ${dateTo} ` +
      `(${hoursBack}h)`
    );

    // Run sync synchronously
    const result = await syncOrdersForAccount(accountId, hoursBack);

    console.log(
      `Range sync completed for ${accountId}: ${result.ordersCount} orders`
    );

    return res.json({
      message: result.status === "success" ?
        "Sync completed successfully" :
        "Sync failed",
      result,
    });
  } catch (error: any) {
    console.error("Error triggering range sync:", error);
    return res.status(500).json({
      error: "Failed to trigger range sync",
      details: error.message,
    });
  }
});

/**
 * Trigger sync for all accounts (TEST)
 * POST /orders/sync-all
 */
ordersRouter.post("/sync-all", async (req, res) => {
  try {
    const {hoursBack = 168} = req.body; // Last 7 days by default

    console.log(`Sync all accounts triggered (${hoursBack}h back)`);

    const db = admin.firestore();
    const accountsSnapshot = await db
      .collection("allegroAccounts")
      .where("status", "==", "active")
      .get();

    const accounts = accountsSnapshot.docs.map((doc) => ({
      id: doc.id,
      email: doc.data().email,
    }));

    console.log(`Found ${accounts.length} accounts to sync`);

    // Start sync in background for all accounts
    const syncPromises = accounts.map((account) =>
      syncOrdersForAccount(account.id, hoursBack)
        .then((result) => ({
          accountId: account.id,
          email: account.email,
          status: result.status,
          ordersCount: result.ordersCount,
        }))
        .catch((error) => ({
          accountId: account.id,
          email: account.email,
          status: "error",
          error: error.message,
        }))
    );

    // Don't wait for all to complete, return immediately
    Promise.all(syncPromises).then((results) => {
      console.log("All syncs completed:", results);
    });

    return res.json({
      message: "Sync started for all accounts",
      accountsCount: accounts.length,
      accounts: accounts.map((a) => ({id: a.id, email: a.email})),
      hoursBack,
    });
  } catch (error: any) {
    console.error("Error triggering sync-all:", error);
    return res.status(500).json({
      error: "Failed to trigger sync-all",
      details: error.message,
    });
  }
});

