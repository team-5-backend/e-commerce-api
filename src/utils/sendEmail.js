import axios from 'axios'

import { HTTP_STATUS } from '../config/constants.js'
import environment from '../config/environment.js'
import logger from '../utils/logger.js'
import { emailSchema } from '../validations/auth.validation.js'

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

export const sendEmail = async (payload) => {
  const { value, error } = emailSchema.validate(payload)
  if (error) {
    throw new AppError(
      `Schema validation failed: ${error.details[0].message}`,
      HTTP_STATUS.BAD_REQUEST,
      {
        cause: error,
      },
    )
  }
  const { to, subject, html } = value

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
    throw new AppError('Failed to send email', HTTP_STATUS.INTERNAL_ERROR, { cause: error })
  }
}

export default sendEmail
