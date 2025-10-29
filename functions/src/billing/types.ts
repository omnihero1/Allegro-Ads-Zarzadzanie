import * as admin from "firebase-admin";

/**
 * Billing entry from Allegro API
 */
export interface BillingEntry {
  id: string;
  occurredAt: string; // ISO 8601 date-time
  type: {
    id: string; // e.g., "LIS", "COM", "PRO"
    name: string; // e.g., "Listing fee", "Commission", "Promotion"
  };
  offer?: {
    id: string;
    name: string;
  };
  value: {
    amount: string; // decimal string
    currency: string; // "PLN", "EUR", etc.
  };
  tax: {
    percentage: string;
    annotation: string; // "OUT_OF_SCOPE", "TAXED", etc.
  };
  balance: {
    amount: string;
    currency: string;
  };
  order?: {
    id: string;
  };
  additionalInfo?: Array<{
    type: string;
    name: string;
    value: string;
  }>;
}

/**
 * Billing entry stored in Firestore
 */
export interface StoredBillingEntry extends BillingEntry {
  accountId: string;
  day: string; // YYYY-MM-DD (extracted from occurredAt)

  // Metadata
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Daily billing statistics aggregated per account
 */
export interface DailyBillingStats {
  id?: string; // accountId_day
  accountId: string;
  day: string; // YYYY-MM-DD

  // Aggregated costs by type
  totalCost: number; // Sum of all billing entries
  listingFees: number; // Type: LIS
  commissions: number; // Type: COM
  promotions: number; // Type: PRO
  otherFees: number; // All other types

  // Breakdown by type
  costsByType: {
    [typeId: string]: {
      typeName: string;
      amount: number;
      count: number;
    };
  };

  // Statistics
  entriesCount: number;
  offersAffected: number; // Unique offer IDs
  ordersAffected: number; // Unique order IDs

  // Metadata
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Billing sync log for tracking synchronization status
 */
export interface BillingSyncLog {
  id?: string;
  accountId: string;
  lastSyncAt: admin.firestore.Timestamp;
  lastSuccessfulSyncAt?: admin.firestore.Timestamp;
  status: "in_progress" | "success" | "error";
  dateRange: {
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
  };
  entriesCount: number; // Number of billing entries fetched
  totalCost?: number; // Total cost in this sync
  error?: string;
}

/**
 * API response from Allegro GET /billing/billing-entries
 */
export interface AllegroBillingResponse {
  billingEntries: BillingEntry[];
  count?: number;
  totalCount?: number;
}

