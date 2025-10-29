/**
 * Fetch advertising statistics from Allegro Advertising Agencies API
 */

import admin from "firebase-admin";
import axios from "axios";
import {
  AgencyClient,
  CampaignStatistics,
  AdvertisingStatistics,
  StatsSyncLog,
} from "./types";

const ALLEGRO_API_URL = "https://api.allegro.pl";

// Lazy load firebase to avoid circular dependency
function getFirestore() {
  require("../firebase");
  return admin.firestore();
}

/**
 * Get account access token from Firestore
 */
async function getAccountToken(accountId: string): Promise<string> {
  const db = getFirestore();
  const accountDoc = await db
    .collection("allegroAccounts")
    .doc(accountId)
    .get();

  if (!accountDoc.exists) {
    throw new Error(`Account ${accountId} not found`);
  }

  const accountData = accountDoc.data();
  if (!accountData?.tokens?.access_token) {
    throw new Error(`No access token for account ${accountId}`);
  }

  return accountData.tokens.access_token;
}

/**
 * Fetch agency clients list
 */
export async function fetchAgencyClients(
  accountId: string
): Promise<AgencyClient[]> {
  const accessToken = await getAccountToken(accountId);

  try {
    const response = await axios.get(
      `${ALLEGRO_API_URL}/advertising-agencies/clients`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.allegro.public.v1+json",
        },
      }
    );

    return response.data.clients || [];
  } catch (error: any) {
    console.error("Error fetching agency clients:", error?.response?.data || error);
    throw error;
  }
}

/**
 * Fetch advertising statistics for a client
 */
export async function fetchAdvertisingStatistics(
  accountId: string,
  clientId: string,
  dateFrom: string,
  dateTo: string,
  types: Array<"SPONSORED_OFFER" | "GRAPHIC_AD"> = ["SPONSORED_OFFER", "GRAPHIC_AD"]
): Promise<{sponsoredOffers: CampaignStatistics[]; graphicAds: CampaignStatistics[]}> {
  const accessToken = await getAccountToken(accountId);

  try {
    const params: any = {
      "statistics.gte": dateFrom,
      "statistics.lte": dateTo,
    };

    // Add types parameter
    if (types.length > 0) {
      params.types = types.join(",");
    }

    console.log(
      `Fetching advertising stats for client ${clientId}: ${dateFrom} to ${dateTo}`
    );

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

    return {
      sponsoredOffers: response.data.sponsoredOffers || [],
      graphicAds: response.data.graphicAds || [],
    };
  } catch (error: any) {
    console.error(
      `Error fetching advertising stats for client ${clientId}:`,
      error?.response?.data || error
    );
    throw error;
  }
}

/**
 * Transform and save statistics to Firestore
 */
export async function saveAdvertisingStatistics(
  accountId: string,
  clientId: string,
  clientName: string,
  sponsoredOffers: CampaignStatistics[],
  graphicAds: CampaignStatistics[]
): Promise<number> {
  const db = getFirestore();
  let batch = db.batch();
  let batchCount = 0;
  let totalCount = 0;

  // Process sponsored offers
  for (const stat of sponsoredOffers) {
    for (const dayData of stat.dayData) {
      const docId = `${accountId}_${clientId}_SO_${stat.campaign.id}_${stat.adGroup.id}_${stat.ad.id}_${dayData.day}`;

      const record: AdvertisingStatistics = {
        accountId,
        clientId,
        clientName,
        type: "SPONSORED_OFFER",
        campaignId: stat.campaign.id,
        campaignName: stat.campaign.name,
        adGroupId: stat.adGroup.id,
        adGroupName: stat.adGroup.name,
        adId: stat.ad.id,
        adName: stat.ad.name,
        offerId: stat.ad.offerId,
        day: dayData.day,
        interest: dayData.data.interest,
        clicks: dayData.data.clicks,
        totalCost: parseFloat(dayData.data.totalCost),
        views: dayData.data.views,
        ctr: parseFloat(dayData.data.ctr),
        totalAttributionCount: dayData.data.totalAttributionCount,
        totalAttributionValue: parseFloat(dayData.data.totalAttributionValue),
        effectiveCpc: dayData.data.effectiveCpc ?
          parseFloat(dayData.data.effectiveCpc) :
          undefined,
        rateOfReturn: parseFloat(dayData.data.rateOfReturn),
        syncedAt: admin.firestore.Timestamp.now(),
        lastUpdatedAt: admin.firestore.Timestamp.now(),
      };

      const docRef = db.collection("advertisingStatistics").doc(docId);
      batch.set(docRef, record, {merge: true});
      batchCount++;
      totalCount++;

      if (batchCount >= 500) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  // Process graphic ads
  for (const stat of graphicAds) {
    for (const dayData of stat.dayData) {
      const docId = `${accountId}_${clientId}_GA_${stat.campaign.id}_${stat.adGroup.id}_${stat.ad.id}_${dayData.day}`;

      const record: AdvertisingStatistics = {
        accountId,
        clientId,
        clientName,
        type: "GRAPHIC_AD",
        campaignId: stat.campaign.id,
        campaignName: stat.campaign.name,
        adGroupId: stat.adGroup.id,
        adGroupName: stat.adGroup.name,
        adId: stat.ad.id,
        adName: stat.ad.name,
        day: dayData.day,
        interest: dayData.data.interest,
        clicks: dayData.data.clicks,
        totalCost: parseFloat(dayData.data.totalCost),
        views: dayData.data.views,
        ctr: parseFloat(dayData.data.ctr),
        totalAttributionCount: dayData.data.totalAttributionCount,
        totalAttributionValue: parseFloat(dayData.data.totalAttributionValue),
        effectiveCpm: dayData.data.effectiveCpm ?
          parseFloat(dayData.data.effectiveCpm) :
          undefined,
        rateOfReturn: parseFloat(dayData.data.rateOfReturn),
        uniqueReach: dayData.data.uniqueReach,
        attributedToCoreValue: dayData.data.attributedToCoreValue ?
          parseFloat(dayData.data.attributedToCoreValue) :
          undefined,
        syncedAt: admin.firestore.Timestamp.now(),
        lastUpdatedAt: admin.firestore.Timestamp.now(),
      };

      const docRef = db.collection("advertisingStatistics").doc(docId);
      batch.set(docRef, record, {merge: true});
      batchCount++;
      totalCount++;

      if (batchCount >= 500) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`Saved ${totalCount} advertising statistics records`);
  return totalCount;
}

/**
 * Sync advertising statistics for a client
 */
export async function syncAdvertisingStatistics(
  accountId: string,
  clientId: string,
  dateFrom: string,
  dateTo: string,
  types: Array<"SPONSORED_OFFER" | "GRAPHIC_AD"> = ["SPONSORED_OFFER", "GRAPHIC_AD"]
): Promise<StatsSyncLog> {
  const db = getFirestore();

  const log: StatsSyncLog = {
    accountId,
    clientId,
    lastSyncAt: admin.firestore.Timestamp.now(),
    statsCount: 0,
    status: "in_progress",
    dateRange: {
      from: dateFrom,
      to: dateTo,
    },
    types,
  };

  try {
    console.log(
      `Starting advertising stats sync for account ${accountId}, ` +
      `client ${clientId} (${dateFrom} to ${dateTo})`
    );

    // Fetch statistics
    const {sponsoredOffers, graphicAds} = await fetchAdvertisingStatistics(
      accountId,
      clientId,
      dateFrom,
      dateTo,
      types
    );

    console.log(
      `Fetched ${sponsoredOffers.length} sponsored offer campaigns, ` +
      `${graphicAds.length} graphic ad campaigns`
    );

    // Get client name
    const clients = await fetchAgencyClients(accountId);
    const client = clients.find((c) => c.id === clientId);
    const clientName = client?.name || clientId;

    // Save to Firestore
    if (sponsoredOffers.length > 0 || graphicAds.length > 0) {
      const count = await saveAdvertisingStatistics(
        accountId,
        clientId,
        clientName,
        sponsoredOffers,
        graphicAds
      );
      log.statsCount = count;
    }

    log.status = "success";
    log.lastSuccessfulSyncAt = admin.firestore.Timestamp.now();

    console.log(
      `✅ Advertising stats sync completed for client ${clientId}: ` +
      `${log.statsCount} records`
    );
  } catch (error: any) {
    log.status = "error";
    log.error = error.message || "Unknown error";
    console.error(
      `❌ Advertising stats sync failed for client ${clientId}:`,
      error.message
    );
  }

  // Save sync log
  await db.collection("advertisingStatsSyncLogs").add(log);

  return log;
}

