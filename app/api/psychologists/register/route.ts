import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializePsychologist } from '@/lib/psychologists'

const isExpired = (date: Date | null) => (date ? date.getTime() < Date.now() : true)

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { error: 'Token inválido.' },
      { status: 400 },
    )
  }

  const psychologist = await prisma.psychologist.findFirst({
    where: { inviteToken: token },
  })

  if (!psychologist) {
    return NextResponse.json(
      { error: 'Convite não encontrado.' },
      { status: 404 },
    )
  }

  if (isExpired(psychologist.inviteExpiresAt)) {
    return NextResponse.json(
      { error: 'Convite expirado.' },
      { status: 410 },
    )
  }

  return NextResponse.json({
    psychologist: {
      name: psychologist.name,
      email: psychologist.email,
    },
  })
}

export async function POST(request: Request) {
  const { token, name, pin } = await request.json()

  if (!token || !pin) {
    return NextResponse.json(
      { error: 'Token e PIN são obrigatórios.' },
      { status: 400 },
    )
  }

  if (!/^[0-9]{6}$/.test(String(pin))) {
    return NextResponse.json(
      { error: 'O PIN precisa conter exatamente 6 dígitos.' },
      { status: 400 },
    )
  }

  const psychologist = await prisma.psychologist.findFirst({
    where: { inviteToken: token },
  })

  if (!psychologist) {
    return NextResponse.json(
      { error: 'Convite não encontrado.' },
      { status: 404 },
    )
  }

  if (isExpired(psychologist.inviteExpiresAt)) {
    return NextResponse.json(
      { error: 'Convite expirado.' },
      { status: 410 },
    )
  }

  const updated = await prisma.psychologist.update({
    where: { id: psychologist.id },
    data: {
      name: String(name || psychologist.name).trim() || psychologist.name,
      pin: String(pin),
      status: 'approved',
      inviteToken: null,
      inviteExpiresAt: null,
      inviteAcceptedAt: new Date(),
    },
  })

  return NextResponse.json({ psychologist: serializePsychologist(updated) })
}
