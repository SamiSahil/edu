import { compareDateDesc, formatDate, formatMonth, getInitials, groupBy, inMonth, paginate, safeString, searchMatches, sortBy, sumBy } from './utils.js';

export function getClassLabel(db, classId) {
  return db.classes?.find((item) => item.id === classId)?.name || 'Unassigned';
}

export function getSectionLabel(db, sectionId) {
  return db.sections?.find((item) => item.id === sectionId)?.name || '-';
}

export function getStudentLabel(db, studentId) {
  return db.students?.find((item) => item.id === studentId)?.fullName || 'Unknown student';
}

export function getStaffLabel(db, staffId) {
  return db.staff?.find((item) => item.id === staffId)?.name || 'Unknown staff';
}

export function getGuardianLabel(db, guardianId) {
  return db.guardians?.find((item) => item.id === guardianId)?.name || 'Unknown guardian';
}

export function getSubjectLabel(db, subjectId) {
  return db.subjects?.find((item) => item.id === subjectId)?.name || 'Unknown subject';
}

export function getRouteLabel(db, routeId) {
  return db.routes?.find((item) => item.id === routeId)?.name || 'Unassigned route';
}

export function getVehicleLabel(db, vehicleId) {
  return db.vehicles?.find((item) => item.id === vehicleId)?.name || 'Unassigned vehicle';
}

export function buildTimeline(records = [], mapItem) {
  return records
    .slice()
    .sort((a, b) => compareDateDesc(a.createdAt || a.updatedAt || a.date || a.issuedAt || a.paidAt, b.createdAt || b.updatedAt || b.date || b.issuedAt || b.paidAt))
    .map((record) => mapItem(record));
}

export function filterAndPaginate(items, { search = '', searchFields = [], filters = [], page = 1, pageSize = 8, sortAccessor, sortDirection = 'desc' } = {}) {
  const filtered = items
    .filter((item) => searchMatches(item, searchFields, search))
    .filter((item) => filters.every((filter) => filter(item)));
  const sorted = sortAccessor ? sortBy(filtered, sortAccessor, sortDirection) : filtered;
  return paginate(sorted, page, pageSize);
}

export function monthValue(value, monthKey) {
  return inMonth(value, monthKey);
}

export function attendanceSummary(records = []) {
  const totals = groupBy(records, 'status');
  return {
    present: totals.present?.length || 0,
    absent: totals.absent?.length || 0,
    late: totals.late?.length || 0,
    half_day: totals.half_day?.length || 0,
    excused: totals.excused?.length || 0,
  };
}

export function invoiceTotal(invoice) {
  return (invoice?.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

export function invoiceBalance(invoice) {
  return Math.max(0, invoiceTotal(invoice) - Number(invoice?.amountPaid || 0) - Number(invoice?.waivedAmount || 0));
}

export function buildAvatarName(name) {
  return getInitials(name);
}

export function formatEntityMonth(value) {
  return formatMonth(value);
}