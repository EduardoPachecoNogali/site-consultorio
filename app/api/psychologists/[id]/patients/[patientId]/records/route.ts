import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Params {
  params: { id: string; patientId: string }
}

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

export async function POST(request: Request, { params }: Params) {
  const { id, patientId } = params
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

  const title = normalizeString(payload.title)
  const content = normalizeString(payload.content)

  if (!title || !content) {
    return NextResponse.json(
      { error: 'Título e conteúdo são obrigatórios.' },
      { status: 400 },
    )
  }

  const record = await prisma.medicalRecord.create({
    data: {
      patientId,
      title,
      content,
      date: payload.date ? new Date(payload.date) : new Date(),
    },
  })

  return NextResponse.json(
    {
      record: {
        id: record.id,
        date: record.date.toISOString(),
        title: record.title,
        content: record.content,
      },
    },
    { status: 201 },
  )
}
