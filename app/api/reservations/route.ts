import { cleanupExpiredReservations } from '@/lib/cleanup';
import { createReservation } from '@/lib/reservation';
import { NextRequest, NextResponse } from 'next/server';

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
    const message = error instanceof Error ? error.message : 'Failed to create reservation';
    
    // Return 409 Conflict for insufficient inventory
    if ((error as any)?.code === 'CONFLICT_409') {
      return NextResponse.json(
        { error: message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
