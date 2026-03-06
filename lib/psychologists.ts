export type PsychologistStatus = 'pending' | 'approved'

export interface PsychologistProfile {
  id: string
  name: string
  email: string
  status: PsychologistStatus
  notes?: string | null
  googleEmail?: string | null
  googleCalendarId?: string | null
  googleConnectedAt?: string | null
  createdAt: string
  updatedAt: string
}

type PsychologistRecord = {
  id: string
  name: string
  email: string
  status: string
  pin: string | null
  notes: string | null
  googleEmail: string | null
  googleCalendarId: string | null
  googleConnectedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export const serializePsychologist = (
  record: PsychologistRecord,
): PsychologistProfile => ({
  id: record.id,
  name: record.name,
  email: record.email,
  status: (record.status as PsychologistStatus) ?? 'pending',
  notes: record.notes,
  googleEmail: record.googleEmail,
  googleCalendarId: record.googleCalendarId,
  googleConnectedAt: record.googleConnectedAt?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
})
