import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Params {
  params: { id: string; reminderId: string }
}

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

export async function PATCH(request: Request, { params }: Params) {
  const { id, reminderId } = params
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

  const updateData: { text?: string; color?: string } = {}

  if (payload.text !== undefined) {
    const value = normalizeString(payload.text)
    if (value) updateData.text = value
  }
  if (payload.color !== undefined) {
    const value = normalizeString(payload.color)
    if (value) updateData.color = value
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
    },
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, reminderId } = params

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
