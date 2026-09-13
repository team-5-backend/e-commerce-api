export const getPagination = (page, limit) => {
  const currentPage = Math.max(Number(page) || 1, 1)
  const currentLimit = Math.min(Math.max(Number(limit) || 10, 1), 100)
  const skip = (currentPage - 1) * currentLimit
  return { currentPage, currentLimit, skip }
}
