import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Params {
  params: { id: string }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = params

  try {
    await prisma.psychologist.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 })
  }
}
