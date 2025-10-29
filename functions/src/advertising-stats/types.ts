import * as admin from "firebase-admin";

/**
 * Daily advertising statistics per ad (granular level)
 */
export interface DailyAdStats {
  // Meta
  id?: string; // accountId_clientId_adId_day
  accountId: string;
  clientId: string;
  day: string; // YYYY-MM-DD

  // Campaign info
  campaignId: string;
  campaignName: string;

  // Ad Group info
  adGroupId: string;
  adGroupName: string;

  // Ad info
  adId: string;
  adName: string;
  offerId?: string; // Only for sponsored offers
  type: "SPONSORED_OFFER" | "GRAPHIC_AD";

  // Statistics
  stats: {
    interest: number;
    clicks: number;
    totalCost: string;
    views: number;
    ctr: string;
    totalAttributionCount: number;
    totalAttributionValue: string;
    effectiveCpc?: string; // Only for sponsored offers
    effectiveCpm?: string; // Only for graphic ads
    rateOfReturn: string;
    uniqueReach?: number; // Only for graphic ads
    attributedToCoreValue?: string; // Only for graphic ads
  };

  // Metadata
  syncedAt: admin.firestore.Timestamp;
}

/**
 * Aggregated daily statistics per client (for quick queries)
 */
export interface DailyClientStats {
  id?: string; // accountId_clientId_day
  accountId: string;
  clientId: string;
  clientName?: string;
  day: string; // YYYY-MM-DD

  // Aggregated stats
  sponsoredOffers: {
    totalCost: number;
    totalClicks: number;
    totalViews: number;
    totalAttributionValue: number;
    totalAttributionCount: number;
    adsCount: number;
  };

  graphicAds: {
    totalCost: number;
    totalClicks: number;
    totalViews: number;
    totalAttributionValue: number;
    totalAttributionCount: number;
    uniqueReach: number;
    adsCount: number;
  };

  // Combined totals
  combined: {
    totalCost: number;
    totalClicks: number;
    totalViews: number;
    totalAttributionValue: number;
    roas: number; // Return on Ad Spend
  };

  // Metadata
  calculatedAt: admin.firestore.Timestamp;
}

/**
 * Sync log for tracking synchronization status
 */
export interface AdStatsSyncLog {
  id?: string;
  accountId: string;
  clientId: string;
  lastSyncAt: admin.firestore.Timestamp;
  lastSuccessfulSyncAt?: admin.firestore.Timestamp;
  status: "in_progress" | "success" | "error";
  dateRange: {
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
  };
  types: Array<"SPONSORED_OFFER" | "GRAPHIC_AD">;
  statsCount: number; // Number of ad-day records
  error?: string;
}
