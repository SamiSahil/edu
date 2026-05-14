import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DATE_FORMATTER, DATE_TIME_FORMATTER, MONTH_FORMATTER, STATUS_VARIANTS } from './constants.js';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function safeString(value) {
  return value == null ? '' : String(value);
}

export function trimValue(value) {
  return safeString(value).trim();
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : DATE_FORMATTER.format(date);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : DATE_TIME_FORMATTER.format(date);
}

export function formatMonth(value) {
  if (!value) return 'Current month';
  const [year, month] = value.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return Number.isNaN(date.getTime()) ? value : MONTH_FORMATTER.format(date);
}

export function formatCurrency(amount, currency = 'USD') {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function getInitials(name = '') {
  return safeString(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'SM';
}

export function generateId(prefix, records = []) {
  const year = new Date().getFullYear();
  const last = records
    .map((record) => safeString(record.id))
    .filter((id) => id.startsWith(`${prefix}-${year}-`))
    .map((id) => Number(id.split('-').pop() || '0'))
    .reduce((max, value) => Math.max(max, value), 0);
  return `${prefix}-${year}-${String(last + 1).padStart(4, '0')}`;
}

export function statusTone(status) {
  return STATUS_VARIANTS[safeString(status).toLowerCase()] || 'neutral';
}

export function searchMatches(record, fields = [], term = '') {
  const query = trimValue(term).toLowerCase();
  if (!query) return true;
  return fields.some((field) => safeString(record?.[field]).toLowerCase().includes(query));
}

export function applyFilters(records = [], filters = []) {
  return filters.reduce((list, filter) => list.filter(filter), records);
}

export function paginate(items = [], page = 1, pageSize = 10) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.max(1, Number(pageSize) || 10);
  const totalPages = Math.max(1, Math.ceil(items.length / safeSize));
  const currentPage = Math.min(safePage, totalPages);
  const start = (currentPage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    totalPages,
    currentPage,
    totalItems: items.length,
    pageSize: safeSize,
  };
}

export function sumBy(items = [], field) {
  return items.reduce((total, item) => total + Number(item?.[field] || 0), 0);
}

export function averageBy(items = [], field) {
  if (!items.length) return 0;
  return sumBy(items, field) / items.length;
}

export function percentage(part, total) {
  if (!total) return 0;
  return Math.round((Number(part) / Number(total)) * 100);
}

export function groupBy(items = [], key) {
  return items.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item?.[key];
    const normalized = groupKey == null ? 'Unknown' : groupKey;
    if (!groups[normalized]) groups[normalized] = [];
    groups[normalized].push(item);
    return groups;
  }, {});
}

export function sortBy(items = [], accessor, direction = 'asc') {
  const list = [...items];
  const factor = direction === 'desc' ? -1 : 1;
  list.sort((a, b) => {
    const av = typeof accessor === 'function' ? accessor(a) : a?.[accessor];
    const bv = typeof accessor === 'function' ? accessor(b) : b?.[accessor];
    if (av === bv) return 0;
    return av > bv ? factor : -factor;
  });
  return list;
}

export function uniqueBy(items = [], field) {
  const seen = new Set();
  return items.filter((item) => {
    const value = item?.[field];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function toMonthKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isSameMonth(value, monthKey) {
  return toMonthKey(value) === monthKey;
}

export function monthRange(monthKey) {
  const [year, month] = safeString(monthKey).split('-').map(Number);
  const start = new Date(year, (month || 1) - 1, 1);
  const end = new Date(year, month || 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function inMonth(value, monthKey) {
  return isSameMonth(value, monthKey);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function trendValue(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function compareDateDesc(a, b) {
  return new Date(b).getTime() - new Date(a).getTime();
}

export function resolveStatusVariant(status) {
  return statusTone(status);
}