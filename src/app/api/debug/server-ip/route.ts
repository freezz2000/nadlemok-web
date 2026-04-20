import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    return NextResponse.json({ ip: data.ip })
  } catch {
    return NextResponse.json({ error: 'IP 조회 실패' }, { status: 500 })
  }
}
