const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function initDatabase() {
  console.log('🔄 Initializing MySQL Database for Government Primary School Jainarkodi...');
  
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306');
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'school_jainarkodi';
  const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

  // 1. Connect directly to the target database
  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database: dbName,
      multipleStatements: true,
      ssl
    });
    console.log(`✅ Connected successfully to Cloud/Local MySQL database \`${dbName}\`.`);
  } catch (err) {
    console.warn(`⚠️ Direct DB connection failed (${err.message}). Trying root connection...`);
    try {
      const rootConn = await mysql.createConnection({ host, port, user, password, ssl });
      await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await rootConn.end();
      connection = await mysql.createConnection({ host, port, user, password, database: dbName, multipleStatements: true, ssl });
    } catch (rootErr) {
      console.error('❌ Failed to connect to MySQL database:', rootErr.message);
      process.exit(1);
    }
  }

  try {
    // 2. Read and execute schema.sql
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(schemaSql);
      console.log('✅ Database schema tables created successfully.');
    } else {
      console.warn('⚠️ schema.sql file not found at:', schemaPath);
    }

    // 3. Read and execute seed.sql
    const seedPath = path.join(__dirname, '../../../database/seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await connection.query(seedSql);
      console.log('✅ Database seed data inserted successfully.');
    } else {
      console.warn('⚠️ seed.sql file not found at:', seedPath);
    }

    // 4. Insert or Update default Super Admin user
    const adminPasswordHash = await bcrypt.hash('Jainarkodi#2026!', 10);
    const teacherPasswordHash = await bcrypt.hash('Jainarkodi#2026!', 10);

    // Insert Super Admin
    await connection.query(`
      INSERT INTO users (id, name, email, phone, password_hash, role_id, status, must_change_password)
      VALUES (1, 'Super Admin', 'admin@jainarkodi.edu.in', '9876543210', ?, 1, 'ACTIVE', 1)
      ON DUPLICATE KEY UPDATE 
        password_hash = VALUES(password_hash),
        name = VALUES(name),
        status = 'ACTIVE';
    `, [adminPasswordHash]);

    // Insert Default Teacher
    await connection.query(`
      INSERT INTO users (id, name, email, phone, password_hash, role_id, status, must_change_password)
      VALUES (2, 'Teacher Anitha', 'teacher@jainarkodi.edu.in', '9876543211', ?, 2, 'ACTIVE', 1)
      ON DUPLICATE KEY UPDATE 
        password_hash = VALUES(password_hash),
        name = VALUES(name),
        status = 'ACTIVE';
    `, [teacherPasswordHash]);

    console.log('✅ Default users initialized:');
    console.log('   - Super Admin: admin@jainarkodi.edu.in / Admin@123 (Role: SUPER_ADMIN)');
    console.log('   - Teacher: teacher@jainarkodi.edu.in / Teacher@123 (Role: TEACHER)');

    // 5. Seed sample homework, notices, activities, gallery, students, downloads if empty
    await seedDemoContent(connection);

    console.log('🎉 Database initialization complete!');
  } catch (error) {
    console.error('❌ Database Initialization Error:', error);
  } finally {
    await connection.end();
  }
}

async function seedDemoContent(connection) {
  // Check if students table is empty
  const [students] = await connection.query('SELECT COUNT(*) as cnt FROM students');
  if (students[0].cnt === 0) {
    console.log('🌱 Seeding demo students...');
    await connection.query(`
      INSERT INTO students (student_code, full_name, class_id, section_id, parent_name, parent_phone, status) VALUES
      ('STD101', 'Aarav Kumar', 1, 1, 'Ramesh Kumar', '9845012345', 'ACTIVE'),
      ('STD102', 'Ananya Hegde', 1, 1, 'Suresh Hegde', '9845012346', 'ACTIVE'),
      ('STD103', 'Bhavya Bhat', 2, 3, 'Ganesh Bhat', '9845012347', 'ACTIVE'),
      ('STD104', 'Chetan Gowda', 3, 5, 'Manjunath Gowda', '9845012348', 'ACTIVE'),
      ('STD105', 'Dhanya Shetty', 3, 5, 'Prakash Shetty', '9845012349', 'ACTIVE'),
      ('STD106', 'Eshwar Rao', 4, 7, 'Subramanya Rao', '9845012350', 'ACTIVE'),
      ('STD107', 'Farhan Ali', 5, 9, 'Mohammed Ali', '9845012351', 'ACTIVE'),
      ('STD108', 'Gautami Naik', 5, 9, 'Venkatesh Naik', '9845012352', 'ACTIVE');
    `);
  }

  // Check homework
  const [homework] = await connection.query('SELECT COUNT(*) as cnt FROM homework');
  if (homework[0].cnt === 0) {
    console.log('🌱 Seeding demo homework...');
    await connection.query(`
      INSERT INTO homework (class_id, section_id, subject_id, title, description, homework_date, homework_day, homework_time, due_date, teacher_id) VALUES
      (3, 5, 1, 'Mathematics - Exercise 4', 'Complete questions 1 to 10 from Chapter 4 Multiplication tables.', '2026-08-15', 'Saturday', '16:30:00', '2026-08-17', 2),
      (1, 1, 4, 'Kannada - Vanamahotsava Poem', 'Recite and write 4 lines of the Kannada nature poem.', '2026-08-15', 'Saturday', '15:00:00', '2026-08-18', 2),
      (5, 9, 5, 'Science - Plant Parts Diagram', 'Draw and label the parts of a flowering plant in your science workbook.', '2026-08-14', 'Friday', '14:00:00', '2026-08-18', 2),
      (2, 3, 3, 'English - Word Meaning', 'Write down 5 new words from Lesson 3 with their meanings.', '2026-08-14', 'Friday', '11:30:00', '2026-08-16', 2),
      (4, 7, 2, 'EVS - Water Conservation', 'Write 5 points on how to save water at home.', '2026-08-13', 'Thursday', '10:00:00', '2026-08-16', 2);
    `);
  }

  // Check notices
  const [notices] = await connection.query('SELECT COUNT(*) as cnt FROM notices');
  if (notices[0].cnt === 0) {
    console.log('🌱 Seeding demo notices...');
    await connection.query(`
      INSERT INTO notices (title, description, priority, notice_date, notice_time, expiry_date, is_archived, created_by) VALUES
      ('Independence Day Celebration 2026', 'School flag hoisting ceremony will take place at 8:00 AM on August 15th. All students must attend in full clean uniform.', 'URGENT', '2026-08-14', '09:00:00', '2026-08-16', 0, 1),
      ('Parent-Teacher Meeting (PTM)', 'Parent-Teacher meeting for 1st to 5th Standard is scheduled for Monday, August 24th from 10:00 AM to 1:00 PM.', 'IMPORTANT', '2026-08-12', '11:00:00', '2026-08-25', 0, 1),
      ('First Terminal Examination Schedule', 'Timetable for the First Terminal Examination will be distributed next week.', 'NORMAL', '2026-08-10', '14:00:00', '2026-08-30', 0, 2);
    `);
  }

  // Check announcements
  const [announcements] = await connection.query('SELECT COUNT(*) as cnt FROM announcements');
  if (announcements[0].cnt === 0) {
    console.log('🌱 Seeding demo announcements...');
    await connection.query(`
      INSERT INTO announcements (content, is_active, is_banner, created_by) VALUES
      ('🎉 Welcome to Government Primary School Jainarkodi - Admissions open for Academic Year 2026-27!', 1, 1, 1),
      ('📢 Independence Day Flag Hoisting Ceremony tomorrow at 8:00 AM.', 1, 0, 1);
    `);
  }

  // Check activities
  const [activities] = await connection.query('SELECT COUNT(*) as cnt FROM activities');
  if (activities[0].cnt === 0) {
    console.log('🌱 Seeding demo activities...');
    await connection.query(`
      INSERT INTO activities (title, description, activity_date, cover_image, created_by) VALUES
      ('Vanamahotsava Tree Plantation Drive', 'Students and teachers actively participated in planting 50 native saplings in the school compound to promote environmental care.', '2026-07-28', '/uploads/demo_vanamahotsava.jpg', 2),
      ('Annual Sports Competition 2026', 'A thrilling day of running races, lemon and spoon race, and tug-of-war for students across all standards.', '2026-07-15', '/uploads/demo_sports.jpg', 2),
      ('Science & Craft Exhibition', 'Students showcased creative handmade models of solar system, rainwater harvesting, and windmills.', '2026-06-25', '/uploads/demo_science.jpg', 2);
    `);
  }

  // Check gallery
  const [gallery] = await connection.query('SELECT COUNT(*) as cnt FROM gallery');
  if (gallery[0].cnt === 0) {
    console.log('🌱 Seeding demo gallery photos...');
    await connection.query(`
      INSERT INTO gallery (title, description, category_id, image_url, uploaded_by) VALUES
      ('School Main Building & Campus', 'Front view of Government Primary School Jainarkodi campus.', 7, '/uploads/hero_school.jpg', 1),
      ('Children Learning in Classroom', 'Students during interactive mathematics activity class.', 4, '/uploads/demo_classroom.jpg', 2),
      ('Sports Day Prize Distribution', 'Head Teacher presenting trophies to 5th Standard sports winners.', 5, '/uploads/demo_sports.jpg', 2),
      ('Cultural Dance Program', 'Students performing traditional folk dance during school day celebration.', 6, '/uploads/demo_cultural.jpg', 2);
    `);
  }

  // Check calendar events
  const [calendar] = await connection.query('SELECT COUNT(*) as cnt FROM calendar_events');
  if (calendar[0].cnt === 0) {
    console.log('🌱 Seeding demo calendar events...');
    await connection.query(`
      INSERT INTO calendar_events (title, description, start_date, end_date, event_type, created_by) VALUES
      ('Independence Day Flag Hoisting', 'National flag hoisting and patriotic songs program.', '2026-08-15', '2026-08-15', 'CELEBRATION', 1),
      ('Parent-Teacher Meeting', 'Term 1 progress review with parents.', '2026-08-24', '2026-08-24', 'PARENT_MEETING', 1),
      ('First Unit Test Examination', 'Class 1 to 5 Unit Test exams.', '2026-09-10', '2026-09-15', 'EXAM', 2),
      ('Ganesh Chaturthi Holiday', 'School holiday on account of Ganesh Chaturthi.', '2026-09-17', '2026-09-17', 'HOLIDAY', 1);
    `);
  }

  // Check downloads
  const [downloads] = await connection.query('SELECT COUNT(*) as cnt FROM downloads');
  if (downloads[0].cnt === 0) {
    console.log('🌱 Seeding demo downloads...');
    await connection.query(`
      INSERT INTO downloads (title, description, class_id, category, file_url, file_size, file_type, uploaded_by) VALUES
      ('Class 3 Maths Multiplication Practice Sheet', 'Worksheet containing 30 practice problems on 2-digit multiplication.', 3, 'Worksheets', '/uploads/demo_maths_worksheet.pdf', 450000, 'pdf', 2),
      ('Class 1 Kannada Alphabet Tracing Guide', 'Practice guide for writing Kannada vowels and consonants.', 1, 'Study Material', '/uploads/demo_kannada_guide.pdf', 820000, 'pdf', 2),
      ('School Academic Calendar 2026-27 Circular', 'Official holiday list and academic schedule for parents.', NULL, 'Circulars', '/uploads/demo_calendar_circular.pdf', 1200000, 'pdf', 1);
    `);
  }
}

// Execute if run directly from command line
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
