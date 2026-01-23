import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/email'
import { serializePsychologist } from '@/lib/psychologists'

interface Params {
  params: { id: string }
}

const generatePin = () => `${Math.floor(100000 + Math.random() * 900000)}`

export async function POST(_request: Request, { params }: Params) {
  const { id } = params

  const psychologist = await prisma.psychologist.findUnique({ where: { id } })
  if (!psychologist) {
    return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 404 })
  }

  const pin = generatePin()

  const updated = await prisma.psychologist.update({
    where: { id },
    data: {
      status: 'approved',
      pin,
    },
  })

  await sendMail({
    to: updated.email,
    subject: 'Seu acesso à MindCare foi aprovado',
    html: `
      <p>Olá ${updated.name},</p>
      <p>Seu cadastro como psicólogo foi aprovado. Utilize o PIN abaixo para acessar a área profissional:</p>
      <p style="font-size:20px;font-weight:bold;letter-spacing:4px;">${pin}</p>
      <p>Abraços,<br/>Equipe MindCare</p>
    `,
  })

  return NextResponse.json({ psychologist: serializePsychologist(updated) })
}
