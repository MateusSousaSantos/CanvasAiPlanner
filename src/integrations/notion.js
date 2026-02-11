import { Client } from '@notionhq/client';

/**
 * Notion API Client for task management
 */
class NotionClient {
  constructor() {
    this.notion = new Client({
      auth: process.env.NOTION_API_KEY
    });
    this.databaseId = process.env.NOTION_DATABASE_ID;
  }

  /**
   * Create or update the weekly review page
   */
  async createWeeklyReview(weekData) {
    try {
      const { week, summary, plan, categories } = weekData;

      // Create a new page in the database
      const response = await this.notion.pages.create({
        parent: { database_id: this.databaseId },
        properties: {
          'Name': {
            title: [
              {
                text: {
                  content: `Weekly Review - ${week}`
                }
              }
            ]
          },
          'Type': {
            select: {
              name: 'Weekly Review'
            }
          },
          'Date': {
            date: {
              start: new Date().toISOString().split('T')[0]
            }
          }
        },
        children: this.buildWeeklyReviewContent(summary, plan, categories)
      });

      return response;
    } catch (error) {
      console.error('Error creating weekly review in Notion:', error.message);
      throw error;
    }
  }

  /**
   * Build the content blocks for weekly review
   */
  buildWeeklyReviewContent(summary, plan, categories) {
    const blocks = [];

    // Summary section
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '📋 Summary' } }]
      }
    });

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: summary } }]
      }
    });

    // Weekly Plan section
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '🎯 Weekly Plan' } }]
      }
    });

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: plan } }]
      }
    });

    // Tasks by category
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '📚 Tasks Breakdown' } }]
      }
    });

    // Add each category
    if (categories.overdue && categories.overdue.length > 0) {
      blocks.push(this.createCategoryBlock('🚨 Overdue', categories.overdue));
    }

    if (categories.urgent && categories.urgent.length > 0) {
      blocks.push(this.createCategoryBlock('⚡ Urgent (Next 2 Days)', categories.urgent));
    }

    if (categories.thisWeek && categories.thisWeek.length > 0) {
      blocks.push(this.createCategoryBlock('📅 This Week', categories.thisWeek));
    }

    if (categories.upcoming && categories.upcoming.length > 0) {
      blocks.push(this.createCategoryBlock('📆 Upcoming', categories.upcoming));
    }

    return blocks;
  }

  /**
   * Create a category block with tasks
   */
  createCategoryBlock(categoryName, tasks) {
    return {
      object: 'block',
      type: 'toggle',
      toggle: {
        rich_text: [{ text: { content: `${categoryName} (${tasks.length})` } }],
        children: tasks.map(task => ({
          object: 'block',
          type: 'to_do',
          to_do: {
            rich_text: [
              {
                text: {
                  content: `${task.name} - ${task.course_name} (Due: ${new Date(task.due_at).toLocaleDateString()})`
                }
              }
            ],
            checked: false
          }
        }))
      }
    };
  }

  /**
   * Create daily update entry
   */
  async createDailyUpdate(updateData) {
    try {
      const { newTasks, updatedTasks, summary } = updateData;

      const response = await this.notion.pages.create({
        parent: { database_id: this.databaseId },
        properties: {
          'Name': {
            title: [
              {
                text: {
                  content: `Daily Update - ${new Date().toLocaleDateString()}`
                }
              }
            ]
          },
          'Type': {
            select: {
              name: 'Daily Update'
            }
          },
          'Date': {
            date: {
              start: new Date().toISOString().split('T')[0]
            }
          }
        },
        children: this.buildDailyUpdateContent(newTasks, updatedTasks, summary)
      });

      return response;
    } catch (error) {
      console.error('Error creating daily update in Notion:', error.message);
      throw error;
    }
  }

  /**
   * Build content blocks for daily update
   */
  buildDailyUpdateContent(newTasks, updatedTasks, summary) {
    const blocks = [];

    // Summary
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: summary } }]
      }
    });

    // New tasks
    if (newTasks.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ text: { content: `✨ New Tasks (${newTasks.length})` } }]
        }
      });

      newTasks.forEach(task => {
        blocks.push({
          object: 'block',
          type: 'to_do',
          to_do: {
            rich_text: [
              {
                text: {
                  content: `${task.name} - ${task.course_name} (Due: ${new Date(task.due_at).toLocaleDateString()})`
                }
              }
            ],
            checked: false
          }
        });
      });
    }

    // Updated tasks
    if (updatedTasks.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ text: { content: `🔄 Updated Tasks (${updatedTasks.length})` } }]
        }
      });

      updatedTasks.forEach(task => {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                text: {
                  content: `${task.name} - ${task.course_name}`
                }
              }
            ]
          }
        });
      });
    }

    return blocks;
  }

  /**
   * Query existing tasks to check for updates
   */
  async queryExistingTasks() {
    try {
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          property: 'Type',
          select: {
            equals: 'Task'
          }
        }
      });

      return response.results;
    } catch (error) {
      console.error('Error querying Notion database:', error.message);
      throw error;
    }
  }
}

export default NotionClient;
