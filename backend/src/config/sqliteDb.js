const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

let dbPromise = null;

async function getSqliteDb() {
  if (!dbPromise) {
    const dbPath = process.env.DB_PATH || (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'school_jainarkodi.sqlite') : path.join(__dirname, '../../school_jainarkodi.sqlite'));
    dbPromise = open({
      filename: dbPath,
      driver: sqlite3.Database
    }).then(async (db) => {
      await initSqliteSchema(db);
      return db;
    });
  }
  return dbPromise;
}

async function initSqliteSchema(db) {
  await db.exec('PRAGMA foreign_keys = ON;');

  // 1. Roles
  await db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT UNIQUE NOT NULL,
      description TEXT
    );
  `);

  await db.exec(`
    INSERT OR IGNORE INTO roles (id, role_name, description) VALUES
    (1, 'SUPER_ADMIN', 'Full system access'),
    (2, 'TEACHER', 'Academic management');
  `);

  // 2. Users
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role_id INTEGER NOT NULL DEFAULT 2,
      status TEXT DEFAULT 'ACTIVE',
      must_change_password INTEGER DEFAULT 1,
      last_login_at TEXT,
      plain_password TEXT DEFAULT 'Jainarkodi#2026!',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    await db.exec("ALTER TABLE users ADD COLUMN plain_password TEXT DEFAULT 'Jainarkodi#2026!';");
  } catch (e) {}

  // 2.1 Password Resets
  await db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      reset_token TEXT UNIQUE NOT NULL,
      otp_code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2.2 Multi-step Password Recovery Requests (Head Teacher Two-Step Approval)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS password_recovery_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      role_name TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_phone TEXT NOT NULL,
      code1_head_teacher TEXT NOT NULL,
      code2_requester TEXT,
      status TEXT DEFAULT 'PENDING_HEAD_TEACHER_APPROVAL',
      head_teacher_phone TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      approved_at TEXT,
      expires_at TEXT NOT NULL
    );
  `);

  // Seed default admin & teacher if empty
  const userCount = await db.get('SELECT COUNT(*) as cnt FROM users');
  if (userCount.cnt === 0) {
    const adminPass = await bcrypt.hash('Jainarkodi#2026!', 10);
    const teacherPass = await bcrypt.hash('Jainarkodi#2026!', 10);

    await db.run(
      `INSERT INTO users (id, name, email, phone, password_hash, plain_password, role_id, status, must_change_password) VALUES
       (1, 'Super Admin', 'admin@jainarkodi.edu.in', '9876543210', ?, 'Jainarkodi#2026!', 1, 'ACTIVE', 1),
       (2, 'Teacher Anitha', 'teacher@jainarkodi.edu.in', '9876543211', ?, 'Jainarkodi#2026!', 2, 'ACTIVE', 1);`,
      [adminPass, teacherPass]
    );
  }

  // 3. Classes
  await db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const classCount = await db.get('SELECT COUNT(*) as cnt FROM classes');
  if (classCount.cnt === 0) {
    await db.exec(`
      INSERT INTO classes (id, class_name, display_order) VALUES
      (1, 'UKG', 1),
      (2, '1st Standard', 2),
      (3, '2nd Standard', 3),
      (4, '3rd Standard', 4),
      (5, '4th Standard', 5),
      (6, '5th Standard', 6);
    `);
  }

  // 4. Sections
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      section_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const secCount = await db.get('SELECT COUNT(*) as cnt FROM sections');
  if (secCount.cnt === 0) {
    await db.exec(`
      INSERT INTO sections (id, class_id, section_name) VALUES
      (1, 1, 'Section A'), (2, 1, 'Section B'),
      (3, 2, 'Section A'), (4, 2, 'Section B'),
      (5, 3, 'Section A'), (6, 3, 'Section B'),
      (7, 4, 'Section A'), (8, 4, 'Section B'),
      (9, 5, 'Section A'), (10, 5, 'Section B'),
      (11, 6, 'Section A'), (12, 6, 'Section B');
    `);
  }

  // 5. Subjects
  await db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_name TEXT NOT NULL,
      subject_code TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const subCount = await db.get('SELECT COUNT(*) as cnt FROM subjects');
  if (subCount.cnt === 0) {
    await db.exec(`
      INSERT INTO subjects (id, subject_name, subject_code) VALUES
      (1, 'Mathematics', 'MATH101'),
      (2, 'Environmental Science (EVS)', 'EVS101'),
      (3, 'English Language', 'ENG101'),
      (4, 'Kannada Language', 'KAN101'),
      (5, 'General Science', 'SCI101'),
      (6, 'Social Studies', 'SOC101');
    `);
  }

  // 6. Homework
  await db.exec(`
    CREATE TABLE IF NOT EXISTS homework (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      section_id INTEGER,
      subject_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      homework_date TEXT NOT NULL,
      homework_day TEXT NOT NULL,
      homework_time TEXT NOT NULL,
      due_date TEXT NOT NULL,
      teacher_id INTEGER,
      custom_teacher_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const hwCount = await db.get('SELECT COUNT(*) as cnt FROM homework');
  if (hwCount.cnt === 0) {
    await db.exec(`
      INSERT INTO homework (class_id, section_id, subject_id, title, description, homework_date, homework_day, homework_time, due_date, teacher_id) VALUES
      (3, 5, 1, 'Mathematics - Exercise 4', 'Complete questions 1 to 10 from Chapter 4 Multiplication tables.', '2026-08-15', 'Saturday', '16:30:00', '2026-08-17', 2),
      (1, 1, 4, 'Kannada - Vanamahotsava Poem', 'Recite and write 4 lines of the Kannada nature poem.', '2026-08-15', 'Saturday', '15:00:00', '2026-08-18', 2),
      (5, 9, 5, 'Science - Plant Parts Diagram', 'Draw and label the parts of a flowering plant in your science workbook.', '2026-08-14', 'Friday', '14:00:00', '2026-08-18', 2),
      (2, 3, 3, 'English - Word Meaning', 'Write down 5 new words from Lesson 3 with their meanings.', '2026-08-14', 'Friday', '11:30:00', '2026-08-16', 2);
    `);
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS homework_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      homework_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 8. Notices
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT DEFAULT 'NORMAL',
      notice_date TEXT NOT NULL,
      notice_time TEXT NOT NULL,
      expiry_date TEXT,
      attachment_url TEXT,
      is_archived INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const notCount = await db.get('SELECT COUNT(*) as cnt FROM notices');
  if (notCount.cnt === 0) {
    await db.exec(`
      INSERT INTO notices (title, description, priority, notice_date, notice_time, expiry_date, is_archived, created_by) VALUES
      ('Independence Day Celebration 2026', 'School flag hoisting ceremony will take place at 8:00 AM on August 15th. All students must attend in full clean uniform.', 'URGENT', '2026-08-14', '09:00:00', '2026-08-16', 0, 1),
      ('Parent-Teacher Meeting (PTM)', 'Parent-Teacher meeting for 1st to 5th Standard is scheduled for Monday, August 24th from 10:00 AM to 1:00 PM.', 'IMPORTANT', '2026-08-12', '11:00:00', '2026-08-25', 0, 1);
    `);
  }

  // 9. Announcements
  await db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      is_banner INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const annCount = await db.get('SELECT COUNT(*) as cnt FROM announcements');
  if (annCount.cnt === 0) {
    await db.exec(`
      INSERT INTO announcements (content, is_active, is_banner, created_by) VALUES
      ('🎉 Welcome to Government Primary School Jainarkodi - Admissions open for Academic Year 2026-27!', 1, 1, 1),
      ('📢 Independence Day Flag Hoisting Ceremony tomorrow at 8:00 AM.', 1, 0, 1);
    `);
  }

  // 10. Activities
  await db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      cover_image TEXT,
      video_url TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 11. Activity Images
  await db.exec(`
    CREATE TABLE IF NOT EXISTS activity_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      caption TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 12. Gallery Categories
  await db.exec(`
    CREATE TABLE IF NOT EXISTS gallery_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const catCount = await db.get('SELECT COUNT(*) as cnt FROM gallery_categories');
  if (catCount.cnt === 0) {
    await db.exec(`
      INSERT INTO gallery_categories (id, category_name, description) VALUES
      (1, 'Academic', 'Classroom learning activities'),
      (2, 'Sports', 'Sports competitions'),
      (3, 'Cultural', 'School day and celebrations'),
      (4, 'Campus', 'School infrastructure');
    `);
  }

  // 13. Gallery
  await db.exec(`
    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category_id INTEGER,
      image_url TEXT NOT NULL,
      uploaded_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 14. Students
  await db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_code TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      class_id INTEGER NOT NULL,
      section_id INTEGER,
      parent_name TEXT NOT NULL,
      parent_phone TEXT NOT NULL,
      address TEXT,
      photo_url TEXT,
      status TEXT DEFAULT 'ACTIVE',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const stdCount = await db.get('SELECT COUNT(*) as cnt FROM students');
  if (stdCount.cnt === 0) {
    await db.exec(`
      INSERT INTO students (student_code, full_name, class_id, section_id, parent_name, parent_phone, address, status, is_active) VALUES
      ('STD101', 'Aarav Kumar', 1, 1, 'Ramesh Kumar', '9845012345', 'Jainarkodi Village', 'ACTIVE', 1),
      ('STD102', 'Ananya Hegde', 1, 1, 'Suresh Hegde', '9845012346', 'Jainarkodi Village', 'ACTIVE', 1),
      ('STD103', 'Bhavya Bhat', 2, 3, 'Ganesh Bhat', '9845012347', 'Jainarkodi Village', 'ACTIVE', 1);
    `);
  }

  // 15. School Information
  await db.exec(`
    CREATE TABLE IF NOT EXISTS school_information (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_name TEXT NOT NULL,
      tagline TEXT,
      logo_url TEXT,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      head_teacher TEXT NOT NULL,
      description TEXT NOT NULL,
      timings TEXT NOT NULL,
      hero_image TEXT,
      map_url TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const sCount = await db.get('SELECT COUNT(*) as cnt FROM school_information');
  if (sCount.cnt === 0) {
    await db.exec(`
      INSERT INTO school_information (id, school_name, tagline, logo_url, address, phone, email, head_teacher, description, timings, map_url) VALUES
      (1, 'Government Primary School Jainarkodi', 'Learning today, building a better tomorrow.', '/logo.png', 'Jainarkodi Village, Primary School Circle, Karnataka 574227', '+91 94812 34567', 'contact@jainarkodi.edu.in', 'Mrs. Savitha R. Shetty', 'Government Primary School Jainarkodi is dedicated to providing holistic primary education, fostering critical thinking, moral values, and academic excellence for children from 1st to 5th Standard in a warm, nurturing community environment.', 'Monday – Friday: 9:00 AM – 4:00 PM | Saturday: 9:00 AM – 1:00 PM', 'https://maps.google.com/?q=Jainarkodi');
    `);
  } else {
    try { await db.run("UPDATE school_information SET logo_url = '/logo.png' WHERE id = 1;"); } catch (e) {}
  }

  // 16. Calendar Events
  await db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      event_type TEXT DEFAULT 'OTHER',
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const calCount = await db.get('SELECT COUNT(*) as cnt FROM calendar_events');
  if (calCount.cnt === 0) {
    await db.exec(`
      INSERT INTO calendar_events (title, description, start_date, end_date, event_type, created_by) VALUES
      ('Independence Day Flag Hoisting', 'National flag hoisting and patriotic songs program.', '2026-08-15', '2026-08-15', 'CELEBRATION', 1),
      ('Parent-Teacher Meeting', 'Term 1 progress review with parents.', '2026-08-24', '2026-08-24', 'PARENT_MEETING', 1);
    `);
  }

  // 17. Downloads
  await db.exec(`
    CREATE TABLE IF NOT EXISTS downloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      class_id INTEGER,
      category TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      uploaded_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const dlCount = await db.get('SELECT COUNT(*) as cnt FROM downloads');
  if (dlCount.cnt === 0) {
    await db.exec(`
      INSERT INTO downloads (title, description, class_id, category, file_url, file_size, file_type, uploaded_by) VALUES
      ('Class 3 Maths Multiplication Practice Sheet', 'Worksheet containing 30 practice problems on 2-digit multiplication.', 4, 'Worksheets', '/uploads/demo_maths_worksheet.pdf', 450000, 'pdf', 2),
      ('Class 1 Kannada Alphabet Tracing Guide', 'Practice guide for writing Kannada vowels and consonants.', 2, 'Study Material', '/uploads/demo_kannada_guide.pdf', 820000, 'pdf', 2);
    `);
  }

  // 18. Audit Logs
  await db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      record_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Column migrations for existing SQLite database files
  try { await db.exec('ALTER TABLE students ADD COLUMN photo_url TEXT;'); } catch (e) {}
  try { await db.exec('ALTER TABLE students ADD COLUMN is_active INTEGER DEFAULT 1;'); } catch (e) {}
  try { await db.exec('ALTER TABLE activities ADD COLUMN video_url TEXT;'); } catch (e) {}
  try { await db.exec('ALTER TABLE homework_attachments ADD COLUMN file_name TEXT;'); } catch (e) {}
  try { await db.exec('ALTER TABLE audit_logs ADD COLUMN record_id INTEGER;'); } catch (e) {}
  try { await db.exec('ALTER TABLE homework ADD COLUMN custom_subject_name TEXT;'); } catch (e) {}
  try {
    const existingHindi = await db.get("SELECT COUNT(*) as cnt FROM subjects WHERE LOWER(subject_name) LIKE '%hindi%'");
    if (existingHindi.cnt === 0) {
      await db.run("INSERT INTO subjects (subject_name, subject_code) VALUES ('Hindi Language', 'HIN101');");
    }
  } catch (e) {}

  console.log('✅ SQLite Database schema & demo tables initialized perfectly!');
}

/**
 * Execute raw SQL query adapter translating MySQL syntax to SQLite
 */
async function executeSqliteQuery(sql, params = []) {
  const db = await getSqliteDb();

  // Normalize params array
  const cleanParams = params.map((p) => (p === undefined ? null : p));

  // Convert MySQL function syntax to SQLite equivalents
  let convertedSql = sql
    .replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP")
    .replace(/CURDATE\(\)/gi, "DATE('now', 'localtime')")
    .replace(/DATE_SUB\(DATE\('now',\s*'localtime'\),\s*INTERVAL\s*(\d+)\s*DAY\)/gi, "DATE('now', '-$1 days')")
    .replace(/DATE_SUB\(CURDATE\(\),\s*INTERVAL\s*(\d+)\s*DAY\)/gi, "DATE('now', '-$1 days')")
    .replace(/FIELD\(([a-zA-Z_.]+),\s*'URGENT',\s*'IMPORTANT',\s*'NORMAL'\)/gi, "CASE $1 WHEN 'URGENT' THEN 1 WHEN 'IMPORTANT' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END")
    .replace(/DATE_FORMAT\(([^,]+),\s*'%a,\s*%b\s*%d'\)/gi, "strftime('%Y-%m-%d', $1)")
    .replace(/DATE_FORMAT\(([^,]+),\s*'%Y-%m-%d'\)/gi, "DATE($1)")
    .replace(/DATE_FORMAT\(([^,]+),\s*'%Y-%m'\)/gi, "strftime('%Y-%m', $1)")
    .replace(/DATE_FORMAT\(([^,]+),\s*'%H:%i'\)/gi, "strftime('%H:%M', $1)")
    .replace(/DATE_FORMAT\(([^,]+),\s*'%d %b %Y'\)/gi, "strftime('%d %m %Y', $1)")
    .replace(/DATE_FORMAT\(([^,]+),\s*'%Y-%m-%d %H:%i'\)/gi, "strftime('%Y-%m-%d %H:%M', $1)");

  const trimmedSql = convertedSql.trim().toUpperCase();

  if (trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('SHOW') || trimmedSql.startsWith('PRAGMA') || trimmedSql.startsWith('EXPLAIN')) {
    const rows = await db.all(convertedSql, cleanParams);
    return [rows];
  } else if (trimmedSql.startsWith('INSERT')) {
    const res = await db.run(convertedSql, cleanParams);
    return [{ insertId: res.lastID, affectedRows: res.changes }];
  } else {
    const res = await db.run(convertedSql, cleanParams);
    return [{ affectedRows: res.changes }];
  }
}

module.exports = {
  executeSqliteQuery,
  getSqliteDb
};
