import { appConfig } from '@/lib/app-config'
import { decryptRefreshToken } from '@/lib/token-crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

interface CreateMeetParams {
  appointmentId: string
  patientEmail: string
  date: Date
  time: string
  duration: string
  psychologistName?: string
  patientName?: string
  google?: {
    refreshToken?: string | null
    calendarId?: string | null
    psychologistEmail?: string | null
  }
}

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const extractMinutes = (duration: string) => {
  const match = duration.match(/\d+/)
  const minutes = match ? Number(match[0]) : 50
  return Number.isNaN(minutes) || minutes <= 0 ? 50 : minutes
}

const addMinutesToTime = (time: string, minutesToAdd: number) => {
  const [hourStr, minuteStr] = time.split(':')
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return { time: '00:00', dayOffset: 0 }
  }

  const totalMinutes = hour * 60 + minute + minutesToAdd
  const dayOffset = Math.floor(totalMinutes / (24 * 60))
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const endHour = Math.floor(normalizedMinutes / 60)
  const endMinute = normalizedMinutes % 60

  return {
    time: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
    dayOffset,
  }
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

const formatDatePart = (date: Date) => date.toISOString().slice(0, 10)

const getAccessToken = async (refreshToken: string) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret || !refreshToken) {
    return { ok: false as const, error: 'Credenciais do Google ausentes.' }
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  })

  if (!response.ok) {
    const details = await response.text()
    console.error('[google:token]', { status: response.status, details })
    return { ok: false as const, error: 'Falha ao obter token do Google.' }
  }

  const data = (await response.json()) as { access_token?: string }
  if (!data.access_token) {
    return { ok: false as const, error: 'Token do Google inválido.' }
  }

  return { ok: true as const, token: data.access_token }
}

export async function createMeetLink({
  appointmentId,
  patientEmail,
  date,
  time,
  duration,
  psychologistName,
  patientName,
  google,
}: CreateMeetParams) {
  const calendarId = normalizeString(google?.calendarId) || 'primary'
  const timeZone =
    process.env.GOOGLE_MEET_TIMEZONE || process.env.APP_TIMEZONE || 'America/Sao_Paulo'

  const refreshTokenInput = normalizeString(google?.refreshToken)
  if (!refreshTokenInput) {
    return { ok: false as const, error: 'Google Calendar não está conectado.' }
  }

  let refreshToken = refreshTokenInput
  try {
    refreshToken = decryptRefreshToken(refreshTokenInput)
  } catch (error) {
    console.error('[google:token]', { error: (error as Error).message })
    return { ok: false as const, error: 'Falha ao ler o token do Google.' }
  }

  const tokenResult = await getAccessToken(refreshToken)
  if (!tokenResult.ok) {
    return { ok: false as const, error: tokenResult.error }
  }

  const safeTime = normalizeString(time) || '09:00'
  const minutes = extractMinutes(duration)
  const endTime = addMinutesToTime(safeTime, minutes)
  const endDate = endTime.dayOffset ? addDays(date, endTime.dayOffset) : date

  const startDatePart = formatDatePart(date)
  const endDatePart = formatDatePart(endDate)

  const summary = `Consulta - ${psychologistName || appConfig.name}`
  const description = patientName
    ? `Consulta com ${patientName}`
    : 'Consulta online'

  const psychologistEmail = normalizeString(google?.psychologistEmail)
  const attendees = [] as { email: string }[]
  if (patientEmail) attendees.push({ email: patientEmail })
  if (psychologistEmail && psychologistEmail !== patientEmail) {
    attendees.push({ email: psychologistEmail })
  }

  const eventPayload = {
    summary,
    description,
    start: {
      dateTime: `${startDatePart}T${safeTime}:00`,
      timeZone,
    },
    end: {
      dateTime: `${endDatePart}T${endTime.time}:00`,
      timeZone,
    },
    attendees: attendees.length ? attendees : undefined,
    conferenceData: {
      createRequest: {
        requestId: `appt-${appointmentId}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  }

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenResult.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    },
  )

  if (!response.ok) {
    const details = await response.text()
    console.error('[google:calendar]', { status: response.status, details })
    return { ok: false as const, error: 'Falha ao criar reunião no Google Meet.' }
  }

  const event = (await response.json()) as { hangoutLink?: string }

  if (!event.hangoutLink) {
    return { ok: false as const, error: 'Google Meet não retornou link.' }
  }

  return { ok: true as const, meetingUrl: event.hangoutLink }
}
