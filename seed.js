import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Seeding database...');
    
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
          inventory: 1,
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

    console.log(`✅ Seeded ${products.count} products`);
  } catch (error) {
    console.error('Error seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
