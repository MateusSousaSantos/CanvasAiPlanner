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

  /**
   * Get all tasks from the task database
   */
  async getTasksFromDatabase() {
    try {
      const taskDatabaseId = process.env.NOTION_TASK_DATABASE_ID || this.databaseId;
      const response = await this.notion.databases.query({
        database_id: taskDatabaseId,
        page_size: 100
      });

      return response.results;
    } catch (error) {
      console.error('Error fetching tasks from Notion:', error.message);
      throw error;
    }
  }

  /**
   * Create a new task in the task database
   */
  async createTaskInDatabase(taskData) {
    try {
      const taskDatabaseId = process.env.NOTION_TASK_DATABASE_ID || this.databaseId;
      
      const properties = {
        'Name': {
          title: [
            {
              text: {
                content: taskData.name
              }
            }
          ]
        }
      };

      // Add optional properties if they exist
      if (taskData.course) {
        properties['Course'] = {
          rich_text: [
            {
              text: {
                content: taskData.course
              }
            }
          ]
        };
      }

      if (taskData.aiOverview) {
        properties['AI Overview'] = {
          rich_text: [
            {
              text: {
                content: taskData.aiOverview
              }
            }
          ]
        };
      }

      if (taskData.urgency) {
        properties['Urgency'] = {
          select: {
            name: taskData.urgency
          }
        };
      }

      if (taskData.canvasUrl) {
        properties['Canvas URL'] = {
          url: taskData.canvasUrl
        };
      }

      if (taskData.dueDate) {
        properties['Due Date'] = {
          date: {
            start: new Date(taskData.dueDate).toISOString()
          }
        };
      }

      if (taskData.done !== undefined) {
        properties['Done'] = {
          checkbox: taskData.done
        };
      }

      const response = await this.notion.pages.create({
        parent: { database_id: taskDatabaseId },
        properties: properties
      });

      return response;
    } catch (error) {
      console.error('Error creating task in Notion:', error.message);
      throw error;
    }
  }

  /**
   * Update an existing task in the task database
   */
  async updateTaskInDatabase(pageId, taskData) {
    try {
      const properties = {};

      // Update properties that are provided
      if (taskData.name) {
        properties['Name'] = {
          title: [
            {
              text: {
                content: taskData.name
              }
            }
          ]
        };
      }

      if (taskData.course) {
        properties['Course'] = {
          rich_text: [
            {
              text: {
                content: taskData.course
              }
            }
          ]
        };
      }

      if (taskData.aiOverview) {
        properties['AI Overview'] = {
          rich_text: [
            {
              text: {
                content: taskData.aiOverview
              }
            }
          ]
        };
      }

      if (taskData.urgency) {
        properties['Urgency'] = {
          select: {
            name: taskData.urgency
          }
        };
      }

      if (taskData.canvasUrl) {
        properties['Canvas URL'] = {
          url: taskData.canvasUrl
        };
      }

      if (taskData.dueDate) {
        properties['Due Date'] = {
          date: {
            start: new Date(taskData.dueDate).toISOString()
          }
        };
      }

      if (taskData.done !== undefined) {
        properties['Done'] = {
          checkbox: taskData.done
        };
      }

      const response = await this.notion.pages.update({
        page_id: pageId,
        properties: properties
      });

      return response;
    } catch (error) {
      console.error('Error updating task in Notion:', error.message);
      throw error;
    }
  }

  /**
   * Update urgency for all tasks based on current dates
   */
  async updateAllTasksUrgency() {
    try {
      const tasks = await this.getTasksFromDatabase();
      let updateCount = 0;

      for (const task of tasks) {
        const dueDate = task.properties['Due Date']?.date?.start;
        const currentUrgency = task.properties['Urgency']?.select?.name;
        const isDone = task.properties['Done']?.checkbox;

        // Skip if no due date or already done
        if (!dueDate || isDone) continue;

        // Calculate what urgency should be
        const newUrgency = this.calculateUrgencyFromDate(dueDate);

        // Update if different
        if (newUrgency !== currentUrgency) {
          await this.updateTaskInDatabase(task.id, { urgency: newUrgency });
          updateCount++;
        }
      }

      console.log(`  Updated urgency for ${updateCount} tasks`);
      return updateCount;
    } catch (error) {
      console.error('Error updating task urgencies:', error.message);
      throw error;
    }
  }

  /**
   * Calculate urgency based on due date
   */
  calculateUrgencyFromDate(dueDate) {
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
}

export default NotionClient;
