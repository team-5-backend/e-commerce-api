export const getPaginatedData = async (
  model,
  query = {},
  page = 1,
  limit = 10,
  sort = '-createdAt',
  populateOptions = [],
  select = '', // <-- 1. Add select parameter
) => {
  const currentPage = Math.max(Number(page) || 1, 1)
  const currentLimit = Math.min(Math.max(Number(limit) || 10, 1), 100)
  const skip = (currentPage - 1) * currentLimit

  let dbQuery = model.find(query).skip(skip).limit(currentLimit)
  if (select) dbQuery = dbQuery.select(select)
  // eslint-disable-next-line unicorn/no-array-sort
  dbQuery = dbQuery.sort(sort).lean()

  if (populateOptions.length) dbQuery = dbQuery.populate(populateOptions)

  const [data, totalItems] = await Promise.all([dbQuery, model.countDocuments(query)])

  const totalPages = Math.max(Math.ceil(totalItems / currentLimit), 1)

  return {
    data,
    pagination: {
      page: currentPage,
      limit: currentLimit,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    },
  }
}
