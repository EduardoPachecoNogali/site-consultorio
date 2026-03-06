import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveRouteParams } from '@/lib/route-params'
import { sendMail } from '@/lib/email'
import { createMeetLink } from '@/lib/google-meet'
import { appConfig } from '@/lib/app-config'
import { requirePsychologistSession } from '@/lib/psychologist-auth'

interface Params {
  params?:
    | { id?: string; appointmentId?: string }
    | Promise<{ id?: string; appointmentId?: string }>
}

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const isEmail = (value: string) => value.includes('@')

export async function POST(request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  const appointmentId = resolvedParams?.appointmentId
  if (!id || !appointmentId) {
    return NextResponse.json({ error: 'Consulta inválida.' }, { status: 400 })
  }

  const sessionPsychologist = await requirePsychologistSession(id)
  if (!sessionPsychologist) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 })
  }

  const payload = await request.json().catch(() => ({}))

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, psychologistId: id },
    include: { patient: true, psychologist: true },
  })

  if (!appointment) {
    return NextResponse.json(
      { error: 'Consulta não encontrada.' },
      { status: 404 },
    )
  }

  const payloadContact = normalizeString(payload.contact)
  const patientEmail = appointment.patient.email ?? ''
  const appointmentContact = appointment.patientContact ?? ''
  const fallbackContact = appointmentContact.includes('@') ? appointmentContact : ''
  const contact = payloadContact || patientEmail || fallbackContact

  if (!contact) {
    return NextResponse.json(
      {
        error: 'Informe o email do paciente.',
      },
      { status: 400 },
    )
  }

  if (!isEmail(contact)) {
    return NextResponse.json(
      { error: 'Email do paciente inválido.' },
      { status: 400 },
    )
  }

  let meetingUrl = appointment.meetingUrl ?? ''
  if (!meetingUrl) {
    if (!appointment.psychologist?.googleRefreshToken) {
      return NextResponse.json(
        { error: 'Google Calendar nao conectado pelo profissional.' },
        { status: 409 },
      )
    }

    const attendeeEmail = patientEmail || contact
    const meetResult = await createMeetLink({
      appointmentId: appointment.id,
      patientEmail: attendeeEmail,
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

  const message =
    normalizeString(payload.message) ||
    `Olá ${appointment.patient.name}, sua consulta está iniciando. Entre no link: ${meetingUrl}`

  await sendMail({
    to: contact,
    subject: 'Sua consulta está iniciando',
    html: `
      <p>Olá ${appointment.patient.name},</p>
      <p>${message}</p>
      <p>Abraços,<br/>Equipe ${appConfig.name}</p>
    `,
  })

  return NextResponse.json({ success: true, channel: 'email', contact, meetingUrl })
}
