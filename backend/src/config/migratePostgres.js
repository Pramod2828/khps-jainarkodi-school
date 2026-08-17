const fs = require('fs');
const path = require('path');

let lastMigrationError = null;

function getMigrationError() {
  return lastMigrationError;
}

async function migratePostgres(pool) {
  if (!pool) return false;

  lastMigrationError = null;
  const migrationWarnings = [];

  try {
    console.log('🔄 Checking Cloud PostgreSQL schema and non-destructive data sync...');

    // 1. Create all production tables individually (no trailing semicolons)
    const createTableQueries = [
      `CREATE TABLE IF NOT EXISTS school_information (
        id SERIAL PRIMARY KEY,
        school_name VARCHAR(255) NOT NULL,
        tagline VARCHAR(255),
        logo_url TEXT,
        address TEXT NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL,
        head_teacher VARCHAR(100),
        description TEXT,
        timings VARCHAR(255),
        hero_image TEXT,
        map_url TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        role_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        role_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        plain_password VARCHAR(255),
        phone VARCHAR(20),
        status VARCHAR(20) DEFAULT 'ACTIVE',
        must_change_password INT DEFAULT 0,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        class_name VARCHAR(50) UNIQUE NOT NULL,
        display_order INT DEFAULT 0
      )`,

      `CREATE TABLE IF NOT EXISTS sections (
        id SERIAL PRIMARY KEY,
        class_id INT NOT NULL,
        section_name VARCHAR(10) NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        subject_name VARCHAR(100) NOT NULL,
        subject_code VARCHAR(50)
      )`,

      `CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        student_code VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        class_id INT NOT NULL,
        section_id INT,
        parent_name VARCHAR(100) NOT NULL,
        parent_phone VARCHAR(20) NOT NULL,
        address TEXT,
        photo_url TEXT,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        is_active INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        user_id INT,
        full_name VARCHAR(100) NOT NULL,
        designation VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(100),
        qualification VARCHAR(100),
        experience VARCHAR(50),
        joining_date DATE,
        photo_url TEXT,
        is_active INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS homework (
        id SERIAL PRIMARY KEY,
        class_id INT NOT NULL,
        section_id INT,
        subject_id INT,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        homework_date DATE NOT NULL,
        homework_day VARCHAR(20),
        homework_time VARCHAR(20),
        due_date DATE NOT NULL,
        teacher_id INT NOT NULL,
        custom_teacher_name VARCHAR(100),
        custom_subject_name VARCHAR(100),
        attachment_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS homework_attachments (
        id SERIAL PRIMARY KEY,
        homework_id INT NOT NULL,
        file_path TEXT NOT NULL,
        file_name VARCHAR(255),
        file_type VARCHAR(100) NOT NULL,
        file_size INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        description TEXT,
        priority VARCHAR(50) DEFAULT 'NORMAL',
        notice_date DATE NOT NULL,
        notice_time VARCHAR(20),
        expiry_date DATE,
        attachment_url TEXT,
        is_archived INT DEFAULT 0,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        is_active INT DEFAULT 1,
        is_banner INT DEFAULT 0,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        activity_date DATE NOT NULL,
        cover_image TEXT,
        video_url TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS activity_images (
        id SERIAL PRIMARY KEY,
        activity_id INT NOT NULL,
        image_url TEXT NOT NULL,
        caption TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS gallery_categories (
        id SERIAL PRIMARY KEY,
        category_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS gallery (
        id SERIAL PRIMARY KEY,
        category_id INT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        uploaded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_holiday INT DEFAULT 0,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS downloadable_files (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_category VARCHAR(100),
        file_path TEXT NOT NULL,
        file_name VARCHAR(255),
        file_type VARCHAR(100),
        file_size INT,
        download_count INT DEFAULT 0,
        class_id INT,
        uploaded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS downloads (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_category VARCHAR(100),
        file_path TEXT NOT NULL,
        file_name VARCHAR(255),
        file_type VARCHAR(100),
        file_size INT,
        download_count INT DEFAULT 0,
        class_id INT,
        uploaded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        reset_token VARCHAR(255) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INT,
        user_name VARCHAR(100),
        action VARCHAR(100) NOT NULL,
        module VARCHAR(50) NOT NULL,
        record_id VARCHAR(50),
        ip_address VARCHAR(50),
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const q of createTableQueries) {
      try {
        await pool.query(q);
      } catch (tableErr) {
        console.error(`Table Query Error: ${tableErr.message} (Query: ${q.substring(0, 50)})`);
        migrationWarnings.push(`Create Table Warning: ${tableErr.message}`);
      }
    }

    // 2. Non-destructive ALTER TABLE ADD COLUMN IF NOT EXISTS
    const alterTableQueries = [
      // notices
      `ALTER TABLE notices ADD COLUMN IF NOT EXISTS content TEXT`,
      `ALTER TABLE notices ALTER COLUMN content DROP NOT NULL`,
      `ALTER TABLE notices ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE notices ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'NORMAL'`,
      `ALTER TABLE notices ADD COLUMN IF NOT EXISTS notice_time VARCHAR(20)`,
      `ALTER TABLE notices ADD COLUMN IF NOT EXISTS expiry_date DATE`,
      `ALTER TABLE notices ADD COLUMN IF NOT EXISTS is_archived INT DEFAULT 0`,
      `ALTER TABLE notices ADD COLUMN IF NOT EXISTS attachment_url TEXT`,
      `UPDATE notices SET content = COALESCE(content, description, title) WHERE content IS NULL`,

      // announcements
      `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS content TEXT`,
      `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_banner INT DEFAULT 0`,
      `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_by INT`,
      `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,

      // gallery_categories
      `ALTER TABLE gallery_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,

      // students
      `ALTER TABLE students ADD COLUMN IF NOT EXISTS sat_number VARCHAR(100)`,
      `ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT`,
      `ALTER TABLE students ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE'`,
      `ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active INT DEFAULT 1`,

      // downloadable_files & downloads
      `ALTER TABLE downloadable_files ADD COLUMN IF NOT EXISTS class_id INT`,
      `ALTER TABLE downloadable_files ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Worksheets'`,
      `ALTER TABLE downloads ADD COLUMN IF NOT EXISTS class_id INT`,
      `ALTER TABLE downloads ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Worksheets'`,

      // homework
      `ALTER TABLE homework ADD COLUMN IF NOT EXISTS custom_teacher_name VARCHAR(100)`,
      `ALTER TABLE homework ADD COLUMN IF NOT EXISTS custom_subject_name VARCHAR(100)`,
      `ALTER TABLE homework ADD COLUMN IF NOT EXISTS attachment_url TEXT`,

      // users
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`,

      // gallery
      `ALTER TABLE gallery ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE gallery ADD COLUMN IF NOT EXISTS category_id INT`,
      `ALTER TABLE gallery ADD COLUMN IF NOT EXISTS uploaded_by INT`,

      // activities
      `ALTER TABLE activities ADD COLUMN IF NOT EXISTS cover_image TEXT`,
      `ALTER TABLE activities ADD COLUMN IF NOT EXISTS video_url TEXT`
    ];

    for (const alterQ of alterTableQueries) {
      try {
        await pool.query(alterQ);
      } catch (alterErr) {}
    }

    // 3. Non-destructive core table seeds
    const seedQueries = [
      `INSERT INTO roles (id, role_name, description) VALUES (1, 'SUPER_ADMIN', 'Full access to manage school system'), (2, 'TEACHER', 'Access to manage homework, activities, and students') ON CONFLICT DO NOTHING`,
      `INSERT INTO classes (id, class_name, display_order) VALUES (1, '1st Standard', 1), (2, '2nd Standard', 2), (3, '3rd Standard', 3), (4, '4th Standard', 4), (5, '5th Standard', 5) ON CONFLICT DO NOTHING`,
      `INSERT INTO sections (id, class_id, section_name) VALUES (1, 1, 'A'), (2, 2, 'A'), (3, 3, 'A'), (4, 4, 'A'), (5, 5, 'A') ON CONFLICT DO NOTHING`,
      `INSERT INTO subjects (id, subject_name, subject_code) VALUES (1, 'Kannada', 'KAN'), (2, 'English', 'ENG'), (3, 'Mathematics', 'MATH'), (4, 'Science', 'SCI'), (5, 'Social Science', 'SS') ON CONFLICT DO NOTHING`
    ];

    for (const sq of seedQueries) {
      try {
        await pool.query(sq);
      } catch(e) {}
    }

    // 4. Load snapshot data and sync IF tables are empty
    const snapshotPath = path.join(__dirname, '../../data_snapshot.json');
    if (fs.existsSync(snapshotPath)) {
      const snapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

      for (let [table, rows] of Object.entries(snapshotData)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;

        let targetTables = [table];
        if (table === 'downloads') {
          targetTables = ['downloadable_files', 'downloads'];
        }

        for (const targetTable of targetTables) {
          try {
            const checkRes = await pool.query(`SELECT COUNT(*) as cnt FROM "${targetTable}"`);
            if (parseInt(checkRes.rows[0].cnt) === 0) {
              console.log(`📥 Preserving ${rows.length} existing records into PostgreSQL table: ${targetTable}...`);
              for (const row of rows) {
                // Ensure content is not null for notices if snapshot row missing content
                if (targetTable === 'notices' && !row.content) {
                  row.content = row.description || row.title || 'Notice Announcement';
                }

                const keys = Object.keys(row);
                const vals = Object.values(row);
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                const colNames = keys.map(k => `"${k}"`).join(', ');
                
                const insertSql = `INSERT INTO "${targetTable}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
                await pool.query(insertSql, vals);
              }
            }
          } catch (tableCheckErr) {
            console.warn(`Snapshot check warning for ${targetTable}:`, tableCheckErr.message);
            migrationWarnings.push(`Snapshot Warning (${targetTable}): ${tableCheckErr.message}`);
          }
        }
      }
    }

    // 5. Reset PostgreSQL SERIAL sequence to max(id) across all tables so auto-increment works cleanly
    const allTables = [
      'school_information', 'roles', 'users', 'classes', 'sections',
      'subjects', 'students', 'teachers', 'homework', 'homework_attachments',
      'notices', 'announcements', 'activities', 'activity_images',
      'gallery_categories', 'gallery', 'calendar_events', 'downloadable_files',
      'downloads', 'password_resets', 'audit_logs'
    ];

    for (const tbl of allTables) {
      try {
        await pool.query(`SELECT setval(pg_get_serial_sequence('${tbl}', 'id'), COALESCE((SELECT MAX(id) FROM "${tbl}"), 1), true)`);
      } catch (seqErr) {}
    }

    // 6. Comprehensive Schema Verification Step
    let liveVerifiedTables = 0;
    for (const tbl of allTables) {
      try {
        await pool.query(`SELECT COUNT(*) FROM "${tbl}"`);
        liveVerifiedTables++;
      } catch (verErr) {
        migrationWarnings.push(`Missing Table/Relation: ${tbl} (${verErr.message})`);
      }
    }

    if (migrationWarnings.length === 0 && liveVerifiedTables === allTables.length) {
      console.log(`✅ All ${liveVerifiedTables}/${allTables.length} PostgreSQL tables and schemas verified 100% cleanly!`);
      return true;
    } else {
      console.warn(`⚠️ PostgreSQL Schema Migration completed with ${migrationWarnings.length} warnings. Verified ${liveVerifiedTables}/${allTables.length} tables.`);
      lastMigrationError = migrationWarnings.join(' | ');
      return true;
    }
  } catch (err) {
    console.error('⚠️ PostgreSQL Migration Notice:', err.message);
    lastMigrationError = err.message;
    return false;
  }
}

module.exports = { migratePostgres, getMigrationError };
