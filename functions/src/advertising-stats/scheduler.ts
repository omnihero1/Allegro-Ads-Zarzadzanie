import * as admin from "firebase-admin";
import axios from "axios";
import {syncAdvertisingStatsForClient} from "./fetcher";
import {getAccountToken} from "../utils/allegro-api";

/**
 * Automatically sync advertising stats for all active clients
 */
export async function autoSyncAdvertisingStats(): Promise<void> {
  console.log("🚀 Starting automatic advertising stats sync...");

  try {
    // Get all active Allegro accounts
    const accountsSnapshot = await admin.firestore()
      .collection("allegroAccounts")
      .where("status", "==", "active")
      .get();

    if (accountsSnapshot.empty) {
      console.log("No active accounts found");
      return;
    }

    console.log(`Found ${accountsSnapshot.size} active accounts`);

    // For each account, get their agency clients
    for (const accountDoc of accountsSnapshot.docs) {
      const accountId = accountDoc.id;
      const accountData = accountDoc.data();

      console.log(`Processing account: ${accountData.name} (${accountData.email})`);

      try {
        // Get fresh access token (will refresh if needed)
        const accessToken = await getAccountToken(accountId);

        console.log(`  ✅ Got access token for account ${accountId}`);

        // Fetch agency clients
        const clientsResponse = await axios.get(
          "https://api.allegro.pl/advertising-agencies/clients",
          {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Accept": "application/vnd.allegro.public.v1+json",
            },
          }
        );

        const clients = clientsResponse.data.clients || [];
        console.log(`  Found ${clients.length} clients for this account`);

        if (clients.length === 0) {
          console.log(`  No agency clients found for account ${accountId}`);
          continue;
        }

        // Sync stats for each client (yesterday's data)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD

        console.log(`  Syncing stats for date: ${dateStr}`);

        for (const client of clients) {
          try {
            console.log(`    Syncing client: ${client.name} (${client.id})`);

            const result = await syncAdvertisingStatsForClient(
              accountId,
              client.id,
              dateStr, // from = yesterday
              dateStr, // to = yesterday
              ["SPONSORED_OFFER", "GRAPHIC_AD"]
            );

            if (result.status === "success") {
              console.log(
                `    ✅ Client ${client.name}: ${result.statsCount} records synced`
              );
            } else {
              console.error(
                `    ❌ Client ${client.name}: ${result.error}`
              );
            }
          } catch (clientError: any) {
            console.error(
              `    ❌ Failed to sync client ${client.id}:`,
              clientError.message
            );
          }
        }
      } catch (accountError: any) {
        console.error(
          `❌ Failed to process account ${accountId}:`,
          accountError.message
        );
      }
    }

    console.log("✅ Automatic advertising stats sync completed");
  } catch (error: any) {
    console.error("❌ Auto sync error:", error.message);
    throw error;
  }
}

