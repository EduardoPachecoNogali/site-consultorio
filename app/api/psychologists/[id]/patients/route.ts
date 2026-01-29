import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveRouteParams } from '@/lib/route-params'

interface Params {
  params?: { id?: string } | Promise<{ id?: string }>
}

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

export async function POST(request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  if (!id) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 })
  }
  const payload = await request.json()

  const name = normalizeString(payload.name)
  const email = normalizeString(payload.email)
  const phone = normalizeString(payload.phone)
  if (!name) {
    return NextResponse.json(
      { error: 'Nome do paciente é obrigatório.' },
      { status: 400 },
    )
  }

  const psychologist = await prisma.psychologist.findUnique({ where: { id } })
  if (!psychologist) {
    return NextResponse.json(
      { error: 'Profissional não encontrado.' },
      { status: 404 },
    )
  }

  let patient = await prisma.patient.findFirst({
    where: {
      psychologistId: id,
      ...(email ? { email: { equals: email, mode: 'insensitive' as const } } : {}),
    },
  })

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        psychologistId: id,
        name,
        email: email || null,
        phone: phone || null,
        age: normalizeString(payload.age) || null,
        occupation: normalizeString(payload.occupation) || null,
        emergencyContact: normalizeString(payload.emergencyContact) || null,
      },
    })
  } else {
    patient = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        name,
        email: email || patient.email,
        phone: phone || patient.phone,
        age: normalizeString(payload.age) || patient.age,
        occupation: normalizeString(payload.occupation) || patient.occupation,
        emergencyContact:
          normalizeString(payload.emergencyContact) || patient.emergencyContact,
      },
    })
  }

  return NextResponse.json(
    {
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email ?? '',
        phone: patient.phone ?? '',
        basicInfo: {
          age: patient.age ?? undefined,
          occupation: patient.occupation ?? undefined,
          emergencyContact: patient.emergencyContact ?? undefined,
        },
      },
    },
    { status: 201 },
  )
}
