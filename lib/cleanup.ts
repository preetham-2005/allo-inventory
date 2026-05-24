import { cleanupExpiredReservations as performCleanup } from './reservation';

/**
 * Wrapper for cleanup to be called from API routes
 * Cleans up expired pending reservations and returns count of released reservations
 */
export async function cleanupExpiredReservations() {
  try {
    const count = await performCleanup();
    if (count > 0) {
      console.log(`Cleaned up ${count} expired reservations`);
    }
  } catch (error) {
    console.error('Error in cleanup:', error);
    // Don't throw - cleanup failures should not block API responses
  }
}

