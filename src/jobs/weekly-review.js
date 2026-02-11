import CanvasClient from '../integrations/canvas.js';
import NotionClient from '../integrations/notion.js';
import AIProvider from '../ai/provider.js';

/**
 * Weekly Review Job
 * Runs every Sunday evening to create a plan for the upcoming week
 */
async function runWeeklyReview() {
  console.log('🚀 Starting Weekly Review...');
  
  try {
    // Initialize clients
    const canvas = new CanvasClient();
    const notion = new NotionClient();
    const ai = new AIProvider();

    // Fetch upcoming assignments
    console.log('📚 Fetching assignments from Canvas...');
    const assignments = await canvas.getUpcomingAssignments(14); // Next 2 weeks
    
    if (assignments.length === 0) {
      console.log('✅ No upcoming assignments found!');
      return;
    }

    console.log(`Found ${assignments.length} upcoming assignments`);

    // Categorize by urgency
    const categories = canvas.categorizeByUrgency(assignments);
    
    console.log(`📊 Categorized: ${categories.overdue.length} overdue, ${categories.urgent.length} urgent, ${categories.thisWeek.length} this week, ${categories.upcoming.length} upcoming`);

    // Format for AI
    const formattedAssignments = canvas.formatAssignmentsForAI(assignments);

    // Generate AI summary and plan
    console.log('🤖 Generating AI summary and weekly plan...');
    
    const systemPrompt = `You are a helpful academic planning assistant. Your role is to analyze student assignments and create clear, actionable weekly plans.`;
    
    const userPrompt = `Here are my upcoming assignments:

${JSON.stringify(formattedAssignments, null, 2)}

Please provide:
1. A brief summary of my workload for the week (2-3 sentences)
2. A strategic weekly plan with specific daily recommendations

Format your response as:
SUMMARY:
[your summary here]

WEEKLY PLAN:
[your plan here - be specific about which tasks to tackle which days]`;

    const aiResponse = await ai.generateCompletion(systemPrompt, userPrompt);
    
    // Parse AI response
    const parts = aiResponse.split('WEEKLY PLAN:');
    const summary = parts[0].replace('SUMMARY:', '').trim();
    const plan = parts[1]?.trim() || 'Focus on completing tasks in order of urgency.';

    // Create week string
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const weekString = `${today.toLocaleDateString()} - ${nextWeek.toLocaleDateString()}`;

    // Save to Notion
    console.log('💾 Saving to Notion...');
    await notion.createWeeklyReview({
      week: weekString,
      summary,
      plan,
      categories
    });

    console.log('✅ Weekly review completed successfully!');
    console.log('\n📋 Summary:', summary);
    console.log('\n🎯 Plan:', plan);

  } catch (error) {
    console.error('❌ Error running weekly review:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runWeeklyReview()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default runWeeklyReview;
