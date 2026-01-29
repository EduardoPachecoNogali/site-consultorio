import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveRouteParams } from '@/lib/route-params'

interface Params {
  params?: { id?: string; patientId?: string; recordId?: string } | Promise<{ id?: string; patientId?: string; recordId?: string }>
}

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

export async function PATCH(request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  const patientId = resolvedParams?.patientId
  const recordId = resolvedParams?.recordId
  if (!id || !patientId || !recordId) {
    return NextResponse.json(
      { error: 'Prontuário inválido.' },
      { status: 400 },
    )
  }
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
    tags?: string[]
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
  if (payload.tags !== undefined) {
    updateData.tags = Array.isArray(payload.tags)
      ? payload.tags.map((entry: unknown) => normalizeString(entry)).filter(Boolean)
      : []
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
      tags: updated.tags ?? [],
    },
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  const patientId = resolvedParams?.patientId
  const recordId = resolvedParams?.recordId
  if (!id || !patientId || !recordId) {
    return NextResponse.json(
      { error: 'Prontuário inválido.' },
      { status: 400 },
    )
  }

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
