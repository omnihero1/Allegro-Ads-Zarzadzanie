/**
 * Admin/maintenance endpoints
 */

import {Router} from "express";
import * as admin from "firebase-admin";
import axios from "axios";
import {getAccountToken} from "../utils/allegro-api";

// eslint-disable-next-line new-cap
export const adminRouter = Router();

/**
 * Check accounts in both collections
 * GET /admin/check-accounts
 */
adminRouter.get("/check-accounts", async (req, res) => {
  try {
    const db = admin.firestore();

    // Check 'accounts' collection
    const accountsSnap = await db.collection("accounts").get();
    const accounts = accountsSnap.docs.map((doc) => ({
      id: doc.id,
      email: doc.data().email,
      name: doc.data().name,
      status: doc.data().status,
      hasTokens: !!doc.data().tokens,
    }));

    // Check 'allegroAccounts' collection
    const allegroAccountsSnap = await db.collection("allegroAccounts").get();
    const allegroAccounts = allegroAccountsSnap.docs.map((doc) => ({
      id: doc.id,
      email: doc.data().email,
      name: doc.data().name,
      status: doc.data().status,
      hasTokens: !!doc.data().tokens,
    }));

    return res.json({
      accounts: {
        count: accounts.length,
        items: accounts,
      },
      allegroAccounts: {
        count: allegroAccounts.length,
        items: allegroAccounts,
      },
      needsMigration: accounts.length > allegroAccounts.length,
    });
  } catch (error: any) {
    console.error("Error checking accounts:", error);
    return res.status(500).json({
      error: "Failed to check accounts",
      details: error.message,
    });
  }
});

/**
 * Migrate accounts from 'accounts' to 'allegroAccounts'
 * POST /admin/migrate-accounts
 */
adminRouter.post("/migrate-accounts", async (req, res) => {
  try {
    const db = admin.firestore();

    console.log("Starting accounts migration...");

    // Get all accounts from old collection
    const accountsSnap = await db.collection("accounts").get();
    console.log(`Found ${accountsSnap.size} accounts in 'accounts' collection`);

    const migrated: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{id: string; error: string}> = [];

    for (const doc of accountsSnap.docs) {
      const accountId = doc.id;
      const accountData = doc.data();

      try {
        // Check if already exists in allegroAccounts
        const allegroAccountDoc = await db
          .collection("allegroAccounts")
          .doc(accountId)
          .get();

        if (allegroAccountDoc.exists) {
          console.log(`Account ${accountId} already exists, skipping`);
          skipped.push(accountId);
          continue;
        }

        // Copy to allegroAccounts
        await db.collection("allegroAccounts").doc(accountId).set(accountData);

        console.log(`Migrated account ${accountId} (${accountData.email})`);
        migrated.push(accountId);
      } catch (error: any) {
        console.error(`Error migrating account ${accountId}:`, error);
        errors.push({
          id: accountId,
          error: error.message,
        });
      }
    }

    return res.json({
      message: "Migration completed",
      migrated: {
        count: migrated.length,
        ids: migrated,
      },
      skipped: {
        count: skipped.length,
        ids: skipped,
      },
      errors: {
        count: errors.length,
        items: errors,
      },
    });
  } catch (error: any) {
    console.error("Error during migration:", error);
    return res.status(500).json({
      error: "Migration failed",
      details: error.message,
    });
  }
});

/**
 * Delete old 'accounts' collection (DANGER!)
 * POST /admin/delete-old-accounts
 * Body: { confirm: "DELETE_OLD_ACCOUNTS" }
 */
adminRouter.post("/delete-old-accounts", async (req, res) => {
  try {
    const {confirm} = req.body;

    if (confirm !== "DELETE_OLD_ACCOUNTS") {
      return res.status(400).json({
        error: "Confirmation required",
        message: "Send {\"confirm\": \"DELETE_OLD_ACCOUNTS\"} to proceed",
      });
    }

    const db = admin.firestore();

    console.log("Deleting old 'accounts' collection...");

    const accountsSnap = await db.collection("accounts").get();
    const batch = db.batch();

    accountsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`Deleted ${accountsSnap.size} documents from 'accounts'`);

    return res.json({
      message: "Old accounts collection deleted",
      deletedCount: accountsSnap.size,
    });
  } catch (error: any) {
    console.error("Error deleting old accounts:", error);
    return res.status(500).json({
      error: "Failed to delete old accounts",
      details: error.message,
    });
  }
});

/**
 * Test Allegro API orders endpoint directly
 * GET /admin/test-allegro-orders?accountId=xxx&days=30
 */
adminRouter.get("/test-allegro-orders", async (req, res) => {
  try {
    const {accountId, days = 30} = req.query;

    if (!accountId) {
      return res.status(400).json({error: "accountId is required"});
    }

    const db = admin.firestore();
    const accountDoc = await db
      .collection("allegroAccounts")
      .doc(accountId as string)
      .get();

    if (!accountDoc.exists) {
      return res.status(404).json({error: "Account not found"});
    }

    // Get fresh access token (will refresh if needed)
    const accessToken = await getAccountToken(accountId as string);

    const dateTo = new Date();
    const dateFrom = new Date(dateTo);
    dateFrom.setDate(dateFrom.getDate() - Number(days));

    const response = await axios.get(
      "https://api.allegro.pl/order/checkout-forms",
      {
        params: {
          "offset": 0,
          "limit": 10,
          "boughtAt.gte": dateFrom.toISOString(),
          "boughtAt.lte": dateTo.toISOString(),
        },
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.allegro.public.v1+json",
        },
      }
    );

    return res.json({
      dateRange: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
      totalCount: response.data.count || 0,
      returnedCount: response.data.checkoutForms?.length || 0,
      sample: response.data.checkoutForms?.slice(0, 3) || [],
    });
  } catch (error: any) {
    console.error("Test Allegro orders error:", error?.response?.data || error);
    return res.status(500).json({
      error: "Failed to fetch orders from Allegro",
      details: error?.response?.data || error.message,
    });
  }
});

/**
 * Manual offers sync endpoint
 * POST /admin/sync-offers
 * Body: { accountId: string }
 */
import {syncOffersForAccount} from "../offers/fetcher";

adminRouter.post("/sync-offers", async (req, res) => {
  try {
    const {accountId} = req.body;

    if (!accountId) {
      return res.status(400).json({
        error: "accountId is required",
      });
    }

    console.log(`Manual offers sync triggered for account ${accountId}`);

    // Run sync
    const result = await syncOffersForAccount(accountId);

    console.log(
      `Offers sync completed for account ${accountId}: ` +
      `${result.offersCount} offers, status: ${result.status}`
    );

    return res.json({
      message: result.status === "success" ?
        "Offers sync completed successfully" :
        "Offers sync failed",
      result,
    });
  } catch (error: any) {
    console.error("Error triggering offers sync:", error);
    return res.status(500).json({
      error: "Failed to sync offers",
      details: error.message,
    });
  }
});

