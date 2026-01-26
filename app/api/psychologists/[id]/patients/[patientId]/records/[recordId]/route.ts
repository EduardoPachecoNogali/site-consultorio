import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Params {
  params: { id: string; patientId: string; recordId: string }
}

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

export async function PATCH(request: Request, { params }: Params) {
  const { id, patientId, recordId } = params
  const payload = await request.json()

  const record = await prisma.medicalRecord.findFirst({
    where: { id: recordId, patientId },
    include: { patient: true },
  })

  if (!record || record.patient.psychologistId !== id) {
    return NextResponse.json(
      { error: 'Prontuário não encontrado.' },
      { status: 404 },
    )
  }

  const updateData: {
    title?: string
    content?: string
    date?: Date
  } = {}

  if (payload.title !== undefined) {
    const value = normalizeString(payload.title)
    if (value) updateData.title = value
  }
  if (payload.content !== undefined) {
    const value = normalizeString(payload.content)
    if (value) updateData.content = value
  }
  if (payload.date) {
    updateData.date = new Date(payload.date)
  }

  const updated = await prisma.medicalRecord.update({
    where: { id: recordId },
    data: updateData,
  })

  return NextResponse.json({
    record: {
      id: updated.id,
      date: updated.date.toISOString(),
      title: updated.title,
      content: updated.content,
    },
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, patientId, recordId } = params

  const record = await prisma.medicalRecord.findFirst({
    where: { id: recordId, patientId },
    include: { patient: true },
  })

  if (!record || record.patient.psychologistId !== id) {
    return NextResponse.json(
      { error: 'Prontuário não encontrado.' },
      { status: 404 },
    )
  }

  await prisma.medicalRecord.delete({ where: { id: recordId } })

  return NextResponse.json({ success: true })
}
