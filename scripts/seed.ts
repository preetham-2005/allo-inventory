import { prisma } from '../lib/prisma';

async function main() {
  try {
    console.log('Seeding database...');

    // Clear existing data
    await prisma.reservationItem.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.stock.deleteMany();
    await prisma.product.deleteMany();
    await prisma.warehouse.deleteMany();

    // Create warehouse
    const warehouse = await prisma.warehouse.create({
      data: {
        name: 'Main Warehouse',
        location: 'Hyderabad',
      },
    });

    // Create products
    const productA = await prisma.product.create({
      data: {
        name: 'Test Item A',
        sku: 'TEST-001',
      },
    });

    const productB = await prisma.product.create({
      data: {
        name: 'Test Item B',
        sku: 'TEST-002',
      },
    });

    const productC = await prisma.product.create({
      data: {
        name: 'Test Item C',
        sku: 'TEST-003',
      },
    });

    // Create stock entries
    await prisma.stock.createMany({
      data: [
        {
          productId: productA.id,
          warehouseId: warehouse.id,
          totalUnits: 1,
          reservedUnits: 0,
        },
        {
          productId: productB.id,
          warehouseId: warehouse.id,
          totalUnits: 1,
          reservedUnits: 0,
        },
        {
          productId: productC.id,
          warehouseId: warehouse.id,
          totalUnits: 5,
          reservedUnits: 0,
        },
      ],
    });

    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('Error seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();