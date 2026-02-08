import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redis } from "@/lib/redis"

function getKey(userId: string) {
  return `sidebar:${userId}`
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ openItems: [] }, { status: 401 })
  }

  // Return empty if Redis not available (client will use localStorage)
  if (!redis) {
    return NextResponse.json({ openItems: [], useLocalStorage: true })
  }

  try {
    const raw = await redis.get(getKey(session.user.id))
    const openItems: string[] = raw ? JSON.parse(raw) : []
    return NextResponse.json({ openItems })
  } catch {
    return NextResponse.json({ openItems: [], useLocalStorage: true })
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Skip if Redis not available (client will use localStorage)
  if (!redis) {
    return NextResponse.json({ ok: true, useLocalStorage: true })
  }

  const body = await request.json()
  const openItems: string[] = body.openItems ?? []

  try {
    await redis.set(getKey(session.user.id), JSON.stringify(openItems), "EX", 60 * 60 * 24 * 90) // 90 day expiry
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true, useLocalStorage: true })
  }
}
