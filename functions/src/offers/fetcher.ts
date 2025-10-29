import * as admin from "firebase-admin";
import axios from "axios";
import {AllegroOffer, DailyOfferSnapshot, OfferSyncLog} from "./types";
import {getAccountToken} from "../utils/allegro-api";

const ALLEGRO_API_URL = "https://api.allegro.pl";

/**
 * Remove undefined values from object recursively (Firestore doesn't allow undefined)
 */
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  if (typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = removeUndefined(value);
      }
    }
    return result;
  }
  return obj;
}

/**
 * Fetch all offers for an account
 */
export async function fetchOffersForAccount(
  accountId: string
): Promise<AllegroOffer[]> {
  const accessToken = await getAccountToken(accountId);
  const offers: AllegroOffer[] = [];
  let offset = 0;
  const limit = 100; // Max per request

  console.log(`Fetching offers for account ${accountId}`);

  try {
    let hasMore = true;
    while (hasMore) {
      const response = await axios.get(
        `${ALLEGRO_API_URL}/sale/offers`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/vnd.allegro.public.v1+json",
          },
          params: {
            offset,
            limit,
          },
        }
      );

      const fetchedOffers = response.data.offers || [];
      console.log(`Fetched ${fetchedOffers.length} offers (offset: ${offset})`);

      if (fetchedOffers.length === 0) {
        hasMore = false;
        break;
      }

      // Transform to our format
      const snapshotDate = new Date().toISOString().split("T")[0];

      for (const offer of fetchedOffers) {
        const transformedOffer: AllegroOffer = {
          // Our metadata
          offerId: offer.id,
          accountId,
          syncedAt: admin.firestore.Timestamp.now(),
          snapshotDate,

          // API fields - exactly as returned
          name: offer.name,
          category: offer.category,
          primaryImage: offer.primaryImage,
          sellingMode: offer.sellingMode || {
            format: "BUY_NOW",
            price: {amount: "0", currency: "PLN"},
          },
          saleInfo: offer.saleInfo,
          stock: offer.stock || {available: 0},
          stats: offer.stats,
          publication: offer.publication || {status: "UNKNOWN"},
          afterSalesServices: offer.afterSalesServices,
          additionalServices: offer.additionalServices,
          external: offer.external,
          delivery: offer.delivery,
          b2b: offer.b2b,
          fundraisingCampaign: offer.fundraisingCampaign,
          additionalMarketplaces: offer.additionalMarketplaces,
        };

        offers.push(transformedOffer);
      }

      offset += limit;

      // Safety limit
      if (offers.length >= 10000) {
        console.warn("Reached safety limit of 10000 offers");
        break;
      }

      // If we got less than limit, we're done
      if (fetchedOffers.length < limit) {
        hasMore = false;
        break;
      }
    }

    console.log(`Total offers fetched: ${offers.length}`);
    return offers;
  } catch (error: any) {
    console.error("Error fetching offers:", error?.response?.data || error);
    throw error;
  }
}

/**
 * Save offers to Firestore
 */
export async function saveOffersToFirestore(
  offers: AllegroOffer[]
): Promise<void> {
  const db = admin.firestore();
  let batch = db.batch();
  let batchCount = 0;

  for (const offer of offers) {
    // Remove undefined values
    const cleanOffer = removeUndefined(offer);

    // Use offerId_accountId_snapshotDate as document ID
    const docId = `${cleanOffer.offerId}_${cleanOffer.accountId}_${cleanOffer.snapshotDate}`;
    const offerRef = db.collection("offers").doc(docId);
    batch.set(offerRef, cleanOffer, {merge: true});
    batchCount++;

    // Firestore batch limit is 500 operations
    if (batchCount >= 500) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`Saved ${offers.length} offers to Firestore`);
}

/**
 * Calculate daily statistics from offers
 */
export async function calculateDailyOfferStats(
  accountId: string,
  date: string // YYYY-MM-DD
): Promise<void> {
  const db = admin.firestore();

  console.log(`Calculating offer stats for ${accountId} on ${date}`);

  // Query offers for this account and date
  const offersSnapshot = await db
    .collection("offers")
    .where("accountId", "==", accountId)
    .where("snapshotDate", "==", date)
    .get();

  const offers = offersSnapshot.docs.map((doc) => doc.data() as AllegroOffer);

  console.log(`Found ${offers.length} offers for ${date}`);

  let activeOffers = 0;
  let inactiveOffers = 0;
  let endedOffers = 0;
  let totalStock = 0;
  let totalSold = 0;
  let totalValue = 0;
  let offersWithStock = 0;
  let offersOutOfStock = 0;
  let totalWatchers = 0;
  let totalVisits = 0;
  let sumPrice = 0;
  let minPrice = Infinity;
  let maxPrice = 0;

  for (const offer of offers) {
    // Count by status
    const status = offer.publication?.status || "UNKNOWN";
    if (status === "ACTIVE") {
      activeOffers++;
    } else if (status === "ENDED") {
      endedOffers++;
    } else {
      inactiveOffers++;
    }

    // Calculate stock stats
    const stock = offer.stock?.available || 0;
    const sold = offer.stock?.sold || 0;
    totalStock += stock;
    totalSold += sold;

    if (stock > 0) {
      offersWithStock++;
    } else {
      offersOutOfStock++;
    }

    // Calculate value and price stats
    const price = parseFloat(offer.sellingMode?.price?.amount || "0");
    sumPrice += price;
    totalValue += price * stock;

    if (price > 0) {
      minPrice = Math.min(minPrice, price);
      maxPrice = Math.max(maxPrice, price);
    }

    // Stats (watchers, visits)
    totalWatchers += offer.stats?.watchersCount || 0;
    totalVisits += offer.stats?.visitsCount || 0;
  }

  const snapshot: DailyOfferSnapshot = {
    id: `${date}_${accountId}`,
    accountId,
    date,
    totalOffers: offers.length,
    activeOffers,
    inactiveOffers,
    endedOffers,
    totalStock,
    totalSold,
    totalValue,
    averagePrice: offers.length > 0 ? sumPrice / offers.length : 0,
    offersWithStock,
    offersOutOfStock,
    totalWatchers,
    totalVisits,
    minPrice: minPrice === Infinity ? 0 : minPrice,
    maxPrice,
    calculatedAt: admin.firestore.Timestamp.now(),
  };

  // Save to Firestore
  await db
    .collection("dailyOfferSnapshots")
    .doc(snapshot.id || "")
    .set(snapshot);

  console.log(
    `Calculated offer stats for ${date}: ` +
    `${activeOffers} active, ${totalStock} stock, ${totalSold} sold, ` +
    `${totalValue.toFixed(2)} PLN value, ${totalWatchers} watchers, ${totalVisits} visits`
  );
}

/**
 * Main sync function for offers
 */
export async function syncOffersForAccount(
  accountId: string
): Promise<OfferSyncLog> {
  const db = admin.firestore();

  const log: OfferSyncLog = {
    accountId,
    lastSyncAt: admin.firestore.Timestamp.now(),
    offersCount: 0,
    status: "in_progress",
  };

  try {
    console.log(`Starting offer sync for account ${accountId}`);

    // Fetch offers
    const offers = await fetchOffersForAccount(accountId);
    log.offersCount = offers.length;

    console.log(`Fetched ${offers.length} offers for account ${accountId}`);

    // Save to Firestore
    if (offers.length > 0) {
      console.log(`Saving ${offers.length} offers to Firestore...`);
      await saveOffersToFirestore(offers);
      console.log(`✅ Saved ${offers.length} offers to Firestore`);

      // Calculate daily stats
      const today = new Date().toISOString().split("T")[0];
      await calculateDailyOfferStats(accountId, today);
    }

    log.status = "success";
    log.lastSuccessfulSyncAt = admin.firestore.Timestamp.now();

    console.log(
      `✅ Offer sync completed for account ${accountId}: ${offers.length} offers`
    );
  } catch (error: any) {
    log.status = "error";
    log.error = error.message || "Unknown error";
    console.error(
      `❌ Offer sync failed for account ${accountId}:`,
      error.message
    );
  }

  // Save sync log
  await db.collection("offerSyncLogs").add(log);

  return log;
}

