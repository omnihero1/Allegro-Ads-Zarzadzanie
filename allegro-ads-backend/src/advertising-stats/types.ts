/**
 * Types for Advertising Agencies API statistics
 */

import admin from "firebase-admin";

export interface AgencyClient {
  id: string;
  name: string;
}

export interface CampaignStatistics {
  campaign: {
    id: string;
    name: string;
  };
  adGroup: {
    id: string;
    name: string;
  };
  ad: {
    id: string;
    name: string;
    offerId?: string; // Only for sponsored offers
  };
  dayData: Array<{
    day: string; // YYYY-MM-DD
    data: {
      interest: number;
      clicks: number;
      totalCost: string;
      views: number;
      ctr: string;
      totalAttributionCount: number;
      totalAttributionValue: string;
      effectiveCpc?: string; // For sponsored offers
      effectiveCpm?: string; // For graphic ads
      rateOfReturn: string;
      uniqueReach?: number; // For graphic ads
      attributedToCoreValue?: string; // For graphic ads
    };
  }>;
}

export interface AdvertisingStatistics {
  id?: string; // Firestore doc ID
  accountId: string;
  clientId: string;
  clientName: string;
  type: "SPONSORED_OFFER" | "GRAPHIC_AD";
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  adId: string;
  adName: string;
  offerId?: string;
  day: string; // YYYY-MM-DD
  interest: number;
  clicks: number;
  totalCost: number; // Converted from string to number
  views: number;
  ctr: number; // Converted from string to number (percentage)
  totalAttributionCount: number;
  totalAttributionValue: number; // Converted from string to number
  effectiveCpc?: number; // For sponsored offers
  effectiveCpm?: number; // For graphic ads
  rateOfReturn: number; // ROAS
  uniqueReach?: number;
  attributedToCoreValue?: number;
  syncedAt: admin.firestore.Timestamp;
  lastUpdatedAt: admin.firestore.Timestamp;
}

export interface StatsSyncLog {
  id?: string;
  accountId: string;
  clientId: string;
  lastSyncAt: admin.firestore.Timestamp;
  lastSuccessfulSyncAt?: admin.firestore.Timestamp;
  statsCount: number;
  status: "in_progress" | "success" | "error";
  dateRange: {
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
  };
  types: Array<"SPONSORED_OFFER" | "GRAPHIC_AD">;
  error?: string;
}

