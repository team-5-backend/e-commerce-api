import https from 'https'

import { create } from 'axios'

import { HTTP_STATUS } from '../config/constants.js'
import environment from '../config/environment.js'
import { emailSchema } from '../validations/brevo.schema.js'

import { AppError } from './appError.js'
import logger from './logger.js'

const httpsAgent = new https.Agent({ keepAlive: true })

const brevoClient = create({
  baseURL: 'https://api.brevo.com/v3/smtp',
  headers: {
    accept: 'application/json',
    'api-key': environment.brevo.brevoApiKey,
    'content-type': 'application/json',
  },
  timeout: 5000,
  httpsAgent,
})

export const sendEmail = async (payload) => {
  const { value, error: schemaError } = emailSchema.validate(payload)
  if (schemaError)
    throw new AppError(
      `Schema validation failed: ${schemaError.message}`,
      HTTP_STATUS.BAD_REQUEST,
      {
        cause: schemaError,
      },
    )
  const { to, subject, html } = value

  try {
    const { data } = await brevoClient.post('/email', {
      sender: {
        name: environment.brevo.senderName,
        email: environment.brevo.senderEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    })

    logger.info({
      message: 'Email sent successfully via Brevo',
      recipient: to,
      messageId: data.messageId,
    })

    return data
  } catch (error) {
    throw new AppError('Failed to send email', HTTP_STATUS.INTERNAL_ERROR, { cause: error })
  }
}
