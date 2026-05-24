import { cleanupExpiredReservations } from '@/lib/cleanup';
import { createReservation } from '@/lib/reservation';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Lazy cleanup
    await cleanupExpiredReservations();

    // For demo purposes, return list of recent reservations
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const reservations = await fetch_reservations_helper(limit);

    return NextResponse.json(
      {
        success: true,
        reservations,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}

async function fetch_reservations_helper(limit: number) {
  const { prisma } = await import('@/lib/prisma');
  const reservations = await prisma.reservation.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
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
  return reservations;
}

export async function POST(request: NextRequest) {
  try {
    // Lazy cleanup: release inventory for expired reservations
    await cleanupExpiredReservations();

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate items have required fields
    for (const item of items) {
      if (!item.productId || !item.warehouseId || !item.quantity) {
        return NextResponse.json(
          {
            error:
              'Each item must have productId, warehouseId, and quantity',
          },
          { status: 400 }
        );
      }
      if (item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Quantity must be greater than 0' },
          { status: 400 }
        );
      }
    }

    const reservation = await createReservation(items);

    return NextResponse.json(
      {
        success: true,
        message: 'Reservation created successfully',
        reservation,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create reservation';

    // Return 409 Conflict for insufficient inventory
    if ((error as any)?.code === 'CONFLICT_409') {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    console.error('Error creating reservation:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
