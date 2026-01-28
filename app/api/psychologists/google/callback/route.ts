import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { appConfig } from '@/lib/app-config'
import { encryptRefreshToken } from '@/lib/token-crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

const buildRedirectUri = () =>
  process.env.GOOGLE_OAUTH_REDIRECT_URI ||
  `${appConfig.publicUrl.replace(/\/$/, '')}/api/psychologists/google/callback`

const renderHtml = (title: string, message: string) => `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f6f6f7; color: #1f2937; }
    .card { max-width: 520px; margin: 8vh auto; background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
    .title { font-size: 20px; font-weight: 600; margin: 0 0 12px; }
    .message { font-size: 14px; line-height: 1.6; margin: 0 0 20px; }
    a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <p class="title">${title}</p>
    <p class="message">${message}</p>
    <a href="${appConfig.publicUrl}">Voltar ao sistema</a>
  </div>
</body>
</html>`

const parseState = (state: string) => {
  try {
    const json = Buffer.from(state, 'base64url').toString('utf8')
    return JSON.parse(json) as { psychologistId?: string }
  } catch {
    return {}
  }
}

const fetchGoogleEmail = async (accessToken: string) => {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return ''
  const data = (await response.json()) as { email?: string }
  return data.email ?? ''
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return new NextResponse(renderHtml('Conexao cancelada', 'A autorizacao foi cancelada no Google.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (!code || !state) {
    return new NextResponse(renderHtml('Conexao invalida', 'Parametros obrigatorios nao encontrados.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const { psychologistId } = parseState(state)
  if (!psychologistId) {
    return new NextResponse(renderHtml('Conexao invalida', 'Identificador do profissional nao encontrado.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return new NextResponse(renderHtml('Conexao indisponivel', 'Credenciais do Google nao configuradas.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const psychologist = await prisma.psychologist.findUnique({
    where: { id: psychologistId },
  })
  if (!psychologist) {
    return new NextResponse(renderHtml('Conexao invalida', 'Profissional nao encontrado.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (psychologist.status !== 'approved') {
    return new NextResponse(renderHtml('Conexao bloqueada', 'Cadastro ainda nao aprovado.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: buildRedirectUri(),
      grant_type: 'authorization_code',
    }).toString(),
  })

  if (!tokenResponse.ok) {
    const details = await tokenResponse.text()
    console.error('[google:oauth]', { status: tokenResponse.status, details })
    return new NextResponse(renderHtml('Conexao falhou', 'Nao foi possivel obter tokens do Google.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string
    refresh_token?: string
  }

  if (!tokenData.access_token) {
    return new NextResponse(renderHtml('Conexao falhou', 'Token de acesso invalido.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  let encryptedRefreshToken = psychologist.googleRefreshToken ?? ''
  if (tokenData.refresh_token) {
    try {
      encryptedRefreshToken = encryptRefreshToken(tokenData.refresh_token)
    } catch (error) {
      console.error('[google:oauth]', { error: (error as Error).message })
      return new NextResponse(renderHtml('Conexao falhou', 'Falha ao proteger o token.'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
  }

  if (!encryptedRefreshToken) {
    return new NextResponse(
      renderHtml(
        'Conexao incompleta',
        'O Google nao retornou refresh_token. Revogue o acesso e tente novamente.',
      ),
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    )
  }

  const googleEmail = await fetchGoogleEmail(tokenData.access_token)

  await prisma.psychologist.update({
    where: { id: psychologistId },
    data: {
      googleRefreshToken: encryptedRefreshToken,
      googleCalendarId: psychologist.googleCalendarId || 'primary',
      googleEmail: googleEmail || psychologist.googleEmail || psychologist.email,
      googleConnectedAt: new Date(),
    },
  })

  return new NextResponse(
    renderHtml('Conexao concluida', 'Google Calendar conectado com sucesso.'),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}
