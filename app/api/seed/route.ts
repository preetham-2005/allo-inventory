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

    // Create test products
    const products = await prisma.product.createMany({
      data: [
        {
          name: 'Test Item A',
          sku: 'TEST-001',
        },
        {
          name: 'Test Item B',
          sku: 'TEST-002',
        },
        {
          name: 'Test Item C',
          sku: 'TEST-003',
        },
      ],
    });

    // Create test warehouse
    const warehouse = await prisma.warehouse.create({
      data: {
        name: 'Test Warehouse',
        location: 'Test Location',
      },
    });

    // Get created products and add stock
    const createdProducts = await prisma.product.findMany();
    const stockData = [
      { productId: createdProducts[0].id, warehouseId: warehouse.id, totalUnits: 1 }, // Only 1 item - perfect for conflict testing
      { productId: createdProducts[1].id, warehouseId: warehouse.id, totalUnits: 1 },
      { productId: createdProducts[2].id, warehouseId: warehouse.id, totalUnits: 5 },
    ];

    await prisma.stock.createMany({
      data: stockData,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Seed data created successfully',
        productsCreated: products.count,
        stockCreated: stockData.length,
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
