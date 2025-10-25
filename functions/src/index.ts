import {onSchedule} from "firebase-functions/v2/scheduler";
import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import {Schedule} from "./schedules/types";
import {shouldExecuteNow} from "./schedules/time-checker";
import {executeScheduleAction} from "./schedules/executor";

// Load environment variables (for local development)
dotenv.config();

// Define secrets
const allegroClientId = defineSecret("ALLEGRO_CLIENT_ID");
const allegroClientSecret = defineSecret("ALLEGRO_CLIENT_SECRET");

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Schedule Executor - runs every 5 minutes
 * Checks active schedules and executes actions if time matches
 */
export const scheduleExecutor = onSchedule({
  schedule: "every 5 minutes",
  timeZone: "Europe/Warsaw",
  secrets: [allegroClientId, allegroClientSecret],
}, async () => {
  const db = admin.firestore();
  const now = new Date();

  console.log(`[${now.toISOString()}] Schedule executor started`);

  try {
    // Get all active schedules
    const schedulesSnapshot = await db
      .collection("schedules")
      .where("isActive", "==", true)
      .get();

    console.log(`Found ${schedulesSnapshot.size} active schedules`);

    if (schedulesSnapshot.empty) {
      console.log("No active schedules to execute");
      return;
    }

    let executed = 0;
    let skipped = 0;

    // Process each schedule
    for (const doc of schedulesSnapshot.docs) {
      const schedule = doc.data() as Schedule;
      schedule.id = doc.id;

      console.log(`Checking schedule: ${schedule.name} (${schedule.id})`);

      // Check if should execute now
      if (shouldExecuteNow(schedule, now)) {
        console.log(`Executing schedule: ${schedule.name}`);

        try {
          // Execute the action
          const result = await executeScheduleAction(schedule);

          // Update schedule with execution results
          const now = admin.firestore.Timestamp.now();
          const logEntry: any = {
            timestamp: now,
            success: result.success,
            message: result.message,
            affectedAdGroupIds: result.affectedAdGroupIds,
          };
          if (result.error) {
            logEntry.error = result.error;
          }
          await doc.ref.update({
            lastExecuted: now,
            executionLog: admin.firestore.FieldValue.arrayUnion(logEntry),
          });

          executed++;
          console.log(`Schedule executed successfully: ${result.message}`);
        } catch (error: any) {
          console.error(`Failed to execute schedule ${schedule.id}:`, error);

          // Log the error
          const now = admin.firestore.Timestamp.now();
          await doc.ref.update({
            executionLog: admin.firestore.FieldValue.arrayUnion({
              timestamp: now,
              success: false,
              message: "Execution failed",
              error: error?.message || "Unknown error",
            }),
          });
        }
      } else {
        skipped++;
        console.log(`Schedule skipped: ${schedule.name} (not matching time/day)`);
      }
    }

    console.log(`Schedule executor finished. Executed: ${executed}, Skipped: ${skipped}`);
  } catch (error: any) {
    console.error("Schedule executor error:", error);
    throw error;
  }
});

/**
 * HTTP endpoint to manually trigger schedule execution (for testing)
 */
export const executeScheduleManually = onRequest({
  secrets: [allegroClientId, allegroClientSecret],
}, async (req, res) => {
  const {scheduleId} = req.query;

  if (!scheduleId || typeof scheduleId !== "string") {
    res.status(400).json({error: "scheduleId is required"});
    return;
  }

  const db = admin.firestore();

  try {
    const scheduleDoc = await db.collection("schedules").doc(scheduleId).get();

    if (!scheduleDoc.exists) {
      res.status(404).json({error: "Schedule not found"});
      return;
    }

    const schedule = scheduleDoc.data() as Schedule;
    schedule.id = scheduleDoc.id;

    console.log(`Manually executing schedule: ${schedule.name}`);

    const result = await executeScheduleAction(schedule);

    // Update schedule
    await scheduleDoc.ref.update({
      lastExecuted: admin.firestore.FieldValue.serverTimestamp(),
      executionLog: admin.firestore.FieldValue.arrayUnion({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        success: result.success,
        message: result.message,
        affectedAdGroupIds: result.affectedAdGroupIds,
        error: result.error,
      }),
    });

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Manual execution error:", error);
    res.status(500).json({
      error: "Execution failed",
      details: error?.message,
    });
  }
});
