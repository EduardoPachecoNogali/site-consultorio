import { cookies } from 'next/headers'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const SESSION_COOKIE = 'admin_session'
const SESSION_TTL_DAYS = 7
const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''
const isSecureCookie = appUrl.startsWith('https://')

export async function createAdminSession(adminId: string) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS)

  await prisma.adminSession.create({
    data: {
      adminId,
      token,
      expiresAt,
    },
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookie,
    expires: expiresAt,
    path: '/',
  })
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    await prisma.adminSession.deleteMany({ where: { token } })
  }
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookie,
    expires: new Date(0),
    path: '/',
  })
}

export async function getAdminFromRequest() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.adminSession.findUnique({
    where: { token },
    include: { admin: true },
  })

  if (!session) return null

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.deleteMany({ where: { token } })
    return null
  }

  return session.admin
}
