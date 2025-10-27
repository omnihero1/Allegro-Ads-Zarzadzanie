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

  // Check if already executed today in this time window
  if (schedule.lastExecuted && schedule.timeMode === "specific" &&
      schedule.startTime && schedule.endTime) {
    const lastExecutedTime = new Date(schedule.lastExecuted.toMillis());
    const lastExecutedDay = lastExecutedTime.toDateString();
    const todayDay = now.toDateString();

    // If executed today
    if (lastExecutedDay === todayDay) {
      // Check if it was in the same time window (startTime - endTime)
      const lastExecutedTimeStr = formatTime(lastExecutedTime);

      if (lastExecutedTimeStr >= schedule.startTime &&
          lastExecutedTimeStr <= schedule.endTime) {
        // Already executed in this time window today
        console.log(
          `Schedule ${schedule.name} already executed today at ${lastExecutedTimeStr} ` +
          `(window: ${schedule.startTime}-${schedule.endTime})`
        );
        return false;
      }
    }
  }

  // For allDay mode, prevent execution more than once per day
  if (schedule.lastExecuted && schedule.timeMode === "allDay") {
    const lastExecutedTime = new Date(schedule.lastExecuted.toMillis());
    const lastExecutedDay = lastExecutedTime.toDateString();
    const todayDay = now.toDateString();

    if (lastExecutedDay === todayDay) {
      console.log(`Schedule ${schedule.name} already executed today (allDay mode)`);
      return false;
    }
  }

  return true;
}

/**
 * Format Date to HH:MM string in Warsaw timezone
 */
function formatTime(date: Date): string {
  // Use proper timezone conversion with Intl API
  const timeStr = date.toLocaleString("en-US", {
    timeZone: "Europe/Warsaw",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  // Extract HH:MM from the formatted string
  const match = timeStr.match(/(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }

  // Fallback (should never happen)
  return "00:00";
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

