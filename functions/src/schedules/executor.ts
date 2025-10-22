import {Schedule, AdGroup} from "./types";
import {getAccountToken, updateAdGroup, getAdGroups} from "../utils/allegro-api";

/**
 * Execute schedule action on ad groups
 */
export async function executeScheduleAction(schedule: Schedule): Promise<{
  success: boolean
  message: string
  affectedAdGroupIds: string[]
  error?: string
}> {
  try {
    console.log(`Executing schedule ${schedule.id}: ${schedule.name}`);

    // Get access token
    const accessToken = await getAccountToken(schedule.accountId);

    // Get ad groups to update
    let adGroups: AdGroup[];

    if (schedule.adGroupIds.length > 0) {
      // Specific ad groups
      console.log(`Targeting specific ad groups: ${schedule.adGroupIds.join(", ")}`);
      const allAdGroups = await getAdGroups(accessToken, schedule.adsClientId);
      adGroups = allAdGroups.filter((ag: AdGroup) =>
        schedule.adGroupIds.includes(ag.id)
      );
    } else {
      // All ad groups
      console.log("Targeting all ad groups");
      adGroups = await getAdGroups(accessToken, schedule.adsClientId);
    }

    if (adGroups.length === 0) {
      return {
        success: false,
        message: "No ad groups found",
        affectedAdGroupIds: [],
      };
    }

    console.log(`Found ${adGroups.length} ad groups to update`);

    const affectedAdGroupIds: string[] = [];
    const errors: string[] = [];

    // Execute action on each ad group
    for (const adGroup of adGroups) {
      try {
        const updateData = buildUpdateData(schedule, adGroup);

        if (Object.keys(updateData).length > 0) {
          await updateAdGroup(
            accessToken,
            schedule.adsClientId,
            adGroup.id,
            updateData
          );
          affectedAdGroupIds.push(adGroup.id);
        }
      } catch (error: any) {
        console.error(`Failed to update ad group ${adGroup.id}:`, error?.message);
        errors.push(`${adGroup.name}: ${error?.message}`);
      }
    }

    const success = affectedAdGroupIds.length > 0;
    const message = success ?
      `Updated ${affectedAdGroupIds.length} ad groups` :
      `Failed to update any ad groups: ${errors.join(", ")}`;

    return {
      success,
      message,
      affectedAdGroupIds,
      error: errors.length > 0 ? errors.join("; ") : undefined,
    };
  } catch (error: any) {
    console.error("Schedule execution failed:", error);
    return {
      success: false,
      message: "Execution failed",
      affectedAdGroupIds: [],
      error: error?.message || "Unknown error",
    };
  }
}

/**
 * Build update data based on schedule action
 */
function buildUpdateData(schedule: Schedule, adGroup: AdGroup): any {
  const updateData: any = {};

  switch (schedule.actionType) {
  case "status":
    if (schedule.statusValue) {
      updateData.status = schedule.statusValue;
    }
    break;

  case "cpc":
    if (adGroup.bidding?.maxCpc) {
      const currentAmount = parseFloat(adGroup.bidding.maxCpc.amount);
      const newAmount = calculateNewAmount(
        currentAmount,
        schedule.changeValue,
        schedule.changeMode
      );

      updateData.bidding = {
        maxCpc: {
          amount: newAmount.toFixed(2),
          currency: adGroup.bidding.maxCpc.currency,
        },
      };

      // Include budget if it exists (Allegro API requirement)
      if (adGroup.budget) {
        updateData.budget = adGroup.budget;
      }
    }
    break;

  case "budget":
    if (adGroup.budget?.daily) {
      const currentAmount = parseFloat(adGroup.budget.daily.amount);
      const newAmount = calculateNewAmount(
        currentAmount,
        schedule.changeValue,
        schedule.changeMode
      );

      updateData.budget = {
        daily: {
          amount: newAmount.toFixed(2),
          currency: adGroup.budget.daily.currency,
        },
      };

      // Include total budget if it exists
      if (adGroup.budget.total) {
        updateData.budget.total = adGroup.budget.total;
      }
    }
    break;
  }

  return updateData;
}

/**
 * Calculate new amount based on change mode
 */
function calculateNewAmount(
  currentAmount: number,
  changeValue: number,
  changeMode: "percentage" | "amount"
): number {
  if (changeMode === "percentage") {
    return currentAmount * (1 + changeValue / 100);
  } else {
    return currentAmount + changeValue;
  }
}

