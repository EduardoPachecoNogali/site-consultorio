import { cookies } from 'next/headers'
import crypto from 'crypto'

const SESSION_COOKIE = 'patient_session'
const SESSION_TTL_DAYS = 7
const isSecureCookie = process.env.NODE_ENV === 'production'

const getSessionSecret = () => {
  const raw =
    process.env.PATIENT_SESSION_SECRET ||
    process.env.APP_SESSION_SECRET ||
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY

  if (!raw) {
    throw new Error(
      'Defina PATIENT_SESSION_SECRET, APP_SESSION_SECRET ou GOOGLE_TOKEN_ENCRYPTION_KEY.',
    )
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }

  const base64 = raw.replace(/\s+/g, '')
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length >= 32) {
    return buffer.subarray(0, 32)
  }

  return crypto.createHash('sha256').update(raw).digest()
}

const signValue = (value: string) =>
  crypto.createHmac('sha256', getSessionSecret()).update(value).digest('base64url')

const buildSignedValue = (payload: Record<string, unknown>) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encodedPayload}.${signValue(encodedPayload)}`
}

const parseSignedValue = <T>(value: string): T | null => {
  const [encodedPayload, signature] = value.split('.')
  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = signValue(encodedPayload)
  const leftBuffer = Buffer.from(signature)
  const rightBuffer = Buffer.from(expectedSignature)

  if (leftBuffer.length !== rightBuffer.length) {
    return null
  }

  if (!crypto.timingSafeEqual(leftBuffer, rightBuffer)) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

export async function createPatientSession(email: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  const cookieStore = await cookies()

  cookieStore.set(
    SESSION_COOKIE,
    buildSignedValue({
      email,
      exp: expiresAt.getTime(),
    }),
    {
      httpOnly: true,
      sameSite: 'strict',
      secure: isSecureCookie,
      expires: expiresAt,
      path: '/',
    },
  )
}

export async function clearPatientSession() {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: isSecureCookie,
    expires: new Date(0),
    path: '/',
  })
}

export async function requirePatientSession(email: string) {
  const cookieStore = await cookies()
  const value = cookieStore.get(SESSION_COOKIE)?.value

  if (!value) {
    return false
  }

  const session = parseSignedValue<{ email?: string; exp?: number }>(value)
  if (!session?.email || !session?.exp || session.exp < Date.now()) {
    await clearPatientSession()
    return false
  }

  return session.email.toLowerCase() === email.toLowerCase()
}
