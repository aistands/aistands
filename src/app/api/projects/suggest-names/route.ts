import { NextRequest, NextResponse } from 'next/server'
import { suggestProjectNames } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { documentText } = await req.json()
  const suggestions = await suggestProjectNames(documentText)
  return NextResponse.json({ suggestions })
}
