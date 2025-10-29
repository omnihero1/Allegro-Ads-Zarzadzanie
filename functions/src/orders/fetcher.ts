/**
 * Allegro Orders Fetcher
 * Fetches orders from Allegro API and stores them in Firestore
 */

import * as admin from "firebase-admin";
import axios from "axios";
import {AllegroOrder, OrderSyncLog, DailyOrderStats} from "./types";
import {getAccountToken} from "../utils/allegro-api";

const ALLEGRO_API_URL = "https://api.allegro.pl";

/**
 * Fetch orders from Allegro API for a given date range
 */
export async function fetchOrdersForAccount(
  accountId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<AllegroOrder[]> {
  const accessToken = await getAccountToken(accountId);

  const orders: AllegroOrder[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  const fromISO = dateFrom.toISOString();
  const toISO = dateTo.toISOString();

  console.log(
    `Fetching orders for account ${accountId} from ${fromISO} to ${toISO}`
  );

  while (hasMore) {
    try {
      const response = await axios.get(
        `${ALLEGRO_API_URL}/order/checkout-forms`,
        {
          params: {
            offset,
            limit,
            "lineItems.boughtAt.gte": fromISO,
            "lineItems.boughtAt.lte": toISO,
          },
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/vnd.allegro.public.v1+json",
          },
        }
      );

      const checkoutForms = response.data.checkoutForms || [];
      console.log(
        `Fetched ${checkoutForms.length} orders (offset: ${offset})`
      );

      // Transform to our format
      for (const form of checkoutForms) {
        // Get boughtAt from first lineItem (it's not in the main checkout-form)
        const boughtAt =
          form.lineItems?.[0]?.boughtAt ||
          form.updatedAt ||
          new Date().toISOString();

        if (!boughtAt) {
          console.warn(`Skipping order ${form.id} - missing boughtAt`);
          continue;
        }

        const order: AllegroOrder = {
          id: form.id,
          accountId,
          status: form.status,
          buyer: {
            id: form.buyer?.id || "",
            ...(form.buyer?.email && {email: form.buyer.email}),
            ...(form.buyer?.login && {login: form.buyer.login}),
          },
          payment: {
            id: form.payment?.id || "",
            type: form.payment?.type || "",
            provider: form.payment?.provider || "",
            ...(form.payment?.finishedAt && {finishedAt: form.payment.finishedAt}),
            ...(form.payment?.paidAmount && {
              paidAmount: {
                amount: form.payment.paidAmount.amount,
                currency: form.payment.paidAmount.currency,
              },
            }),
          },
          delivery: {
            method: {
              id: form.delivery?.method?.id || "",
              ...(form.delivery?.method?.name && {name: form.delivery.method.name}),
            },
            ...(form.delivery?.address && {
              address: {
                firstName: form.delivery.address.firstName,
                lastName: form.delivery.address.lastName,
                street: form.delivery.address.street,
                city: form.delivery.address.city,
                zipCode: form.delivery.address.zipCode,
                countryCode: form.delivery.address.countryCode,
              },
            }),
            ...(form.delivery?.cost && {
              cost: {
                amount: form.delivery.cost.amount,
                currency: form.delivery.cost.currency,
              },
            }),
          },
          lineItems: (form.lineItems || []).map((item: any) => {
            // Try different paths for SKU
            const sku = item.offer?.external?.id ||
                       item.external?.id ||
                       item.offer?.externalId ||
                       undefined;

            // Log for debugging (only first item)
            if (orders.length === 0 && form.lineItems?.[0] === item) {
              console.log("Sample lineItem structure:", {
                hasOfferExternal: !!item.offer?.external,
                hasExternal: !!item.external,
                offerExternalId: item.offer?.external?.id,
                externalId: item.external?.id,
                resolvedSku: sku,
              });
            }

            return {
              id: item.id,
              offerId: item.offer?.id || "",
              offerName: item.offer?.name || "",
              offerSku: sku,
              quantity: item.quantity || 0,
              price: {
                amount: item.price?.amount || "0",
                currency: item.price?.currency || "PLN",
              },
              boughtAt: item.boughtAt || boughtAt,
            };
          }),
          summary: {
            totalToPay: {
              amount: form.summary?.totalToPay?.amount || "0",
              currency: form.summary?.totalToPay?.currency || "PLN",
            },
          },
          boughtAt,
          ...(form.fulfilledAt && {fulfilledAt: form.fulfilledAt}),
          syncedAt: admin.firestore.Timestamp.now(),
          lastUpdatedAt: admin.firestore.Timestamp.now(),
        };

        orders.push(order);
      }

      // Check if there are more orders
      hasMore = checkoutForms.length === limit;
      offset += limit;

      // Safety limit
      if (orders.length >= 10000) {
        console.warn("Reached safety limit of 10000 orders");
        break;
      }
    } catch (error: any) {
      console.error("Error fetching orders:", error?.response?.data || error);
      throw error;
    }
  }

  console.log(`Total orders fetched: ${orders.length}`);
  return orders;
}

/**
 * Save orders to Firestore (batch write)
 */
/**
 * Remove undefined values from object recursively
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

export async function saveOrdersToFirestore(
  orders: AllegroOrder[]
): Promise<void> {
  const db = admin.firestore();
  let batch = db.batch();
  let batchCount = 0;

  for (const order of orders) {
    // Remove undefined values before saving
    const cleanOrder = removeUndefined(order);

    const orderRef = db.collection("orders").doc(order.id);
    batch.set(orderRef, cleanOrder, {merge: true});
    batchCount++;

    // Firestore batch limit is 500 operations
    if (batchCount >= 500) {
      await batch.commit();
      batch = db.batch(); // Create new batch after commit
      batchCount = 0;
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`Saved ${orders.length} orders to Firestore`);
}

/**
 * Calculate daily statistics from orders
 */
export async function calculateDailyStats(
  accountId: string,
  date: Date
): Promise<DailyOrderStats> {
  const db = admin.firestore();

  // Get date range (full day in UTC)
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
  const startOfDay = new Date(dateStr + "T00:00:00.000Z");
  const endOfDay = new Date(dateStr + "T23:59:59.999Z");

  console.log(
    `Calculating stats for ${accountId} on ${dateStr}`
  );

  // Query orders for this day
  const ordersSnapshot = await db
    .collection("orders")
    .where("accountId", "==", accountId)
    .where("boughtAt", ">=", startOfDay.toISOString())
    .where("boughtAt", "<=", endOfDay.toISOString())
    .get();

  const orders = ordersSnapshot.docs.map((doc) => doc.data() as AllegroOrder);

  console.log(`Found ${orders.length} orders for ${dateStr}`);

  // Calculate stats
  let totalSales = 0;
  let totalItemsSold = 0;
  const productSales: {
    [offerId: string]: {name: string; sku?: string; quantity: number; sales: number};
  } = {};

  for (const order of orders) {
    // Total sales
    totalSales += parseFloat(order.summary.totalToPay.amount);

    // Process line items
    for (const item of order.lineItems) {
      totalItemsSold += item.quantity;

      const offerId = item.offerId;
      const itemTotal = parseFloat(item.price.amount) * item.quantity;

      if (!productSales[offerId]) {
        productSales[offerId] = {
          name: item.offerName,
          sku: item.offerSku,
          quantity: 0,
          sales: 0,
        };
      }

      productSales[offerId].quantity += item.quantity;
      productSales[offerId].sales += itemTotal;
    }
  }

  // Sort products by sales and take top 20
  const topProducts = Object.entries(productSales)
    .map(([offerId, data]) => ({
      offerId,
      offerName: data.name,
      offerSku: data.sku,
      quantity: data.quantity,
      sales: data.sales,
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 20);

  const stats: DailyOrderStats = {
    id: `${accountId}_${dateStr}`,
    accountId,
    date: dateStr,
    ordersCount: orders.length,
    totalSales,
    totalItemsSold,
    topProducts,
    calculatedAt: admin.firestore.Timestamp.now(),
  };

  // Save stats to Firestore
  await db.collection("dailyOrderStats").doc(stats.id).set(stats);

  console.log(
    `Calculated stats for ${dateStr}: ` +
    `${orders.length} orders, ${totalSales.toFixed(2)} PLN`
  );

  return stats;
}

/**
 * Sync orders for an account (main function)
 * Now saves orders in batches as they're fetched to avoid memory issues
 */
export async function syncOrdersForAccount(
  accountId: string,
  hoursBack = 24
): Promise<OrderSyncLog> {
  const db = admin.firestore();

  const dateTo = new Date();
  const dateFrom = new Date(dateTo);
  dateFrom.setHours(dateFrom.getHours() - hoursBack);

  const log: OrderSyncLog = {
    accountId,
    lastSyncAt: admin.firestore.Timestamp.now(),
    ordersCount: 0,
    status: "in_progress",
    dateRange: {
      from: dateFrom.toISOString(),
      to: dateTo.toISOString(),
    },
  };

  try {
    console.log(
      `Starting order sync for account ${accountId} ` +
      `(${dateFrom.toISOString()} to ${dateTo.toISOString()})`
    );

    // Fetch orders
    const orders = await fetchOrdersForAccount(accountId, dateFrom, dateTo);
    log.ordersCount = orders.length;

    console.log(`Fetched ${orders.length} orders for account ${accountId}`);

    // Save to Firestore in batches
    if (orders.length > 0) {
      console.log(`Saving ${orders.length} orders to Firestore...`);
      await saveOrdersToFirestore(orders);
      console.log(`✅ Saved ${orders.length} orders to Firestore`);
    }

    // Calculate daily stats for affected days
    const affectedDates = new Set<string>();
    for (const order of orders) {
      const dateStr = order.boughtAt.split("T")[0];
      affectedDates.add(dateStr);
    }

    console.log(`Calculating stats for ${affectedDates.size} days...`);
    for (const dateStr of affectedDates) {
      await calculateDailyStats(accountId, new Date(dateStr));
    }

    log.status = "success";
    log.lastSuccessfulSyncAt = admin.firestore.Timestamp.now();

    console.log(
      `✅ Order sync completed for account ${accountId}: ` +
      `${orders.length} orders`
    );
  } catch (error: any) {
    log.status = "error";
    log.error = error.message || "Unknown error";
    console.error(
      `❌ Order sync failed for account ${accountId}:`,
      error.message
    );
  }

  // Save sync log
  await db.collection("orderSyncLogs").add(log);

  return log;
}

