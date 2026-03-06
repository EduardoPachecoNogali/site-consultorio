import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveRouteParams } from '@/lib/route-params'
import { createMeetLink } from '@/lib/google-meet'
import { requirePsychologistSession } from '@/lib/psychologist-auth'

interface Params {
  params?: { id?: string } | Promise<{ id?: string }>
}

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

const normalizeDate = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return new Date()
  }
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0),
  )
}

const resolveSlots = (payload: any) => {
  if (Array.isArray(payload?.slots) && payload.slots.length > 0) {
    return payload.slots
  }

  if (payload?.date && payload?.time) {
    return [{ date: payload.date, time: payload.time }]
  }

  return []
}

export async function POST(request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  if (!id) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 })
  }
  const payload = await request.json()

  const patientName = normalizeString(payload.patientName)
  const patientEmail = normalizeString(payload.patientEmail)
  const patientPhone = normalizeString(payload.patientPhone)
  const duration = normalizeString(payload.duration) || '50 min'
  const notes = normalizeString(payload.notes)
  const reason = normalizeString(payload.reason)
  const requestedBy = normalizeString(payload.createdBy)
  const sessionPsychologist = await requirePsychologistSession(id)
  const createdBy = sessionPsychologist ? 'psychologist' : 'patient'
  const groupRequested = Boolean(payload.groupRequested)
  const groupRequestNote = normalizeString(payload.groupRequestNote)
  const isGroup = Boolean(payload.isGroup) && !groupRequested
  const groupName = normalizeString(payload.groupName)
  const groupSize = Number(payload.groupSize)
  const groupParticipants = Array.isArray(payload.groupParticipants)
    ? payload.groupParticipants.map((entry: unknown) => normalizeString(entry)).filter(Boolean)
    : []
  const tags = Array.isArray(payload.tags)
    ? payload.tags.map((entry: unknown) => normalizeString(entry)).filter(Boolean)
    : []
  const groupTags = Array.isArray(payload.groupTags)
    ? payload.groupTags.map((entry: unknown) => normalizeString(entry)).filter(Boolean)
    : []
  const notificationPreference = 'email'
  const resolvedContact = patientEmail

  const rawSlots = resolveSlots(payload)
    .map((slot: any) => ({
      date: normalizeString(slot?.date),
      time: normalizeString(slot?.time),
    }))
    .filter((slot: { date: string; time: string }) => slot.date && slot.time)

  const slotKeys = new Set<string>()
  const slots = rawSlots.filter((slot: { date: string; time: string }) => {
    const key = `${slot.date}T${slot.time}`
    if (slotKeys.has(key)) {
      return false
    }
    slotKeys.add(key)
    return true
  })

  if (!patientName || slots.length === 0) {
    return NextResponse.json(
      { error: 'Informe o paciente e ao menos um horário.' },
      { status: 400 },
    )
  }

  if (!patientEmail) {
    return NextResponse.json(
      { error: 'Informe o email do paciente.' },
      { status: 400 },
    )
  }

  if (!resolvedContact) {
    return NextResponse.json(
      {
        error: 'Informe o email do paciente.',
      },
      { status: 400 },
    )
  }

  if (slots.some((slot: { date: string; time: string }) => !TIME_PATTERN.test(slot.time))) {
    return NextResponse.json(
      { error: 'Horário inválido. Use o formato HH:MM.' },
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

  if (isGroup && createdBy !== 'psychologist') {
    return NextResponse.json(
      { error: 'Somente o psicólogo pode criar grupo.' },
      { status: 403 },
    )
  }

  if (requestedBy === 'psychologist' && !sessionPsychologist) {
    return NextResponse.json(
      { error: 'Sessão do psicólogo inválida.' },
      { status: 401 },
    )
  }

  if (isGroup && !groupName) {
    return NextResponse.json(
      { error: 'Informe o nome do grupo.' },
      { status: 400 },
    )
  }

  if (!isGroup) {
    const normalizedSlots: Array<{ date: Date; time: string }> = slots.map(
      (slot: { date: string; time: string }) => ({
        date: normalizeDate(slot.date),
        time: slot.time,
      }),
    )

    const conflict = await prisma.appointment.findFirst({
      where: {
        psychologistId: id,
        status: { notIn: ['cancelled'] },
        OR: normalizedSlots.map((slot: { date: Date; time: string }) => ({
          date: slot.date,
          time: slot.time,
        })),
      },
    })

    if (conflict) {
      return NextResponse.json(
        { error: 'Horário indisponível para consulta individual.' },
        { status: 409 },
      )
    }
  }

  const patientLookup = patientEmail
    ? { email: { equals: patientEmail, mode: 'insensitive' as const } }
    : { name: { equals: patientName, mode: 'insensitive' as const } }

  let patient = await prisma.patient.findFirst({
    where: {
      psychologistId: id,
      ...patientLookup,
    },
  })

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        psychologistId: id,
        name: patientName,
        email: patientEmail || null,
        phone: patientPhone || null,
      },
    })
  } else if (patientEmail || patientPhone || patientName) {
    const updates: {
      name?: string
      email?: string | null
      phone?: string | null
    } = {}

    if (patientName && patient.name !== patientName) {
      updates.name = patientName
    }
    if (patientEmail) {
      updates.email = patientEmail
    }
    if (patientPhone) {
      updates.phone = patientPhone
    }

    if (Object.keys(updates).length > 0) {
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: updates,
      })
    }
  }

  const createdAppointments = await prisma.$transaction(
    slots.map((slot: { date: string; time: string }) =>
      prisma.appointment.create({
        data: {
          psychologistId: id,
          patientId: patient!.id,
          date: normalizeDate(slot.date),
          time: slot.time,
          duration,
          status: 'upcoming',
          notes: notes || null,
          reason: reason || null,
          isGroup,
          groupName: isGroup ? groupName || null : null,
          groupSize: isGroup && Number.isFinite(groupSize) ? groupSize : null,
          groupParticipants: isGroup ? groupParticipants : [],
          groupRequested,
          groupRequestNote: groupRequested ? groupRequestNote || null : null,
          attendanceStatus: 'pending',
          tags,
          groupTags: isGroup ? groupTags : [],
          notificationPreference,
          patientContact: resolvedContact,
        },
      }),
    ),
  )

  let finalizedAppointments = createdAppointments

  if (psychologist.googleRefreshToken) {
    try {
      finalizedAppointments = await Promise.all(
        createdAppointments.map(async (appointment) => {
          const meetResult = await createMeetLink({
            appointmentId: appointment.id,
            patientEmail,
            date: appointment.date,
            time: appointment.time,
            duration: appointment.duration,
            psychologistName: psychologist.name,
            patientName: patient!.name,
            google: {
              refreshToken: psychologist.googleRefreshToken,
              calendarId: psychologist.googleCalendarId,
              psychologistEmail: psychologist.googleEmail || psychologist.email,
            },
          })

          if (!meetResult.ok) {
            throw new Error(meetResult.error || 'Erro ao criar reunião no Google Meet.')
          }

          return prisma.appointment.update({
            where: { id: appointment.id },
            data: { meetingUrl: meetResult.meetingUrl },
          })
        }),
      )
    } catch (error: any) {
      console.error('[appointments:createMeetLink]', {
        psychologistId: id,
        error: error.message || 'Erro ao criar reunião no Google Meet.',
      })
    }
  }

  return NextResponse.json(
    {
      appointments: finalizedAppointments.map((appointment) => ({
        id: appointment.id,
        patientId: appointment.patientId,
        patientName: patientName,
        time: appointment.time,
        duration: appointment.duration,
        status: appointment.status,
        notes: appointment.notes ?? '',
        reason: appointment.reason ?? '',
        isGroup: appointment.isGroup,
        groupName: appointment.groupName ?? '',
        groupSize: appointment.groupSize ?? null,
        groupParticipants: appointment.groupParticipants ?? [],
        groupRequested: appointment.groupRequested ?? false,
        groupRequestNote: appointment.groupRequestNote ?? '',
        attendanceStatus: appointment.attendanceStatus ?? 'pending',
        tags: appointment.tags ?? [],
        groupTags: appointment.groupTags ?? [],
        date: appointment.date.toISOString(),
        notificationPreference: appointment.notificationPreference,
        patientContact: appointment.patientContact,
        meetingUrl: appointment.meetingUrl ?? '',
      })),
    },
    { status: 201 },
  )
}
