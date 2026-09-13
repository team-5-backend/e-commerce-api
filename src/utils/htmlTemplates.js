export const otpHtml = (otp) => {
  return `
    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; text-align: center;">
      <h2 style="color: #333;">Verification Code</h2>
      <p style="color: #555; font-size: 16px;">Please use the following One-Time Password (OTP) to proceed. This code is valid for 10 minutes.</p>
      <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #000;">${otp}</span>
      </div>
      <p style="color: #888; font-size: 12px;">If you did not request this code, please securely ignore and delete this message.</p>
    </div>
  `
}

export const passwordOtpHtml = (otp) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #eaeaea; }
    .header { color: #333333; font-size: 20px; font-weight: 600; margin-bottom: 15px; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }
    .content { color: #555555; font-size: 16px; line-height: 1.5; }
    .otp { font-size: 32px; font-weight: bold; color: #2c3e50; text-align: center; margin: 20px 0; letter-spacing: 5px; }
    .footer { margin-top: 30px; font-size: 12px; color: #999999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Password Reset Request</div>
    <div class="content">
      <p>We received a request to reset your password. Enter the following code to proceed:</p>
      <div class="otp">${otp}</div>
      <p>This code will expire shortly. <strong>Do not share this code with anyone.</strong></p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} YourAppName. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`

export const genericMessageHtml = (title, message) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #eaeaea; }
    .header { color: #333333; font-size: 20px; font-weight: 600; margin-bottom: 15px; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }
    .content { color: #555555; font-size: 16px; line-height: 1.5; }
    .footer { margin-top: 30px; font-size: 12px; color: #999999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">${title}</div>
    <div class="content">
      <p>${message}</p>
    </div>
    <div class="footer">
      <p>If you didn't request this email, you can safely ignore it.</p>
      <p>&copy; ${new Date().getFullYear()} YourAppName. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`

export const getOrderConfirmationTemplate = (order, userName) => {
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.price}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.price * item.quantity}</td>
    </tr>
  `,
    )
    .join('')

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Thank you for your order, ${userName}!</h2>
      <p>Order ID: <strong>#${order._id}</strong></p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 8px; text-align: left;">Item</th>
            <th style="padding: 8px; text-align: center;">Qty</th>
            <th style="padding: 8px; text-align: right;">Price</th>
            <th style="padding: 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="margin-top: 20px; text-align: right; font-size: 14px;">
        <p>Subtotal: $${order.subtotal}</p>
        <p>Discount: -$${order.discount}</p>
        <h3>Grand Total: $${order.totalPrice}</h3>
      </div>
    </div>
  `
}

export const getStatusEmailTemplate = (orderId, status, userName) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Hello ${userName},</h2>
      <p>Your order <strong>#${orderId}</strong> status has been updated to: <b style="color: #007bff;">${status.toUpperCase()}</b></p>
    </div>
  `
}
