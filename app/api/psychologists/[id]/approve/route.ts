import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/email'
import { serializePsychologist } from '@/lib/psychologists'
import { appConfig } from '@/lib/app-config'
import { getAdminFromRequest } from '@/lib/admin-auth'
import crypto from 'crypto'

interface Params {
  params?: { id?: string } | Promise<{ id?: string }>
}

const resolveParams = async (params?: Params['params']) => {
  if (!params) return undefined
  return typeof (params as Promise<{ id?: string }>)?.then === 'function'
    ? await (params as Promise<{ id?: string }>)
    : (params as { id?: string })
}

const getIdFromRequest = (request: Request, params?: { id?: string }) => {
  if (params?.id) return params.id
  const pathname = new URL(request.url).pathname
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length >= 4 && segments[0] === 'api' && segments[1] === 'psychologists') {
    return segments[2]
  }
  return undefined
}

export async function POST(request: Request, { params }: Params) {
  const admin = await getAdminFromRequest()
  if (!admin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 })
  }

  const resolvedParams = await resolveParams(params)
  const id = getIdFromRequest(request, resolvedParams)
  if (!id) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 })
  }

  const psychologist = await prisma.psychologist.findUnique({ where: { id } })
  if (!psychologist) {
    return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 404 })
  }

  const inviteToken = crypto.randomBytes(32).toString('hex')
  const inviteExpiresAt = new Date()
  inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7)

  const updated = await prisma.psychologist.update({
    where: { id },
    data: {
      status: 'approved',
      inviteToken,
      inviteExpiresAt,
      inviteAcceptedAt: null,
    },
  })

  const inviteLink = `${appConfig.publicUrl.replace(/\/$/, '')}/psicologo/cadastro?token=${inviteToken}`

  await sendMail({
    to: updated.email,
    subject: `Seu acesso à ${appConfig.name} foi aprovado`,
    html: `
      <p>Olá ${updated.name},</p>
      <p>Seu cadastro como psicólogo foi aprovado. Clique no link abaixo para concluir seu cadastro:</p>
      <p><a href="${inviteLink}">Finalizar cadastro</a></p>
      <p>Abraços,<br/>Equipe ${appConfig.name}</p>
    `,
  })

  return NextResponse.json({ psychologist: serializePsychologist(updated) })
}
