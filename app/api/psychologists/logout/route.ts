import { NextResponse } from 'next/server'
import { clearPsychologistSession } from '@/lib/psychologist-auth'

export async function POST() {
  await clearPsychologistSession()
  return NextResponse.json({ success: true })
}
