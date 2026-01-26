import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Params {
  params: { id: string; appointmentId: string }
}

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeDate = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return new Date()
  }
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0),
  )
}

export async function PATCH(request: Request, { params }: Params) {
  const { id, appointmentId } = params
  const payload = await request.json()

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, psychologistId: id },
  })

  if (!appointment) {
    return NextResponse.json(
      { error: 'Consulta não encontrada.' },
      { status: 404 },
    )
  }

  const updateData: {
    date?: Date
    time?: string
    duration?: string
    status?: string
    notes?: string | null
    notificationPreference?: string
    patientContact?: string
  } = {}

  if (payload.date) {
    updateData.date = normalizeDate(payload.date)
  }
  if (payload.time) {
    updateData.time = normalizeString(payload.time)
  }
  if (payload.duration) {
    updateData.duration = normalizeString(payload.duration)
  }
  if (payload.status) {
    updateData.status = normalizeString(payload.status)
  }
  if (payload.notes !== undefined) {
    updateData.notes = normalizeString(payload.notes) || null
  }
  if (payload.notificationPreference) {
    updateData.notificationPreference = normalizeString(payload.notificationPreference)
  }
  if (payload.patientContact !== undefined) {
    updateData.patientContact = normalizeString(payload.patientContact)
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: updateData,
  })

  return NextResponse.json({
    appointment: {
      id: updated.id,
      patientId: updated.patientId,
      time: updated.time,
      duration: updated.duration,
      status: updated.status,
      notes: updated.notes ?? '',
      date: updated.date.toISOString(),
      notificationPreference: updated.notificationPreference,
      patientContact: updated.patientContact,
    },
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, appointmentId } = params

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, psychologistId: id },
  })

  if (!appointment) {
    return NextResponse.json(
      { error: 'Consulta não encontrada.' },
      { status: 404 },
    )
  }

  await prisma.appointment.delete({ where: { id: appointmentId } })

  return NextResponse.json({ success: true })
}
