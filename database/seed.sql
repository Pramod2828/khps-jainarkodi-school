USE `school_jainarkodi`;

-- ---------------------------------------------------------
-- SEED DATA: Roles
-- ---------------------------------------------------------
INSERT INTO `roles` (`id`, `role_name`, `description`) VALUES
(1, 'SUPER_ADMIN', 'Full system access and teacher management'),
(2, 'TEACHER', 'Class homework, notices, activities and gallery management')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- ---------------------------------------------------------
-- SEED DATA: School Information
-- ---------------------------------------------------------
INSERT INTO `school_information` 
(`id`, `school_name`, `tagline`, `logo_url`, `address`, `phone`, `email`, `head_teacher`, `description`, `timings`, `hero_image`, `map_url`) VALUES
(1, 
 'Government Primary School Jainarkodi', 
 'Learning today, building a better tomorrow.', 
 '/uploads/school_logo.png', 
 'Jainarkodi Village, Primary School Circle, Karnataka 574227', 
 '+91 94812 34567', 
 'contact@jainarkodi.edu.in', 
 'Mrs. Savitha R. Shetty (Head Teacher)', 
 'Government Primary School Jainarkodi is dedicated to providing holistic primary education, fostering critical thinking, moral values, and academic excellence for children from 1st to 5th Standard in a warm, nurturing community environment.', 
 'Monday - Friday: 9:00 AM - 4:00 PM | Saturday: 9:00 AM - 1:00 PM', 
 '/uploads/hero_school.jpg', 
 'https://maps.google.com/?q=Government+Primary+School+Jainarkodi')
ON DUPLICATE KEY UPDATE `school_name` = VALUES(`school_name`);

-- ---------------------------------------------------------
-- SEED DATA: Gallery Categories
-- ---------------------------------------------------------
INSERT INTO `gallery_categories` (`id`, `category_name`) VALUES
(1, 'School Events'),
(2, 'Students'),
(3, 'Teachers'),
(4, 'Classroom'),
(5, 'Sports'),
(6, 'Cultural'),
(7, 'Infrastructure'),
(8, 'Other')
ON DUPLICATE KEY UPDATE `category_name` = VALUES(`category_name`);

-- ---------------------------------------------------------
-- SEED DATA: Classes
-- ---------------------------------------------------------
INSERT INTO `classes` (`id`, `class_name`, `display_order`) VALUES
(1, '1st Standard', 1),
(2, '2nd Standard', 2),
(3, '3rd Standard', 3),
(4, '4th Standard', 4),
(5, '5th Standard', 5)
ON DUPLICATE KEY UPDATE `class_name` = VALUES(`class_name`);

-- ---------------------------------------------------------
-- SEED DATA: Sections
-- ---------------------------------------------------------
INSERT INTO `sections` (`id`, `class_id`, `section_name`) VALUES
(1, 1, 'A'), (2, 1, 'B'),
(3, 2, 'A'), (4, 2, 'B'),
(5, 3, 'A'), (6, 3, 'B'),
(7, 4, 'A'), (8, 4, 'B'),
(9, 5, 'A'), (10, 5, 'B')
ON DUPLICATE KEY UPDATE `section_name` = VALUES(`section_name`);

-- ---------------------------------------------------------
-- SEED DATA: Subjects
-- ---------------------------------------------------------
INSERT INTO `subjects` (`id`, `subject_name`, `code`, `class_id`) VALUES
(1, 'Mathematics', 'MATH', NULL),
(2, 'Environmental Studies', 'EVS', NULL),
(3, 'English', 'ENG', NULL),
(4, 'Kannada', 'KAN', NULL),
(5, 'Science', 'SCI', NULL),
(6, 'Social Studies', 'SST', NULL)
ON DUPLICATE KEY UPDATE `subject_name` = VALUES(`subject_name`);
