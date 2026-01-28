import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveRouteParams } from '@/lib/route-params'
import { appConfig } from '@/lib/app-config'

interface Params {
  params?: { id?: string } | Promise<{ id?: string }>
}

const getIdFromRequest = (request: Request, params?: { id?: string }) => {
  if (params?.id) return params.id
  const pathname = new URL(request.url).pathname
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length >= 5 && segments[0] === 'api' && segments[1] === 'psychologists') {
    return segments[2]
  }
  return undefined
}

const buildRedirectUri = () =>
  process.env.GOOGLE_OAUTH_REDIRECT_URI ||
  `${appConfig.publicUrl.replace(/\/$/, '')}/api/psychologists/google/callback`

export async function GET(request: Request, { params }: Params) {
  const resolvedParams = await resolveRouteParams(params)
  const id = getIdFromRequest(request, resolvedParams)

  if (!id) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID não configurado.' },
      { status: 500 },
    )
  }

  const psychologist = await prisma.psychologist.findUnique({ where: { id } })
  if (!psychologist) {
    return NextResponse.json(
      { error: 'Profissional não encontrado.' },
      { status: 404 },
    )
  }

  if (psychologist.status !== 'approved') {
    return NextResponse.json(
      { error: 'Cadastro ainda não aprovado.' },
      { status: 403 },
    )
  }

  const state = Buffer.from(
    JSON.stringify({ psychologistId: id, ts: Date.now() }),
  ).toString('base64url')

  const redirectUri = buildRedirectUri()
  const paramsUrl = new URLSearchParams({
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    response_type: 'code',
    redirect_uri: redirectUri,
    client_id: clientId,
    state,
    login_hint: psychologist.email,
  })

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${paramsUrl.toString()}`
  return NextResponse.json({ url })
}
