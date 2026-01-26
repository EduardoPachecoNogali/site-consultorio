import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminFromRequest } from '@/lib/admin-auth'

interface Params {
  params: { id: string }
}

export async function DELETE(_request: Request, { params }: Params) {
  const admin = await getAdminFromRequest()
  if (!admin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 })
  }

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
