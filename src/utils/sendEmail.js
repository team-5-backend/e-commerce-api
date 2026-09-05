import axios from 'axios'

import { HTTP_STATUS } from '../config/constants.js'
import environment from '../config/environment.js'
import logger from '../utils/logger.js'

import { AppError } from './appError.js'

const brevoClient = axios.create({
  baseURL: 'https://api.brevo.com/v3/smtp',
  headers: {
    accept: 'application/json',
    'api-key': environment.brevo.brevoApiKey,
    'content-type': 'application/json',
  },
  timeout: 5000,
})

export const sendEmail = async ({ to, subject, html }) => {
  if (!to || !subject || !html) {
    throw new AppError(
      'Email "to", "subject", and "html" content are required.',
      HTTP_STATUS.BAD_REQUEST,
    )
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
    throw new AppError('Failed to send email', HTTP_STATUS.INTERNAL_ERROR)
  }
}

export default sendEmail
