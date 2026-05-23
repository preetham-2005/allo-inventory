import { cleanupExpiredReservations } from '@/lib/cleanup';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Lazy cleanup: release inventory for expired reservations
    await cleanupExpiredReservations();

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        inventory: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(
      {
        success: true,
        products,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
