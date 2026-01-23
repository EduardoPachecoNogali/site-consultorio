export type PsychologistStatus = 'pending' | 'approved'

export interface PsychologistProfile {
  id: string
  name: string
  email: string
  status: PsychologistStatus
  pin?: string | null
  notes?: string | null
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
  pin: record.pin,
  notes: record.notes,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
})
