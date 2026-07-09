function buildPagination(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildSort(query = {}, defaultSort = '-createdAt') {
  const sortBy = query.sortBy;
  const sortOrder = query.sortOrder === 'asc' ? '' : '-';

  if (!sortBy) {
    return defaultSort;
  }

  return `${sortOrder}${sortBy}`;
}

module.exports = {
  buildPagination,
  buildSort
};
