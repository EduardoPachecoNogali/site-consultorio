import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveRouteParams } from '@/lib/route-params'

interface Params {
  params?: { id?: string; patientId?: string } | Promise<{ id?: string; patientId?: string }>
}

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

export async function PATCH(request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  const patientId = resolvedParams?.patientId
  if (!id || !patientId) {
    return NextResponse.json(
      { error: 'Paciente inválido.' },
      { status: 400 },
    )
  }
  const payload = await request.json()

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, psychologistId: id },
  })

  if (!patient) {
    return NextResponse.json(
      { error: 'Paciente não encontrado.' },
      { status: 404 },
    )
  }

  const updateData: {
    name?: string
    email?: string | null
    phone?: string | null
    age?: string | null
    occupation?: string | null
    emergencyContact?: string | null
  } = {}

  if (payload.name !== undefined) {
    const value = normalizeString(payload.name)
    if (value) updateData.name = value
  }
  if (payload.email !== undefined) {
    updateData.email = normalizeString(payload.email) || null
  }
  if (payload.phone !== undefined) {
    updateData.phone = normalizeString(payload.phone) || null
  }
  if (payload.age !== undefined) {
    updateData.age = normalizeString(payload.age) || null
  }
  if (payload.occupation !== undefined) {
    updateData.occupation = normalizeString(payload.occupation) || null
  }
  if (payload.emergencyContact !== undefined) {
    updateData.emergencyContact =
      normalizeString(payload.emergencyContact) || null
  }

  const updated = await prisma.patient.update({
    where: { id: patientId },
    data: updateData,
  })

  return NextResponse.json({
    patient: {
      id: updated.id,
      name: updated.name,
      email: updated.email ?? '',
      phone: updated.phone ?? '',
      basicInfo: {
        age: updated.age ?? undefined,
        occupation: updated.occupation ?? undefined,
        emergencyContact: updated.emergencyContact ?? undefined,
      },
    },
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  const patientId = resolvedParams?.patientId
  if (!id || !patientId) {
    return NextResponse.json(
      { error: 'Paciente inválido.' },
      { status: 400 },
    )
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, psychologistId: id },
  })

  if (!patient) {
    return NextResponse.json(
      { error: 'Paciente não encontrado.' },
      { status: 404 },
    )
  }

  await prisma.patient.delete({ where: { id: patientId } })

  return NextResponse.json({ success: true })
}
