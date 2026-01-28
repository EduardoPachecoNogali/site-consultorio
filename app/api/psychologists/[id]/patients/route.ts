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

  const patient = await prisma.patient.create({
    data: {
      psychologistId: id,
      name,
      email: normalizeString(payload.email) || null,
      phone: normalizeString(payload.phone) || null,
      age: normalizeString(payload.age) || null,
      occupation: normalizeString(payload.occupation) || null,
      emergencyContact: normalizeString(payload.emergencyContact) || null,
    },
  })

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
