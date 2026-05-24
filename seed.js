import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Seeding database...');

    // Clear existing data
    await prisma.reservationItem.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.stock.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.product.deleteMany();

    // Create test warehouses
    const warehouses = await prisma.warehouse.createMany({
      data: [
        {
          name: 'West Coast Hub',
          location: 'Los Angeles, CA',
        },
        {
          name: 'Central Distribution',
          location: 'Chicago, IL',
        },
        {
          name: 'East Coast Center',
          location: 'New York, NY',
        },
      ],
    });

    console.log(`✅ Seeded ${warehouses.count} warehouses`);

    // Create test products
    const products = await prisma.product.createMany({
      data: [
        {
          name: 'Wireless Headphones',
          sku: 'AUDIO-001',
        },
        {
          name: 'USB-C Cable',
          sku: 'CABLE-001',
        },
        {
          name: 'Phone Case',
          sku: 'CASE-001',
        },
        {
          name: 'Screen Protector',
          sku: 'SCREEN-001',
        },
        {
          name: 'Portable Charger',
          sku: 'CHARGE-001',
        },
      ],
    });

    console.log(`✅ Seeded ${products.count} products`);

    // Fetch created data
    const createdWarehouses = await prisma.warehouse.findMany();
    const createdProducts = await prisma.product.findMany();

    // Create stock entries for each product in each warehouse
    // This creates realistic inventory levels
    const stockData = [];
    for (const product of createdProducts) {
      for (const warehouse of createdWarehouses) {
        const totalUnits =
          Math.floor(Math.random() * 50) + 10; // 10-60 units per SKU/warehouse
        stockData.push({
          productId: product.id,
          warehouseId: warehouse.id,
          totalUnits,
          reservedUnits: 0,
        });
      }
    }

    await prisma.stock.createMany({ data: stockData });

    console.log(`✅ Seeded ${stockData.length} stock entries`);
    console.log('✅ Database seeding complete!');
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

