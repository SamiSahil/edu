export function parsePagination(query = {}) {
  const page = Math.max(1, Number(query.page || 1) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(query.pageSize || 20) || 20));
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return { page, pageSize, skip, take };
}

export function buildPageMeta({ page, pageSize, totalItems }) {
  const totalPages = Math.max(1, Math.ceil(Number(totalItems || 0) / pageSize));
  return { page, pageSize, totalItems, totalPages };
}