import * as admin from "firebase-admin";

/**
 * Complete offer data from Allegro API /sale/offers
 * Based on the actual API response structure
 */
export interface AllegroOffer {
  // Metadata (our custom fields)
  id?: string; // Document ID in Firestore
  offerId: string; // Allegro offer ID (from API: "id")
  accountId: string;
  syncedAt: admin.firestore.Timestamp;
  snapshotDate: string; // YYYY-MM-DD - day when snapshot was taken

  // Basic info from API
  name: string;
  category: {
    id: string;
  };

  // Primary image
  primaryImage?: {
    url: string;
  };

  // Selling mode
  sellingMode: {
    format: string; // "BUY_NOW", "AUCTION", etc.
    price: {
      amount: string;
      currency: string;
    };
    priceAutomation?: {
      rule?: {
        id: string;
      };
    };
    minimalPrice?: {
      amount: string;
      currency: string;
    };
    startingPrice?: {
      amount: string;
      currency: string;
    };
  };

  // Sale info (for auctions)
  saleInfo?: {
    currentPrice?: {
      amount: string;
      currency: string;
    };
    biddersCount?: number;
  };

  // Stock
  stock: {
    available: number;
    sold?: number;
  };

  // Stats
  stats?: {
    watchersCount?: number;
    visitsCount?: number;
  };

  // Publication
  publication: {
    status: string; // "ACTIVE", "INACTIVE", "ENDED", etc.
    startingAt?: string;
    startedAt?: string;
    endingAt?: string;
    endedAt?: string;
    marketplaces?: {
      base?: {
        id: string;
      };
      additional?: Array<{
        id: string;
      }>;
    };
  };

  // After sales services
  afterSalesServices?: {
    impliedWarranty?: {
      id: string;
    };
    returnPolicy?: {
      id: string;
    };
    warranty?: {
      id: string;
    };
  };

  // Additional services
  additionalServices?: {
    id: string;
  };

  // External ID (SKU)
  external?: {
    id: string;
  };

  // Delivery
  delivery?: {
    shippingRates?: {
      id: string;
    };
  };

  // B2B
  b2b?: {
    buyableOnlyByBusiness: boolean;
  };

  // Fundraising campaign
  fundraisingCampaign?: {
    id: string;
  };

  // Additional marketplaces (allegro-cz, allegro-sk, etc.)
  additionalMarketplaces?: {
    [marketplaceId: string]: {
      publication?: {
        state: string; // "APPROVED", "REJECTED", etc.
      };
      sellingMode?: {
        price?: {
          amount: string;
          currency: string;
        };
        priceAutomation?: {
          rule?: {
            id: string;
          };
        };
      };
      stats?: {
        watchersCount?: number;
        visitsCount?: number;
      };
      stock?: {
        sold?: number;
      };
    };
  };
}

/**
 * Daily snapshot summary for statistics
 */
export interface DailyOfferSnapshot {
  id?: string; // YYYY-MM-DD_accountId
  accountId: string;
  date: string; // YYYY-MM-DD

  // Basic counts
  totalOffers: number;
  activeOffers: number;
  inactiveOffers: number;
  endedOffers: number;

  // Stock statistics
  totalStock: number;
  totalSold: number;
  totalValue: number; // Sum of (price * stock) for all offers
  averagePrice: number;
  offersWithStock: number; // Offers with stock > 0
  offersOutOfStock: number; // Offers with stock = 0

  // Engagement statistics
  totalWatchers: number;
  totalVisits: number;

  // Price ranges
  minPrice: number;
  maxPrice: number;

  calculatedAt: admin.firestore.Timestamp;
}

/**
 * Sync log for tracking synchronization
 */
export interface OfferSyncLog {
  id?: string;
  accountId: string;
  lastSyncAt: admin.firestore.Timestamp;
  lastSuccessfulSyncAt?: admin.firestore.Timestamp;
  offersCount: number;
  status: "in_progress" | "success" | "error";
  error?: string;
}
