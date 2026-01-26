import { NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function GET() {
  const admin = await getAdminFromRequest()
  if (!admin) {
    return NextResponse.json({ admin: null }, { status: 401 })
  }
  return NextResponse.json({ admin: { id: admin.id, email: admin.email } })
}
