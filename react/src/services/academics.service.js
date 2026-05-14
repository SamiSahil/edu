import { api } from '../api/client.js';

export async function getClassesSections() {
  const { data } = await api.get('/academics/classes-sections');
  return data; // { classes, sections, staff }
}

export async function getSubjects() {
  const { data } = await api.get('/academics/subjects');
  return data || [];
}

export async function getTimetable(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const { data } = await api.get(`/academics/timetable?${qs}`);
  return data || [];
}

export async function saveTimetableEntry(values) {
  try {
    const { data } = values?.id
      ? await api.patch(`/academics/timetable/${values.id}`, values)
      : await api.post('/academics/timetable', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function archiveTimetableEntry(id) {
  try {
    const { data } = await api.del(`/academics/timetable/${id}`);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

// Classes CRUD
export async function saveClass(values) {
  try {
    const { data } = values?.id
      ? await api.patch(`/academics/classes/${values.id}`, values)
      : await api.post('/academics/classes', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function archiveClass(id) {
  try {
    const { data } = await api.del(`/academics/classes/${id}`);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

// Sections CRUD
export async function saveSection(values) {
  try {
    const { data } = values?.id
      ? await api.patch(`/academics/sections/${values.id}`, values)
      : await api.post('/academics/sections', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function archiveSection(id) {
  try {
    const { data } = await api.del(`/academics/sections/${id}`);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

// Subjects CRUD
export async function saveSubject(values) {
  try {
    const { data } = values?.id
      ? await api.patch(`/academics/subjects/${values.id}`, values)
      : await api.post('/academics/subjects', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function archiveSubject(id) {
  try {
    const { data } = await api.del(`/academics/subjects/${id}`);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}