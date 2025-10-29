import * as admin from "firebase-admin";
import axios from "axios";
import {DailyAdStats, DailyClientStats, AdStatsSyncLog} from "./types";
import {getAccountToken} from "../utils/allegro-api";

const ALLEGRO_API_URL = "https://api.allegro.pl";

/**
 * Fetch advertising statistics from Allegro API
 */
export async function fetchAdvertisingStats(
  accountId: string,
  clientId: string,
  dateFrom: string, // YYYY-MM-DD
  dateTo: string, // YYYY-MM-DD
  types: Array<"SPONSORED_OFFER" | "GRAPHIC_AD"> = ["SPONSORED_OFFER", "GRAPHIC_AD"]
): Promise<{sponsoredOffers: any[]; graphicAds: any[]}> {
  const accessToken = await getAccountToken(accountId);

  console.log(
    `Fetching ad stats for client ${clientId} from ${dateFrom} to ${dateTo}`,
    `types: ${types.join(",")}`
  );

  const params = {
    "types": types.join(","),
    "statistics.gte": dateFrom,
    "statistics.lte": dateTo,
  };

  console.log("API Request params:", params);

  try {
    const response = await axios.get(
      `${ALLEGRO_API_URL}/advertising-agencies/clients/${clientId}/statistics`,
      {
        params,
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.allegro.public.v1+json",
        },
      }
    );

    console.log(
      `✅ Successfully fetched stats: ${response.data.sponsoredOffers?.length || 0} sponsored, ` +
      `${response.data.graphicAds?.length || 0} graphic`
    );

    return {
      sponsoredOffers: response.data.sponsoredOffers || [],
      graphicAds: response.data.graphicAds || [],
    };
  } catch (error: any) {
    console.error(
      `❌ Failed to fetch ad stats for client ${clientId}:`,
      {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        params,
        url: `${ALLEGRO_API_URL}/advertising-agencies/clients/${clientId}/statistics`,
        errorMessage: error?.message,
        fullError: JSON.stringify(error?.response?.data, null, 2),
      }
    );
    throw error;
  }
}

/**
 * Transform API response to DailyAdStats records
 */
function transformToAdStats(
  accountId: string,
  clientId: string,
  data: {sponsoredOffers: any[]; graphicAds: any[]}
): DailyAdStats[] {
  const records: DailyAdStats[] = [];

  // Process Sponsored Offers
  for (const item of data.sponsoredOffers) {
    for (const dayData of item.dayData || []) {
      records.push({
        id: `${accountId}_${clientId}_${item.ad.id}_${dayData.day}`,
        accountId,
        clientId,
        day: dayData.day,
        campaignId: item.campaign.id,
        campaignName: item.campaign.name,
        adGroupId: item.adGroup.id,
        adGroupName: item.adGroup.name,
        adId: item.ad.id,
        adName: item.ad.name,
        offerId: item.ad.offerId,
        type: "SPONSORED_OFFER",
        stats: {
          interest: dayData.data.interest || 0,
          clicks: dayData.data.clicks || 0,
          totalCost: dayData.data.totalCost || "0",
          views: dayData.data.views || 0,
          ctr: dayData.data.ctr || "0",
          totalAttributionCount: dayData.data.totalAttributionCount || 0,
          totalAttributionValue: dayData.data.totalAttributionValue || "0",
          effectiveCpc: dayData.data.effectiveCpc || "0",
          rateOfReturn: dayData.data.rateOfReturn || "0",
        },
        syncedAt: admin.firestore.Timestamp.now(),
      });
    }
  }

  // Process Graphic Ads
  for (const item of data.graphicAds) {
    for (const dayData of item.dayData || []) {
      records.push({
        id: `${accountId}_${clientId}_${item.ad.id}_${dayData.day}`,
        accountId,
        clientId,
        day: dayData.day,
        campaignId: item.campaign.id,
        campaignName: item.campaign.name,
        adGroupId: item.adGroup.id,
        adGroupName: item.adGroup.name,
        adId: item.ad.id,
        adName: item.ad.name,
        type: "GRAPHIC_AD",
        stats: {
          interest: dayData.data.interest || 0,
          clicks: dayData.data.clicks || 0,
          totalCost: dayData.data.totalCost || "0",
          views: dayData.data.views || 0,
          ctr: dayData.data.ctr || "0",
          totalAttributionCount: dayData.data.totalAttributionCount || 0,
          totalAttributionValue: dayData.data.totalAttributionValue || "0",
          effectiveCpm: dayData.data.effectiveCpm || "0",
          rateOfReturn: dayData.data.rateOfReturn || "0",
          uniqueReach: dayData.data.uniqueReach || 0,
          attributedToCoreValue: dayData.data.attributedToCoreValue || "0",
        },
        syncedAt: admin.firestore.Timestamp.now(),
      });
    }
  }

  return records;
}

/**
 * Save ad stats to Firestore
 */
async function saveAdStatsToFirestore(
  stats: DailyAdStats[]
): Promise<void> {
  if (stats.length === 0) return;

  const db = admin.firestore();
  let batch = db.batch();
  let batchCount = 0;

  for (const stat of stats) {
    const statRef = db.collection("advertisingStatistics").doc(stat.id || "");
    batch.set(statRef, stat, {merge: true});
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

  console.log(`Saved ${stats.length} ad stats records to Firestore`);
}

/**
 * Calculate and save aggregated daily stats per client
 */
async function calculateClientDailyStats(
  accountId: string,
  clientId: string,
  day: string
): Promise<void> {
  const db = admin.firestore();

  console.log(`Calculating client stats for ${clientId} on ${day}`);

  // Query all ad stats for this client and day
  const statsSnapshot = await db
    .collection("advertisingStatistics")
    .where("accountId", "==", accountId)
    .where("clientId", "==", clientId)
    .where("day", "==", day)
    .get();

  const stats = statsSnapshot.docs.map((doc) => doc.data() as DailyAdStats);

  console.log(`Found ${stats.length} ad stats for ${day}`);

  // Aggregate by type
  const sponsored = {
    totalCost: 0,
    totalClicks: 0,
    totalViews: 0,
    totalAttributionValue: 0,
    totalAttributionCount: 0,
    adsCount: 0,
  };

  const graphic = {
    totalCost: 0,
    totalClicks: 0,
    totalViews: 0,
    totalAttributionValue: 0,
    totalAttributionCount: 0,
    uniqueReach: 0,
    adsCount: 0,
  };

  for (const stat of stats) {
    if (stat.type === "SPONSORED_OFFER") {
      sponsored.totalCost += parseFloat(stat.stats.totalCost);
      sponsored.totalClicks += stat.stats.clicks;
      sponsored.totalViews += stat.stats.views;
      sponsored.totalAttributionValue += parseFloat(
        stat.stats.totalAttributionValue
      );
      sponsored.totalAttributionCount += stat.stats.totalAttributionCount;
      sponsored.adsCount++;
    } else {
      graphic.totalCost += parseFloat(stat.stats.totalCost);
      graphic.totalClicks += stat.stats.clicks;
      graphic.totalViews += stat.stats.views;
      graphic.totalAttributionValue += parseFloat(
        stat.stats.totalAttributionValue
      );
      graphic.totalAttributionCount += stat.stats.totalAttributionCount;
      graphic.uniqueReach = Math.max(
        graphic.uniqueReach,
        stat.stats.uniqueReach || 0
      );
      graphic.adsCount++;
    }
  }

  // Calculate combined totals
  const combinedCost = sponsored.totalCost + graphic.totalCost;
  const combinedAttribution =
    sponsored.totalAttributionValue + graphic.totalAttributionValue;

  const clientStats: DailyClientStats = {
    id: `${accountId}_${clientId}_${day}`,
    accountId,
    clientId,
    day,
    sponsoredOffers: sponsored,
    graphicAds: graphic,
    combined: {
      totalCost: combinedCost,
      totalClicks: sponsored.totalClicks + graphic.totalClicks,
      totalViews: sponsored.totalViews + graphic.totalViews,
      totalAttributionValue: combinedAttribution,
      roas: combinedCost > 0 ? (combinedAttribution / combinedCost) * 100 : 0,
    },
    calculatedAt: admin.firestore.Timestamp.now(),
  };

  // Save to Firestore
  await db
    .collection("dailyClientAdStats")
    .doc(clientStats.id || "")
    .set(clientStats);

  console.log(
    `Calculated client stats for ${day}: ` +
    `${combinedCost.toFixed(2)} PLN cost, ` +
    `${combinedAttribution.toFixed(2)} PLN attribution`
  );
}

/**
 * Main sync function for advertising statistics
 */
export async function syncAdvertisingStatsForClient(
  accountId: string,
  clientId: string,
  dateFrom: string, // YYYY-MM-DD
  dateTo: string, // YYYY-MM-DD
  types: Array<"SPONSORED_OFFER" | "GRAPHIC_AD"> = ["SPONSORED_OFFER", "GRAPHIC_AD"]
): Promise<AdStatsSyncLog> {
  const db = admin.firestore();

  const log: AdStatsSyncLog = {
    accountId,
    clientId,
    lastSyncAt: admin.firestore.Timestamp.now(),
    status: "in_progress",
    dateRange: {from: dateFrom, to: dateTo},
    types,
    statsCount: 0,
  };

  try {
    console.log(
      `Starting ad stats sync for client ${clientId} ` +
      `from ${dateFrom} to ${dateTo}`
    );

    // Fetch stats from Allegro API
    const apiData = await fetchAdvertisingStats(
      accountId,
      clientId,
      dateFrom,
      dateTo,
      types
    );

    // Transform to our format
    const adStats = transformToAdStats(accountId, clientId, apiData);
    log.statsCount = adStats.length;

    console.log(`Fetched ${adStats.length} ad-day records`);

    // Save ad stats to Firestore
    if (adStats.length > 0) {
      await saveAdStatsToFirestore(adStats);

      // Calculate aggregated stats per day
      const uniqueDays = new Set(adStats.map((s) => s.day));
      for (const day of uniqueDays) {
        await calculateClientDailyStats(accountId, clientId, day);
      }
    }

    log.status = "success";
    log.lastSuccessfulSyncAt = admin.firestore.Timestamp.now();

    console.log(
      `✅ Ad stats sync completed for client ${clientId}: ` +
      `${adStats.length} records`
    );
  } catch (error: any) {
    log.status = "error";
    log.error = error.message || "Unknown error";
    console.error(
      `❌ Ad stats sync failed for client ${clientId}:`,
      error.message
    );
  }

  // Save sync log
  await db.collection("advertisingStatsSyncLogs").add(log);

  return log;
}
