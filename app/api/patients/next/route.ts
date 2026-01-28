import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMeetLink } from '@/lib/google-meet'

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

export async function GET(request: Request) {
  const email = normalizeString(new URL(request.url).searchParams.get('email') || '')
  if (!email) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
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

  let meetingUrl = appointment.meetingUrl ?? ''
  if (!meetingUrl) {
    if (!appointment.psychologist?.googleRefreshToken) {
      return NextResponse.json(
        { error: 'Google Calendar nao conectado pelo profissional.' },
        { status: 409 },
      )
    }

    const meetResult = await createMeetLink({
      appointmentId: appointment.id,
      patientEmail: patient.email || email,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration,
      psychologistName: appointment.psychologist?.name,
      patientName: appointment.patient.name,
      google: {
        refreshToken: appointment.psychologist?.googleRefreshToken,
        calendarId: appointment.psychologist?.googleCalendarId,
        psychologistEmail:
          appointment.psychologist?.googleEmail || appointment.psychologist?.email,
      },
    })

    if (!meetResult.ok) {
      return NextResponse.json(
        { error: meetResult.error || 'Erro ao criar reunião no Google Meet.' },
        { status: 502 },
      )
    }

    meetingUrl = meetResult.meetingUrl

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { meetingUrl },
    })
  }

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
