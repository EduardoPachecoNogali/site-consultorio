import { cookies } from 'next/headers'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const SESSION_COOKIE = 'psychologist_session'
const SESSION_TTL_DAYS = 7
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

const isSecureCookie = process.env.NODE_ENV === 'production'

const getSessionSecret = () => {
  const raw =
    process.env.PSYCHOLOGIST_SESSION_SECRET ||
    process.env.APP_SESSION_SECRET ||
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY

  if (!raw) {
    throw new Error(
      'Defina PSYCHOLOGIST_SESSION_SECRET, APP_SESSION_SECRET ou GOOGLE_TOKEN_ENCRYPTION_KEY.',
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

const encodePayload = (payload: Record<string, unknown>) =>
  Buffer.from(JSON.stringify(payload)).toString('base64url')

const signValue = (value: string) =>
  crypto.createHmac('sha256', getSessionSecret()).update(value).digest('base64url')

const buildSignedValue = (payload: Record<string, unknown>) => {
  const encodedPayload = encodePayload(payload)
  const signature = signValue(encodedPayload)
  return `${encodedPayload}.${signature}`
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

export async function createPsychologistSession(psychologistId: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  const cookieStore = await cookies()

  cookieStore.set(
    SESSION_COOKIE,
    buildSignedValue({
      psychologistId,
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

export async function clearPsychologistSession() {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: isSecureCookie,
    expires: new Date(0),
    path: '/',
  })
}

export async function getPsychologistFromRequest() {
  const cookieStore = await cookies()
  const value = cookieStore.get(SESSION_COOKIE)?.value

  if (!value) {
    return null
  }

  const session = parseSignedValue<{ psychologistId?: string; exp?: number }>(value)
  if (!session?.psychologistId || !session?.exp || session.exp < Date.now()) {
    await clearPsychologistSession()
    return null
  }

  return prisma.psychologist.findUnique({
    where: { id: session.psychologistId },
  })
}

export async function requirePsychologistSession(expectedPsychologistId: string) {
  const psychologist = await getPsychologistFromRequest()

  if (!psychologist || psychologist.id !== expectedPsychologistId) {
    return null
  }

  return psychologist
}

export const buildGoogleOAuthState = (psychologistId: string) =>
  buildSignedValue({
    psychologistId,
    ts: Date.now(),
  })

export const parseGoogleOAuthState = (value: string) => {
  const parsed = parseSignedValue<{ psychologistId?: string; ts?: number }>(value)
  if (!parsed?.psychologistId || !parsed?.ts) {
    return null
  }

  if (Date.now() - parsed.ts > OAUTH_STATE_TTL_MS) {
    return null
  }

  return parsed
}
