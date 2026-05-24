import { cleanupExpiredReservations } from '@/lib/cleanup';
import { releaseReservation } from '@/lib/reservation';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Lazy cleanup: release inventory for expired reservations
    await cleanupExpiredReservations();

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }

    const reservation = await releaseReservation(id);

    return NextResponse.json(
      {
        success: true,
        message: 'Reservation released successfully',
        reservation,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to release reservation';

    console.error('Error releasing reservation:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
