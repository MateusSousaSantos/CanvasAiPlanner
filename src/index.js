import dotenv from 'dotenv';
dotenv.config({ override: true });

import runWeeklyReview from './jobs/weekly-review.js';
import runDailyUpdate from './jobs/daily-update.js';

/**
 * Main entry point for testing
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🎓 Canvas AI Planner\n');

  try {
    switch (command) {
      case 'weekly':
        await runWeeklyReview();
        break;
      
      case 'daily':
        await runDailyUpdate();
        break;
      
      case 'test':
        console.log('Running test mode - both jobs...\n');
        await runWeeklyReview();
        console.log('\n---\n');
        await runDailyUpdate();
        break;
      
      default:
        console.log('Usage:');
        console.log('  node src/index.js weekly  - Run weekly review');
        console.log('  node src/index.js daily   - Run daily update');
        console.log('  node src/index.js test    - Run both for testing');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
