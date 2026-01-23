import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/email'

interface Params {
  params: { id: string }
}

export async function POST(_request: Request, { params }: Params) {
  const { id } = params

  const psychologist = await prisma.psychologist.findUnique({ where: { id } })
  if (!psychologist) {
    return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 404 })
  }

  if (!psychologist.pin) {
    return NextResponse.json(
      { error: 'Nenhum PIN foi gerado para este profissional.' },
      { status: 400 },
    )
  }

  await sendMail({
    to: psychologist.email,
    subject: 'PIN de acesso à MindCare',
    html: `
      <p>Olá ${psychologist.name},</p>
      <p>Segue novamente o seu PIN para acesso:</p>
      <p style="font-size:20px;font-weight:bold;letter-spacing:4px;">${psychologist.pin}</p>
      <p>Abraços,<br/>Equipe MindCare</p>
    `,
  })

  return NextResponse.json({ success: true })
}
