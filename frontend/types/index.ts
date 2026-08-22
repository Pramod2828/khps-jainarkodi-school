export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  qualification?: string;
  class_id?: number;
  teaching_standard?: string;
  photo_url?: string;
  role: 'SUPER_ADMIN' | 'TEACHER';
  status: 'ACTIVE' | 'INACTIVE';
  must_change_password?: boolean;
  last_login_at?: string;
  created_at?: string;
}

export interface TeacherProfile {
  id: number;
  name: string;
  qualification?: string;
  class_id?: number;
  teaching_standard?: string;
  photo_url?: string;
}

export interface HomeworkAttachment {
  id: number;
  homework_id: number;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

export interface Homework {
  id: number;
  class_id: number;
  class_name: string;
  section_id?: number;
  section_name?: string;
  subject_id: number;
  subject_name: string;
  subject_code?: string;
  title: string;
  description: string;
  homework_date: string;
  homework_day: string;
  homework_time: string;
  due_date: string;
  teacher_id: number;
  teacher_name: string;
  custom_teacher_name?: string;
  custom_subject_name?: string;
  attachment_url?: string;
  attachments?: HomeworkAttachment[];
  created_at: string;
  updated_at: string;
  attachment_id?: number;
  file_path?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
}

export interface Notice {
  id: number;
  title: string;
  description: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  notice_date: string;
  notice_time: string;
  expiry_date?: string;
  attachment_url?: string;
  is_archived: boolean | number;
  created_by: number;
  author_name?: string;
  created_at: string;
}

export interface Announcement {
  id: number;
  content: string;
  is_active: boolean | number;
  is_banner: boolean | number;
  created_by: number;
  author?: string;
  created_at: string;
}

export interface ActivityImage {
  id: number;
  image_url: string;
}

export interface Activity {
  id: number;
  title: string;
  description: string;
  activity_date: string;
  cover_image?: string;
  video_url?: string;
  created_by: number;
  author_name?: string;
  created_at: string;
  images?: ActivityImage[];
}

export interface GalleryCategory {
  id: number;
  category_name: string;
}

export interface GalleryItem {
  id: number;
  title: string;
  description?: string;
  category_id: number;
  category_name?: string;
  image_url: string;
  uploaded_by: number;
  uploader_name?: string;
  created_at: string;
}

export interface Student {
  id: number;
  student_code: string;
  sat_number?: string;
  full_name: string;
  class_id: number;
  class_name?: string;
  section_id?: number;
  section_name?: string;
  parent_name: string;
  parent_phone: string;
  address?: string;
  photo_url?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED';
  created_at: string;
}

export interface Section {
  id: number;
  class_id: number;
  section_name: string;
}

export interface ClassItem {
  id: number;
  class_name: string;
  display_order: number;
  student_count: number;
  sections?: Section[];
}

export interface SubjectItem {
  id: number;
  subject_name: string;
  code?: string;
  class_id?: number;
  class_name?: string;
}

export interface SchoolInfo {
  id: number;
  school_name: string;
  tagline?: string;
  logo_url?: string;
  address: string;
  phone: string;
  email: string;
  head_teacher: string;
  description: string;
  timings: string;
  hero_image?: string;
  map_url?: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  event_type: 'HOLIDAY' | 'EXAM' | 'PARENT_MEETING' | 'SCHOOL_EVENT' | 'CELEBRATION' | 'IMPORTANT_DATE';
  created_by: number;
  created_by_name?: string;
  created_at: string;
}

export interface DownloadItem {
  id: number;
  title: string;
  description?: string;
  class_id?: number;
  class_name?: string;
  category: string;
  file_url: string;
  file_path?: string;
  file_size?: number;
  file_type?: string;
  uploader_name?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_name: string;
  action: string;
  module: string;
  record_id?: string;
  ip_address?: string;
  details?: string;
  created_at: string;
}

export interface DashboardStats {
  homeworkToday: number;
  totalHomework: number;
  activeNotices: number;
  totalActivities: number;
  totalGalleryPhotos: number;
  totalStudents: number;
  totalClasses: number;
  upcomingEvents: number;
  homework_today?: number;
  homework_posted?: number;
  active_notices?: number;
  total_activities?: number;
  gallery_photos?: number;
  total_students?: number;
  total_classes?: number;
  upcoming_events?: number;
}

export interface ActivityChartData {
  class_name: string;
  homework_count: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: Pagination;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}
