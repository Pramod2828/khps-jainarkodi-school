const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * GET /api/dashboard/stats
 * Real-time statistics strictly computed from SQL queries - PostgreSQL & SQLite compatible
 */
async function getDashboardStats(req, res) {
  try {
    const [[studentsCount]] = await pool.query("SELECT COUNT(*) as total FROM students WHERE status = 'ACTIVE' OR is_active = 1");
    const [[teachersCount]] = await pool.query("SELECT COUNT(*) as total FROM users u JOIN roles r ON u.role_id = r.id WHERE (r.role_name = 'TEACHER' OR r.role_name = 'ADMIN') AND (u.status = 'ACTIVE' OR u.status IS NULL)");
    const [[classesCount]] = await pool.query('SELECT COUNT(*) as total FROM classes');
    const [[homeworkTotal]] = await pool.query('SELECT COUNT(*) as total FROM homework');
    const [[homeworkToday]] = await pool.query("SELECT COUNT(*) as total FROM homework WHERE homework_date = CURRENT_DATE");
    const [[noticesCount]] = await pool.query('SELECT COUNT(*) as total FROM notices WHERE is_archived = 0 OR is_archived IS NULL');
    const [[activitiesCount]] = await pool.query('SELECT COUNT(*) as total FROM activities');
    const [[galleryCount]] = await pool.query('SELECT COUNT(*) as total FROM gallery');
    const [[upcomingEventsCount]] = await pool.query("SELECT COUNT(*) as total FROM calendar_events WHERE COALESCE(end_date, start_date) >= CURRENT_DATE");

    const statsData = {
      total_students: studentsCount ? parseInt(studentsCount.total) : 0,
      totalStudents: studentsCount ? parseInt(studentsCount.total) : 0,
      total_teachers: teachersCount ? parseInt(teachersCount.total) : 0,
      totalTeachers: teachersCount ? parseInt(teachersCount.total) : 0,
      total_classes: classesCount ? parseInt(classesCount.total) : 0,
      totalClasses: classesCount ? parseInt(classesCount.total) : 0,
      homework_posted: homeworkTotal ? parseInt(homeworkTotal.total) : 0,
      totalHomework: homeworkTotal ? parseInt(homeworkTotal.total) : 0,
      homework_today: homeworkToday ? parseInt(homeworkToday.total) : 0,
      homeworkToday: homeworkToday ? parseInt(homeworkToday.total) : 0,
      active_notices: noticesCount ? parseInt(noticesCount.total) : 0,
      activeNotices: noticesCount ? parseInt(noticesCount.total) : 0,
      total_activities: activitiesCount ? parseInt(activitiesCount.total) : 0,
      totalActivities: activitiesCount ? parseInt(activitiesCount.total) : 0,
      gallery_photos: galleryCount ? parseInt(galleryCount.total) : 0,
      totalGalleryPhotos: galleryCount ? parseInt(galleryCount.total) : 0,
      upcoming_events: upcomingEventsCount ? parseInt(upcomingEventsCount.total) : 0,
      upcomingEvents: upcomingEventsCount ? parseInt(upcomingEventsCount.total) : 0
    };

    return successResponse(res, statsData, 'Dashboard statistics retrieved');
  } catch (error) {
    console.error('getDashboardStats Error:', error);
    return errorResponse(res, 'Failed to compute dashboard statistics', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/dashboard/charts
 * Analytical charts data generated from SQL aggregations
 */
async function getDashboardCharts(req, res) {
  try {
    // 1. Homework by Class
    const [homeworkRaw] = await pool.query(`
      SELECT c.class_name, COUNT(h.id) as count
      FROM classes c
      LEFT JOIN homework h ON c.id = h.class_id
      GROUP BY c.id, c.class_name, c.display_order
      ORDER BY c.display_order ASC
    `);

    const homeworkByClass = homeworkRaw.map(item => ({
      class_name: item.class_name,
      count: parseInt(item.count || 0),
      homework_count: parseInt(item.count || 0)
    }));

    // 2. Students per Class
    const [studentsRaw] = await pool.query(`
      SELECT c.class_name, COUNT(s.id) as count
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id AND (s.status = 'ACTIVE' OR s.is_active = 1)
      GROUP BY c.id, c.class_name, c.display_order
      ORDER BY c.display_order ASC
    `);

    const studentsByClass = studentsRaw.map(item => ({
      name: item.class_name,
      class_name: item.class_name,
      count: parseInt(item.count || 0),
      value: parseInt(item.count || 0)
    }));

    return successResponse(res, {
      homework_by_class: homeworkByClass,
      homeworkByClass: homeworkByClass,
      students_by_class: studentsByClass,
      studentsPerClass: studentsByClass
    }, 'Dashboard chart data retrieved');
  } catch (error) {
    console.error('getDashboardCharts Error:', error);
    return errorResponse(res, 'Failed to fetch dashboard charts', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * GET /api/dashboard/recent-activity
 */
async function getRecentActivity(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT id, user_name, action, module, details, created_at
      FROM audit_logs
      ORDER BY id DESC
      LIMIT 10
    `);

    return successResponse(res, rows, 'Recent activity feed retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch recent activity', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getDashboardStats,
  getDashboardCharts,
  getRecentActivity
};
