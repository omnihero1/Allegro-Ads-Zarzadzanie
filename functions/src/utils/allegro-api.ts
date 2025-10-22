import * as admin from "firebase-admin";
import axios from "axios";

const ALLEGRO_API_URL = "https://api.allegro.pl";
const ALLEGRO_TOKEN_URL = "https://allegro.pl/auth/oauth/token";

interface AllegroTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

/**
 * Get valid access token for account (refresh if expired)
 */
export async function getAccountToken(accountId: string): Promise<string> {
  const db = admin.firestore();
  const accountDoc = await db.collection("accounts").doc(accountId).get();

  if (!accountDoc.exists) {
    throw new Error(`Account ${accountId} not found`);
  }

  const accountData = accountDoc.data();
  if (!accountData?.tokens) {
    throw new Error(`No tokens found for account ${accountId}`);
  }

  const {access_token, refresh_token, expires_at} = accountData.tokens;

  // Check if token is expired (with 5 min buffer)
  const now = Date.now();
  const expiresAt = expires_at?.toMillis?.() || 0;

  if (expiresAt > now + 5 * 60 * 1000) {
    // Token still valid
    return access_token;
  }

  // Token expired, refresh it
  console.log(`Refreshing token for account ${accountId}`);

  const clientId = process.env.ALLEGRO_CLIENT_ID;
  const clientSecret = process.env.ALLEGRO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("ALLEGRO_CLIENT_ID and ALLEGRO_CLIENT_SECRET must be set");
  }

  try {
    const response = await axios.post<AllegroTokens>(
      ALLEGRO_TOKEN_URL,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        auth: {
          username: clientId,
          password: clientSecret,
        },
      }
    );

    const newTokens = response.data;
    const newExpiresAt = new Date(now + newTokens.expires_in * 1000);

    // Update tokens in Firestore
    await accountDoc.ref.update({
      "tokens.access_token": newTokens.access_token,
      "tokens.refresh_token": newTokens.refresh_token || refresh_token,
      "tokens.expires_at": admin.firestore.Timestamp.fromDate(newExpiresAt),
    });

    console.log(`Token refreshed for account ${accountId}`);
    return newTokens.access_token;
  } catch (error: any) {
    console.error(`Failed to refresh token for account ${accountId}:`, error?.response?.data || error?.message);
    throw new Error("Failed to refresh access token");
  }
}

/**
 * Update ad group via Allegro API
 */
export async function updateAdGroup(
  accessToken: string,
  adsClientId: string,
  adGroupId: string,
  data: {
    status?: "ACTIVE" | "PAUSED"
    bidding?: {
      maxCpc?: {
        amount: string
        currency: string
      }
    }
    budget?: {
      daily?: {
        amount: string
        currency: string
      }
      total?: {
        amount: string
        currency: string
      }
    }
  }
): Promise<void> {
  const url = `${ALLEGRO_API_URL}/ads/clients/${adsClientId}/sponsored/adgroups/${adGroupId}`;

  console.log(`Updating ad group ${adGroupId}:`, JSON.stringify(data));

  try {
    await axios.patch(url, data, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.allegro.beta.v1+json",
        "Content-Type": "application/vnd.allegro.beta.v1+json",
      },
    });

    console.log(`Ad group ${adGroupId} updated successfully`);
  } catch (error: any) {
    console.error(`Failed to update ad group ${adGroupId}:`, error?.response?.data || error?.message);
    throw error;
  }
}

/**
 * Get all ad groups for a client
 */
export async function getAdGroups(
  accessToken: string,
  adsClientId: string,
  status?: string[]
): Promise<any[]> {
  const url = `${ALLEGRO_API_URL}/ads/clients/${adsClientId}/sponsored/adgroups`;

  try {
    const response = await axios.get(url, {
      params: {
        marketplaceId: "allegro-pl",
        status: status || ["ACTIVE", "PAUSED"],
      },
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.allegro.beta.v1+json",
      },
    });

    return response.data.adGroups || [];
  } catch (error: any) {
    console.error(`Failed to get ad groups for client ${adsClientId}:`, error?.response?.data || error?.message);
    throw error;
  }
}

