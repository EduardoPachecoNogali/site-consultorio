import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveRouteParams } from '@/lib/route-params'
import { requirePsychologistSession } from '@/lib/psychologist-auth'

interface Params {
  params?: { id?: string; reminderId?: string } | Promise<{ id?: string; reminderId?: string }>
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

export async function PATCH(request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  const reminderId = resolvedParams?.reminderId
  if (!id || !reminderId) {
    return NextResponse.json(
      { error: 'Lembrete inválido.' },
      { status: 400 },
    )
  }

  const sessionPsychologist = await requirePsychologistSession(id)
  if (!sessionPsychologist) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 })
  }
  const payload = await request.json()

  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, psychologistId: id },
  })

  if (!reminder) {
    return NextResponse.json(
      { error: 'Lembrete não encontrado.' },
      { status: 404 },
    )
  }

  const updateData: { text?: string; color?: string; remindAt?: Date | null } = {}

  if (payload.text !== undefined) {
    const value = normalizeString(payload.text)
    if (value) updateData.text = value
  }
  if (payload.color !== undefined) {
    const value = normalizeString(payload.color)
    if (value) updateData.color = value
  }
  if (payload.remindAt !== undefined) {
    updateData.remindAt = normalizeDate(payload.remindAt)
  }

  const updated = await prisma.reminder.update({
    where: { id: reminderId },
    data: updateData,
  })

  return NextResponse.json({
    reminder: {
      id: updated.id,
      text: updated.text,
      color: updated.color,
      remindAt: updated.remindAt?.toISOString() ?? null,
    },
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  const reminderId = resolvedParams?.reminderId
  if (!id || !reminderId) {
    return NextResponse.json(
      { error: 'Lembrete inválido.' },
      { status: 400 },
    )
  }

  const sessionPsychologist = await requirePsychologistSession(id)
  if (!sessionPsychologist) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 })
  }

  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, psychologistId: id },
  })

  if (!reminder) {
    return NextResponse.json(
      { error: 'Lembrete não encontrado.' },
      { status: 404 },
    )
  }

  await prisma.reminder.delete({ where: { id: reminderId } })

  return NextResponse.json({ success: true })
}
