import { prisma } from './prisma';

const RESERVATION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Lazy cleanup: Release inventory for expired pending reservations
 * Call this at the start of any API operation to clean up expired reservations
 */
export async function cleanupExpiredReservations() {
  try {
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() - RESERVATION_TIMEOUT_MS);

    // Find all pending reservations that have expired
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: 'pending',
        createdAt: {
          lt: expiryThreshold,
        },
      },
      include: {
        items: true,
      },
    });

    if (expiredReservations.length === 0) {
      return;
    }

    // Release inventory for each expired reservation
    for (const reservation of expiredReservations) {
      // Update product inventory
      for (const item of reservation.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            inventory: {
              increment: item.quantity,
            },
          },
        });
      }

      // Mark reservation as expired
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'expired',
        },
      });
    }

    console.log(`Cleaned up ${expiredReservations.length} expired reservations`);
  } catch (error) {
    console.error('Error cleaning up expired reservations:', error);
    // Don't throw - cleanup failure shouldn't break the main operation
  }
}
