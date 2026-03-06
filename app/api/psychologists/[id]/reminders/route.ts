import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveRouteParams } from '@/lib/route-params'
import { requirePsychologistSession } from '@/lib/psychologist-auth'

interface Params {
  params?: { id?: string } | Promise<{ id?: string }>
}

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeDate = (value?: string) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

export async function POST(request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  if (!id) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 })
  }

  const sessionPsychologist = await requirePsychologistSession(id)
  if (!sessionPsychologist) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 })
  }
  const payload = await request.json()

  const text = normalizeString(payload.text)
  const color = normalizeString(payload.color)
  const remindAt = normalizeDate(payload.remindAt)

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
      remindAt,
    },
  })

  return NextResponse.json(
    {
      reminder: {
        id: reminder.id,
        text: reminder.text,
        color: reminder.color,
        remindAt: reminder.remindAt?.toISOString() ?? null,
      },
    },
    { status: 201 },
  )
}
