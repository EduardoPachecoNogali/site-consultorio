import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializePsychologist } from '@/lib/psychologists'

export async function GET() {
  const records = await prisma.psychologist.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    psychologists: records.map(serializePsychologist),
  })
}

export async function POST(request: Request) {
  const { name, email, notes } = await request.json()

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
    return NextResponse.json(
      { error: 'Já existe um cadastro com este email.' },
      { status: 409 },
    )
  }

  const record = await prisma.psychologist.create({
    data: {
      name: (name || 'Profissional MindCare').trim(),
      email: normalizedEmail,
      notes: notes?.trim() || null,
      status: 'pending',
    },
  })

  return NextResponse.json(
    { psychologist: serializePsychologist(record) },
    { status: 201 },
  )
}
