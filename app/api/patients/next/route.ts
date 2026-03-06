import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePatientSession } from '@/lib/patient-auth'

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

export async function GET(request: Request) {
  const email = normalizeString(new URL(request.url).searchParams.get('email') || '')
  if (!email) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }

  const hasSession = await requirePatientSession(email)
  if (!hasSession) {
    return NextResponse.json({ error: 'Sessão do paciente inválida.' }, { status: 401 })
  }

  const patient = await prisma.patient.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  })

  if (!patient) {
    return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const appointment = await prisma.appointment.findFirst({
    where: {
      patientId: patient.id,
      date: { gte: today },
      status: { notIn: ['completed', 'cancelled'] },
    },
    include: { psychologist: true, patient: true },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  })

  if (!appointment) {
    return NextResponse.json({ error: 'Nenhuma consulta futura.' }, { status: 404 })
  }

  const meetingUrl = appointment.meetingUrl ?? ''

  return NextResponse.json({
    appointment: {
      id: appointment.id,
      date: appointment.date.toISOString(),
      time: appointment.time,
      duration: appointment.duration,
      psychologistName: appointment.psychologist?.name || 'Psicólogo(a)',
      specialty: 'Psicologia',
      meetingUrl,
    },
  })
}
