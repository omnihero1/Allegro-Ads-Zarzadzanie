import * as admin from "firebase-admin";
import axios from "axios";
import {
  BillingEntry,
  StoredBillingEntry,
  DailyBillingStats,
  BillingSyncLog,
  AllegroBillingResponse,
} from "./types";
import {getAccountToken} from "../utils/allegro-api";

const ALLEGRO_API_URL = "https://api.allegro.pl";

/**
 * Fetch billing entries from Allegro API
 */
export async function fetchBillingEntries(
  accountId: string,
  dateFrom: string, // YYYY-MM-DD
  dateTo: string, // YYYY-MM-DD
  limit = 100, // Allegro Billing API max limit is 100 (not 1000!)
  offset = 0
): Promise<{entries: BillingEntry[]; totalCount: number}> {
  const accessToken = await getAccountToken(accountId);

  // Convert to Date objects and then to ISO string (same as orders)
  const fromDate = new Date(dateFrom);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(dateTo);
  toDate.setHours(23, 59, 59, 999);

  const fromISO = fromDate.toISOString();
  const toISO = toDate.toISOString();

  // Validate: gte must be earlier than lte
  if (fromDate >= toDate) {
    console.error(`Invalid date range: from=${fromISO} is not before to=${toISO}`);
    throw new Error("occurredAt.gte must be earlier than occurredAt.lte");
  }

  console.log(
    `Fetching billing entries for account ${accountId} from ${fromISO} to ${toISO}`
  );
  console.log(`  Date validation: ${fromDate.getTime()} < ${toDate.getTime()} ✓`);

  // According to Allegro docs, these parameters are correct:
  // occurredAt.gte and occurredAt.lte
  // Example from docs: occurredAt.gte=2019-05-08T09:45:32.818Z
  const params: any = {
    "occurredAt.gte": fromISO,
    "occurredAt.lte": toISO,
    limit,
    offset,
  };

  console.log("Testing billing API with params:");
  console.log("API Request params:", JSON.stringify(params, null, 2));

  // Build URL manually to see exact request
  const queryString = new URLSearchParams(params as any).toString();
  const fullUrl = `${ALLEGRO_API_URL}/billing/billing-entries?${queryString}`;
  console.log("Full URL:", fullUrl);

  try {
    const response = await axios.get<AllegroBillingResponse>(
      `${ALLEGRO_API_URL}/billing/billing-entries`,
      {
        params,
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.allegro.public.v1+json",
        },
      }
    );

    const entries = response.data.billingEntries || [];
    const totalCount = response.data.totalCount || entries.length;

    console.log(
      `✅ Successfully fetched ${entries.length} billing entries (total: ${totalCount})`
    );

    return {entries, totalCount};
  } catch (error: any) {
    console.error(
      `❌ Failed to fetch billing entries for account ${accountId}:`,
      {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        params,
        url: `${ALLEGRO_API_URL}/billing/billing-entries`,
        errorMessage: error?.message,
        fullError: JSON.stringify(error?.response?.data, null, 2),
      }
    );
    throw error;
  }
}

/**
 * Fetch all billing entries (handles pagination)
 */
export async function fetchAllBillingEntries(
  accountId: string,
  dateFrom: string,
  dateTo: string
): Promise<BillingEntry[]> {
  const allEntries: BillingEntry[] = [];
  const limit = 100; // Allegro Billing API max limit is 100
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const {entries} = await fetchBillingEntries(
      accountId,
      dateFrom,
      dateTo,
      limit,
      offset
    );

    allEntries.push(...entries);

    // Continue if we got full page (100 entries) - means there might be more
    hasMore = entries.length === limit;

    if (hasMore) {
      offset += limit;
      console.log(
        `Fetched ${allEntries.length} billing entries so far, continuing... (got full page of ${limit})`
      );
    } else {
      console.log(
        `Fetched ${allEntries.length} billing entries total (last page had ${entries.length} entries)`
      );
    }
  }

  return allEntries;
}

/**
 * Save billing entries to Firestore
 */
async function saveBillingEntriesToFirestore(
  entries: StoredBillingEntry[]
): Promise<void> {
  const db = admin.firestore();
  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  entries.forEach((entry) => {
    const docRef = db.collection("billingEntries").doc(entry.id);
    batch.set(
      docRef,
      {
        ...entry,
        updatedAt: now,
      },
      {merge: true}
    );
  });

  await batch.commit();
  console.log(`✅ Saved ${entries.length} billing entries to Firestore`);
}

/**
 * Calculate and save daily billing statistics
 */
async function calculateDailyBillingStats(
  accountId: string,
  day: string
): Promise<void> {
  const db = admin.firestore();

  // Get all billing entries for this day
  const entriesSnapshot = await db
    .collection("billingEntries")
    .where("accountId", "==", accountId)
    .where("day", "==", day)
    .get();

  if (entriesSnapshot.empty) {
    console.log(`No billing entries found for ${accountId} on ${day}`);
    return;
  }

  const entries = entriesSnapshot.docs.map(
    (doc) => doc.data() as StoredBillingEntry
  );

  // Initialize aggregations
  let totalCost = 0;
  let listingFees = 0;
  let commissions = 0;
  let promotions = 0;
  let otherFees = 0;

  const costsByType: {
    [typeId: string]: {typeName: string; amount: number; count: number};
  } = {};
  const uniqueOffers = new Set<string>();
  const uniqueOrders = new Set<string>();

  // Aggregate
  entries.forEach((entry) => {
    const amount = parseFloat(entry.value.amount);
    totalCost += amount;

    // Aggregate by type
    const typeId = entry.type.id;
    const typeName = entry.type.name;

    if (!costsByType[typeId]) {
      costsByType[typeId] = {typeName, amount: 0, count: 0};
    }
    costsByType[typeId].amount += amount;
    costsByType[typeId].count++;

    // Categorize common types
    switch (typeId) {
    case "LIS":
      listingFees += amount;
      break;
    case "COM":
      commissions += amount;
      break;
    case "PRO":
      promotions += amount;
      break;
    default:
      otherFees += amount;
    }

    // Track unique offers and orders
    if (entry.offer?.id) {
      uniqueOffers.add(entry.offer.id);
    }
    if (entry.order?.id) {
      uniqueOrders.add(entry.order.id);
    }
  });

  const statsId = `${accountId}_${day}`;
  const stats: DailyBillingStats = {
    id: statsId,
    accountId,
    day,
    totalCost,
    listingFees,
    commissions,
    promotions,
    otherFees,
    costsByType,
    entriesCount: entries.length,
    offersAffected: uniqueOffers.size,
    ordersAffected: uniqueOrders.size,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  // Save to Firestore
  await db
    .collection("dailyBillingStats")
    .doc(statsId)
    .set(stats, {merge: true});

  console.log(
    `✅ Calculated daily billing stats for ${accountId} on ${day}: ` +
    `${totalCost.toFixed(2)} PLN (${entries.length} entries)`
  );
}

/**
 * Main sync function for billing entries
 */
export async function syncBillingForAccount(
  accountId: string,
  dateFrom: string, // YYYY-MM-DD
  dateTo: string // YYYY-MM-DD
): Promise<BillingSyncLog> {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  const log: BillingSyncLog = {
    accountId,
    lastSyncAt: now,
    status: "in_progress",
    dateRange: {from: dateFrom, to: dateTo},
    entriesCount: 0,
  };

  try {
    console.log(
      `Starting billing sync for account ${accountId} from ${dateFrom} to ${dateTo}`
    );

    // Fetch all billing entries
    const apiEntries = await fetchAllBillingEntries(
      accountId,
      dateFrom,
      dateTo
    );

    log.entriesCount = apiEntries.length;

    if (apiEntries.length === 0) {
      console.log("No billing entries found for the specified date range");
      log.status = "success";
      log.lastSuccessfulSyncAt = now;
      await db.collection("billingSyncLogs").add(log);
      return log;
    }

    // Transform to stored format
    const storedEntries: StoredBillingEntry[] = apiEntries.map((entry) => ({
      ...entry,
      accountId,
      day: entry.occurredAt.split("T")[0], // Extract YYYY-MM-DD
      createdAt: now,
      updatedAt: now,
    }));

    // Calculate total cost for this sync
    const totalCost = storedEntries.reduce(
      (sum, entry) => sum + parseFloat(entry.value.amount),
      0
    );
    log.totalCost = totalCost;

    // Save billing entries to Firestore
    await saveBillingEntriesToFirestore(storedEntries);

    // Calculate daily stats
    const uniqueDays = new Set(storedEntries.map((e) => e.day));
    for (const day of uniqueDays) {
      await calculateDailyBillingStats(accountId, day);
    }

    log.status = "success";
    log.lastSuccessfulSyncAt = now;

    console.log(
      `✅ Billing sync completed for account ${accountId}: ` +
      `${apiEntries.length} entries, ${totalCost.toFixed(2)} PLN total`
    );
  } catch (error: any) {
    log.status = "error";
    log.error = error.message || "Unknown error";
    console.error(`❌ Billing sync failed for account ${accountId}:`, error.message);
  }

  // Save sync log
  await db.collection("billingSyncLogs").add(log);

  return log;
}

