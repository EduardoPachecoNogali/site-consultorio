import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Params {
  params: { id: string }
}

type AppointmentCounts = {
  total: number
  completed: number
  upcoming: number
}

const buildCounts = (appointments: { patientId: string; status: string }[]) => {
  const counts = new Map<string, AppointmentCounts>()

  appointments.forEach((appointment) => {
    const current = counts.get(appointment.patientId) ?? {
      total: 0,
      completed: 0,
      upcoming: 0,
    }

    current.total += 1
    if (appointment.status === 'completed') {
      current.completed += 1
    } else if (appointment.status !== 'cancelled') {
      current.upcoming += 1
    }

    counts.set(appointment.patientId, current)
  })

  return counts
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = params

  const psychologist = await prisma.psychologist.findUnique({ where: { id } })
  if (!psychologist) {
    return NextResponse.json(
      { error: 'Profissional não encontrado.' },
      { status: 404 },
    )
  }

  const [patients, appointments, reminders] = await Promise.all([
    prisma.patient.findMany({
      where: { psychologistId: id },
      include: {
        medicalRecords: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.appointment.findMany({
      where: { psychologistId: id },
      include: { patient: true },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    }),
    prisma.reminder.findMany({
      where: { psychologistId: id },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const appointmentCounts = buildCounts(appointments)

  const serializedPatients = patients.map((patient) => {
    const counts = appointmentCounts.get(patient.id) ?? {
      total: 0,
      completed: 0,
      upcoming: 0,
    }

    return {
      id: patient.id,
      name: patient.name,
      email: patient.email ?? '',
      phone: patient.phone ?? '',
      totalAppointments: counts.total,
      completedAppointments: counts.completed,
      upcomingAppointments: counts.upcoming,
      medicalRecords: patient.medicalRecords.map((record) => ({
        id: record.id,
        date: record.date.toISOString(),
        title: record.title,
        content: record.content,
      })),
      basicInfo: {
        age: patient.age ?? undefined,
        occupation: patient.occupation ?? undefined,
        emergencyContact: patient.emergencyContact ?? undefined,
      },
    }
  })

  const serializedAppointments = appointments.map((appointment) => ({
    id: appointment.id,
    patientId: appointment.patientId,
    patientName: appointment.patient.name,
    time: appointment.time,
    duration: appointment.duration,
    status: appointment.status,
    notes: appointment.notes ?? '',
    date: appointment.date.toISOString(),
    notificationPreference: appointment.notificationPreference,
    patientContact: appointment.patientContact,
  }))

  const serializedReminders = reminders.map((reminder) => ({
    id: reminder.id,
    text: reminder.text,
    color: reminder.color,
  }))

  return NextResponse.json({
    patients: serializedPatients,
    appointments: serializedAppointments,
    reminders: serializedReminders,
  })
}
