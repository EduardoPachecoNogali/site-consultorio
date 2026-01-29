import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const psychologists = await prisma.psychologist.findMany({
    where: { status: 'approved' },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    psychologists: psychologists.map((psychologist) => ({
      id: psychologist.id,
      name: psychologist.name,
      email: psychologist.email,
      status: psychologist.status,
    })),
  })
}
