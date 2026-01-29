import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveRouteParams } from '@/lib/route-params'

interface Params {
  params?: { id?: string } | Promise<{ id?: string }>
}

type Availability = {
  timezone: string
  slotDurationMinutes: number
  bufferMinutes: number
  allowGroup: boolean
  maxGroupSize: number
  weekly: Record<number, { enabled: boolean; start: string; end: string }>
}

const DEFAULT_AVAILABILITY: Availability = {
  timezone: 'America/Sao_Paulo',
  slotDurationMinutes: 50,
  bufferMinutes: 10,
  allowGroup: false,
  maxGroupSize: 6,
  weekly: {
    0: { enabled: false, start: '09:00', end: '17:00' },
    1: { enabled: true, start: '09:00', end: '18:00' },
    2: { enabled: true, start: '09:00', end: '18:00' },
    3: { enabled: true, start: '09:00', end: '18:00' },
    4: { enabled: true, start: '09:00', end: '18:00' },
    5: { enabled: true, start: '09:00', end: '16:00' },
    6: { enabled: false, start: '09:00', end: '12:00' },
  },
}

const normalizeAvailability = (payload: any): Availability => {
  if (!payload || typeof payload !== 'object') return DEFAULT_AVAILABILITY
  const weekly = payload.weekly ?? {}
  const normalizedWeekly: Availability['weekly'] = {}
  for (let day = 0; day <= 6; day += 1) {
    const entry = weekly?.[day] ?? weekly?.[String(day)] ?? {}
    normalizedWeekly[day] = {
      enabled: Boolean(entry.enabled ?? DEFAULT_AVAILABILITY.weekly[day].enabled),
      start: typeof entry.start === 'string' ? entry.start : DEFAULT_AVAILABILITY.weekly[day].start,
      end: typeof entry.end === 'string' ? entry.end : DEFAULT_AVAILABILITY.weekly[day].end,
    }
  }

  return {
    timezone: typeof payload.timezone === 'string' ? payload.timezone : DEFAULT_AVAILABILITY.timezone,
    slotDurationMinutes:
      typeof payload.slotDurationMinutes === 'number'
        ? payload.slotDurationMinutes
        : DEFAULT_AVAILABILITY.slotDurationMinutes,
    bufferMinutes:
      typeof payload.bufferMinutes === 'number'
        ? payload.bufferMinutes
        : DEFAULT_AVAILABILITY.bufferMinutes,
    allowGroup:
      typeof payload.allowGroup === 'boolean' ? payload.allowGroup : DEFAULT_AVAILABILITY.allowGroup,
    maxGroupSize:
      typeof payload.maxGroupSize === 'number' ? payload.maxGroupSize : DEFAULT_AVAILABILITY.maxGroupSize,
    weekly: normalizedWeekly,
  }
}

const parseDateInput = (value?: string | null) => {
  if (!value) return new Date()
  const [year, month, day] = value.split('-').map((part) => Number(part))
  if (!year || !month || !day) return new Date()
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
}

const toDateKey = (date: Date) => date.toISOString().slice(0, 10)

const parseTimeToMinutes = (value: string) => {
  const [hour, minute] = value.split(':').map((part) => Number(part))
  if (Number.isNaN(hour) || Number.isNaN(minute)) return 0
  return hour * 60 + minute
}

const minutesToTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

const getPreferenceWeight = (minutes: number, preference: string | null) => {
  if (!preference) return 0
  if (preference === 'morning') {
    return minutes >= 480 && minutes < 720 ? 0 : 3
  }
  if (preference === 'afternoon') {
    return minutes >= 720 && minutes < 1020 ? 0 : 3
  }
  if (preference === 'evening') {
    return minutes >= 1020 && minutes < 1200 ? 0 : 3
  }
  return 0
}

export async function GET(request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  if (!id) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 })
  }

  const url = new URL(request.url)
  const fromParam = url.searchParams.get('from')
  const daysParam = Number(url.searchParams.get('days') || 7)
  const preference = url.searchParams.get('preference')

  const startDate = parseDateInput(fromParam)
  const totalDays = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 30) : 7
  const endDate = new Date(startDate)
  endDate.setUTCDate(endDate.getUTCDate() + totalDays)

  const psychologist = await prisma.psychologist.findUnique({
    where: { id },
    select: { availability: true },
  })

  if (!psychologist) {
    return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 404 })
  }

  const availability = normalizeAvailability(psychologist.availability)

  const appointments = await prisma.appointment.findMany({
    where: {
      psychologistId: id,
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
    select: { date: true, time: true },
  })

  const bookedMap = new Map<string, Set<string>>()
  appointments.forEach((appointment) => {
    const key = toDateKey(appointment.date)
    const existing = bookedMap.get(key) ?? new Set<string>()
    existing.add(appointment.time)
    bookedMap.set(key, existing)
  })

  const slots: { date: string; time: string }[] = []

  for (let offset = 0; offset < totalDays; offset += 1) {
    const dayDate = new Date(startDate)
    dayDate.setUTCDate(startDate.getUTCDate() + offset)
    const weekday = dayDate.getUTCDay()
    const dayAvailability = availability.weekly[weekday]
    if (!dayAvailability?.enabled) continue

    const startMinutes = parseTimeToMinutes(dayAvailability.start)
    const endMinutes = parseTimeToMinutes(dayAvailability.end)
    const slotLength = availability.slotDurationMinutes
    const step = availability.slotDurationMinutes + availability.bufferMinutes
    const dateKey = toDateKey(dayDate)
    const bookedTimes = bookedMap.get(dateKey) ?? new Set<string>()

    for (let current = startMinutes; current + slotLength <= endMinutes; current += step) {
      const time = minutesToTime(current)
      if (bookedTimes.has(time)) continue
      slots.push({ date: dateKey, time })
    }
  }

  const dayLoad = new Map<string, number>()
  appointments.forEach((appointment) => {
    const key = toDateKey(appointment.date)
    const current = dayLoad.get(key) ?? 0
    dayLoad.set(key, current + 1)
  })

  const suggestedSlots = [...slots]
    .map((slot) => {
      const minutes = parseTimeToMinutes(slot.time)
      const preferenceWeight = getPreferenceWeight(minutes, preference)
      const loadWeight = dayLoad.get(slot.date) ?? 0
      return { ...slot, score: loadWeight * 2 + preferenceWeight }
    })
    .sort((a, b) => a.score - b.score || a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 6)
    .map(({ score: _score, ...slot }) => slot)

  return NextResponse.json({
    availability,
    slots,
    suggestedSlots,
  })
}
