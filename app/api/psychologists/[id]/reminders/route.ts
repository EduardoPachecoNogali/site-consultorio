import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Params {
  params: { id: string }
}

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

export async function POST(request: Request, { params }: Params) {
  const { id } = params
  const payload = await request.json()

  const text = normalizeString(payload.text)
  const color = normalizeString(payload.color)

  if (!text) {
    return NextResponse.json(
      { error: 'Texto do lembrete é obrigatório.' },
      { status: 400 },
    )
  }

  const psychologist = await prisma.psychologist.findUnique({ where: { id } })
  if (!psychologist) {
    return NextResponse.json(
      { error: 'Profissional não encontrado.' },
      { status: 404 },
    )
  }

  const reminder = await prisma.reminder.create({
    data: {
      psychologistId: id,
      text,
      color: color || 'blue',
    },
  })

  return NextResponse.json(
    {
      reminder: {
        id: reminder.id,
        text: reminder.text,
        color: reminder.color,
      },
    },
    { status: 201 },
  )
}
