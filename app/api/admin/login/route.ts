import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAdminSession } from '@/lib/admin-auth'
import { hashSecret, isHashedSecret, verifySecret } from '@/lib/secret-crypto'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email e senha são obrigatórios.' },
      { status: 400 },
    )
  }

  const normalizedEmail = String(email).trim().toLowerCase()
  const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } })

  if (!admin) {
    return NextResponse.json(
      { error: 'Credenciais inválidas.' },
      { status: 401 },
    )
  }

  const providedPassword = String(password)
  const isValidPassword = await verifySecret(providedPassword, admin.password)

  if (!isValidPassword) {
    return NextResponse.json(
      { error: 'Credenciais inválidas.' },
      { status: 401 },
    )
  }

  if (!isHashedSecret(admin.password)) {
    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: await hashSecret(providedPassword) },
    })
  }

  await createAdminSession(admin.id)

  return NextResponse.json({ success: true })
}
