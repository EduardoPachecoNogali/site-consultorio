import nodemailer from 'nodemailer'
import { appConfig } from '@/lib/app-config'

interface SendMailParams {
  to: string
  subject: string
  html: string
}

let cachedTransporter: nodemailer.Transporter | null = null

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter

  const host = process.env.EMAIL_SERVER_HOST
  const port = process.env.EMAIL_SERVER_PORT
  const user = process.env.EMAIL_SERVER_USER
  const pass = process.env.EMAIL_SERVER_PASSWORD

  if (!host || !port || !user || !pass) {
    return null
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  })

  return cachedTransporter
}

export async function sendMail({ to, subject, html }: SendMailParams) {
  const transporter = getTransporter()
  const from = process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER

  if (!transporter || !from) {
    console.info('[email:mock]', { to, subject, app: appConfig.name })
    return
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    })
  } catch (error) {
    console.error('[email:error]', { to, subject, error })
  }
}
