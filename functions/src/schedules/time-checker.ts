import {Schedule} from "./types";

/**
 * Check if schedule should execute now
 */
export function shouldExecuteNow(schedule: Schedule, now: Date): boolean {
  // Check if active
  if (!schedule.isActive) {
    return false;
  }

  // Check day of week
  const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc.
  if (!schedule.daysOfWeek.includes(dayOfWeek)) {
    return false;
  }

  // Check time
  if (schedule.timeMode === "specific") {
    if (!schedule.startTime || !schedule.endTime) {
      return false;
    }

    const currentTime = formatTime(now);
    if (currentTime < schedule.startTime || currentTime > schedule.endTime) {
      return false;
    }
  }

  // Check if not executed in last 5 minutes (avoid duplicate executions)
  if (schedule.lastExecuted) {
    const lastExecutedTime = schedule.lastExecuted.toMillis();
    const diff = now.getTime() - lastExecutedTime;
    const fiveMinutes = 5 * 60 * 1000;

    if (diff < fiveMinutes) {
      return false;
    }
  }

  return true;
}

/**
 * Format Date to HH:MM string in Warsaw timezone
 */
function formatTime(date: Date): string {
  // Convert UTC to Warsaw time (UTC+1 in winter, UTC+2 in summer)
  // For simplicity, we'll use UTC+2 (CEST - Central European Summer Time)
  const warsawOffset = 2; // CEST is UTC+2
  const warsawTime = new Date(date.getTime() + (warsawOffset * 60 * 60 * 1000));

  const hours = warsawTime.getUTCHours().toString().padStart(2, "0");
  const minutes = warsawTime.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Get next execution time for display
 */
export function getNextExecutionTime(schedule: Schedule): Date | null {
  if (!schedule.isActive) {
    return null;
  }

  const now = new Date();
  const currentDay = now.getDay();

  // Find next matching day
  for (let i = 0; i < 7; i++) {
    const checkDay = (currentDay + i) % 7;

    if (schedule.daysOfWeek.includes(checkDay)) {
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + i);

      if (schedule.timeMode === "specific" && schedule.startTime) {
        const [hours, minutes] = schedule.startTime.split(":").map(Number);
        nextDate.setHours(hours, minutes, 0, 0);

        // If it's today and time has passed, continue to next day
        if (i === 0 && nextDate < now) {
          continue;
        }

        return nextDate;
      } else {
        // All day - return midnight
        nextDate.setHours(0, 0, 0, 0);
        if (i === 0 && nextDate < now) {
          continue;
        }
        return nextDate;
      }
    }
  }

  return null;
}

