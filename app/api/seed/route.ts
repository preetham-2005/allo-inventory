import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Seed test data for concurrent testing
 * POST /api/seed
 */
export async function POST() {
  try {
    // Clear existing data
    await prisma.reservationItem.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.product.deleteMany();

    // Create test products with limited inventory to trigger conflicts
    const products = await prisma.product.createMany({
      data: [
        {
          name: 'Test Item A',
          sku: 'TEST-001',
          inventory: 1, // Only 1 item - perfect for conflict testing
        },
        {
          name: 'Test Item B',
          sku: 'TEST-002',
          inventory: 1,
        },
        {
          name: 'Test Item C',
          sku: 'TEST-003',
          inventory: 5,
        },
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Seed data created successfully',
        count: products.count,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error seeding data:', error);
    return NextResponse.json(
      { error: 'Failed to seed data' },
      { status: 500 }
    );
  }
}
