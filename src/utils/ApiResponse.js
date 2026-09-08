export class ApiResponse {
  constructor(message = 'Success', data = null) {
    this.success = true
    this.message = message
    if (data !== null && data !== undefined) {
      this.data = data
    }
  }
}
