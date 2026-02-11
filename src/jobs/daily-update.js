import CanvasClient from '../integrations/canvas.js';
import NotionClient from '../integrations/notion.js';
import AIProvider from '../ai/provider.js';
import fs from 'fs';
import path from 'path';

/**
 * Daily Update Job
 * Runs daily to check for new or updated assignments
 */
async function runDailyUpdate() {
  console.log('🌅 Starting Daily Update...');
  
  try {
    // Initialize clients
    const canvas = new CanvasClient();
    const notion = new NotionClient();
    const ai = new AIProvider();

    // Fetch current assignments
    console.log('📚 Fetching current assignments...');
    const currentAssignments = await canvas.getUpcomingAssignments(14);
    
    // Load previous assignments from cache
    const cacheFile = path.join(process.cwd(), '.assignment-cache.json');
    let previousAssignments = [];
    
    if (fs.existsSync(cacheFile)) {
      previousAssignments = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    }

    // Detect changes
    const changes = detectChanges(previousAssignments, currentAssignments);
    
    console.log(`📊 Changes detected: ${changes.new.length} new, ${changes.updated.length} updated`);

    if (changes.new.length === 0 && changes.updated.length === 0) {
      console.log('✅ No changes detected. All tasks up to date!');
      return;
    }

    // Generate AI summary of changes
    console.log('🤖 Generating update summary...');
    
    const systemPrompt = `You are a helpful academic assistant. Summarize changes to a student's assignment list in a clear, actionable way.`;
    
    const userPrompt = `New assignments: ${changes.new.length}
Updated assignments: ${changes.updated.length}

New tasks:
${JSON.stringify(changes.new.map(a => ({ name: a.name, course: a.course_name, due: a.due_at })), null, 2)}

Updated tasks:
${JSON.stringify(changes.updated.map(a => ({ name: a.name, course: a.course_name, due: a.due_at })), null, 2)}

Provide a brief, actionable summary (2-3 sentences) of what changed and any immediate actions needed.`;

    const summary = await ai.generateCompletion(systemPrompt, userPrompt);

    // Save to Notion
    console.log('💾 Saving daily update to Notion...');
    await notion.createDailyUpdate({
      newTasks: changes.new,
      updatedTasks: changes.updated,
      summary
    });

    // Update cache
    fs.writeFileSync(cacheFile, JSON.stringify(currentAssignments, null, 2));

    console.log('✅ Daily update completed successfully!');
    console.log('\n📝 Summary:', summary);

  } catch (error) {
    console.error('❌ Error running daily update:', error);
    throw error;
  }
}

/**
 * Detect what changed between previous and current assignments
 */
function detectChanges(previous, current) {
  const previousMap = new Map(previous.map(a => [a.id, a]));
  const currentMap = new Map(current.map(a => [a.id, a]));

  const newAssignments = [];
  const updatedAssignments = [];

  // Find new and updated assignments
  for (const [id, assignment] of currentMap) {
    if (!previousMap.has(id)) {
      newAssignments.push(assignment);
    } else {
      const prev = previousMap.get(id);
      // Check if due date or other important fields changed
      if (prev.due_at !== assignment.due_at || 
          prev.points_possible !== assignment.points_possible) {
        updatedAssignments.push(assignment);
      }
    }
  }

  return {
    new: newAssignments,
    updated: updatedAssignments
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDailyUpdate()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default runDailyUpdate;
