-- =========================================================
-- DATABASE SCHEMA: Government Primary School Jainarkodi
-- Database Name: school_jainarkodi
-- Engine: InnoDB
-- Charset: utf8mb4 / utf8mb4_unicode_ci
-- =========================================================

CREATE DATABASE IF NOT EXISTS `school_jainarkodi` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `school_jainarkodi`;

-- ---------------------------------------------------------
-- 1. ROLES TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_name` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 2. USERS TABLE (Super Admins and Teachers)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` INT NOT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  `must_change_password` TINYINT(1) DEFAULT 0,
  `last_login_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role_id`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 3. CLASSES TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `classes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_name` VARCHAR(50) NOT NULL UNIQUE,
  `display_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_classes_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 4. SECTIONS TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` INT NOT NULL,
  `section_name` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_class_section` (`class_id`, `section_name`),
  INDEX `idx_sections_class` (`class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 5. SUBJECTS TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subjects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `subject_name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(20) NULL,
  `class_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE SET NULL,
  INDEX `idx_subjects_class` (`class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 6. STUDENTS TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_code` VARCHAR(50) NOT NULL UNIQUE,
  `full_name` VARCHAR(100) NOT NULL,
  `class_id` INT NOT NULL,
  `section_id` INT NULL,
  `parent_name` VARCHAR(100) NOT NULL,
  `parent_phone` VARCHAR(20) NOT NULL,
  `address` TEXT NULL,
  `photo_url` VARCHAR(255) NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'GRADUATED') DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE SET NULL,
  INDEX `idx_students_class` (`class_id`),
  INDEX `idx_students_section` (`section_id`),
  INDEX `idx_students_code` (`student_code`),
  INDEX `idx_students_name` (`full_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 7. HOMEWORK TABLE (Using subject_id FK)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `homework` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` INT NOT NULL,
  `section_id` INT NULL,
  `subject_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `homework_date` DATE NOT NULL,
  `homework_day` VARCHAR(20) NOT NULL,
  `homework_time` TIME NOT NULL,
  `due_date` DATE NOT NULL,
  `teacher_id` INT NOT NULL,
  `custom_teacher_name` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_homework_class` (`class_id`),
  INDEX `idx_homework_subject` (`subject_id`),
  INDEX `idx_homework_date` (`homework_date`),
  INDEX `idx_homework_teacher` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 8. HOMEWORK ATTACHMENTS TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `homework_attachments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `homework_id` INT NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(50) NOT NULL,
  `file_size` INT NOT NULL,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`homework_id`) REFERENCES `homework`(`id`) ON DELETE CASCADE,
  INDEX `idx_hw_attach_homework` (`homework_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 9. NOTICES TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `priority` ENUM('NORMAL', 'IMPORTANT', 'URGENT') DEFAULT 'NORMAL',
  `notice_date` DATE NOT NULL,
  `notice_time` TIME NOT NULL,
  `expiry_date` DATE NULL,
  `attachment_url` VARCHAR(255) NULL,
  `is_archived` TINYINT(1) DEFAULT 0,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_notices_priority` (`priority`),
  INDEX `idx_notices_date` (`notice_date`),
  INDEX `idx_notices_archived` (`is_archived`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 10. ANNOUNCEMENTS TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `content` TEXT NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_banner` TINYINT(1) DEFAULT 0,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_announcements_active` (`is_active`),
  INDEX `idx_announcements_banner` (`is_banner`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 11. ACTIVITIES TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activities` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `activity_date` DATE NOT NULL,
  `cover_image` VARCHAR(255) NULL,
  `video_url` VARCHAR(255) NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_activities_date` (`activity_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 12. ACTIVITY IMAGES TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activity_images` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `activity_id` INT NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE CASCADE,
  INDEX `idx_act_img_activity` (`activity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 13. GALLERY CATEGORIES TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `gallery_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_name` VARCHAR(50) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 14. GALLERY TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `gallery` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `category_id` INT NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `uploaded_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `gallery_categories`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_gallery_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 15. CALENDAR EVENTS TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `event_type` ENUM('HOLIDAY', 'EXAM', 'PARENT_MEETING', 'SCHOOL_EVENT', 'CELEBRATION', 'IMPORTANT_DATE') DEFAULT 'SCHOOL_EVENT',
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_calendar_start` (`start_date`),
  INDEX `idx_calendar_type` (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 16. DOWNLOADS TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `downloads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `class_id` INT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'Worksheets',
  `file_url` VARCHAR(255) NOT NULL,
  `file_size` INT DEFAULT 0,
  `file_type` VARCHAR(50) DEFAULT 'pdf',
  `uploaded_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_downloads_class` (`class_id`),
  INDEX `idx_downloads_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 17. SCHOOL INFORMATION TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `school_information` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_name` VARCHAR(150) NOT NULL,
  `tagline` VARCHAR(255) NULL,
  `logo_url` VARCHAR(255) NULL,
  `address` TEXT NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `head_teacher` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `timings` VARCHAR(100) NOT NULL,
  `hero_image` VARCHAR(255) NULL,
  `map_url` TEXT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- 18. AUDIT LOGS TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `user_name` VARCHAR(100) NOT NULL DEFAULT 'System',
  `action` VARCHAR(50) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `record_id` VARCHAR(50) NULL,
  `ip_address` VARCHAR(45) NULL,
  `details` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_audit_user` (`user_id`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_module` (`module`),
  INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
