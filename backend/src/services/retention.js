import { store } from "./store.js";

/**
 * Daily retention purge worker (PRD Section 17.7)
 * Runs automatically every 24 hours to delete raw logs past the retention threshold.
 */
export function initRetentionWorker() {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  setInterval(() => {
    try {
      const result = store.purgeOldEvents();
      console.log(`[Retention Worker] Purged ${result.deletedCount} expired events. Remaining: ${result.remainingCount}`);
    } catch (err) {
      console.error("[Retention Worker Error]", err);
    }
  }, TWENTY_FOUR_HOURS);

  console.log(`[Retention Worker] Initialized (running daily with ${store.adminSettings.retentionDays} days retention).`);
}

