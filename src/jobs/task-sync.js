import CanvasClient from '../integrations/canvas.js';
import NotionClient from '../integrations/notion.js';
import AIProvider from '../ai/provider.js';

/**
 * Task Sync Job
 * Runs daily to sync all Canvas tasks to Notion task database
 * and updates urgency levels based on due dates
 */
async function runTaskSync() {
  console.log('🔄 Starting Task Sync...');
  
  try {
    // Initialize clients
    const canvas = new CanvasClient();
    const notion = new NotionClient();
    const ai = new AIProvider();

    // Fetch all assignments from Canvas (all upcoming and current)
    console.log('📚 Fetching all assignments from Canvas...');
    const assignments = await canvas.getAllAssignments();
    
    console.log(`Found ${assignments.length} total assignments`);

    // Get existing tasks from Notion
    console.log('📋 Fetching existing tasks from Notion...');
    const existingTasks = await notion.getTasksFromDatabase();
    
    // Create a map of existing tasks by Canvas assignment ID
    const existingTasksMap = new Map();
    existingTasks.forEach(task => {
      const canvasUrl = task.properties?.['Canvas URL']?.url;
      if (canvasUrl) {
        // Extract assignment ID from URL
        const match = canvasUrl.match(/assignments\/(\d+)/);
        if (match) {
          existingTasksMap.set(match[1], task);
        }
      }
    });

    console.log(`Found ${existingTasks.length} existing tasks in Notion`);

    // Process each assignment
    let newCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      console.log(`\nProcessing (${i + 1}/${assignments.length}): ${assignment.name}`);

      // Calculate urgency
      const urgency = calculateUrgency(assignment.due_at);

      // Generate AI overview for new tasks or tasks that need update
      const existingTask = existingTasksMap.get(String(assignment.id));
      let aiOverview;

      if (!existingTask || shouldRegenerateOverview(existingTask)) {
        console.log('  🤖 Generating AI overview...');
        aiOverview = await generateTaskOverview(ai, assignment);
      } else {
        // Use existing overview
        aiOverview = existingTask.properties?.['AI Overview']?.rich_text?.[0]?.text?.content || '';
      }

      // Prepare task data
      const taskData = {
        name: assignment.name,
        course: assignment.course_name || assignment.course_code || 'Unknown Course',
        aiOverview: aiOverview,
        urgency: urgency,
        canvasUrl: assignment.html_url,
        dueDate: assignment.due_at,
        done: false,
        assignmentId: String(assignment.id)
      };

      // Create or update task in Notion
      if (existingTask) {
        console.log('  📝 Updating existing task...');
        await notion.updateTaskInDatabase(existingTask.id, taskData);
        updatedCount++;
      } else {
        console.log('  ✨ Creating new task...');
        await notion.createTaskInDatabase(taskData);
        newCount++;
      }

      // Small delay to avoid rate limits
      if (i < assignments.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Update urgency for all tasks in Notion based on current dates
    console.log('\n⏰ Updating urgency levels for all tasks...');
    await notion.updateAllTasksUrgency();

    console.log('\n✅ Task sync completed successfully!');
    console.log(`📊 Summary: ${newCount} new tasks, ${updatedCount} updated tasks`);

  } catch (error) {
    console.error('❌ Error running task sync:', error);
    throw error;
  }
}

/**
 * Calculate urgency level based on due date
 */
function calculateUrgency(dueDate) {
  if (!dueDate) return 'Upcoming';

  const now = new Date();
  const due = new Date(dueDate);
  const daysUntilDue = (due - now) / (1000 * 60 * 60 * 24);

  if (daysUntilDue < 0) {
    return 'Overdue';
  } else if (daysUntilDue <= 2) {
    return 'Urgent';
  } else if (daysUntilDue <= 7) {
    return 'This Week';
  } else {
    return 'Upcoming';
  }
}

/**
 * Generate AI overview for a task
 */
async function generateTaskOverview(ai, assignment) {
  try {
    // Clean up description (remove HTML tags)
    const description = assignment.description 
      ? assignment.description.replace(/<[^>]*>/g, '').substring(0, 500)
      : 'No description provided';

    const systemPrompt = `You are a helpful academic assistant. Create brief, actionable overviews of assignments for students.`;
    
    const userPrompt = `Create a concise overview (2-3 sentences) for this assignment:

Assignment: ${assignment.name}
Course: ${assignment.course_name || 'Unknown'}
Due Date: ${assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'Not specified'}
Points: ${assignment.points_possible || 'N/A'}
Description: ${description}

Focus on: what the task is, key requirements, and what the student should prioritize.`;

    const overview = await ai.generateCompletion(systemPrompt, userPrompt);
    return overview;
  } catch (error) {
    console.error('  ⚠️  Error generating AI overview, using fallback:', error.message);
    return `Complete ${assignment.name} for ${assignment.course_name || 'course'}.`;
  }
}

/**
 * Check if we should regenerate the AI overview
 */
function shouldRegenerateOverview(existingTask) {
  // Regenerate if there's no overview or it's very short
  const overview = existingTask.properties?.['AI Overview']?.rich_text?.[0]?.text?.content || '';
  return overview.length < 20;
}

// Export the job function
export default runTaskSync;

// If running directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  import('dotenv').then(dotenv => {
    dotenv.default.config();
    runTaskSync();
  });
}
