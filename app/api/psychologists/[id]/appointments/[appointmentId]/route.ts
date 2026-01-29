import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveRouteParams } from '@/lib/route-params'

interface Params {
  params?: { id?: string; appointmentId?: string } | Promise<{ id?: string; appointmentId?: string }>
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
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  const appointmentId = resolvedParams?.appointmentId
  if (!id || !appointmentId) {
    return NextResponse.json(
      { error: 'Consulta inválida.' },
      { status: 400 },
    )
  }
  const payload = await request.json()

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, psychologistId: id },
    include: { patient: true },
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
    reason?: string | null
    isGroup?: boolean
    groupName?: string | null
    groupSize?: number | null
    groupParticipants?: string[]
    groupRequested?: boolean
    groupRequestNote?: string | null
    attendanceStatus?: string
    tags?: string[]
    groupTags?: string[]
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
  if (payload.reason !== undefined) {
    updateData.reason = normalizeString(payload.reason) || null
  }
  if (payload.isGroup !== undefined) {
    updateData.isGroup = Boolean(payload.isGroup)
  }
  if (payload.groupName !== undefined) {
    updateData.groupName = normalizeString(payload.groupName) || null
  }
  if (payload.groupSize !== undefined) {
    const parsedSize = Number(payload.groupSize)
    updateData.groupSize = Number.isFinite(parsedSize) ? parsedSize : null
  }
  if (payload.groupParticipants !== undefined) {
    updateData.groupParticipants = Array.isArray(payload.groupParticipants)
      ? payload.groupParticipants.map((entry: unknown) => normalizeString(entry)).filter(Boolean)
      : []
  }
  if (payload.groupRequested !== undefined) {
    updateData.groupRequested = Boolean(payload.groupRequested)
  }
  if (payload.groupRequestNote !== undefined) {
    updateData.groupRequestNote = normalizeString(payload.groupRequestNote) || null
  }
  if (payload.attendanceStatus !== undefined) {
    updateData.attendanceStatus = normalizeString(payload.attendanceStatus) || 'pending'
  }
  if (payload.tags !== undefined) {
    updateData.tags = Array.isArray(payload.tags)
      ? payload.tags.map((entry: unknown) => normalizeString(entry)).filter(Boolean)
      : []
  }
  if (payload.groupTags !== undefined) {
    updateData.groupTags = Array.isArray(payload.groupTags)
      ? payload.groupTags.map((entry: unknown) => normalizeString(entry)).filter(Boolean)
      : []
  }

  if (payload.isGroup === false) {
    updateData.groupName = null
    updateData.groupSize = null
    updateData.groupParticipants = []
    updateData.groupTags = []
  }

  if (payload.isGroup === true) {
    updateData.groupRequested = false
    if (updateData.groupRequestNote === undefined) {
      updateData.groupRequestNote = null
    }
  }

  const desiredIsGroup = updateData.isGroup ?? appointment.isGroup
  const desiredDate = updateData.date ?? appointment.date
  const desiredTime = updateData.time ?? appointment.time
  const desiredGroupName = updateData.groupName ?? appointment.groupName

  if (!desiredIsGroup) {
    const conflict = await prisma.appointment.findFirst({
      where: {
        psychologistId: id,
        id: { not: appointmentId },
        date: desiredDate,
        time: desiredTime,
        status: { notIn: ['cancelled'] },
      },
    })

    if (conflict) {
      return NextResponse.json(
        { error: 'Horário indisponível para consulta individual.' },
        { status: 409 },
      )
    }
  }

  if (desiredIsGroup && !desiredGroupName) {
    return NextResponse.json(
      { error: 'Informe o nome do grupo.' },
      { status: 400 },
    )
  }
  if (payload.notificationPreference !== undefined) {
    updateData.notificationPreference = 'email'
  }
  if (payload.patientContact !== undefined) {
    updateData.patientContact = normalizeString(payload.patientContact)
  }

  const nextContact =
    updateData.patientContact ??
    appointment.patient.email ??
    appointment.patientContact
  if (!nextContact) {
    return NextResponse.json(
      {
        error: 'Informe o email do paciente.',
      },
      { status: 400 },
    )
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
      reason: updated.reason ?? '',
      isGroup: updated.isGroup ?? false,
      groupName: updated.groupName ?? '',
      groupSize: updated.groupSize ?? null,
      groupParticipants: updated.groupParticipants ?? [],
      groupRequested: updated.groupRequested ?? false,
      groupRequestNote: updated.groupRequestNote ?? '',
      attendanceStatus: updated.attendanceStatus ?? 'pending',
      tags: updated.tags ?? [],
      groupTags: updated.groupTags ?? [],
      date: updated.date.toISOString(),
      notificationPreference: updated.notificationPreference,
      patientContact: updated.patientContact,
      meetingUrl: updated.meetingUrl ?? '',
    },
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  const appointmentId = resolvedParams?.appointmentId
  if (!id || !appointmentId) {
    return NextResponse.json(
      { error: 'Consulta inválida.' },
      { status: 400 },
    )
  }

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
