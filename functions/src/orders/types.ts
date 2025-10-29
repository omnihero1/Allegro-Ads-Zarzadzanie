/**
 * Order sync types for Firestore
 */

export interface AllegroOrder {
  id: string; // checkout form ID
  accountId: string; // which Allegro account
  status: string; // READY_FOR_PROCESSING, etc.
  buyer: {
    id: string;
    email?: string;
    login?: string;
  };
  payment: {
    id: string;
    type: string;
    provider: string;
    finishedAt?: string;
    paidAmount?: {
      amount: string;
      currency: string;
    };
  };
  delivery: {
    method: {
      id: string;
      name?: string;
    };
    address?: {
      firstName?: string;
      lastName?: string;
      street?: string;
      city?: string;
      zipCode?: string;
      countryCode?: string;
    };
    cost?: {
      amount: string;
      currency: string;
    };
  };
  lineItems: Array<{
    id: string;
    offerId: string;
    offerName: string;
    offerSku?: string; // External ID / SKU from Allegro
    quantity: number;
    price: {
      amount: string;
      currency: string;
    };
    boughtAt: string;
  }>;
  summary: {
    totalToPay: {
      amount: string;
      currency: string;
    };
  };
  boughtAt: string; // ISO date when order was placed
  fulfilledAt?: string;

  // Metadata
  syncedAt: FirebaseFirestore.Timestamp;
  lastUpdatedAt: FirebaseFirestore.Timestamp;
}

export interface OrderSyncLog {
  accountId: string;
  lastSyncAt: FirebaseFirestore.Timestamp;
  lastSuccessfulSyncAt?: FirebaseFirestore.Timestamp;
  ordersCount: number;
  status: "success" | "error" | "in_progress";
  error?: string;
  dateRange: {
    from: string;
    to: string;
  };
}

export interface DailyOrderStats {
  id: string; // format: accountId_YYYY-MM-DD
  accountId: string;
  date: string; // YYYY-MM-DD

  // Aggregated stats
  ordersCount: number;
  totalSales: number; // in PLN
  totalItemsSold: number;

  // Top products (limited to top 20)
  topProducts: Array<{
    offerId: string;
    offerName: string;
    quantity: number;
    sales: number; // revenue from this product
  }>;

  // Ads attribution (if available)
  adsOrdersCount?: number;
  adsSales?: number;

  calculatedAt: FirebaseFirestore.Timestamp;
}

