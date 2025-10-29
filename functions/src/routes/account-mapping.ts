/**
 * Account mapping endpoints - link sales accounts with agency clients
 */

import {Router} from "express";
import * as admin from "firebase-admin";

// eslint-disable-next-line new-cap
export const accountMappingRouter = Router();

/**
 * Link a sales account with an agency client
 * POST /account-mapping/link
 * Body: {
 *   salesAccountId: string,
 *   agencyAccountId: string,
 *   agencyClientId: string
 * }
 */
accountMappingRouter.post("/link", async (req, res) => {
  try {
    const {salesAccountId, agencyAccountId, agencyClientId} = req.body;

    if (!salesAccountId || !agencyAccountId || !agencyClientId) {
      return res.status(400).json({
        error: "salesAccountId, agencyAccountId, and agencyClientId are required",
      });
    }

    const db = admin.firestore();

    // Verify sales account exists
    const salesAccountDoc = await db
      .collection("allegroAccounts")
      .doc(salesAccountId)
      .get();

    if (!salesAccountDoc.exists) {
      return res.status(404).json({
        error: "Sales account not found",
      });
    }

    // Update sales account with agency mapping
    await db.collection("allegroAccounts").doc(salesAccountId).update({
      agencyMapping: {
        agencyAccountId,
        agencyClientId,
        linkedAt: admin.firestore.Timestamp.now(),
      },
    });

    console.log(
      `Linked sales account ${salesAccountId} with agency client ${agencyClientId}`
    );

    return res.json({
      success: true,
      message: "Account mapping created successfully",
      mapping: {
        salesAccountId,
        agencyAccountId,
        agencyClientId,
      },
    });
  } catch (error: any) {
    console.error("Error creating account mapping:", error);
    return res.status(500).json({
      error: "Failed to create account mapping",
      details: error.message,
    });
  }
});

/**
 * Unlink agency client from sales account
 * POST /account-mapping/unlink
 * Body: { salesAccountId: string }
 */
accountMappingRouter.post("/unlink", async (req, res) => {
  try {
    const {salesAccountId} = req.body;

    if (!salesAccountId) {
      return res.status(400).json({
        error: "salesAccountId is required",
      });
    }

    const db = admin.firestore();

    await db.collection("allegroAccounts").doc(salesAccountId).update({
      agencyMapping: admin.firestore.FieldValue.delete(),
    });

    console.log(`Unlinked sales account ${salesAccountId} from agency client`);

    return res.json({
      success: true,
      message: "Account mapping removed successfully",
    });
  } catch (error: any) {
    console.error("Error removing account mapping:", error);
    return res.status(500).json({
      error: "Failed to remove account mapping",
      details: error.message,
    });
  }
});

/**
 * Get account mapping for a sales account
 * GET /account-mapping/:salesAccountId
 */
accountMappingRouter.get("/:salesAccountId", async (req, res) => {
  try {
    const {salesAccountId} = req.params;

    const db = admin.firestore();
    const accountDoc = await db
      .collection("allegroAccounts")
      .doc(salesAccountId)
      .get();

    if (!accountDoc.exists) {
      return res.status(404).json({
        error: "Account not found",
      });
    }

    const accountData = accountDoc.data();
    const mapping = accountData?.agencyMapping;

    return res.json({
      salesAccountId,
      mapping: mapping || null,
      hasMapping: !!mapping,
    });
  } catch (error: any) {
    console.error("Error getting account mapping:", error);
    return res.status(500).json({
      error: "Failed to get account mapping",
      details: error.message,
    });
  }
});

