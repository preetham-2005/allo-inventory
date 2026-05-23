import { prisma } from './prisma';

interface ReservationItemInput {
  productId: string;
  quantity: number;
}

/**
 * Create a new reservation with items
 * Reserves inventory for each item
 * Throws error if inventory is insufficient (simulates 409 Conflict)
 */
export async function createReservation(items: ReservationItemInput[]) {
  // Use transaction to atomically check and reserve inventory
  return await prisma.$transaction(
    async (tx) => {
      // Check if all products exist and have sufficient inventory
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (product.inventory < item.quantity) {
          const error = new Error(
            `Insufficient inventory for ${product.name}. Available: ${product.inventory}, Requested: ${item.quantity}`
          );
          (error as any).code = 'CONFLICT_409';
          throw error;
        }
      }

      // Create reservation with items
      const reservation = await tx.reservation.create({
        data: {
          status: 'pending',
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Deduct inventory for reserved items (atomic)
      for (const item of items) {
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: {
            inventory: {
              decrement: item.quantity,
            },
          },
        });

        // Double-check inventory didn't go negative (shouldn't happen in transaction)
        if (updated.inventory < 0) {
          throw new Error(`Inventory would be negative for ${updated.name}`);
        }
      }

      return reservation;
    },
    {
      isolationLevel: 'Serializable', // Strongest isolation for concurrent access
    }
  );
}

/**
 * Cancel a pending reservation and release its inventory
 */
export async function cancelReservation(reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      items: true,
    },
  });

  if (!reservation) {
    throw new Error('Reservation not found');
  }

  if (reservation.status !== 'pending') {
    throw new Error(`Cannot cancel ${reservation.status} reservation`);
  }

  // Release inventory
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

  // Mark as cancelled
  return await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: 'cancelled',
    },
  });
}
