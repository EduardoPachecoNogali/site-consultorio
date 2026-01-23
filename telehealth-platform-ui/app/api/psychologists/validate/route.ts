import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializePsychologist } from '@/lib/psychologists'

export async function POST(request: Request) {
  const { email, pin } = await request.json()

  if (!email || !pin) {
    return NextResponse.json(
      { error: 'Email e PIN são obrigatórios.' },
      { status: 400 },
    )
  }

  const normalizedEmail = (email as string).trim().toLowerCase()

  const psychologist = await prisma.psychologist.findUnique({
    where: { email: normalizedEmail },
  })

  if (!psychologist) {
    return NextResponse.json(
      { error: 'Nenhum profissional encontrado para estas credenciais.' },
      { status: 404 },
    )
  }

  if (psychologist.status !== 'approved') {
    return NextResponse.json(
      { error: 'Cadastro ainda não aprovado pela equipe administrativa.' },
      { status: 403 },
    )
  }

  if (psychologist.pin !== pin) {
    return NextResponse.json(
      { error: 'PIN inválido. Verifique o código enviado por email.' },
      { status: 401 },
    )
  }

  return NextResponse.json({ psychologist: serializePsychologist(psychologist) })
}
