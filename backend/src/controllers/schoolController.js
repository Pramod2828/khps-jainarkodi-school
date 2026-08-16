const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');

/**
 * GET /api/school
 * Public endpoint to fetch school metadata
 */
async function getSchoolInfo(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM school_information WHERE id = 1');
    if (rows.length === 0) {
      return errorResponse(res, 'School information not found', 404, 'NOT_FOUND');
    }
    return successResponse(res, rows[0], 'School information retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch school information', 500, 'SERVER_ERROR', error.message);
  }
}

/**
 * PUT /api/school
 * Protected: Teacher / Admin
 */
async function updateSchoolInfo(req, res) {
  try {
    const { school_name, tagline, address, phone, email, head_teacher, description, timings, map_url } = req.body;

    let logoUrl = null;
    let heroImage = null;

    if (req.files) {
      if (req.files['logo'] && req.files['logo'][0]) {
        logoUrl = `/uploads/${req.files['logo'][0].filename}`;
      }
      if (req.files['hero_image'] && req.files['hero_image'][0]) {
        heroImage = `/uploads/${req.files['hero_image'][0].filename}`;
      }
    }

    await pool.query(
      `UPDATE school_information SET
        school_name = COALESCE(?, school_name),
        tagline = COALESCE(?, tagline),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        head_teacher = COALESCE(?, head_teacher),
        description = COALESCE(?, description),
        timings = COALESCE(?, timings),
        map_url = COALESCE(?, map_url),
        logo_url = COALESCE(?, logo_url),
        hero_image = COALESCE(?, hero_image)
       WHERE id = 1`,
      [
        school_name ? school_name.trim() : null,
        tagline ? tagline.trim() : null,
        address ? address.trim() : null,
        phone ? phone.trim() : null,
        email ? email.trim() : null,
        head_teacher ? head_teacher.trim() : null,
        description ? description.trim() : null,
        timings ? timings.trim() : null,
        map_url ? map_url.trim() : null,
        logoUrl,
        heroImage
      ]
    );

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPDATE_SCHOOL_INFO',
      module: 'SCHOOL_INFO'
    });

    return successResponse(res, null, 'School information updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update school information', 500, 'SERVER_ERROR', error.message);
  }
}

module.exports = {
  getSchoolInfo,
  updateSchoolInfo
};
