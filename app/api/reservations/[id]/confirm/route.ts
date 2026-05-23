import { cleanupExpiredReservations } from '@/lib/cleanup';
import { prisma } from '@/lib/prisma';
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

    // Find the reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Check if already confirmed
    if (reservation.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Reservation is already confirmed' },
        { status: 400 }
      );
    }

    // Check if reservation has expired
    if (reservation.status === 'expired' || reservation.status === 'cancelled') {
      return NextResponse.json(
        { error: `Reservation is ${reservation.status}` },
        { status: 400 }
      );
    }

    // Update reservation status to confirmed
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Reservation confirmed successfully',
        reservation: updatedReservation,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error confirming reservation:', error);
    return NextResponse.json(
      { error: 'Failed to confirm reservation' },
      { status: 500 }
    );
  }
}
