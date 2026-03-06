import { NextResponse } from 'next/server'
import { getPsychologistFromRequest } from '@/lib/psychologist-auth'
import { serializePsychologist } from '@/lib/psychologists'

export async function GET() {
  const psychologist = await getPsychologistFromRequest()

  if (!psychologist) {
    return NextResponse.json({ psychologist: null }, { status: 401 })
  }

  return NextResponse.json({ psychologist: serializePsychologist(psychologist) })
}
