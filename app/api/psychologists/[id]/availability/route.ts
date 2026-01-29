import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveRouteParams } from '@/lib/route-params'

interface Params {
  params?: { id?: string } | Promise<{ id?: string }>
}

const DEFAULT_AVAILABILITY = {
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

const normalizeAvailability = (payload: any) => {
  if (!payload || typeof payload !== 'object') return DEFAULT_AVAILABILITY

  const weekly = payload.weekly ?? {}
  const normalizedWeekly: Record<number, { enabled: boolean; start: string; end: string }> = {}

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

export async function GET(_request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  if (!id) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 })
  }

  const psychologist = await prisma.psychologist.findUnique({
    where: { id },
    select: { availability: true },
  })

  if (!psychologist) {
    return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 404 })
  }

  const availability = normalizeAvailability(psychologist.availability)

  return NextResponse.json({ availability })
}

export async function PATCH(request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  if (!id) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 })
  }

  const payload = await request.json()
  const availability = normalizeAvailability(payload?.availability ?? payload)

  const psychologist = await prisma.psychologist.findUnique({ where: { id } })
  if (!psychologist) {
    return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 404 })
  }

  const updated = await prisma.psychologist.update({
    where: { id },
    data: { availability },
    select: { availability: true },
  })

  return NextResponse.json({ availability: normalizeAvailability(updated.availability) })
}
