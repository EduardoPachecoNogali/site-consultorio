import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/email'
import { appConfig } from '@/lib/app-config'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { resolveRouteParams } from '@/lib/route-params'
import crypto from 'crypto'

interface Params {
  params?: { id?: string } | Promise<{ id?: string }>
}

export async function POST(_request: Request, { params }: Params) {
  const admin = await getAdminFromRequest()
  if (!admin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 })
  }

  const resolvedParams = await resolveRouteParams(params)
  const id = resolvedParams?.id
  if (!id) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 })
  }

  const psychologist = await prisma.psychologist.findUnique({ where: { id } })
  if (!psychologist) {
    return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 404 })
  }

  const isExpired =
    !psychologist.inviteExpiresAt ||
    psychologist.inviteExpiresAt.getTime() < Date.now()

  const inviteToken =
    psychologist.inviteToken && !isExpired
      ? psychologist.inviteToken
      : crypto.randomBytes(32).toString('hex')

  const inviteExpiresAt =
    psychologist.inviteExpiresAt && !isExpired
      ? psychologist.inviteExpiresAt
      : (() => {
          const date = new Date()
          date.setDate(date.getDate() + 7)
          return date
        })()

  if (!psychologist.inviteToken || isExpired) {
    await prisma.psychologist.update({
      where: { id },
      data: {
        inviteToken,
        inviteExpiresAt,
        inviteAcceptedAt: null,
      },
    })
  }

  const inviteLink = `${appConfig.publicUrl.replace(/\/$/, '')}/psicologo/cadastro?token=${inviteToken}`

  await sendMail({
    to: psychologist.email,
    subject: `Finalize seu cadastro na ${appConfig.name}`,
    html: `
      <p>Olá ${psychologist.name},</p>
      <p>Segue novamente o link para concluir seu cadastro:</p>
      <p><a href="${inviteLink}">Finalizar cadastro</a></p>
      <p>Abraços,<br/>Equipe ${appConfig.name}</p>
    `,
  })

  return NextResponse.json({ success: true })
}
