export const ApiResponse = (message = 'Success', data = null) => ({
  success: true,
  message,
  ...(data !== null && data !== undefined && { data }),
})