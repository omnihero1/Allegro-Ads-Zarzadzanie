import * as admin from "firebase-admin";
import {syncBillingForAccount} from "./fetcher";

/**
 * Automatic daily billing sync for all active accounts
 * Runs every day at 4:00 AM (after orders and ads stats)
 */
export async function autoSyncBilling(): Promise<void> {
  console.log("🚀 Starting automatic billing sync...");

  try {
    const db = admin.firestore();

    // Get all active Allegro accounts
    const accountsSnapshot = await db
      .collection("allegroAccounts")
      .where("status", "==", "active")
      .get();

    const accounts = accountsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`Found ${accounts.length} active accounts for billing sync`);

    if (accounts.length === 0) {
      console.log("No active accounts found. Skipping billing sync.");
      return;
    }

    // Sync billing for yesterday (Allegro finalizes billing data with 1-day delay)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`Syncing billing data for date: ${dateStr}`);

    const syncResults = [];

    for (const account of accounts) {
      const accountId = account.id;
      const accountData = account as any;

      console.log(
        `Processing account: ${accountData.name || accountData.email} (${accountId})`
      );

      try {
        const result = await syncBillingForAccount(
          accountId,
          dateStr, // from = yesterday
          dateStr // to = yesterday
        );

        syncResults.push({
          accountId,
          status: result.status,
          entriesCount: result.entriesCount,
          totalCost: result.totalCost,
        });

        console.log(
          `  ✅ Billing sync completed: ${result.entriesCount} entries, ` +
          `${result.totalCost?.toFixed(2) || 0} PLN`
        );
      } catch (error: any) {
        console.error(
          `  ❌ Failed to sync billing for account ${accountId}:`,
          error.message
        );
        syncResults.push({
          accountId,
          status: "error",
          error: error.message,
        });
      }
    }

    // Summary
    const successful = syncResults.filter((r) => r.status === "success").length;
    const failed = syncResults.filter((r) => r.status === "error").length;
    const totalEntries = syncResults.reduce(
      (sum, r) => sum + (r.entriesCount || 0),
      0
    );
    const totalCost = syncResults.reduce(
      (sum, r) => sum + (r.totalCost || 0),
      0
    );

    console.log(
      `✅ Billing sync completed: ${successful} successful, ${failed} failed`
    );
    console.log(
      `   Total: ${totalEntries} entries, ${totalCost.toFixed(2)} PLN`
    );
  } catch (error: any) {
    console.error("❌ Automatic billing sync error:", error);
    throw error;
  }
}

