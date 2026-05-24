import { prisma } from './prisma';

const RESERVATION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

interface ReservationItemInput {
  productId: string;
  warehouseId: string;
  quantity: number;
}

/**
 * Create a new reservation with items
 * Uses row-level locking to ensure exactly one request succeeds when competing for the last unit
 * Throws error with code 'CONFLICT_409' if inventory is insufficient
 */
export async function createReservation(items: ReservationItemInput[]) {
  return await prisma.$transaction(
    async (tx) => {
      // For each item, lock the Stock row and check availability
      const stockLocks: {
        id: string;
        productId: string;
        warehouseId: string;
        totalUnits: number;
        reservedUnits: number;
        quantity: number;
      }[] = [];

      for (const item of items) {
        // Use raw SQL to SELECT FOR UPDATE on the stock row
        // This prevents other transactions from modifying it until we commit
        const stockRow = await tx.$queryRaw<
          Array<{
            id: string;
            productId: string;
            warehouseId: string;
            totalUnits: number;
            reservedUnits: number;
          }>
        >`
          SELECT s.id, s."productId", s."warehouseId", s."totalUnits", s."reservedUnits"
          FROM "Stock" s
          WHERE s."productId" = ${item.productId} AND s."warehouseId" = ${item.warehouseId}
          FOR UPDATE
        `;

        if (!stockRow || stockRow.length === 0) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          throw new Error(
            `Product or warehouse combination not found: ${product?.name || item.productId}`
          );
        }

        const stock = stockRow[0];
        const available = stock.totalUnits - stock.reservedUnits;

        if (available < item.quantity) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          const error = new Error(
            `Insufficient inventory for ${product?.name}. Available: ${available}, Requested: ${item.quantity}`
          );
          (error as any).code = 'CONFLICT_409';
          throw error;
        }

        stockLocks.push({
          ...stock,
          quantity: item.quantity,
        });
      }

      // Create reservation with calculated expiry time
      const expiresAt = new Date(Date.now() + RESERVATION_TIMEOUT_MS);
      const reservation = await tx.reservation.create({
        data: {
          expiresAt,
          items: {
            create: stockLocks.map((lock) => ({
              productId: lock.productId,
              stockId: lock.id,
              quantity: lock.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
              stock: {
                include: {
                  warehouse: true,
                },
              },
            },
          },
        },
      });

      // Update Stock to increment reserved units for each item
      for (const lock of stockLocks) {
        await tx.stock.update({
          where: { id: lock.id },
          data: {
            reservedUnits: {
              increment: lock.quantity,
            },
          },
        });
      }

      return reservation;
    },
    {
      isolationLevel: 'Serializable', // Strongest isolation for concurrent access
    }
  );
}

/**
 * Confirm a pending reservation (payment succeeded)
 * When payment succeeds:
 * 1. Decrease totalUnits (actual inventory removal)
 * 2. Decrease reservedUnits (unreserve the held inventory)
 * 3. Update status to 'confirmed'
 * 
 * Example:
 * Before: totalUnits = 10, reservedUnits = 3
 * After:  totalUnits = 9, reservedUnits = 2 (both decrease)
 */
export async function confirmReservation(reservationId: string) {
  return await prisma.$transaction(
    async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: {
          items: true,
        },
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.status !== 'pending') {
        throw new Error(`Cannot confirm ${reservation.status} reservation`);
      }

      // Check if reservation has expired
      if (new Date() > reservation.expiresAt) {
        // Auto-release if expired
        await releaseReservation(reservationId);
        const error = new Error('Reservation has expired');
        (error as any).code = 'EXPIRED_410';
        throw error;
      }

      // For each reserved item: decrease both totalUnits and reservedUnits
      for (const item of reservation.items) {
        await tx.stock.update({
          where: { id: item.stockId },
          data: {
            // Decrease totalUnits (actual inventory removal from system)
            totalUnits: {
              decrement: item.quantity,
            },
            // Decrease reservedUnits (unreserve the held inventory)
            reservedUnits: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Update reservation status to confirmed
      const confirmed = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'confirmed',
          confirmedAt: new Date(),
        },
        include: {
          items: {
            include: {
              product: true,
              stock: {
                include: {
                  warehouse: true,
                },
              },
            },
          },
        },
      });

      return confirmed;
    },
    {
      isolationLevel: 'Serializable',
    }
  );
}

/**
 * Release a reservation (payment failed, user cancelled, or expired)
 * Returns reserved units back to available inventory
 */
export async function releaseReservation(reservationId: string) {
  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
      include: {
        items: true,
      },
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (
      reservation.status !== 'pending' &&
      reservation.status !== 'confirmed'
    ) {
      throw new Error(`Cannot release ${reservation.status} reservation`);
    }

    // Release inventory for each item
    for (const item of reservation.items) {
      await tx.stock.update({
        where: { id: item.stockId },
        data: {
          reservedUnits: {
            decrement: item.quantity,
          },
        },
      });
    }

    // Update reservation status
    const released = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'released',
        releasedAt: new Date(),
      },
    });

    return released;
  });
}

/**
 * Cleanup: Release expired pending reservations
 * This is called periodically to free up inventory from abandoned carts
 */
export async function cleanupExpiredReservations() {
  const now = new Date();

  // Find all pending reservations that have expired
  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: 'pending',
      expiresAt: {
        lt: now,
      },
    },
    include: {
      items: true,
    },
  });

  if (expiredReservations.length === 0) {
    return 0;
  }

  // Release each expired reservation
  for (const reservation of expiredReservations) {
    await releaseReservation(reservation.id);
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: 'expired' },
    });
  }

  return expiredReservations.length;
}
