export const STORAGE_KEYS = {
  auth: 'sms_auth',
  ui: 'sms_ui',
  db: 'sms_db',
};

export const ROLES = [
  'Admin',
  'Principal',
  'Teacher',
  'Accountant',
  'Librarian',
  'Student',
  'Parent',
];

export const STUDENT_STATUSES = ['active', 'inactive', 'transferred', 'promoted', 'archived'];
export const ADMISSION_STATUSES = ['new', 'contacted', 'shortlisted', 'approved', 'rejected', 'converted'];
export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'half_day', 'excused'];
export const INVOICE_STATUSES = ['unpaid', 'partial', 'paid', 'overdue', 'waived'];
export const EXAM_STATUSES = ['draft', 'scheduled', 'ongoing', 'published', 'locked'];
export const ASSIGNMENT_STATUSES = ['draft', 'published', 'closed'];
export const MESSAGE_STATUSES = ['draft', 'scheduled', 'sent', 'archived'];
export const BOOK_STATUSES = ['available', 'issued', 'reserved', 'lost'];
export const TRANSPORT_STATUSES = ['active', 'maintenance', 'retired'];
export const LEAVE_STATUSES = ['pending', 'approved', 'rejected'];

export const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

export const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const STATUS_VARIANTS = {
  active: 'success',
  inactive: 'neutral',
  transferred: 'warning',
  promoted: 'info',
  archived: 'neutral',
  new: 'info',
  contacted: 'warning',
  shortlisted: 'info',
  approved: 'success',
  rejected: 'danger',
  converted: 'success',
  present: 'success',
  absent: 'danger',
  late: 'warning',
  half_day: 'warning',
  excused: 'info',
  unpaid: 'danger',
  partial: 'warning',
  paid: 'success',
  overdue: 'danger',
  waived: 'neutral',
  draft: 'neutral',
  scheduled: 'info',
  ongoing: 'warning',
  published: 'success',
  locked: 'danger',
  closed: 'neutral',
  sent: 'success',
  available: 'success',
  issued: 'warning',
  reserved: 'info',
  lost: 'danger',
  maintenance: 'warning',
  retired: 'neutral',
  pending: 'warning',
};

export const PRIORITY_VARIANTS = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};