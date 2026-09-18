export const ApiResponse = (message = 'Success', data = null) => {
  const isValid =
    data !== null &&
    data !== undefined &&
    data !== '' &&
    (typeof data !== 'object' || Object.keys(data).length > 0)

  return {
    success: true,
    message,
    ...(isValid && { data }),
  }
}
