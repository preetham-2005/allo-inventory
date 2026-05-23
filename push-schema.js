const { execSync } = require('child_process');

try {
  console.log('Pushing Prisma schema to database...');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  console.log('✅ Schema pushed successfully');
} catch (error) {
  console.error('Error pushing schema:', error.message);
  process.exit(1);
}
