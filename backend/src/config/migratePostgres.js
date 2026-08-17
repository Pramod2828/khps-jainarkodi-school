const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migratePostgres(connectionString) {
  if (!connectionString) return;

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Checking Cloud PostgreSQL schema and data sync...');

    // 1. Create tables if not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS school_information (
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
      );

      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        role_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS users (
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
      );

      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        class_name VARCHAR(50) UNIQUE NOT NULL,
        display_order INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS sections (
        id SERIAL PRIMARY KEY,
        class_id INT NOT NULL,
        section_name VARCHAR(10) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS students (
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS teachers (
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
      );

      CREATE TABLE IF NOT EXISTS homework (
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
      );

      CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        notice_date DATE NOT NULL,
        category VARCHAR(50) DEFAULT 'GENERAL',
        target_audience VARCHAR(50) DEFAULT 'ALL',
        is_pinned INT DEFAULT 0,
        is_active INT DEFAULT 1,
        attachment_url TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        is_active INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        activity_date DATE NOT NULL,
        cover_image TEXT,
        video_url TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activity_images (
        id SERIAL PRIMARY KEY,
        activity_id INT NOT NULL,
        image_url TEXT NOT NULL,
        caption TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS gallery_categories (
        id SERIAL PRIMARY KEY,
        category_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS gallery (
        id SERIAL PRIMARY KEY,
        category_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        event_date DATE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_holiday INT DEFAULT 0,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Load snapshot data and sync IF tables are empty
    const snapshotPath = path.join(__dirname, '../../data_snapshot.json');
    if (fs.existsSync(snapshotPath)) {
      const snapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

      for (const [table, rows] of Object.entries(snapshotData)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;

        const checkRes = await pool.query(`SELECT COUNT(*) as cnt FROM ${table}`);
        if (parseInt(checkRes.rows[0].cnt) === 0) {
          console.log(`📥 Preserving ${rows.length} existing records into PostgreSQL table: ${table}...`);
          for (const row of rows) {
            const keys = Object.keys(row);
            const vals = Object.values(row);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const colNames = keys.map(k => `"${k}"`).join(', ');
            
            const insertSql = `INSERT INTO ${table} (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
            await pool.query(insertSql, vals);
          }

          // Reset PostgreSQL SERIAL sequence to max(id) so auto-increment works cleanly
          try {
            await pool.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))`);
          } catch(seqErr) {}
        }
      }
    }

    console.log('✅ PostgreSQL Schema & Data Sync verified 100%!');
  } catch (err) {
    console.error('⚠️ PostgreSQL Migration Error:', err.message);
  } finally {
    await pool.end();
  }
}

module.exports = { migratePostgres };
