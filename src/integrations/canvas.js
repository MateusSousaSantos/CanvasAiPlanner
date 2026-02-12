import axios from 'axios';

/**
 * Canvas LMS API Client
 */
class CanvasClient {
  constructor() {
    this.baseUrl = process.env.CANVAS_API_URL;
    this.token = process.env.CANVAS_API_TOKEN;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get all active courses for the current user
   */
  async getCourses() {
    try {
      const response = await this.client.get('/courses', {
        params: {
          enrollment_state: 'active',
          per_page: 100
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching courses:', error.message);
      throw error;
    }
  }

  /**
   * Get all assignments across all courses (including past and future)
   */
  async getAllAssignments() {
    try {
      const courses = await this.getCourses();
      const allAssignments = [];

      for (const course of courses) {
        const assignments = await this.getCourseAssignments(course.id);
        
        // Add course name to each assignment
        const assignmentsWithCourse = assignments.map(assignment => ({
          ...assignment,
          course_name: course.name,
          course_code: course.course_code
        }));
        
        allAssignments.push(...assignmentsWithCourse);
      }

      // Filter for assignments with due dates and sort by due date
      return allAssignments
        .filter(assignment => assignment.due_at)
        .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
    } catch (error) {
      console.error('Error fetching all assignments:', error.message);
      throw error;
    }
  }

  /**
   * Get upcoming assignments across all courses
   * @param {number} daysAhead - How many days to look ahead
   */
  async getUpcomingAssignments(daysAhead = 14) {
    try {
      const courses = await this.getCourses();
      const allAssignments = [];

      for (const course of courses) {
        const assignments = await this.getCourseAssignments(course.id);
        
        // Add course name to each assignment
        const assignmentsWithCourse = assignments.map(assignment => ({
          ...assignment,
          course_name: course.name,
          course_code: course.course_code
        }));
        
        allAssignments.push(...assignmentsWithCourse);
      }

      // Filter for upcoming assignments
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      return allAssignments
        .filter(assignment => {
          if (!assignment.due_at) return false;
          const dueDate = new Date(assignment.due_at);
          return dueDate >= now && dueDate <= futureDate;
        })
        .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
    } catch (error) {
      console.error('Error fetching assignments:', error.message);
      throw error;
    }
  }

  /**
   * Get assignments for a specific course
   */
  async getCourseAssignments(courseId) {
    try {
      const response = await this.client.get(`/courses/${courseId}/assignments`, {
        params: {
          per_page: 100,
          order_by: 'due_at'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching assignments for course ${courseId}:`, error.message);
      return [];
    }
  }

  /**
   * Get assignment details including submission status
   */
  async getAssignmentDetails(courseId, assignmentId) {
    try {
      const response = await this.client.get(
        `/courses/${courseId}/assignments/${assignmentId}`,
        {
          params: {
            include: ['submission']
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching assignment ${assignmentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Categorize assignments by urgency
   */
  categorizeByUrgency(assignments) {
    const now = new Date();
    const categories = {
      overdue: [],
      urgent: [],      // Due in next 2 days
      thisWeek: [],    // Due in next 7 days
      upcoming: []     // Due later
    };

    assignments.forEach(assignment => {
      const dueDate = new Date(assignment.due_at);
      const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
      const daysUntilDue = hoursUntilDue / 24;

      if (hoursUntilDue < 0) {
        categories.overdue.push(assignment);
      } else if (daysUntilDue <= 2) {
        categories.urgent.push(assignment);
      } else if (daysUntilDue <= 7) {
        categories.thisWeek.push(assignment);
      } else {
        categories.upcoming.push(assignment);
      }
    });

    return categories;
  }

  /**
   * Format assignments for AI processing
   */
  formatAssignmentsForAI(assignments) {
    return assignments.map(a => ({
      title: a.name,
      course: a.course_name,
      due_date: a.due_at,
      points: a.points_possible,
      description: a.description?.replace(/<[^>]*>/g, '').substring(0, 200) || 'No description',
      url: a.html_url
    }));
  }
}

export default CanvasClient;
