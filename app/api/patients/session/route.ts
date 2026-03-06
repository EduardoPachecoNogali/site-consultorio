import { NextResponse } from 'next/server'
import { createPatientSession } from '@/lib/patient-auth'

export async function POST(request: Request) {
  const { email } = await request.json()
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!normalizedEmail) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }

  await createPatientSession(normalizedEmail)
  return NextResponse.json({ success: true })
}
