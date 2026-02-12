import dotenv from 'dotenv';
dotenv.config({ override: true });

import runWeeklyReview from './jobs/weekly-review.js';
import runDailyUpdate from './jobs/daily-update.js';
import runTaskSync from './jobs/task-sync.js';

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
      
      case 'sync':
        await runTaskSync();
        break;
      
      case 'test':
        console.log('Running test mode - all jobs...\n');
        await runWeeklyReview();
        console.log('\n---\n');
        await runDailyUpdate();
        console.log('\n---\n');
        await runTaskSync();
        break;
      
      default:
        console.log('Usage:');
        console.log('  node src/index.js weekly  - Run weekly review');
        console.log('  node src/index.js daily   - Run daily update');
        console.log('  node src/index.js sync    - Sync Canvas tasks to Notion');
        console.log('  node src/index.js test    - Run all jobs for testing');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
