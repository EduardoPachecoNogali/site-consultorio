import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializePsychologist } from '@/lib/psychologists'
import { appConfig } from '@/lib/app-config'

export async function POST(request: Request) {
  const { name, email } = await request.json()

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json(
      { error: 'Informe seu nome completo.' },
      { status: 400 },
    )
  }

  if (!email || typeof email !== 'string') {
    return NextResponse.json(
      { error: 'Email profissional é obrigatório.' },
      { status: 400 },
    )
  }

  const normalizedEmail = email.trim().toLowerCase()

  const existing = await prisma.psychologist.findUnique({
    where: { email: normalizedEmail },
  })

  if (existing) {
    const message =
      existing.status === 'approved'
        ? `Seu cadastro já foi aprovado. Use o PIN enviado pela equipe ${appConfig.name}.`
        : 'Já existe uma solicitação pendente para este email.'
    return NextResponse.json({ error: message }, { status: 409 })
  }

  const record = await prisma.psychologist.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      status: 'pending',
    },
  })

  return NextResponse.json(
    { psychologist: serializePsychologist(record) },
    { status: 201 },
  )
}
