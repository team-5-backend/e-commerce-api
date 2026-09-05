import axios from 'axios'

import environment from '../config/environment.js'
import logger from '../utils/logger.js'

const brevoClient = axios.create({
  baseURL: 'https://api.brevo.com/v3/mtp',
  headers: {
    accept: 'application/json',
    'api-key': environment.brevo.brevoApiKey,
    'content-type': 'application/json',
  },
  timeout: 5000,
})

export const sendEmail = async ({ to, subject, html }) => {
  if (!to || !subject || !html) {
    throw new Error('Email "to", "subject", and "html" content are required.')
  }

  try {
    const { data } = await brevoClient.post('/email', {
      sender: {
        name: environment.brevo.fromName,
        email: environment.brevo.fromEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    })

    logger.info({
      message: 'Email sent successfully via Brevo',
      to,
      messageId: data.messageId,
    })

    return data
  } catch (error) {
    logger.error({ message: 'Brevo error:', error })
    throw new Error('Failed to send email')
  }
}

export default sendEmail
