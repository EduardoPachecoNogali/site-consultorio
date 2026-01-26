import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Params {
  params: { id: string }
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
  const { id } = params
  const payload = await request.json()

  const patientName = normalizeString(payload.patientName)
  const patientEmail = normalizeString(payload.patientEmail)
  const patientPhone = normalizeString(payload.patientPhone)
  const duration = normalizeString(payload.duration) || '50 min'
  const notes = normalizeString(payload.notes)
  const notificationPreference = normalizeString(payload.notificationPreference)
  const patientContact = normalizeString(payload.patientContact)

  const slots = resolveSlots(payload)
    .map((slot: any) => ({
      date: normalizeString(slot?.date),
      time: normalizeString(slot?.time),
    }))
    .filter((slot: { date: string; time: string }) => slot.date && slot.time)

  if (!patientName || slots.length === 0) {
    return NextResponse.json(
      { error: 'Informe o paciente e ao menos um horário.' },
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
          notificationPreference: notificationPreference || 'whatsapp',
          patientContact: patientContact || patientPhone || patientEmail || '',
        },
      }),
    ),
  )

  return NextResponse.json(
    {
      appointments: createdAppointments.map((appointment) => ({
        id: appointment.id,
        patientId: appointment.patientId,
        patientName: patientName,
        time: appointment.time,
        duration: appointment.duration,
        status: appointment.status,
        notes: appointment.notes ?? '',
        date: appointment.date.toISOString(),
        notificationPreference: appointment.notificationPreference,
        patientContact: appointment.patientContact,
      })),
    },
    { status: 201 },
  )
}
