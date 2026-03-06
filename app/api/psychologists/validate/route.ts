import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializePsychologist } from '@/lib/psychologists'
import { createPsychologistSession } from '@/lib/psychologist-auth'
import { hashSecret, isHashedSecret, verifySecret } from '@/lib/secret-crypto'

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

  if (!psychologist.pin) {
    return NextResponse.json(
      { error: 'Cadastro ainda não foi concluído. Verifique seu email.' },
      { status: 403 },
    )
  }

  const normalizedPin = String(pin)
  const isValidPin = await verifySecret(normalizedPin, psychologist.pin)

  if (!isValidPin) {
    return NextResponse.json(
      { error: 'PIN inválido. Verifique o PIN definido no seu cadastro.' },
      { status: 401 },
    )
  }

  if (psychologist.pin && !isHashedSecret(psychologist.pin)) {
    await prisma.psychologist.update({
      where: { id: psychologist.id },
      data: { pin: await hashSecret(normalizedPin) },
    })
  }

  await createPsychologistSession(psychologist.id)

  return NextResponse.json({ psychologist: serializePsychologist(psychologist) })
}
