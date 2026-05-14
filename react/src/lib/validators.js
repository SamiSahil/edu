import { trimValue } from './utils.js';

export function isRequired(value) {
  return trimValue(value).length > 0;
}

export function validateRequired(value, label) {
  return isRequired(value) ? '' : `${label} is required.`;
}

export function validateEmail(value) {
  if (!trimValue(value)) return 'Email is required.';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimValue(value)) ? '' : 'Enter a valid email address.';
}

export function validatePhone(value) {
  const text = trimValue(value);
  if (!text) return 'Phone number is required.';
  return /^[+]?[-0-9()\s]{7,18}$/.test(text) ? '' : 'Enter a valid phone number.';
}

export function validateDate(value, label = 'Date') {
  if (!trimValue(value)) return `${label} is required.`;
  return Number.isNaN(new Date(value).getTime()) ? `Enter a valid ${label.toLowerCase()}.` : '';
}

export function validateAmount(value, label = 'Amount', min = 0) {
  if (value === '' || value == null) return `${label} is required.`;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return `Enter a valid ${label.toLowerCase()}.`;
  if (numeric < min) return `${label} must be at least ${min}.`;
  return '';
}

export function validateLength(value, label, min = 0, max = Infinity) {
  const text = trimValue(value);
  if (text.length < min) return `${label} must be at least ${min} characters.`;
  if (text.length > max) return `${label} must be at most ${max} characters.`;
  return '';
}

export function validateMatch(value, otherValue, label, otherLabel) {
  return trimValue(value) === trimValue(otherValue) ? '' : `${label} must match ${otherLabel}.`;
}

export function validateSelection(value, label) {
  return trimValue(value) ? '' : `Select a ${label.toLowerCase()}.`;
}

export function createValidator(rules = []) {
  return (values = {}, context = {}) => {
    const errors = {};
    rules.forEach((rule) => {
      const error = rule.validate(values[rule.field], values, context);
      if (error) errors[rule.field] = error;
    });
    return { valid: Object.keys(errors).length === 0, errors };
  };
}

export function withDuplicateCheck(items = [], field, value, label, excludeId = null) {
  const normalized = trimValue(value).toLowerCase();
  const duplicate = items.find((item) => trimValue(item?.[field]).toLowerCase() === normalized && item?.id !== excludeId);
  return duplicate ? `${label} already exists.` : '';
}