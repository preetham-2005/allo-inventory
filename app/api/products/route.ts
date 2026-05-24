import { cleanupExpiredReservations } from '@/lib/cleanup';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Lazy cleanup: release inventory for expired reservations
    await cleanupExpiredReservations();

    const products = await prisma.product.findMany({
      include: {
        stock: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to include available units per warehouse
    const transformedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      createdAt: product.createdAt,
      warehouses: product.stock.map((s) => ({
        warehouseId: s.warehouse.id,
        warehouseName: s.warehouse.name,
        location: s.warehouse.location,
        totalUnits: s.totalUnits,
        reservedUnits: s.reservedUnits,
        availableUnits: s.totalUnits - s.reservedUnits,
      })),
    }));

    return NextResponse.json(
      {
        success: true,
        products: transformedProducts,
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
