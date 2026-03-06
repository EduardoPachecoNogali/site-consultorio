import { cookies } from 'next/headers'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const SESSION_COOKIE = 'admin_session'
const SESSION_TTL_DAYS = 7
const isSecureCookie = process.env.NODE_ENV === 'production'

const hashSessionToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex')

export async function createAdminSession(adminId: string) {
  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS)

  await prisma.adminSession.create({
    data: {
      adminId,
      token: hashSessionToken(token),
      expiresAt,
    },
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isSecureCookie,
    expires: expiresAt,
    path: '/',
  })
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    await prisma.adminSession.deleteMany({
      where: {
        OR: [{ token: hashSessionToken(token) }, { token }],
      },
    })
  }
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: isSecureCookie,
    expires: new Date(0),
    path: '/',
  })
}

export async function getAdminFromRequest() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.adminSession.findFirst({
    where: {
      OR: [{ token: hashSessionToken(token) }, { token }],
    },
    include: { admin: true },
  })

  if (!session) return null

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.deleteMany({ where: { token } })
    return null
  }

  return session.admin
}
